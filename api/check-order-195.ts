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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();
    const orderId = 195;

    console.log('🔍 Checking order 195 details and points status...');

    // Check order details
    const order = await sql`
      SELECT id, user_id, supabase_user_id, total, created_at, status
      FROM orders
      WHERE id = ${orderId}
    `;

    // Check if points transaction exists
    const pointsTransaction = await sql`
      SELECT id, user_id, supabase_user_id, points, description, created_at
      FROM points_transactions
      WHERE order_id = ${orderId}
    `;

    // Check current user points
    const userPoints = await sql`
      SELECT points, total_earned, last_earned_at
      FROM user_points
      WHERE user_id = 29 OR supabase_user_id = 'fc644776-1ca0-46ad-ae6c-8f753478374b'
    `;

    console.log('🔍 Order 195 results:', {
      orderFound: order.length > 0,
      order: order[0] || null,
      pointsTransactionFound: pointsTransaction.length > 0,
      pointsTransaction: pointsTransaction[0] || null,
      userPoints: userPoints[0] || null
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        orderId,
        order: order[0] || null,
        pointsTransaction: pointsTransaction[0] || null,
        userPoints: userPoints[0] || null,
        analysis: {
          orderExists: order.length > 0,
          hasProperUserId: order[0]?.user_id === 29,
          pointsAwarded: pointsTransaction.length > 0,
          expectedPoints: order[0] ? Math.floor(parseFloat(order[0].total)) : 0
        }
      })
    };

  } catch (error) {
    console.error('🔧 Check order 195 error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to check order', details: error.message })
    };
  }
};