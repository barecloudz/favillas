import { Handler } from '@netlify/functions';
import postgres from 'postgres';

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

async function awardPointsToLegacyUser(sql: any, userId: number, order: any, pointsToAward: number) {
  console.log('🎯 Award Points: Processing legacy user points award');

  // Create points transaction
  const pointsTransaction = await sql`
    INSERT INTO points_transactions (user_id, order_id, type, points, description, order_amount, created_at)
    VALUES (${userId}, ${order.id}, 'earned', ${pointsToAward}, ${'Points for Order #' + order.id}, ${order.total}, NOW())
    RETURNING *
  `;

  // Update user_points record
  await sql`
    UPDATE user_points
    SET
      points = points + ${pointsToAward},
      total_earned = total_earned + ${pointsToAward},
      last_earned_at = NOW(),
      updated_at = NOW()
    WHERE user_id = ${userId}
  `;

  console.log('✅ Award Points: Legacy user points awarded successfully');
  return { success: true, pointsAwarded: pointsToAward, userType: 'legacy', transactionId: pointsTransaction[0].id };
}

async function awardPointsToSupabaseUser(sql: any, supabaseUserId: string, order: any, pointsToAward: number) {
  console.log('🎯 Award Points: Processing Supabase user points award');

  // Create points transaction
  const pointsTransaction = await sql`
    INSERT INTO points_transactions (supabase_user_id, order_id, type, points, description, order_amount, created_at)
    VALUES (${supabaseUserId}, ${order.id}, 'earned', ${pointsToAward}, ${'Points for Order #' + order.id}, ${order.total}, NOW())
    RETURNING *
  `;

  // Update or create user_points record
  await sql`
    INSERT INTO user_points (supabase_user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
    VALUES (${supabaseUserId}, ${pointsToAward}, ${pointsToAward}, 0, NOW(), NOW(), NOW())
    ON CONFLICT (supabase_user_id)
    DO UPDATE SET
      points = user_points.points + ${pointsToAward},
      total_earned = user_points.total_earned + ${pointsToAward},
      last_earned_at = NOW(),
      updated_at = NOW()
  `;

  console.log('✅ Award Points: Supabase user points awarded successfully');
  return { success: true, pointsAwarded: pointsToAward, userType: 'supabase', transactionId: pointsTransaction[0].id };
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
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
    const { orderId } = JSON.parse(event.body || '{}');

    if (!orderId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Order ID is required' })
      };
    }

    console.log('🔍 Award Points: Processing order', orderId);

    // Get the order details
    const order = await sql`
      SELECT * FROM orders WHERE id = ${orderId}
    `;

    if (order.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Order not found' })
      };
    }

    const orderData = order[0];

    // Check if points already awarded
    const existingPoints = await sql`
      SELECT id FROM points_transactions
      WHERE order_id = ${orderId}
    `;

    if (existingPoints.length > 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Points already awarded for this order',
          alreadyAwarded: true
        })
      };
    }

    // Verify order is paid
    console.log('🔍 Award Points: Checking payment status:', {
      payment_status: orderData.payment_status,
      isAccepted: ['completed', 'succeeded', 'paid'].includes(orderData.payment_status)
    });

    if (!['completed', 'succeeded', 'paid'].includes(orderData.payment_status)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Order is not paid',
          paymentStatus: orderData.payment_status,
          orderId: orderId
        })
      };
    }

    const pointsToAward = Math.floor(parseFloat(orderData.total));

    let result;

    // Award points based on order user association
    if (orderData.user_id) {
      // Legacy user
      result = await awardPointsToLegacyUser(sql, orderData.user_id, orderData, pointsToAward);
    } else if (orderData.supabase_user_id) {
      // Supabase user
      result = await awardPointsToSupabaseUser(sql, orderData.supabase_user_id, orderData, pointsToAward);
    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Order has no associated user' })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        pointsAwarded: pointsToAward,
        userType: result.userType,
        orderId: orderId,
        orderTotal: orderData.total
      })
    };

  } catch (error) {
    console.error('❌ Award Points API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to award points',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};