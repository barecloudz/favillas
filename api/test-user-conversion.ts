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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();

    // Test the conversion logic for barecloudz@gmail.com
    const testEmail = 'barecloudz@gmail.com';

    console.log('🧪 Testing user conversion logic for:', testEmail);

    // Look for existing legacy user record by email
    const existingLegacyUser = await sql`
      SELECT id, username, email, supabase_user_id, created_at FROM users WHERE email = ${testEmail}
    `;

    console.log('📊 Found legacy users:', existingLegacyUser.length);

    const results = {
      testEmail,
      foundUsers: existingLegacyUser,
      analysis: {
        hasLegacyUser: existingLegacyUser.length > 0,
        legacyUserId: existingLegacyUser.length > 0 ? existingLegacyUser[0].id : null,
        conversionShouldWork: existingLegacyUser.length > 0 ? 'YES - Should use legacy ID' : 'NO - Would create new user'
      }
    };

    // Check recent orders for this email
    const recentOrders = await sql`
      SELECT id, user_id, supabase_user_id, total, created_at
      FROM orders
      WHERE supabase_user_id IN (
        SELECT DISTINCT supabase_user_id FROM orders WHERE supabase_user_id IS NOT NULL
      )
      ORDER BY created_at DESC
      LIMIT 5
    `;

    results.recentOrders = recentOrders;

    // Check what the conversion logic SHOULD do
    if (existingLegacyUser.length > 0) {
      results.expectedBehavior = {
        action: 'Use existing legacy user ID',
        userId: existingLegacyUser[0].id,
        supabaseUserId: null,
        shouldGetPoints: true
      };
    } else {
      results.expectedBehavior = {
        action: 'Create new legacy user',
        userId: 'NEW_ID_TO_BE_CREATED',
        supabaseUserId: null,
        shouldGetPoints: true
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results, null, 2)
    };

  } catch (error) {
    console.error('🧪 Test conversion error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};