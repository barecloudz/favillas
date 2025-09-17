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
    const body = JSON.parse(event.body || '{}');
    const { voucherCode } = body;

    if (!voucherCode || typeof voucherCode !== 'string' || !voucherCode.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid voucher code',
          message: 'Voucher code is required and must be a non-empty string'
        })
      };
    }

    console.log('🎫 Validating voucher:', voucherCode, 'for user:', authPayload.userId);

    // Get voucher details for this user
    const vouchers = authPayload.isSupabaseUser
      ? await sql`
          SELECT uv.*, r.name as reward_name
          FROM user_vouchers uv
          LEFT JOIN rewards r ON uv.reward_id = r.id
          WHERE uv.voucher_code = ${voucherCode}
          AND uv.supabase_user_id = ${authPayload.userId}
          AND uv.status = 'active'
          AND uv.expires_at > NOW()
        `
      : await sql`
          SELECT uv.*, r.name as reward_name
          FROM user_vouchers uv
          LEFT JOIN rewards r ON uv.reward_id = r.id
          WHERE uv.voucher_code = ${voucherCode}
          AND uv.user_id = ${parseInt(authPayload.userId)}
          AND uv.status = 'active'
          AND uv.expires_at > NOW()
        `;

    if (vouchers.length === 0) {
      console.log('❌ Voucher not found or invalid:', voucherCode);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid voucher',
          message: 'Voucher not found, expired, or already used'
        })
      };
    }

    const voucher = vouchers[0];

    console.log('✅ Valid voucher found:', {
      code: voucher.voucher_code,
      discount: voucher.discount_amount,
      type: voucher.discount_type,
      minOrder: voucher.min_order_amount
    });

    // Return voucher details for checkout integration
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id: voucher.id,
        voucher_code: voucher.voucher_code,
        discount_amount: parseFloat(voucher.discount_amount),
        discount_type: voucher.discount_type,
        min_order_amount: parseFloat(voucher.min_order_amount || 0),
        title: voucher.title,
        description: voucher.description,
        reward_name: voucher.reward_name,
        expires_at: voucher.expires_at,
        valid: true
      })
    };

  } catch (error) {
    console.error('❌ Voucher validation API error:', error);
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