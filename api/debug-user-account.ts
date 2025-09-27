import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';

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

function authenticateToken(event: any): { userId: number | null; supabaseUserId: string | null; username: string; role: string; isSupabase: boolean } | null {
  // Check for JWT token in Authorization header first (Netlify normalizes headers to lowercase)
  const authHeader = event.headers.authorization || event.headers.Authorization;
  let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  console.log('🔍 DEBUG-USER: Auth header check:', {
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    authHeaderType: typeof authHeader,
    tokenLength: token?.length,
    headers: Object.keys(event.headers)
  });

  // If no Authorization header, check for auth-token cookie
  if (!token) {
    const cookies = event.headers.cookie || event.headers.Cookie;
    if (cookies) {
      const authCookie = cookies.split(';').find((c: string) => c.trim().startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
        console.log('🍪 DEBUG-USER: Found auth token in cookie');
      }
    }
  }

  if (!token) {
    return null;
  }

  try {
    // First try to decode as Supabase JWT token
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      console.log('🔍 DEBUG-USER: Supabase token payload:', payload);

      if (payload.iss && payload.iss.includes('supabase')) {
        // This is a Supabase token, extract user ID
        const supabaseUserId = payload.sub;
        console.log('✅ DEBUG-USER: Supabase user ID from token:', supabaseUserId);
        console.log('📧 DEBUG-USER: Email from token:', payload.email);

        // For Supabase users, return the UUID directly
        return {
          userId: null, // No integer user ID for Supabase users
          supabaseUserId: supabaseUserId,
          username: payload.email || 'supabase_user',
          role: 'customer',
          isSupabase: true
        };
      }
    } catch (supabaseError) {
      console.log('DEBUG-USER: Not a Supabase token, trying JWT verification');
    }

    // Fallback to our JWT verification
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    return {
      userId: decoded.userId,
      supabaseUserId: null,
      username: decoded.username,
      role: decoded.role || 'customer',
      isSupabase: false
    };
  } catch (error) {
    console.error('DEBUG-USER: Token authentication failed:', error);
    return null;
  }
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
    const authPayload = authenticateToken(event);

    console.log('🧪 DEBUG-USER: Starting comprehensive user account debug');
    console.log('🧪 DEBUG-USER: Auth result:', authPayload);

    if (!authPayload) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          error: 'No authentication found',
          authPayload: null
        })
      };
    }

    // Search for all user records related to this user
    const results: any = {
      authPayload,
      searches: {}
    };

    // Search by Supabase user ID
    if (authPayload.supabaseUserId) {
      console.log('🔍 DEBUG-USER: Searching by Supabase user ID:', authPayload.supabaseUserId);
      results.searches.bySupabaseUserId = await sql`
        SELECT * FROM users WHERE supabase_user_id = ${authPayload.supabaseUserId}
      `;
      console.log('📊 DEBUG-USER: Found by Supabase ID:', results.searches.bySupabaseUserId.length);
    }

    // Search by email
    if (authPayload.username) {
      console.log('🔍 DEBUG-USER: Searching by email:', authPayload.username);
      results.searches.byEmail = await sql`
        SELECT * FROM users WHERE email = ${authPayload.username}
      `;
      console.log('📊 DEBUG-USER: Found by email:', results.searches.byEmail.length);
    }

    // Search by username
    results.searches.byUsername = await sql`
      SELECT * FROM users WHERE username = ${authPayload.username}
    `;
    console.log('📊 DEBUG-USER: Found by username:', results.searches.byUsername.length);

    // Get recent orders for this user
    if (authPayload.supabaseUserId) {
      results.searches.ordersBySupabaseId = await sql`
        SELECT id, user_id, supabase_user_id, total, created_at, status
        FROM orders
        WHERE supabase_user_id = ${authPayload.supabaseUserId}
        ORDER BY created_at DESC
        LIMIT 5
      `;
    }

    if (authPayload.userId) {
      results.searches.ordersByUserId = await sql`
        SELECT id, user_id, supabase_user_id, total, created_at, status
        FROM orders
        WHERE user_id = ${authPayload.userId}
        ORDER BY created_at DESC
        LIMIT 5
      `;
    }

    // Check points records
    if (authPayload.supabaseUserId) {
      results.searches.pointsBySupabaseId = await sql`
        SELECT * FROM user_points WHERE supabase_user_id = ${authPayload.supabaseUserId}
      `;

      results.searches.pointsTransactionsBySupabaseId = await sql`
        SELECT * FROM points_transactions
        WHERE supabase_user_id = ${authPayload.supabaseUserId}
        ORDER BY created_at DESC
        LIMIT 10
      `;
    }

    if (authPayload.userId) {
      results.searches.pointsByUserId = await sql`
        SELECT * FROM user_points WHERE user_id = ${authPayload.userId}
      `;

      results.searches.pointsTransactionsByUserId = await sql`
        SELECT * FROM points_transactions
        WHERE user_id = ${authPayload.userId}
        ORDER BY created_at DESC
        LIMIT 10
      `;
    }

    // Check for duplicate users
    if (authPayload.username) {
      results.searches.allMatchingUsers = await sql`
        SELECT id, username, email, supabase_user_id, created_at, updated_at
        FROM users
        WHERE email = ${authPayload.username} OR username = ${authPayload.username}
        ORDER BY created_at ASC
      `;
    }

    console.log('✅ DEBUG-USER: Comprehensive user debug completed');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results, null, 2)
    };

  } catch (error) {
    console.error('🧪 DEBUG-USER: Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};