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

    console.log('🔧 RETROACTIVE POINTS: Starting fix for orders 172-176');

    // Get the problematic orders (172-176) that should have points but don't
    const problematicOrders = await sql`
      SELECT
        o.id,
        o.user_id,
        o.supabase_user_id,
        o.total,
        o.created_at,
        CASE
          WHEN o.user_id IS NOT NULL THEN 'legacy'
          WHEN o.supabase_user_id IS NOT NULL THEN 'supabase'
          ELSE 'guest'
        END as user_type
      FROM orders o
      WHERE o.id BETWEEN 172 AND 176
      AND (o.user_id IS NOT NULL OR o.supabase_user_id IS NOT NULL)
      ORDER BY o.id
    `;

    console.log('🔍 Found orders to fix:', problematicOrders.length);

    const results = [];

    for (const order of problematicOrders) {
      console.log(`🔧 Processing order ${order.id}:`, {
        userId: order.user_id,
        supabaseUserId: order.supabase_user_id,
        total: order.total,
        userType: order.user_type
      });

      const pointsToAward = Math.floor(parseFloat(order.total));

      // Check if points already exist for this order
      const existingPoints = await sql`
        SELECT id FROM points_transactions
        WHERE order_id = ${order.id}
        AND (
          (user_id = ${order.user_id} AND user_id IS NOT NULL) OR
          (supabase_user_id = ${order.supabase_user_id} AND supabase_user_id IS NOT NULL)
        )
      `;

      if (existingPoints.length > 0) {
        console.log(`⚠️ Order ${order.id} already has points transaction:`, existingPoints[0].id);
        results.push({
          orderId: order.id,
          status: 'skipped',
          reason: 'Points already exist',
          transactionId: existingPoints[0].id
        });
        continue;
      }

      try {
        // CRITICAL: The issue was that orders 172-176 were created with user_id: null
        // We need to fix them to have the correct user_id first

        if (order.supabase_user_id && !order.user_id) {
          console.log(`🔄 Order ${order.id}: Converting from Supabase to legacy user pattern`);

          // Find the legacy user for this Supabase user
          const legacyUser = await sql`
            SELECT id FROM users
            WHERE supabase_user_id = ${order.supabase_user_id}
            LIMIT 1
          `;

          if (legacyUser.length > 0) {
            const legacyUserId = legacyUser[0].id;

            // Update the order to use legacy user ID
            await sql`
              UPDATE orders
              SET user_id = ${legacyUserId}, supabase_user_id = NULL
              WHERE id = ${order.id}
            `;

            console.log(`✅ Order ${order.id}: Updated to use legacy user ID ${legacyUserId}`);

            // Update our working order object
            order.user_id = legacyUserId;
            order.supabase_user_id = null;
            order.user_type = 'legacy';
          }
        }

        // Now award points using the corrected user information
        if (order.user_id) {
          // Legacy user points
          console.log(`🎁 Order ${order.id}: Awarding ${pointsToAward} points to legacy user ${order.user_id}`);

          // Create points transaction
          const pointsTransaction = await sql`
            INSERT INTO points_transactions (user_id, order_id, type, points, description, order_amount, created_at)
            VALUES (${order.user_id}, ${order.id}, 'earned', ${pointsToAward}, ${'RETROACTIVE: Order #' + order.id}, ${order.total}, ${order.created_at})
            RETURNING id
          `;

          // Update user points
          await sql`
            INSERT INTO user_points (user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
            VALUES (${order.user_id}, ${pointsToAward}, ${pointsToAward}, 0, ${order.created_at}, ${order.created_at}, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
              points = user_points.points + ${pointsToAward},
              total_earned = user_points.total_earned + ${pointsToAward},
              last_earned_at = ${order.created_at},
              updated_at = NOW()
            RETURNING user_id, points, total_earned
          `;

          // Update legacy rewards column
          await sql`
            UPDATE users
            SET rewards = (SELECT points FROM user_points WHERE user_id = ${order.user_id}), updated_at = NOW()
            WHERE id = ${order.user_id}
          `;

          results.push({
            orderId: order.id,
            status: 'success',
            userType: 'legacy',
            userId: order.user_id,
            pointsAwarded: pointsToAward,
            transactionId: pointsTransaction[0].id
          });

          console.log(`✅ Order ${order.id}: Successfully awarded ${pointsToAward} points to legacy user ${order.user_id}`);

        } else if (order.supabase_user_id) {
          // Supabase user points
          console.log(`🎁 Order ${order.id}: Awarding ${pointsToAward} points to Supabase user ${order.supabase_user_id}`);

          // Create points transaction
          const pointsTransaction = await sql`
            INSERT INTO points_transactions (user_id, supabase_user_id, order_id, type, points, description, order_amount, created_at)
            VALUES (NULL, ${order.supabase_user_id}, ${order.id}, 'earned', ${pointsToAward}, ${'RETROACTIVE: Order #' + order.id}, ${order.total}, ${order.created_at})
            RETURNING id
          `;

          // Update user points
          await sql`
            INSERT INTO user_points (user_id, supabase_user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
            VALUES (NULL, ${order.supabase_user_id}, ${pointsToAward}, ${pointsToAward}, 0, ${order.created_at}, ${order.created_at}, NOW())
            ON CONFLICT (supabase_user_id) DO UPDATE SET
              points = COALESCE(user_points.points, 0) + ${pointsToAward},
              total_earned = COALESCE(user_points.total_earned, 0) + ${pointsToAward},
              last_earned_at = ${order.created_at},
              updated_at = NOW()
            RETURNING supabase_user_id, points, total_earned
          `;

          results.push({
            orderId: order.id,
            status: 'success',
            userType: 'supabase',
            supabaseUserId: order.supabase_user_id,
            pointsAwarded: pointsToAward,
            transactionId: pointsTransaction[0].id
          });

          console.log(`✅ Order ${order.id}: Successfully awarded ${pointsToAward} points to Supabase user ${order.supabase_user_id}`);
        }

      } catch (error) {
        console.error(`❌ Order ${order.id}: Failed to award points:`, error);
        results.push({
          orderId: order.id,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log('🎯 RETROACTIVE POINTS: Completed processing');

    // Get summary of user's points after fix
    const userPointsSummary = await sql`
      SELECT
        up.user_id,
        up.supabase_user_id,
        up.points,
        up.total_earned,
        u.email
      FROM user_points up
      LEFT JOIN users u ON (up.user_id = u.id OR up.supabase_user_id = u.supabase_user_id)
      WHERE up.user_id = 29 OR u.email = 'barecloudz@gmail.com'
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Retroactive points processing completed',
        ordersProcessed: problematicOrders.length,
        results: results,
        userPointsSummary: userPointsSummary,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('🔧 RETROACTIVE POINTS: Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Retroactive points fix failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};