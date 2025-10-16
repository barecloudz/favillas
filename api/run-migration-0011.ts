import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, isStaff } from './_shared/auth';
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
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  console.log('🔧 RUN MIGRATION 0011 API CALLED');

  // Authenticate - admin only
  const authPayload = await authenticateToken(event);
  if (!authPayload || !isStaff(authPayload)) {
    console.log('❌ Authorization failed - admin access required');
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Admin access required' })
    };
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

    console.log('📦 Running migration 0011 - Prevent Duplicate Points Records');

    // Read migration file
    const migrationPath = join(process.cwd(), 'migrations', '0011_prevent_duplicate_points_records.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    console.log('📋 Migration SQL loaded');

    // Execute migration
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration 0011 completed successfully');

    // Check for remaining duplicates
    const duplicateCheck = await sql`
      SELECT user_id, supabase_user_id, COUNT(*) as count
      FROM user_points
      GROUP BY user_id, supabase_user_id
      HAVING COUNT(*) > 1
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Migration 0011 completed successfully!',
        details: 'All duplicate records cleaned up and unique constraints enforced',
        remainingDuplicates: duplicateCheck.length,
        duplicates: duplicateCheck
      }, null, 2)
    };

  } catch (error: any) {
    console.error('❌ Migration error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Migration failed',
        details: error.message,
        stack: error.stack
      })
    };
  }
};
