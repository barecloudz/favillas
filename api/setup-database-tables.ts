import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, isStaff } from './_shared/auth';

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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    // Require admin authentication for database setup
    const authPayload = await authenticateToken(event);
    if (!authPayload || !isStaff(authPayload)) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized - Admin access required' })
      };
    }

    const sql = getDB();
    const setupLog = [];

    // 1. Create tax_categories table if it doesn't exist
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS tax_categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          rate DECIMAL(5,2) NOT NULL DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          applies_to_delivery BOOLEAN DEFAULT false,
          applies_to_tips BOOLEAN DEFAULT false,
          applies_to_service_fees BOOLEAN DEFAULT false,
          applies_to_menu_items BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `;
      setupLog.push('✅ tax_categories table created/verified');
    } catch (error) {
      setupLog.push(`❌ tax_categories table error: ${error}`);
    }

    // 2. Add display_name column to system_settings if it doesn't exist
    try {
      await sql`
        ALTER TABLE system_settings
        ADD COLUMN IF NOT EXISTS display_name VARCHAR(255)
      `;
      setupLog.push('✅ display_name column added to system_settings');
    } catch (error) {
      setupLog.push(`❌ system_settings display_name error: ${error}`);
    }

    // 3. Update existing system_settings rows to have display_name
    try {
      await sql`
        UPDATE system_settings
        SET display_name = setting_key
        WHERE display_name IS NULL
      `;
      setupLog.push('✅ Updated existing system_settings with display_name');
    } catch (error) {
      setupLog.push(`❌ system_settings update error: ${error}`);
    }

    // 4. Create a default tax category if none exist
    try {
      const existingCategories = await sql`
        SELECT COUNT(*) as count FROM tax_categories
      `;

      if (existingCategories[0].count === '0') {
        await sql`
          INSERT INTO tax_categories (name, description, rate, is_active, applies_to_menu_items)
          VALUES ('Standard Tax', 'Default tax category for menu items', 8.75, true, true)
        `;
        setupLog.push('✅ Created default tax category (8.75%)');
      } else {
        setupLog.push('✅ Tax categories already exist, skipping default creation');
      }
    } catch (error) {
      setupLog.push(`❌ Default tax category error: ${error}`);
    }

    // 5. Ensure QR codes table exists (from previous work)
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS qr_codes (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          type VARCHAR(50) NOT NULL DEFAULT 'menu',
          url TEXT NOT NULL,
          qr_data TEXT NOT NULL,
          table_number INTEGER,
          is_active BOOLEAN DEFAULT true,
          usage_count INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          created_by_user_id INTEGER REFERENCES users(id)
        )
      `;
      setupLog.push('✅ qr_codes table created/verified');
    } catch (error) {
      setupLog.push(`❌ qr_codes table error: ${error}`);
    }

    console.log('🔧 Database setup completed:', setupLog);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Database setup completed successfully',
        log: setupLog
      })
    };

  } catch (error) {
    console.error('Database Setup API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Failed to setup database tables',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};