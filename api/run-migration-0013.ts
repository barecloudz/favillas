import { Handler } from '@netlify/functions';
import { getDB, executeWithRetry } from './_shared/db';
import * as fs from 'fs';
import * as path from 'path';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🚀 Starting migration 0013: Add order_id to email_logs');

    // Read migration SQL file
    const migrationPath = path.join(process.cwd(), 'migrations', '0013_add_order_id_to_email_logs.sql');
    let migrationSQL: string;

    try {
      migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
      console.log('✅ Migration file loaded successfully');
    } catch (fileError) {
      console.error('❌ Failed to read migration file:', fileError);
      // Fallback to inline SQL if file read fails
      migrationSQL = `
        -- Add order_id column to email_logs table
        ALTER TABLE email_logs
        ADD COLUMN IF NOT EXISTS order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE;

        -- Make campaign_id nullable
        ALTER TABLE email_logs
        ALTER COLUMN campaign_id DROP NOT NULL;

        -- Create index for order_id lookups
        CREATE INDEX IF NOT EXISTS idx_email_logs_order_id ON email_logs(order_id);
      `;
      console.log('⚠️ Using inline SQL as fallback');
    }

    // Execute migration
    const result = await executeWithRetry(async (sql) => {
      console.log('📝 Executing migration SQL...');
      await sql.unsafe(migrationSQL);
      console.log('✅ Migration executed successfully');

      // Verify the changes
      const tableInfo = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'email_logs'
        ORDER BY ordinal_position
      `;

      console.log('📋 Updated email_logs table structure:');
      tableInfo.forEach((col: any) => {
        console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
      });

      return {
        success: true,
        message: 'Migration 0013 completed successfully',
        tableStructure: tableInfo
      };
    });

    console.log('🎉 Migration 0013 completed successfully!');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error: any) {
    console.error('❌ Migration 0013 failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    };
  }
};
