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
      supabaseUserId: null,
      username: decoded.username,
      role: decoded.role || 'customer',
      isSupabase: false
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

    console.log('🎫 Getting active vouchers for user:', {
      userId: authPayload.userId,
      supabaseUserId: authPayload.supabaseUserId,
      isSupabase: authPayload.isSupabase
    });

    // UNIFIED: Check if user has unified account first, regardless of auth type
    let hasUnifiedAccount = false;
    let unifiedUserId = null;

    if (authPayload.userId) {
      // Direct user ID from legacy token
      hasUnifiedAccount = true;
      unifiedUserId = authPayload.userId;
    } else if (authPayload.isSupabase && authPayload.supabaseUserId) {
      // Check if this Supabase user has a corresponding database user_id
      const dbUser = await sql`
        SELECT id FROM users WHERE supabase_user_id = ${authPayload.supabaseUserId}
      `;
      if (dbUser.length > 0) {
        hasUnifiedAccount = true;
        unifiedUserId = dbUser[0].id;
        console.log('✅ Found unified account for Supabase user:', unifiedUserId);
      }
    }

    // Get user's active vouchers from user_points_redemptions (redeemed rewards that haven't been used)
    let activeVouchers;

    if (hasUnifiedAccount && unifiedUserId) {
      // UNIFIED: Use user_id for voucher lookup (works for both legacy users and unified Supabase users)
      console.log('🔍 Using unified account lookup for vouchers with user_id:', unifiedUserId);
      activeVouchers = await sql`
        SELECT
          upr.*,
          r.name as reward_name,
          r.description as reward_description,
          r.reward_type,
          r.discount,
          r.free_item,
          r.min_order_amount
        FROM user_points_redemptions upr
        LEFT JOIN rewards r ON upr.reward_id = r.id
        WHERE upr.user_id = ${unifiedUserId}
          AND upr.is_used = false
          AND (upr.expires_at IS NULL OR upr.expires_at > NOW())
        ORDER BY upr.created_at DESC
      `;
    } else if (authPayload.isSupabase) {
      // Fallback: Supabase user without unified account
      console.log('🔍 Using Supabase-only lookup for vouchers');
      activeVouchers = await sql`
        SELECT
          upr.*,
          r.name as reward_name,
          r.description as reward_description,
          r.reward_type,
          r.discount,
          r.free_item,
          r.min_order_amount
        FROM user_points_redemptions upr
        LEFT JOIN rewards r ON upr.reward_id = r.id
        WHERE upr.supabase_user_id = ${authPayload.supabaseUserId}
          AND upr.is_used = false
          AND (upr.expires_at IS NULL OR upr.expires_at > NOW())
        ORDER BY upr.created_at DESC
      `;
    } else {
      // Legacy user - query using user_id
      console.log('🔍 Using legacy user lookup for vouchers');
      activeVouchers = await sql`
        SELECT
          upr.*,
          r.name as reward_name,
          r.description as reward_description,
          r.reward_type,
          r.discount,
          r.free_item,
          r.min_order_amount
        FROM user_points_redemptions upr
        LEFT JOIN rewards r ON upr.reward_id = r.id
        WHERE upr.user_id = ${authPayload.userId}
          AND upr.is_used = false
          AND (upr.expires_at IS NULL OR upr.expires_at > NOW())
        ORDER BY upr.created_at DESC
      `;
    }

    // Get order total from request body if provided (for calculating best voucher)
    const body = event.body ? JSON.parse(event.body) : {};
    const orderTotal = body.orderTotal || 0;

    // Calculate discount value for each voucher based on reward type
    const calculateDiscount = (voucher: any, total: number) => {
      const minOrderAmount = parseFloat(voucher.min_order_amount || 0);
      if (total < minOrderAmount) {
        return 0; // Doesn't meet minimum order requirement
      }

      // Use reward data to determine discount type and amount
      if (voucher.reward_type === 'discount' && voucher.discount) {
        return (total * voucher.discount) / 100; // Percentage discount
      } else if (voucher.reward_type === 'free_delivery') {
        return 3.99; // Delivery fee amount
      } else if (voucher.reward_type === 'free_item') {
        return 15; // Estimated value of free item
      } else {
        return 5; // Default value
      }
    };

    // Generate a unique voucher code for each redemption
    const generateVoucherCode = (voucher: any) => {
      const prefix = voucher.reward_type === 'discount' ? 'DISC' :
                   voucher.reward_type === 'free_delivery' ? 'SHIP' :
                   voucher.reward_type === 'free_item' ? 'FREE' : 'GIFT';
      const suffix = voucher.id.toString().padStart(4, '0');
      return `${prefix}${suffix}`;
    };

    // Format vouchers for frontend use
    const formattedVouchers = activeVouchers.map((voucher: any) => {
      const discountValue = calculateDiscount(voucher, orderTotal);
      const isApplicable = discountValue > 0;
      const voucherCode = generateVoucherCode(voucher);

      return {
        id: voucher.id,
        voucher_code: voucherCode,
        title: voucher.reward_name,
        description: voucher.description,
        discount_amount: voucher.reward_type === 'discount' ? voucher.discount : discountValue,
        discount_type: voucher.reward_type === 'discount' ? 'percentage' :
                      voucher.reward_type === 'free_delivery' ? 'delivery_fee' : 'fixed',
        min_order_amount: parseFloat(voucher.min_order_amount || 0),
        expires_at: voucher.expires_at,
        created_at: voucher.created_at,
        reward_id: voucher.reward_id,
        points_spent: voucher.points_spent,
        // Calculated fields for this order
        calculated_discount: discountValue,
        is_applicable: isApplicable,
        savings_text: voucher.reward_type === 'discount'
          ? `${voucher.discount}% off`
          : voucher.reward_type === 'free_delivery'
          ? 'Free delivery'
          : voucher.reward_type === 'free_item'
          ? `Free ${voucher.free_item}`
          : `$${discountValue} off`
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