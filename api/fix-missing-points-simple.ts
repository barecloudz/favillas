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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();

    console.log('🔧 SIMPLE MISSING POINTS FIX: Starting retroactive points award');

    const userId = 29;
    const missingPointsOrders = [
      { id: 176, total: 22.18 },
      { id: 175, total: 30.20 },
      { id: 174, total: 29.17 },
      { id: 173, total: 26.51 },
      { id: 172, total: 31.38 },
    ];

    const results = [];
    let totalPointsAwarded = 0;

    for (const order of missingPointsOrders) {
      const pointsToAward = Math.floor(order.total);

      try {
        // Check if points already awarded for this order
        const existingTransaction = await sql`
          SELECT id FROM points_transactions
          WHERE order_id = ${order.id} AND user_id = ${userId}
        `;

        if (existingTransaction.length > 0) {
          results.push({
            orderId: order.id,
            status: 'ALREADY_AWARDED',
            points: pointsToAward
          });
          continue;
        }

        // Create points transaction
        const pointsTransaction = await sql`
          INSERT INTO points_transactions (user_id, order_id, type, points, description, order_amount, created_at)
          VALUES (${userId}, ${order.id}, 'earned', ${pointsToAward}, ${'Retroactive points - Order #' + order.id}, ${order.total}, NOW())
          RETURNING id
        `;

        // Check if user_points record exists
        const existingUserPoints = await sql`
          SELECT points, total_earned FROM user_points WHERE user_id = ${userId}
        `;

        if (existingUserPoints.length > 0) {
          // Update existing record
          const newPoints = existingUserPoints[0].points + pointsToAward;
          const newTotalEarned = existingUserPoints[0].total_earned + pointsToAward;

          await sql`
            UPDATE user_points
            SET points = ${newPoints},
                total_earned = ${newTotalEarned},
                last_earned_at = NOW(),
                updated_at = NOW()
            WHERE user_id = ${userId}
          `;

          results.push({
            orderId: order.id,
            status: 'AWARDED_UPDATE',
            points: pointsToAward,
            newBalance: newPoints
          });
        } else {
          // Create new record
          await sql`
            INSERT INTO user_points (user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
            VALUES (${userId}, ${pointsToAward}, ${pointsToAward}, 0, NOW(), NOW(), NOW())
          `;

          results.push({
            orderId: order.id,
            status: 'AWARDED_NEW',
            points: pointsToAward,
            newBalance: pointsToAward
          });
        }

        // Update legacy rewards column
        await sql`
          UPDATE users
          SET rewards = (SELECT points FROM user_points WHERE user_id = ${userId}), updated_at = NOW()
          WHERE id = ${userId}
        `;

        totalPointsAwarded += pointsToAward;
        console.log(`✅ Awarded ${pointsToAward} points for order ${order.id}`);

      } catch (orderError) {
        results.push({
          orderId: order.id,
          status: 'ERROR',
          points: pointsToAward,
          error: orderError instanceof Error ? orderError.message : 'Unknown error'
        });
        console.error(`❌ Failed to award points for order ${order.id}:`, orderError);
      }
    }

    // Get final user balance
    const finalBalance = await sql`
      SELECT up.points, up.total_earned, u.rewards
      FROM user_points up
      JOIN users u ON up.user_id = u.id
      WHERE up.user_id = ${userId}
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Retroactive points fix completed`,
        totalPointsAwarded,
        ordersProcessed: results.length,
        results,
        finalBalance: finalBalance[0] || null,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('🔧 Simple missing points fix error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Simple missing points fix failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};