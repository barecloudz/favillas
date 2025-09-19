import { Handler } from '@netlify/functions';
import postgres from 'postgres';

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

    console.log('🔧 Setting up admin_settings table...');

    // Create admin_settings table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        setting_type VARCHAR(50) DEFAULT 'string',
        description TEXT,
        updated_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    console.log('✅ admin_settings table created');

    // Insert default pickup time setting
    await sql`
      INSERT INTO admin_settings (setting_key, setting_value, setting_type, description, updated_by, created_at, updated_at)
      VALUES ('pickup_time_minutes', '25', 'integer', 'Default pickup time in minutes', 'system', NOW(), NOW())
      ON CONFLICT (setting_key) DO NOTHING
    `;

    console.log('✅ Default pickup time setting initialized');

    // Get current settings to verify
    const settings = await sql`
      SELECT * FROM admin_settings
      ORDER BY setting_key
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Admin settings table setup completed',
        settings: settings
      })
    };

  } catch (error: any) {
    console.error('❌ Admin settings setup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Setup failed',
        details: error.message
      })
    };
  }
};