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
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const authPayload = authenticateToken(event);
  if (!authPayload) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    const sql = getDB();

    // Get user profile information for checkout pre-population
    let userInfo = null;

    if (authPayload.isSupabase) {
      const userQuery = await sql`
        SELECT phone, address, city, state, zip_code, email, username
        FROM users
        WHERE supabase_user_id = ${authPayload.supabaseUserId}
      `;
      userInfo = userQuery[0] || null;
    } else {
      const userQuery = await sql`
        SELECT phone, address, city, state, zip_code, email, username
        FROM users
        WHERE id = ${authPayload.userId}
      `;
      userInfo = userQuery[0] || null;
    }

    // Return simplified checkout information
    const checkoutInfo = {
      phone: userInfo?.phone || '',
      address: userInfo?.address || '',
      city: userInfo?.city || '',
      state: userInfo?.state || '',
      zipCode: userInfo?.zip_code || '',
      email: userInfo?.email || authPayload.username || '',
      hasProfile: !!userInfo
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(checkoutInfo)
    };

  } catch (error: any) {
    console.error('User checkout info API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};