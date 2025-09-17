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

function authenticateToken(event: any): { userId: number; supabaseUserId: string | null; username: string; role: string; isSupabaseUser: boolean } | null {
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
            // Convert Supabase UUID to numeric user ID using same logic as other APIs
            const numericUserId = parseInt(supabaseUserId.replace(/-/g, '').substring(0, 8), 16);

            return {
              userId: numericUserId,
              supabaseUserId: supabaseUserId,
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
      userId: decoded.userId,
      supabaseUserId: null,
      username: decoded.username,
      role: decoded.role || 'customer',
      isSupabaseUser: false
    };
  } catch (error) {
    console.error('Token authentication failed:', error);
    return null;
  }
}

// Generate unique voucher code
function generateVoucherCode(discountAmount: number, discountType: string): string {
  const prefix = discountType === 'percentage' ? 'PCT' :
                 discountType === 'delivery_fee' ? 'SHIP' : 'SAVE';
  const amount = Math.floor(discountAmount);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${amount}-${random}`;
}

// Main voucher creation function
async function createUserVoucher(
  sql: any,
  userId: number,
  supabaseUserId: string | null,
  isSupabaseUser: boolean,
  rewardId: number,
  reward: any
): Promise<{ success: boolean; voucher?: any; error?: string }> {
  try {
    console.log('🎁 Creating voucher for user:', { userId, supabaseUserId, rewardId });

    // Look up user by numeric ID (same conversion logic as other APIs)
    const userQuery = await sql`SELECT * FROM users WHERE id = ${userId}`;

    if (userQuery.length === 0) {
      return {
        success: false,
        error: `User not found. Account not linked properly. (User ID: ${userId})`
      };
    }

    const user = userQuery[0];

    // Get current points from user_points table (the proper points system)
    const pointsQuery = await sql`
      SELECT points FROM user_points
      WHERE user_id = ${user.id}
    `;

    const currentPoints = pointsQuery.length > 0 ? pointsQuery[0].points || 0 : (user.rewards || 0);

    console.log('💰 User points check:', {
      userId: user.id,
      fromUserPoints: pointsQuery.length > 0 ? pointsQuery[0].points : 'not found',
      fromUserRewards: user.rewards,
      finalPoints: currentPoints,
      requiredPoints: reward.points_required
    });

    if (currentPoints < reward.points_required) {
      return {
        success: false,
        error: `Insufficient points. You have ${currentPoints}, need ${reward.points_required}`
      };
    }

    // Check if user has reached max uses for this reward
    const existingVouchers = await sql`SELECT COUNT(*) as count FROM user_vouchers WHERE user_id = ${userId} AND reward_id = ${rewardId}`;

    const currentUses = parseInt(existingVouchers[0].count);
    const maxUses = reward.max_uses_per_user || 1;

    if (currentUses >= maxUses) {
      return {
        success: false,
        error: `You've already redeemed this reward ${currentUses}/${maxUses} times`
      };
    }

    // Handle both old and new reward schemas
    const discountAmount = parseFloat(reward.discount_amount || reward.discount || 5);
    const discountType = reward.discount_type || (reward.reward_type === 'discount' && reward.discount ? 'fixed' : 'fixed');
    const minOrderAmount = parseFloat(reward.min_order_amount || 0);

    // Generate voucher code
    const voucherCode = generateVoucherCode(discountAmount, discountType);

    // Calculate expiration date
    const validityDays = reward.voucher_validity_days || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    // Transaction: Deduct points and create voucher
    const result = await sql.begin(async (transaction: any) => {
      // Deduct points from user (use proper user_points table)
      const newPoints = currentPoints - reward.points_required;

      // Update user_points table (the proper points system)
      await transaction`
        UPDATE user_points
        SET points = ${newPoints},
            total_redeemed = total_redeemed + ${reward.points_required},
            updated_at = NOW()
        WHERE user_id = ${user.id}
      `;

      // Also update legacy users.rewards field for backward compatibility
      await transaction`
        UPDATE users
        SET rewards = ${newPoints}, updated_at = NOW()
        WHERE id = ${userId}
      `;

      // Create voucher
      const voucherData = {
        user_id: userId,
        supabase_user_id: supabaseUserId,
        reward_id: rewardId,
        voucher_code: voucherCode,
        discount_amount: discountAmount,
        discount_type: discountType,
        min_order_amount: minOrderAmount,
        points_used: reward.points_required,
        status: 'active',
        expires_at: expiresAt.toISOString(),
        title: reward.name,
        description: reward.usage_instructions || `Save ${discountType === 'percentage' ? discountAmount + '%' : '$' + discountAmount} on your order`
      };

      const voucher = await transaction`
        INSERT INTO user_vouchers (
          user_id, supabase_user_id, reward_id, voucher_code,
          discount_amount, discount_type, min_order_amount,
          points_used, status, expires_at, title, description
        ) VALUES (
          ${voucherData.user_id}, ${voucherData.supabase_user_id}, ${voucherData.reward_id}, ${voucherData.voucher_code},
          ${voucherData.discount_amount}, ${voucherData.discount_type}, ${voucherData.min_order_amount},
          ${voucherData.points_used}, ${voucherData.status}, ${voucherData.expires_at}, ${voucherData.title}, ${voucherData.description}
        )
        RETURNING *
      `;

      return { voucher: voucher[0], newPoints };
    });

    console.log('✅ Voucher created successfully:', result.voucher.voucher_code);

    return {
      success: true,
      voucher: {
        ...result.voucher,
        userPointsRemaining: result.newPoints
      }
    };

  } catch (error) {
    console.error('❌ Voucher creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
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

    // Extract reward ID from URL path: /api/rewards/123/redeem
    const pathParts = event.path.split('/');
    const rewardIdFromPath = pathParts[pathParts.length - 2]; // Get the ID before 'redeem'

    // Also check request body as fallback
    const body = JSON.parse(event.body || '{}');
    const rewardIdFromBody = body.rewardId;

    // Use path parameter first, then fallback to body
    const rewardId = rewardIdFromPath || rewardIdFromBody;

    console.log('🎯 Reward redemption request:', {
      path: event.path,
      pathParts,
      rewardIdFromPath,
      rewardIdFromBody,
      finalRewardId: rewardId
    });

    // Validate input - handle both number and string inputs
    const parsedRewardId = parseInt(rewardId);
    if (!rewardId || isNaN(parsedRewardId) || parsedRewardId <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid reward ID. Must be a valid positive integer.',
          received: rewardId,
          type: typeof rewardId,
          pathParts: pathParts,
          debug: {
            path: event.path,
            rewardIdFromPath,
            rewardIdFromBody
          }
        })
      };
    }

    // Get reward details
    const rewards = await sql`SELECT * FROM rewards WHERE id = ${parsedRewardId} AND is_active = true`;
    if (rewards.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Reward not found or inactive' })
      };
    }

    const reward = rewards[0];

    // Create voucher
    const result = await createUserVoucher(
      sql,
      authPayload.userId,
      authPayload.supabaseUserId,
      authPayload.isSupabaseUser,
      parsedRewardId,
      reward
    );

    if (!result.success) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: result.error,
          success: false
        })
      };
    }

    console.log('✅ Voucher redemption successful');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Voucher created! Code: ${result.voucher.voucher_code}`,
        voucher: result.voucher,
        pointsRemaining: result.voucher.userPointsRemaining
      })
    };

  } catch (error) {
    console.error('❌ Redeem voucher API error:', error);
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