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

    console.log('🧪 MANUAL POINTS TEST: Testing manual points award to user 29');

    // Test adding 29 points to user 29 (your legacy user ID)
    const userId = 29;
    const pointsToAward = 29;
    const testOrderId = 9999; // Fake order ID for testing

    // Step 1: Check if user exists
    const userExists = await sql`SELECT id, email FROM users WHERE id = ${userId}`;
    console.log('👤 User exists check:', userExists);

    if (userExists.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          error: 'User not found',
          userId
        })
      };
    }

    // Step 2: Create points transaction
    const pointsTransaction = await sql`
      INSERT INTO points_transactions (user_id, order_id, type, points, description, order_amount, created_at)
      VALUES (${userId}, ${testOrderId}, 'earned', ${pointsToAward}, 'Manual test points', 29.00, NOW())
      RETURNING id
    `;
    console.log('✅ Points transaction created:', pointsTransaction[0]?.id);

    // Step 3: Update user points
    const userPointsUpdate = await sql`
      INSERT INTO user_points (user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
      VALUES (${userId}, ${pointsToAward}, ${pointsToAward}, 0, NOW(), NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        points = user_points.points + ${pointsToAward},
        total_earned = user_points.total_earned + ${pointsToAward},
        last_earned_at = NOW(),
        updated_at = NOW()
      RETURNING user_id, points, total_earned
    `;
    console.log('✅ User points updated:', userPointsUpdate[0]);

    // Step 4: Update legacy rewards column
    await sql`
      UPDATE users
      SET rewards = (SELECT points FROM user_points WHERE user_id = ${userId}), updated_at = NOW()
      WHERE id = ${userId}
    `;
    console.log('✅ Legacy rewards column updated');

    // Step 5: Check final points balance
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
        message: `Successfully awarded ${pointsToAward} points to user ${userId}`,
        user: userExists[0],
        transaction: pointsTransaction[0],
        pointsUpdate: userPointsUpdate[0],
        finalBalance: finalBalance[0],
        testOrderId
      })
    };

  } catch (error) {
    console.error('🧪 Manual points test error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Manual points test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};