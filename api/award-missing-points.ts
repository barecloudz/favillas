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

    console.log('🔍 Award Missing Points: Scanning for orders without points...');

    // Find all paid orders without points transactions (last 24 hours)
    const ordersWithoutPoints = await sql`
      SELECT o.id, o.user_id, o.supabase_user_id, o.total, o.status, o.payment_status, o.created_at
      FROM orders o
      LEFT JOIN points_transactions pt ON o.id = pt.order_id
      WHERE o.payment_status IN ('completed', 'succeeded', 'paid')
        AND pt.id IS NULL
        AND o.user_id IS NOT NULL
        AND o.created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY o.created_at DESC
    `;

    console.log(`📊 Found ${ordersWithoutPoints.length} orders without points`);

    if (ordersWithoutPoints.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No missing points found',
          ordersChecked: 0,
          pointsAwarded: 0
        })
      };
    }

    let totalPointsAwarded = 0;
    const fixedOrders = [];

    // Award points for each missing order
    for (const order of ordersWithoutPoints) {
      const pointsToAward = Math.floor(parseFloat(order.total));

      console.log(`🎁 Awarding ${pointsToAward} points for Order ${order.id} ($${order.total})`);

      // Create points transaction
      const pointsTransaction = await sql`
        INSERT INTO points_transactions (user_id, order_id, type, points, description, order_amount, created_at)
        VALUES (${order.user_id}, ${order.id}, 'earned', ${pointsToAward}, ${'Retroactive points for Order #' + order.id}, ${order.total}, NOW())
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
        WHERE user_id = ${order.user_id}
      `;

      totalPointsAwarded += pointsToAward;
      fixedOrders.push({
        orderId: order.id,
        pointsAwarded: pointsToAward,
        orderTotal: order.total
      });

      console.log(`✅ Awarded ${pointsToAward} points for Order ${order.id}`);
    }

    console.log(`🎉 Total points awarded: ${totalPointsAwarded} across ${fixedOrders.length} orders`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully awarded ${totalPointsAwarded} points across ${fixedOrders.length} orders`,
        ordersChecked: ordersWithoutPoints.length,
        pointsAwarded: totalPointsAwarded,
        fixedOrders: fixedOrders
      })
    };

  } catch (error) {
    console.error('❌ Award Missing Points API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to award missing points',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};