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
    const targetSupabaseUserId = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a';

    console.log('🔧 Creating missing user record for:', targetSupabaseUserId);

    // Create the missing user record
    const newUser = await sql`
      INSERT INTO users (
        supabase_user_id, username, email, role, phone, address, city, state, zip_code,
        first_name, last_name, password, created_at, updated_at
      ) VALUES (
        ${targetSupabaseUserId},
        'barecloudz@gmail.com',
        'barecloudz@gmail.com',
        'customer',
        '8039774285',
        '', '', '', '',
        'Blake', 'Nardoni',
        'SUPABASE_USER',
        NOW(), NOW()
      )
      ON CONFLICT (supabase_user_id) DO UPDATE SET
        email = EXCLUDED.email,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        phone = EXCLUDED.phone,
        updated_at = NOW()
      RETURNING id, supabase_user_id, email, first_name, last_name
    `;

    console.log('✅ User record created/updated:', newUser[0]);

    // Check current points
    const pointsRecord = await sql`
      SELECT points, total_earned FROM user_points WHERE supabase_user_id = ${targetSupabaseUserId}
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User record created successfully',
        user: newUser[0],
        points: pointsRecord[0] || { points: 0, total_earned: 0 },
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Error creating user record:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create user record',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};