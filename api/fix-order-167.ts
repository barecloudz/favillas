import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, AuthPayload } from './_shared/auth';

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
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
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

  // Require authentication
  const authPayload = await authenticateToken(event);
  if (!authPayload || !authPayload.isSupabase) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    const sql = getDB();
    const supabaseUserId = authPayload.supabaseUserId;

    console.log('🔧 Fixing order 167 for Supabase user:', supabaseUserId);

    // Update order 167 to associate it with the current user
    const orderUpdate = await sql`
      UPDATE orders
      SET supabase_user_id = ${supabaseUserId}, updated_at = NOW()
      WHERE id = 167 AND user_id IS NULL AND supabase_user_id IS NULL
      RETURNING id, total, supabase_user_id
    `;

    if (orderUpdate.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Order 167 not found or already associated with a user'
        })
      };
    }

    const order = orderUpdate[0];
    const pointsToAward = Math.floor(parseFloat(order.total));

    console.log('✅ Order 167 updated with supabase_user_id:', order.supabase_user_id);
    console.log('🎁 Awarding points:', pointsToAward);

    // Check if points were already awarded
    const existingTransaction = await sql`
      SELECT id FROM points_transactions
      WHERE order_id = 167 AND supabase_user_id = ${supabaseUserId}
    `;

    if (existingTransaction.length > 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Order 167 already has points awarded',
          orderId: 167,
          pointsAwarded: 0,
          alreadyAwarded: true
        })
      };
    }

    // Award points in atomic transaction
    const result = await sql.begin(async (sql) => {
      // Record points transaction
      const pointsTransaction = await sql`
        INSERT INTO points_transactions (supabase_user_id, order_id, type, points, description, order_amount, created_at)
        VALUES (${supabaseUserId}, 167, 'earned', ${pointsToAward}, 'Order #167 (retroactive)', ${order.total}, NOW())
        RETURNING id
      `;

      // Update user points
      const userPointsUpdate = await sql`
        INSERT INTO user_points (supabase_user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
        VALUES (${supabaseUserId}, ${pointsToAward}, ${pointsToAward}, 0, NOW(), NOW(), NOW())
        ON CONFLICT (supabase_user_id) DO UPDATE SET
          points = user_points.points + ${pointsToAward},
          total_earned = user_points.total_earned + ${pointsToAward},
          last_earned_at = NOW(),
          updated_at = NOW()
        RETURNING points, total_earned
      `;

      return {
        transactionId: pointsTransaction[0].id,
        newBalance: userPointsUpdate[0]
      };
    });

    console.log('🎁 Points awarded successfully:', pointsToAward);
    console.log('💰 New balance:', result.newBalance.points);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Order 167 fixed and points awarded successfully',
        orderId: 167,
        pointsAwarded: pointsToAward,
        newBalance: result.newBalance.points,
        transactionId: result.transactionId
      })
    };

  } catch (error) {
    console.error('❌ Error fixing order 167:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fix order',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};