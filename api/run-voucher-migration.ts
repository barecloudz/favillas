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
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const sql = getDB();

    console.log('🔄 Creating user_vouchers table...');

    // Create user vouchers table
    await sql`
      CREATE TABLE IF NOT EXISTS user_vouchers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        supabase_user_id TEXT,
        reward_id INTEGER,
        voucher_code TEXT UNIQUE NOT NULL,

        -- Discount details
        discount_amount DECIMAL(10,2) NOT NULL,
        discount_type TEXT NOT NULL DEFAULT 'fixed',
        min_order_amount DECIMAL(10,2) DEFAULT 0,

        -- Voucher lifecycle
        points_used INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        expires_at TIMESTAMP NOT NULL DEFAULT NOW() + INTERVAL '30 days',

        -- Usage tracking
        applied_to_order_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        used_at TIMESTAMP,

        -- Metadata
        title TEXT,
        description TEXT
      )
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_user_vouchers_user_id ON user_vouchers(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_vouchers_supabase_user_id ON user_vouchers(supabase_user_id) WHERE supabase_user_id IS NOT NULL`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_vouchers_code ON user_vouchers(voucher_code)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_vouchers_status ON user_vouchers(status)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_vouchers_expires ON user_vouchers(expires_at)`;

    // Unique constraint
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_vouchers_code_unique ON user_vouchers(voucher_code)`;

    // Check if table was created successfully
    const tableCheck = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'user_vouchers'
    `;

    console.log('✅ user_vouchers table migration completed');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'user_vouchers table created successfully',
        tableExists: tableCheck.length > 0
      })
    };

  } catch (error) {
    console.error('❌ Migration error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};