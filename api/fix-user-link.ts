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

    console.log('🔧 Attempting to fix user link for:', authPayload.userId);

    // Find user with 1446 points (or highest points)
    const usersWithPoints = await sql`
      SELECT u.id, u.username, u.email, u.supabase_user_id, u.rewards,
             up.points as user_points_balance, up.total_earned
      FROM users u
      LEFT JOIN user_points up ON u.id = up.user_id
      WHERE up.points > 1000
      ORDER BY up.points DESC
      LIMIT 5
    `;

    console.log('Found users with high points:', usersWithPoints.length);

    if (usersWithPoints.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'No user found with significant points to link',
          debug: 'Expected to find user with 1446 points'
        })
      };
    }

    // Get the user with the most points (likely the 1446 points user)
    const targetUser = usersWithPoints[0];

    console.log('Target user to link:', {
      id: targetUser.id,
      currentSupabaseId: targetUser.supabase_user_id,
      points: targetUser.user_points_balance,
      email: targetUser.email
    });

    // Update the user record to link it to current Supabase user
    const updateResult = await sql`
      UPDATE users
      SET supabase_user_id = ${authPayload.userId},
          email = ${authPayload.username},
          updated_at = NOW()
      WHERE id = ${targetUser.id}
      RETURNING *
    `;

    console.log('✅ User link update successful');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User account linked successfully',
        linkedUser: {
          id: targetUser.id,
          points: targetUser.user_points_balance,
          totalEarned: targetUser.total_earned
        },
        supabaseUserId: authPayload.userId,
        debug: {
          foundUsers: usersWithPoints.length,
          targetUser: targetUser
        }
      })
    };

  } catch (error) {
    console.error('❌ Fix user link API error:', error);
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