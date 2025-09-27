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

  try {
    const sql = getDB();
    const supabaseUserId = 'fc644776-1ca0-46ad-ae6c-8f753478374b';
    const orderId = 170;
    const pointsToAward = 23;

    console.log('🧪 Testing points award for order 170');

    // Get order details
    const order = await sql`
      SELECT * FROM orders WHERE id = ${orderId}
    `;

    // Check if points already exist
    const existingPoints = await sql`
      SELECT * FROM points_transactions
      WHERE order_id = ${orderId} AND supabase_user_id = ${supabaseUserId}
    `;

    // Try to award points manually
    const result = await sql.begin(async (sql) => {
      // Create transaction
      const transaction = await sql`
        INSERT INTO points_transactions (supabase_user_id, order_id, type, points, description, order_amount, created_at)
        VALUES (${supabaseUserId}, ${orderId}, 'earned', ${pointsToAward}, 'Order #170 TEST', 23.80, NOW())
        RETURNING id
      `;

      // Update user points
      const pointsUpdate = await sql`
        UPDATE user_points
        SET points = points + ${pointsToAward},
            total_earned = total_earned + ${pointsToAward},
            last_earned_at = NOW(),
            updated_at = NOW()
        WHERE supabase_user_id = ${supabaseUserId}
        RETURNING points, total_earned
      `;

      return {
        transactionId: transaction[0]?.id,
        newBalance: pointsUpdate[0]
      };
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        order: order[0],
        existingPoints: existingPoints,
        result,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Test failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null
      })
    };
  }
};