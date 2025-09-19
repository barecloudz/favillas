import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken } from './_shared/auth';

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
    const authPayload = authenticateToken(event);

    console.log('🔍 Debug Profile - Auth payload:', {
      hasAuth: !!authPayload,
      userId: authPayload?.userId,
      supabaseUserId: authPayload?.supabaseUserId,
      username: authPayload?.username,
      isSupabase: authPayload?.isSupabase
    });

    if (!authPayload) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'No authentication',
          debug: 'Token not found or invalid'
        })
      };
    }

    const sql = getDB();

    // Check if user exists in database
    let userRecord = null;
    if (authPayload.isSupabase) {
      const supabaseUsers = await sql`
        SELECT * FROM users WHERE supabase_user_id = ${authPayload.supabaseUserId}
      `;
      userRecord = supabaseUsers[0] || null;
    } else {
      const legacyUsers = await sql`
        SELECT * FROM users WHERE id = ${authPayload.userId}
      `;
      userRecord = legacyUsers[0] || null;
    }

    // If POST, try to save test data
    if (event.httpMethod === 'POST') {
      const testData = {
        phone: '(555) 123-TEST',
        address: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        zip_code: '12345'
      };

      console.log('🧪 Debug Profile - Testing save with data:', testData);

      if (authPayload.isSupabase) {
        // Test Supabase user save
        const result = await sql`
          INSERT INTO users (
            supabase_user_id, username, email, role, phone, address, city, state, zip_code,
            first_name, last_name, password, created_at, updated_at
          ) VALUES (
            ${authPayload.supabaseUserId},
            ${authPayload.username || 'test_user'},
            ${authPayload.username || 'test@example.com'},
            'customer',
            ${testData.phone},
            ${testData.address},
            ${testData.city},
            ${testData.state},
            ${testData.zip_code},
            'Test',
            'User',
            'GOOGLE_USER',
            NOW(),
            NOW()
          )
          ON CONFLICT (supabase_user_id) DO UPDATE SET
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            city = EXCLUDED.city,
            state = EXCLUDED.state,
            zip_code = EXCLUDED.zip_code,
            updated_at = NOW()
          RETURNING *
        `;

        console.log('🧪 Debug Profile - Supabase save result:', result[0]);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Test save completed',
            authPayload,
            beforeSave: userRecord,
            afterSave: result[0],
            testData
          })
        };
      }
    }

    // Return debug information
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Profile debug information',
        authPayload,
        userRecord,
        userExists: !!userRecord,
        instructions: 'Send POST request to test saving'
      })
    };

  } catch (error: any) {
    console.error('❌ Debug profile error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Debug failed',
        details: error.message,
        stack: error.stack
      })
    };
  }
};