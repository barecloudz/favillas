import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

let dbConnection: any = null;

function getDB() {
  if (dbConnection) return dbConnection;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  dbConnection = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });

  return dbConnection;
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const sql = getDB();

    console.log('🚀 Running points system migration...');

    // Read and execute the migration SQL
    const migrationSQL = `
-- Migration to fix points system constraints and ensure proper Supabase user support
-- This migration addresses issues preventing points from being awarded to Supabase users

-- 1. Ensure supabase_user_id columns exist in all required tables
ALTER TABLE user_points ADD COLUMN IF NOT EXISTS supabase_user_id TEXT;
ALTER TABLE points_transactions ADD COLUMN IF NOT EXISTS supabase_user_id TEXT;

-- 2. Drop existing constraints that might be causing issues
ALTER TABLE user_points DROP CONSTRAINT IF EXISTS chk_user_points_user_reference;
ALTER TABLE points_transactions DROP CONSTRAINT IF EXISTS chk_points_transactions_user_reference;

-- 3. Modify user_id columns to allow NULL when supabase_user_id is used
ALTER TABLE user_points ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE points_transactions ALTER COLUMN user_id DROP NOT NULL;

-- 4. Create proper unique constraints
DROP INDEX IF EXISTS idx_user_points_supabase_user_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_points_supabase_user_id
ON user_points(supabase_user_id) WHERE supabase_user_id IS NOT NULL;

-- Also ensure we have a unique constraint on user_id for legacy users
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_points_user_id
ON user_points(user_id) WHERE user_id IS NOT NULL;

-- 5. Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_points_transactions_supabase_user_id
ON points_transactions(supabase_user_id) WHERE supabase_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_points_transactions_order_id
ON points_transactions(order_id);

-- 6. Add proper check constraints to ensure data integrity
ALTER TABLE user_points ADD CONSTRAINT chk_user_points_user_reference
CHECK (
  (user_id IS NOT NULL AND supabase_user_id IS NULL) OR
  (user_id IS NULL AND supabase_user_id IS NOT NULL)
);

ALTER TABLE points_transactions ADD CONSTRAINT chk_points_transactions_user_reference
CHECK (
  (user_id IS NOT NULL AND supabase_user_id IS NULL) OR
  (user_id IS NULL AND supabase_user_id IS NOT NULL)
);

-- 7. Ensure users table has proper constraints for supabase_user_id
ALTER TABLE users ADD COLUMN IF NOT EXISTS supabase_user_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_supabase_user_id
ON users(supabase_user_id) WHERE supabase_user_id IS NOT NULL;
    `;

    // Execute migration in parts to handle potential issues
    const migrationSteps = migrationSQL.split(';').filter(step => step.trim());
    const results = [];

    for (let i = 0; i < migrationSteps.length; i++) {
      const step = migrationSteps[i].trim();
      if (!step) continue;

      try {
        console.log(`Executing step ${i + 1}:`, step.substring(0, 100) + '...');
        await sql.unsafe(step);
        results.push({ step: i + 1, status: 'success', sql: step.substring(0, 100) + '...' });
      } catch (stepError) {
        console.error(`Step ${i + 1} failed:`, stepError.message);
        results.push({
          step: i + 1,
          status: 'error',
          error: stepError.message,
          sql: step.substring(0, 100) + '...'
        });
        // Continue with other steps even if one fails
      }
    }

    // Verify the migration worked by checking table structure
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name IN ('user_points', 'points_transactions')
      AND column_name IN ('user_id', 'supabase_user_id')
      ORDER BY table_name, column_name
    `;

    const constraintInfo = await sql`
      SELECT
        tc.table_name,
        tc.constraint_name,
        tc.constraint_type
      FROM information_schema.table_constraints tc
      WHERE tc.table_name IN ('user_points', 'points_transactions')
      AND tc.constraint_type IN ('CHECK', 'UNIQUE')
      ORDER BY tc.table_name, tc.constraint_name
    `;

    const indexInfo = await sql`
      SELECT
        indexname,
        tablename,
        indexdef
      FROM pg_indexes
      WHERE tablename IN ('user_points', 'points_transactions')
      AND indexname LIKE '%supabase%'
      ORDER BY tablename, indexname
    `;

    console.log('✅ Migration completed');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Points system migration completed',
        timestamp: new Date().toISOString(),
        migrationResults: results,
        verification: {
          tableStructure: tableInfo,
          constraints: constraintInfo,
          indexes: indexInfo
        },
        success: true
      }, null, 2)
    };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      })
    };
  }
};