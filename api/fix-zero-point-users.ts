import { Handler } from '@netlify/functions';
import postgres from 'postgres';

// Database connection
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
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();

    console.log('🔍 Looking for users with 0 points but successful orders...');

    // Find users who have points records with 0 total_earned but have successful orders
    const usersWithZeroPoints = await sql`
      SELECT
        up.supabase_user_id,
        up.points,
        up.total_earned,
        COUNT(o.id) as order_count,
        SUM(o.total::numeric) as total_spent,
        u.email,
        u.role
      FROM user_points up
      LEFT JOIN orders o ON o.supabase_user_id = up.supabase_user_id
        AND o.payment_status = 'succeeded'
      LEFT JOIN users u ON u.supabase_user_id = up.supabase_user_id
      WHERE up.supabase_user_id IS NOT NULL
        AND up.total_earned = 0
        AND o.id IS NOT NULL
      GROUP BY up.supabase_user_id, up.points, up.total_earned, u.email, u.role
      HAVING COUNT(o.id) > 0
    `;

    console.log(`📊 Found ${usersWithZeroPoints.length} users with 0 points but successful orders`);

    const fixes = [];

    for (const user of usersWithZeroPoints) {
      try {
        // Calculate points they should have earned (1 point per dollar)
        const pointsToAward = Math.floor(parseFloat(user.total_spent));

        console.log(`🎁 Awarding ${pointsToAward} points to user ${user.supabase_user_id} (${user.email}) for $${user.total_spent} spent`);

        // Update points record
        const updatedPoints = await sql`
          UPDATE user_points
          SET points = points + ${pointsToAward},
              total_earned = total_earned + ${pointsToAward},
              last_earned_at = NOW(),
              updated_at = NOW()
          WHERE supabase_user_id = ${user.supabase_user_id}
          RETURNING *
        `;

        // Get all orders for this user to create audit trail
        const userOrders = await sql`
          SELECT id, total, created_at
          FROM orders
          WHERE supabase_user_id = ${user.supabase_user_id}
            AND payment_status = 'succeeded'
          ORDER BY created_at ASC
        `;

        // Create audit trail entries for each order
        let auditEntriesCreated = 0;
        for (const order of userOrders) {
          const orderPoints = Math.floor(parseFloat(order.total));
          try {
            await sql`
              INSERT INTO points_transactions (
                user_id, supabase_user_id, order_id, type, points,
                description, order_amount, created_at
              ) VALUES (
                NULL, ${user.supabase_user_id}, ${order.id}, 'earned', ${orderPoints},
                ${'Order #' + order.id + ' (retroactive)'}, ${order.total}, ${order.created_at}
              )
              ON CONFLICT (order_id, supabase_user_id) DO NOTHING
            `;
            auditEntriesCreated++;
          } catch (auditError) {
            console.warn(`⚠️ Failed to create audit entry for order ${order.id}:`, auditError);
          }
        }

        fixes.push({
          supabase_user_id: user.supabase_user_id,
          email: user.email,
          role: user.role,
          order_count: user.order_count,
          total_spent: user.total_spent,
          points_awarded: pointsToAward,
          audit_entries_created: auditEntriesCreated,
          success: true,
          updated_record: updatedPoints[0]
        });

        console.log(`✅ Successfully awarded ${pointsToAward} points to ${user.email}`);

      } catch (error) {
        console.error(`❌ Failed to fix user ${user.supabase_user_id}:`, error);
        fixes.push({
          supabase_user_id: user.supabase_user_id,
          email: user.email,
          error: error.message,
          success: false
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: `Processed ${fixes.length} users with zero points`,
        users_found: usersWithZeroPoints,
        fixes: fixes,
        summary: {
          total_users_processed: fixes.length,
          total_users_fixed: fixes.filter(f => f.success).length,
          total_users_failed: fixes.filter(f => !f.success).length,
          total_points_awarded: fixes.reduce((sum, f) => sum + (f.points_awarded || 0), 0)
        }
      })
    };

  } catch (error: any) {
    console.error('Fix zero points error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};