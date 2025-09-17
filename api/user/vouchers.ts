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

    console.log('🎁 Getting vouchers for user:', authPayload.userId);

    // Get user's vouchers with reward details
    const vouchers = authPayload.isSupabaseUser
      ? await sql`
          SELECT
            uv.*,
            r.name as reward_name,
            r.description as reward_description
          FROM user_vouchers uv
          LEFT JOIN rewards r ON uv.reward_id = r.id
          WHERE uv.supabase_user_id = ${authPayload.userId}
          ORDER BY uv.created_at DESC
        `
      : await sql`
          SELECT
            uv.*,
            r.name as reward_name,
            r.description as reward_description
          FROM user_vouchers uv
          LEFT JOIN rewards r ON uv.reward_id = r.id
          WHERE uv.user_id = ${parseInt(authPayload.userId)}
          ORDER BY uv.created_at DESC
        `;

    // Categorize vouchers
    const now = new Date();
    const categorizedVouchers = {
      active: [],
      used: [],
      expired: []
    };

    vouchers.forEach((voucher: any) => {
      const expiresAt = new Date(voucher.expires_at);

      if (voucher.status === 'used') {
        categorizedVouchers.used.push(voucher);
      } else if (expiresAt < now) {
        // Mark as expired if past expiration date
        categorizedVouchers.expired.push({
          ...voucher,
          status: 'expired'
        });
      } else {
        categorizedVouchers.active.push(voucher);
      }
    });

    // Update expired vouchers in database
    if (categorizedVouchers.expired.length > 0) {
      const expiredIds = categorizedVouchers.expired.map(v => v.id);
      await sql`
        UPDATE user_vouchers
        SET status = 'expired'
        WHERE id = ANY(${expiredIds})
        AND status != 'used'
      `;
    }

    console.log(`✅ Found ${vouchers.length} vouchers for user ${authPayload.userId}`);
    console.log(`   Active: ${categorizedVouchers.active.length}`);
    console.log(`   Used: ${categorizedVouchers.used.length}`);
    console.log(`   Expired: ${categorizedVouchers.expired.length}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        vouchers: categorizedVouchers,
        summary: {
          total: vouchers.length,
          active: categorizedVouchers.active.length,
          used: categorizedVouchers.used.length,
          expired: categorizedVouchers.expired.length
        }
      })
    };

  } catch (error) {
    console.error('❌ User vouchers API error:', error);
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