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
    const userId = 29;
    const userEmail = 'barecloudz@gmail.com';
    const supabaseUserId = 'fc644776-1ca0-46ad-ae6c-8f753478374b';

    console.log('🔧 HISTORICAL FIX: Finding ALL orders without points for user 29');

    // Find ALL orders for user_id 29 that don't have points transactions
    const ordersWithoutPoints = await sql`
      SELECT o.id, o.total, o.created_at, o.status, o.payment_status
      FROM orders o
      LEFT JOIN points_transactions pt ON pt.order_id = o.id AND pt.user_id = o.user_id
      WHERE o.user_id = ${userId}
        AND pt.id IS NULL
        AND o.total > 0
      ORDER BY o.created_at ASC
    `;

    console.log(`📊 Found ${ordersWithoutPoints.length} orders without points`);

    if (ordersWithoutPoints.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No orders found without points',
          ordersFixed: 0
        })
      };
    }

    let totalPointsAwarded = 0;
    const awardedOrders = [];

    // Award points for each order
    for (const order of ordersWithoutPoints) {
      const pointsToAward = Math.floor(parseFloat(order.total));

      if (pointsToAward > 0) {
        // Create points transaction
        await sql`
          INSERT INTO points_transactions (
            user_id, supabase_user_id, order_id, type, points, description, order_amount, created_at
          ) VALUES (
            ${userId}, ${supabaseUserId}, ${order.id}, 'earned', ${pointsToAward},
            'Historical retroactive points - Order #' || ${order.id}, ${order.total}, NOW()
          )
        `;

        totalPointsAwarded += pointsToAward;
        awardedOrders.push({
          orderId: order.id,
          total: order.total,
          pointsAwarded: pointsToAward,
          createdAt: order.created_at
        });
      }
    }

    // Update user_points with total awarded points
    if (totalPointsAwarded > 0) {
      await sql`
        UPDATE user_points
        SET
          points = points + ${totalPointsAwarded},
          total_earned = total_earned + ${totalPointsAwarded},
          last_earned_at = NOW(),
          updated_at = NOW()
        WHERE (user_id = ${userId} OR supabase_user_id = ${supabaseUserId})
      `;

      // Update users rewards column
      await sql`
        UPDATE users
        SET rewards = (SELECT points FROM user_points WHERE user_id = ${userId} OR supabase_user_id = ${supabaseUserId} LIMIT 1), updated_at = NOW()
        WHERE id = ${userId}
      `;
    }

    // Get final points balance
    const finalBalance = await sql`
      SELECT points FROM user_points
      WHERE user_id = ${userId} OR supabase_user_id = ${supabaseUserId}
      LIMIT 1
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Historical fix completed: ${awardedOrders.length} orders processed, ${totalPointsAwarded} points awarded`,
        summary: {
          ordersProcessed: awardedOrders.length,
          totalPointsAwarded: totalPointsAwarded,
          finalPointsBalance: finalBalance[0]?.points || 0,
          orderDetails: awardedOrders.slice(0, 15)
        }
      })
    };

  } catch (error) {
    console.error('🔧 Historical fix error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fix historical orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};