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

function authenticateToken(event: any): { userId: number; username: string; role: string } | null {
  // Check for JWT token in Authorization header first
  const authHeader = event.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // If no Authorization header, check for auth-token cookie
  if (!token) {
    const cookies = event.headers.cookie;
    if (cookies) {
      const authCookie = cookies.split(';').find((c: string) => c.trim().startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
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
      console.log('🔍 Supabase token payload:', payload);

      if (payload.iss && payload.iss.includes('supabase')) {
        // This is a Supabase token, extract user ID
        const supabaseUserId = payload.sub;
        console.log('✅ Supabase user ID:', supabaseUserId);

        // Return the Supabase user ID as the userId for now
        // We'll need to create a proper mapping later
        return {
          userId: parseInt(supabaseUserId.replace(/-/g, '').substring(0, 8), 16) || 1, // Convert to number
          username: payload.email || 'supabase_user',
          role: 'customer'
        };
      }
    } catch (supabaseError) {
      console.log('Not a Supabase token, trying JWT verification');
    }

    // Fallback to our JWT verification
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    return {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role || 'customer'
    };
  } catch (error) {
    console.error('Token authentication failed:', error);
    return null;
  }
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
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

    console.log('🎫 Getting active vouchers for user:', { userId: authPayload.userId });

    // Get user's active vouchers (not used and not expired)
    const activeVouchers = await sql`
      SELECT
        uv.*,
        r.name as reward_name,
        r.description as reward_description
      FROM user_vouchers uv
      LEFT JOIN rewards r ON uv.reward_id = r.id
      WHERE uv.user_id = ${authPayload.userId}
        AND uv.status = 'active'
        AND uv.expires_at > NOW()
        AND uv.used_at IS NULL
      ORDER BY uv.created_at DESC
    `;

    // Get order total from request body if provided (for calculating best voucher)
    const body = event.body ? JSON.parse(event.body) : {};
    const orderTotal = body.orderTotal || 0;

    // Calculate discount value for each voucher
    const calculateDiscount = (voucher: any, total: number) => {
      if (total < (voucher.min_order_amount || 0)) {
        return 0; // Doesn't meet minimum order requirement
      }

      if (voucher.discount_type === 'percentage') {
        return (total * voucher.discount_amount) / 100;
      } else if (voucher.discount_type === 'delivery_fee') {
        return 5; // Assume $5 delivery fee savings
      } else {
        return voucher.discount_amount; // Fixed amount
      }
    };

    // Format vouchers for frontend use
    const formattedVouchers = activeVouchers.map((voucher: any) => {
      const discountValue = calculateDiscount(voucher, orderTotal);
      const isApplicable = discountValue > 0;

      return {
        id: voucher.id,
        voucher_code: voucher.voucher_code,
        title: voucher.title || voucher.reward_name,
        description: voucher.description,
        discount_amount: parseFloat(voucher.discount_amount),
        discount_type: voucher.discount_type,
        min_order_amount: parseFloat(voucher.min_order_amount || 0),
        expires_at: voucher.expires_at,
        created_at: voucher.created_at,
        reward_id: voucher.reward_id,
        points_used: voucher.points_used,
        // Calculated fields for this order
        calculated_discount: discountValue,
        is_applicable: isApplicable,
        savings_text: voucher.discount_type === 'percentage'
          ? `${voucher.discount_amount}% off`
          : voucher.discount_type === 'delivery_fee'
          ? 'Free delivery'
          : `$${voucher.discount_amount} off`
      };
    });

    // Sort by best discount first (most savings)
    const sortedVouchers = formattedVouchers.sort((a, b) => {
      if (a.is_applicable && !b.is_applicable) return -1;
      if (!a.is_applicable && b.is_applicable) return 1;
      return b.calculated_discount - a.calculated_discount;
    });

    console.log(`✅ Found ${formattedVouchers.length} active vouchers for user ${authPayload.userId}, order total: $${orderTotal}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        vouchers: sortedVouchers,
        count: sortedVouchers.length,
        applicable_count: sortedVouchers.filter(v => v.is_applicable).length,
        best_voucher: sortedVouchers.find(v => v.is_applicable) || null,
        order_total: orderTotal
      })
    };

  } catch (error: any) {
    console.error('❌ Active vouchers API error:', error);

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