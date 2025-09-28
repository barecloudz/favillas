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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();
    const targetUserId = 29; // barecloudz@gmail.com user ID

    console.log('🔧 INIT-USER-POINTS: Initializing user_points for user_id:', targetUserId);

    // Check if user_points record already exists
    const existingRecord = await sql`
      SELECT user_id, points FROM user_points WHERE user_id = ${targetUserId}
    `;

    if (existingRecord.length > 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'User points record already exists',
          currentPoints: existingRecord[0].points,
          userId: targetUserId
        })
      };
    }

    // Create user_points record
    const newRecord = await sql`
      INSERT INTO user_points (user_id, points, total_earned, total_redeemed, created_at, updated_at)
      VALUES (${targetUserId}, 0, 0, 0, NOW(), NOW())
      RETURNING user_id, points, total_earned, total_redeemed
    `;

    console.log('✅ INIT-USER-POINTS: Created user_points record:', newRecord[0]);

    // Also calculate retroactive points for existing orders
    const existingOrders = await sql`
      SELECT o.id, o.total, o.created_at
      FROM orders o
      LEFT JOIN points_transactions pt ON pt.order_id = o.id AND pt.user_id = o.user_id
      WHERE o.user_id = ${targetUserId}
        AND pt.id IS NULL
        AND o.total > 0
      ORDER BY o.created_at ASC
    `;

    let totalRetroactivePoints = 0;
    const retroactiveTransactions = [];

    for (const order of existingOrders) {
      const pointsToAward = Math.floor(parseFloat(order.total));
      if (pointsToAward > 0) {
        // Create points transaction
        const transaction = await sql`
          INSERT INTO points_transactions (user_id, order_id, type, points, description, order_amount, created_at)
          VALUES (${targetUserId}, ${order.id}, 'earned', ${pointsToAward}, ${'Retroactive points - Order #' + order.id}, ${order.total}, NOW())
          RETURNING id, points
        `;

        retroactiveTransactions.push({
          orderId: order.id,
          points: pointsToAward,
          transactionId: transaction[0].id
        });

        totalRetroactivePoints += pointsToAward;
      }
    }

    // Update user_points with retroactive points
    if (totalRetroactivePoints > 0) {
      await sql`
        UPDATE user_points
        SET
          points = points + ${totalRetroactivePoints},
          total_earned = total_earned + ${totalRetroactivePoints},
          last_earned_at = NOW(),
          updated_at = NOW()
        WHERE user_id = ${targetUserId}
      `;

      // Update legacy rewards column
      await sql`
        UPDATE users
        SET rewards = (SELECT points FROM user_points WHERE user_id = ${targetUserId}), updated_at = NOW()
        WHERE id = ${targetUserId}
      `;
    }

    const finalRecord = await sql`
      SELECT user_id, points, total_earned FROM user_points WHERE user_id = ${targetUserId}
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User points record initialized successfully',
        userId: targetUserId,
        initializedPoints: finalRecord[0].points,
        totalEarned: finalRecord[0].total_earned,
        retroactiveOrders: existingOrders.length,
        retroactivePoints: totalRetroactivePoints,
        retroactiveTransactions: retroactiveTransactions
      })
    };

  } catch (error) {
    console.error('🔧 INIT-USER-POINTS: Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to initialize user points',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};