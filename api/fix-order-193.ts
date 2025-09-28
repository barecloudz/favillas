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
    max: 1, idle_timeout: 20, connect_timeout: 10, prepare: false, keep_alive: false,
  });
  return dbConnection;
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();
    const orderId = 193;
    const userId = 29;
    const supabaseUserId = 'fc644776-1ca0-46ad-ae6c-8f753478374b';

    console.log('🔧 Fixing order 193 - awarding points for emergency bypass order');

    // Get order details for points calculation
    const order = await sql`
      SELECT id, total, created_at FROM orders WHERE id = ${orderId}
    `;

    if (order.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Order not found' })
      };
    }

    const pointsToAward = Math.floor(parseFloat(order[0].total));

    // Check if points already exist
    const existingTransaction = await sql`
      SELECT id FROM points_transactions
      WHERE order_id = ${orderId} AND (user_id = ${userId} OR supabase_user_id = ${supabaseUserId})
    `;

    if (existingTransaction.length === 0 && pointsToAward > 0) {
      // Award points
      const transaction = await sql`
        INSERT INTO points_transactions (
          user_id, supabase_user_id, order_id, type, points, description, order_amount, created_at
        ) VALUES (
          ${userId}, ${supabaseUserId}, ${orderId}, 'earned', ${pointsToAward},
          'Points for Order #' || ${orderId} || ' (Emergency Bypass)', ${order[0].total}, NOW()
        ) RETURNING *
      `;

      // Update user_points
      await sql`
        UPDATE user_points
        SET
          points = points + ${pointsToAward},
          total_earned = total_earned + ${pointsToAward},
          last_earned_at = NOW(),
          updated_at = NOW()
        WHERE (user_id = ${userId} OR supabase_user_id = ${supabaseUserId})
      `;

      // Update users rewards
      await sql`
        UPDATE users
        SET rewards = (SELECT points FROM user_points WHERE user_id = ${userId} OR supabase_user_id = ${supabaseUserId} LIMIT 1), updated_at = NOW()
        WHERE id = ${userId}
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Order 193 points awarded - Emergency bypass working!',
          orderId: orderId,
          pointsAwarded: pointsToAward,
          transactionId: transaction[0].id,
          note: 'Order had correct user_id thanks to bypass, just needed points'
        })
      };
    } else {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Order 193 already has points',
          orderId: orderId,
          pointsAwarded: 0
        })
      };
    }

  } catch (error) {
    console.error('🔧 Fix order 193 error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fix order', details: error.message })
    };
  }
};