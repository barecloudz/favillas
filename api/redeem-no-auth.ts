import { Handler } from '@netlify/functions';
import postgres from 'postgres';

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

// Generate unique voucher code
function generateVoucherCode(discountAmount: number, discountType: string): string {
  const prefix = discountType === 'percentage' ? 'PCT' :
                 discountType === 'delivery_fee' ? 'SHIP' : 'SAVE';
  const amount = Math.floor(discountAmount);
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${amount}-${random}`;
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

  try {
    const sql = getDB();
    const body = JSON.parse(event.body || '{}');
    const { rewardId, supabaseUserId } = body;

    // Use hardcoded Supabase User ID if not provided
    const userId = supabaseUserId || '1422df18-924e-47ae-af1b-6d1f2b4b659b';

    console.log('🎁 No-auth redemption for user:', userId, 'reward:', rewardId);

    // Extract reward ID from body (URL path not used for this endpoint)
    const finalRewardId = parseInt(rewardId);

    if (!finalRewardId || isNaN(finalRewardId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid reward ID',
          received: rewardId,
          parsed: finalRewardId,
          debug: { path: event.path, body: body }
        })
      };
    }

    // Get reward details
    const rewards = await sql`SELECT * FROM rewards WHERE id = ${finalRewardId} AND is_active = true`;
    if (rewards.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Reward not found or inactive' })
      };
    }

    const reward = rewards[0];

    // Get user by Supabase ID
    const userQuery = await sql`SELECT * FROM users WHERE supabase_user_id = ${userId}`;
    if (userQuery.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found. Account not linked properly.' })
      };
    }

    const user = userQuery[0];

    // Get current points from user_points table
    const pointsQuery = await sql`SELECT points FROM user_points WHERE user_id = ${user.id}`;
    const currentPoints = pointsQuery.length > 0 ? pointsQuery[0].points || 0 : 0;

    console.log('💰 Points check:', {
      userId: user.id,
      currentPoints,
      requiredPoints: reward.points_required
    });

    if (currentPoints < reward.points_required) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Insufficient points. You have ${currentPoints}, need ${reward.points_required}`,
          currentPoints,
          requiredPoints: reward.points_required
        })
      };
    }

    // Handle both old and new reward schemas
    const discountAmount = parseFloat(reward.discount_amount || reward.discount || 5);
    const discountType = reward.discount_type || (reward.reward_type === 'discount' ? 'fixed' : 'fixed');
    const minOrderAmount = parseFloat(reward.min_order_amount || 0);

    // Generate voucher code
    const voucherCode = generateVoucherCode(discountAmount, discountType);

    // Calculate expiration date
    const validityDays = reward.voucher_validity_days || 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + validityDays);

    // Transaction: Deduct points and create voucher
    const result = await sql.begin(async (transaction: any) => {
      const newPoints = currentPoints - reward.points_required;

      // Update user_points table
      await transaction`
        UPDATE user_points
        SET points = ${newPoints},
            total_redeemed = total_redeemed + ${reward.points_required},
            updated_at = NOW()
        WHERE user_id = ${user.id}
      `;

      // Create voucher
      const voucher = await transaction`
        INSERT INTO user_vouchers (
          user_id, supabase_user_id, reward_id, voucher_code,
          discount_amount, discount_type, min_order_amount,
          points_used, status, expires_at, title, description
        ) VALUES (
          ${user.id}, ${userId}, ${finalRewardId}, ${voucherCode},
          ${discountAmount}, ${discountType}, ${minOrderAmount},
          ${reward.points_required}, 'active', ${expiresAt.toISOString()},
          ${reward.name}, 'Use this voucher code at checkout for your discount'
        )
        RETURNING *
      `;

      return { voucher: voucher[0], newPoints };
    });

    console.log('✅ Voucher created successfully:', result.voucher.voucher_code);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Voucher created! Code: ${result.voucher.voucher_code}`,
        voucher: {
          ...result.voucher,
          userPointsRemaining: result.newPoints
        },
        pointsRemaining: result.newPoints
      })
    };

  } catch (error) {
    console.error('❌ No-auth redeem error:', error);
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