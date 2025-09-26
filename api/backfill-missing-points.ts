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
    const supabaseUserId = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a';

    console.log('🔄 Starting points backfill for user:', supabaseUserId);

    // First, let's get all orders for this user that don't have points transactions
    const ordersWithoutPoints = await sql`
      SELECT o.id, o.total, o.created_at, o.payment_status
      FROM orders o
      WHERE o.supabase_user_id = ${supabaseUserId}
      AND o.payment_status IN ('completed', 'succeeded')
      AND NOT EXISTS (
        SELECT 1 FROM points_transactions pt
        WHERE pt.order_id = o.id
        AND pt.supabase_user_id = ${supabaseUserId}
      )
      ORDER BY o.created_at ASC
    `;

    console.log('📊 Found', ordersWithoutPoints.length, 'orders without points');

    let totalPointsToAward = 0;
    let successfulBackfills = 0;
    let backfillResults = [];

    // Process each order in a transaction
    for (const order of ordersWithoutPoints) {
      try {
        const pointsToAward = Math.floor(parseFloat(order.total));
        totalPointsToAward += pointsToAward;

        await sql.begin(async (sql) => {
          console.log(`💰 Processing order ${order.id} - awarding ${pointsToAward} points`);

          // Ensure user exists in users table
          const userExists = await sql`
            SELECT id FROM users WHERE supabase_user_id = ${supabaseUserId}
          `;

          if (userExists.length === 0) {
            console.log('Creating user record...');
            await sql`
              INSERT INTO users (
                supabase_user_id, username, email, role, phone, address, city, state, zip_code,
                first_name, last_name, password, created_at, updated_at
              ) VALUES (
                ${supabaseUserId},
                'customer_user',
                'customer@example.com',
                'customer',
                '', '', '', '', '',
                'Customer', 'User',
                'SUPABASE_USER',
                NOW(), NOW()
              )
              ON CONFLICT (supabase_user_id) DO NOTHING
            `;
          }

          // Create points transaction
          const pointsTransaction = await sql`
            INSERT INTO points_transactions (
              user_id, supabase_user_id, order_id, type, points, description, order_amount, created_at
            ) VALUES (
              NULL, ${supabaseUserId}, ${order.id}, 'earned', ${pointsToAward},
              ${'BACKFILL - Order #' + order.id}, ${order.total}, ${order.created_at}
            )
            RETURNING id
          `;

          // Update user points with UPSERT
          const userPointsUpdate = await sql`
            INSERT INTO user_points (
              user_id, supabase_user_id, points, total_earned, total_redeemed,
              last_earned_at, created_at, updated_at
            ) VALUES (
              NULL, ${supabaseUserId}, ${pointsToAward}, ${pointsToAward}, 0,
              ${order.created_at}, ${order.created_at}, NOW()
            )
            ON CONFLICT (supabase_user_id) DO UPDATE SET
              points = COALESCE(user_points.points, 0) + ${pointsToAward},
              total_earned = COALESCE(user_points.total_earned, 0) + ${pointsToAward},
              last_earned_at = GREATEST(user_points.last_earned_at, ${order.created_at}),
              updated_at = NOW()
            RETURNING supabase_user_id, points, total_earned
          `;

          successfulBackfills++;
          backfillResults.push({
            orderId: order.id,
            pointsAwarded: pointsToAward,
            orderTotal: order.total,
            orderDate: order.created_at,
            transactionId: pointsTransaction[0].id,
            newBalance: userPointsUpdate[0]?.points || 0
          });

          console.log(`✅ Successfully backfilled order ${order.id} with ${pointsToAward} points`);
        });

      } catch (orderError) {
        console.error(`❌ Failed to backfill order ${order.id}:`, orderError);
        backfillResults.push({
          orderId: order.id,
          error: orderError.message,
          pointsAwarded: 0
        });
      }
    }

    // Get final user points status
    const finalUserPoints = await sql`
      SELECT * FROM user_points WHERE supabase_user_id = ${supabaseUserId}
    `;

    // Get summary of all transactions
    const allTransactions = await sql`
      SELECT COUNT(*) as count, SUM(points) as total_points
      FROM points_transactions
      WHERE supabase_user_id = ${supabaseUserId}
      AND type = 'earned'
    `;

    const result = {
      timestamp: new Date().toISOString(),
      supabaseUserId,
      backfillSummary: {
        ordersProcessed: ordersWithoutPoints.length,
        successfulBackfills,
        totalPointsAwarded: totalPointsToAward,
        failedBackfills: ordersWithoutPoints.length - successfulBackfills
      },
      finalUserStatus: finalUserPoints[0] || null,
      allTransactionsSummary: allTransactions[0] || null,
      backfillDetails: backfillResults,
      success: true
    };

    console.log('🎉 Backfill completed:', result.backfillSummary);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result, null, 2)
    };

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Backfill failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      })
    };
  }
};