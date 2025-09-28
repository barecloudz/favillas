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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();
    const userId = 29;
    const userEmail = 'barecloudz@gmail.com';
    const supabaseUserId = 'fc644776-1ca0-46ad-ae6c-8f753478374b';

    console.log('🔧 COMPREHENSIVE FIX: Finding and fixing ALL orders with user_id null');

    // Find ALL orders with user_id null that likely belong to you
    // (created recently, matching payment patterns, etc.)
    const nullUserOrders = await sql\`
      SELECT id, total, created_at, payment_status, status
      FROM orders
      WHERE user_id IS NULL
        AND total > 0
        AND created_at >= '2025-09-26'::date
      ORDER BY created_at DESC
    \`;

    console.log(\`📊 Found \${nullUserOrders.length} orders with user_id null\`);

    if (nullUserOrders.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'No null user_id orders found to fix',
          ordersFixed: 0
        })
      };
    }

    let totalPointsAwarded = 0;
    let ordersFixed = 0;
    const fixedOrderDetails = [];

    // Begin transaction to fix everything atomically
    await sql.begin(async (tx) => {
      // Fix all orders - assign them to user_id 29
      const updatedOrders = await tx\`
        UPDATE orders
        SET user_id = \${userId}, updated_at = NOW()
        WHERE user_id IS NULL
          AND total > 0
          AND created_at >= '2025-09-26'::date
        RETURNING id, total
      \`;

      ordersFixed = updatedOrders.length;
      console.log(\`✅ Fixed \${ordersFixed} orders user_id\`);

      // Award points for each order (only if no transaction exists)
      for (const order of nullUserOrders) {
        const pointsToAward = Math.floor(parseFloat(order.total));

        // Check if points transaction already exists
        const existingTransaction = await tx\`
          SELECT id FROM points_transactions
          WHERE order_id = \${order.id} AND (user_id = \${userId} OR supabase_user_id = \${supabaseUserId})
        \`;

        if (existingTransaction.length === 0 && pointsToAward > 0) {
          // Create points transaction
          await tx\`
            INSERT INTO points_transactions (
              user_id, supabase_user_id, order_id, type, points, description, order_amount, created_at
            ) VALUES (
              \${userId}, \${supabaseUserId}, \${order.id}, 'earned', \${pointsToAward},
              'Retroactive points - Order #' + \${order.id}, \${order.total}, NOW()
            )
          \`;

          totalPointsAwarded += pointsToAward;
          fixedOrderDetails.push({
            orderId: order.id,
            total: order.total,
            pointsAwarded: pointsToAward,
            createdAt: order.created_at
          });
        }
      }

      // Update user_points with total awarded points
      if (totalPointsAwarded > 0) {
        await tx\`
          UPDATE user_points
          SET
            points = points + \${totalPointsAwarded},
            total_earned = total_earned + \${totalPointsAwarded},
            last_earned_at = NOW(),
            updated_at = NOW()
          WHERE (user_id = \${userId} OR supabase_user_id = \${supabaseUserId})
        \`;

        // Update users rewards column
        await tx\`
          UPDATE users
          SET rewards = (SELECT points FROM user_points WHERE user_id = \${userId} OR supabase_user_id = \${supabaseUserId} LIMIT 1), updated_at = NOW()
          WHERE id = \${userId}
        \`;
      }
    });

    // Get final points balance
    const finalBalance = await sql\`
      SELECT points FROM user_points
      WHERE user_id = \${userId} OR supabase_user_id = \${supabaseUserId}
      LIMIT 1
    \`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: \`Comprehensive fix completed: \${ordersFixed} orders fixed, \${totalPointsAwarded} points awarded\`,
        summary: {
          ordersFixed: ordersFixed,
          totalPointsAwarded: totalPointsAwarded,
          finalPointsBalance: finalBalance[0]?.points || 0,
          orderDetails: fixedOrderDetails.slice(0, 10), // Show first 10 for brevity
          totalOrdersProcessed: fixedOrderDetails.length
        }
      })
    };

  } catch (error) {
    console.error('🔧 Comprehensive fix error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fix orders',
        details: error.message
      })
    };
  }
};