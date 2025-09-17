import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';

// Database connection - serverless optimized
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

function authenticateToken(event: any): { userId: string; username: string; role: string; isSupabaseUser: boolean } | null {
  const authHeader = event.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    const cookies = event.headers.cookie;
    if (cookies) {
      const authCookie = cookies.split(';').find((c: string) => c.trim().startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }
  }

  if (!token) return null;

  try {
    // First try to decode as Supabase JWT token
    try {
      if (token && token.includes('.')) {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          // Add proper base64 padding if missing
          let payloadB64 = tokenParts[1];
          while (payloadB64.length % 4) {
            payloadB64 += '=';
          }

          const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());

          if (payload.iss && payload.iss.includes('supabase')) {
            const supabaseUserId = payload.sub;

            return {
              userId: supabaseUserId, // Use full UUID
              username: payload.email || 'supabase_user',
              role: 'customer',
              isSupabaseUser: true
            };
          }
        }
      }
    } catch (supabaseError) {
      console.log('Not a Supabase token, trying JWT verification:', supabaseError);
    }

    // Fallback to our JWT verification
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    return {
      userId: decoded.userId.toString(),
      username: decoded.username,
      role: decoded.role || 'customer',
      isSupabaseUser: false
    };
  } catch (error) {
    console.error('Token authentication failed:', error);
    return null;
  }
}

export const handler: Handler = async (event, context) => {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check authentication
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

    console.log('🔍 Debugging user for:', authPayload.userId);

    // Find all users with similar data
    const usersBySupabaseId = await sql`
      SELECT id, username, email, supabase_user_id, rewards, created_at
      FROM users
      WHERE supabase_user_id = ${authPayload.userId}
    `;

    const usersByEmail = await sql`
      SELECT id, username, email, supabase_user_id, rewards, created_at
      FROM users
      WHERE email LIKE ${authPayload.username + '%'}
    `;

    const allUsersWithPoints = await sql`
      SELECT u.id, u.username, u.email, u.supabase_user_id, u.rewards,
             up.points as user_points_balance
      FROM users u
      LEFT JOIN user_points up ON u.id = up.user_id
      WHERE up.points > 0
      ORDER BY up.points DESC
    `;

    // Get all user_points records
    const userPointsRecords = await sql`
      SELECT user_id, points, total_earned, total_redeemed, last_earned_at, created_at
      FROM user_points
      WHERE points > 0
      ORDER BY points DESC
      LIMIT 10
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        authInfo: {
          userId: authPayload.userId,
          username: authPayload.username,
          isSupabaseUser: authPayload.isSupabaseUser
        },
        usersBySupabaseId,
        usersByEmail,
        allUsersWithPoints,
        userPointsRecords,
        debug: {
          message: 'This debug API shows all user and points data to help identify the mismatch'
        }
      })
    };

  } catch (error) {
    console.error('❌ Debug user API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};