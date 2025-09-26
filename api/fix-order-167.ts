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

    console.log('🔧 Looking for orphaned orders for Supabase user:', supabaseUserId);

    // First, find any orphaned orders that match the user's phone number
    const userProfile = await sql`
      SELECT phone FROM users WHERE supabase_user_id = ${supabaseUserId}
    `;

    if (userProfile.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User profile not found' })
      };
    }

    const userPhone = userProfile[0].phone;
    if (!userPhone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No phone number in user profile to match orders' })
      };
    }

    console.log('📞 Looking for orphaned orders with phone:', userPhone);

    // Find orphaned orders with matching phone number
    const orphanedOrders = await sql`
      SELECT id, total, phone, created_at
      FROM orders
      WHERE user_id IS NULL
        AND supabase_user_id IS NULL
        AND phone = ${userPhone}
        AND created_at > NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
    `;

    console.log('🔍 Found orphaned orders:', orphanedOrders.length);

    if (orphanedOrders.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'No orphaned orders found matching your phone number'
        })
      };
    }

    let totalPointsAwarded = 0;
    const fixedOrders = [];

    // Fix each orphaned order
    for (const order of orphanedOrders) {
      console.log('🔧 Fixing order:', order.id);

      // Update order to associate with user
      await sql`
        UPDATE orders
        SET supabase_user_id = ${supabaseUserId}, updated_at = NOW()
        WHERE id = ${order.id}
      `;

      const pointsToAward = Math.floor(parseFloat(order.total));

      // Check if points were already awarded
      const existingTransaction = await sql`
        SELECT id FROM points_transactions
        WHERE order_id = ${order.id} AND supabase_user_id = ${supabaseUserId}
      `;

      if (existingTransaction.length === 0) {
        // Award points in atomic transaction
        await sql.begin(async (sql) => {
          // Record points transaction
          await sql`
            INSERT INTO points_transactions (supabase_user_id, order_id, type, points, description, order_amount, created_at)
            VALUES (${supabaseUserId}, ${order.id}, 'earned', ${pointsToAward}, ${'Order #' + order.id + ' (retroactive)'}, ${order.total}, NOW())
          `;

          // Update user points
          await sql`
            INSERT INTO user_points (supabase_user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
            VALUES (${supabaseUserId}, ${pointsToAward}, ${pointsToAward}, 0, NOW(), NOW(), NOW())
            ON CONFLICT (supabase_user_id) DO UPDATE SET
              points = user_points.points + ${pointsToAward},
              total_earned = user_points.total_earned + ${pointsToAward},
              last_earned_at = NOW(),
              updated_at = NOW()
          `;
        });

        totalPointsAwarded += pointsToAward;
      }

      fixedOrders.push({
        orderId: order.id,
        pointsAwarded: pointsToAward,
        orderDate: order.created_at
      });
    }

    // Get final user points balance
    const finalBalance = await sql`
      SELECT points FROM user_points WHERE supabase_user_id = ${supabaseUserId}
    `;

    console.log('🎁 Total points awarded:', totalPointsAwarded);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: `Fixed ${orphanedOrders.length} orphaned order(s) and awarded ${totalPointsAwarded} points`,
        fixedOrders,
        totalPointsAwarded,
        newBalance: finalBalance[0]?.points || 0
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