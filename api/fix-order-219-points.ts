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

    console.log('🔍 Fixing Order 219 points...');

    // Check current points for Order 219
    const pointsCheck = await sql`
      SELECT id, points, description, order_amount, created_at
      FROM points_transactions
      WHERE order_id = 219
    `;

    console.log('📋 Current points for Order 219:', pointsCheck);

    if (pointsCheck.length > 0) {
      const currentPoints = pointsCheck[0].points;
      const correctPoints = 79; // Based on $79.58 subtotal
      const additionalPoints = correctPoints - currentPoints;

      if (additionalPoints > 0) {
        console.log(`💰 Need to award additional ${additionalPoints} points (currently ${currentPoints}, should be ${correctPoints})`);

        // Award additional points
        await sql`
          INSERT INTO points_transactions (user_id, order_id, type, points, description, order_amount, created_at)
          VALUES (30, 219, 'earned', ${additionalPoints}, 'Correction: Additional points for Order #219 (fixed total calculation)', 79.58, NOW())
        `;

        // Update user points
        await sql`
          UPDATE user_points
          SET
            points = points + ${additionalPoints},
            total_earned = total_earned + ${additionalPoints},
            last_earned_at = NOW(),
            updated_at = NOW()
          WHERE user_id = 30
        `;

        console.log(`✅ Awarded additional ${additionalPoints} points for Order 219`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Successfully awarded additional ${additionalPoints} points for Order 219`,
            additionalPoints: additionalPoints,
            originalPoints: currentPoints,
            totalPoints: correctPoints
          })
        };
      } else {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Order 219 already has correct points',
            currentPoints: currentPoints
          })
        };
      }
    } else {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'No points transactions found for Order 219'
        })
      };
    }

  } catch (error) {
    console.error('❌ Fix Order 219 Points API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fix Order 219 points',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};