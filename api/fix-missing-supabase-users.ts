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

    console.log('🔍 Analyzing Supabase user situation...');

    // First, let's see what we have
    const allOrderUsers = await sql`
      SELECT DISTINCT o.supabase_user_id, COUNT(*) as order_count, SUM(o.total::numeric) as total_spent
      FROM orders o
      WHERE o.supabase_user_id IS NOT NULL
        AND o.payment_status = 'succeeded'
      GROUP BY o.supabase_user_id
    `;

    console.log(`📊 Found ${allOrderUsers.length} distinct Supabase users with successful orders`);

    // Check which ones have user records
    const usersWithRecords = await sql`
      SELECT DISTINCT u.supabase_user_id, u.id, u.email, u.role
      FROM users u
      WHERE u.supabase_user_id IS NOT NULL
    `;

    console.log(`👥 Found ${usersWithRecords.length} users with database records`);

    // Check which ones have points records
    const usersWithPoints = await sql`
      SELECT DISTINCT up.supabase_user_id, up.points, up.total_earned
      FROM user_points up
      WHERE up.supabase_user_id IS NOT NULL
    `;

    console.log(`🎁 Found ${usersWithPoints.length} users with points records`);

    // Find orders that have supabase_user_ids but no corresponding user records OR no points records
    const ordersWithMissingUsers = await sql`
      SELECT DISTINCT o.supabase_user_id, COUNT(*) as order_count, SUM(o.total::numeric) as total_spent
      FROM orders o
      LEFT JOIN users u ON u.supabase_user_id = o.supabase_user_id
      LEFT JOIN user_points up ON up.supabase_user_id = o.supabase_user_id
      WHERE o.supabase_user_id IS NOT NULL
        AND o.payment_status = 'succeeded'
        AND (u.supabase_user_id IS NULL OR up.supabase_user_id IS NULL)
      GROUP BY o.supabase_user_id
    `;

    console.log(`🔍 Found ${ordersWithMissingUsers.length} Supabase users missing user records OR points records`);

    const fixes = [];

    for (const missing of ordersWithMissingUsers) {
      try {
        // Create user record
        const newUser = await sql`
          INSERT INTO users (
            supabase_user_id, username, email, role, phone, address, city, state, zip_code,
            first_name, last_name, password, created_at, updated_at
          ) VALUES (
            ${missing.supabase_user_id},
            'recovered_user',
            'recovered_user@example.com',
            'customer',
            '', '', '', '', '',
            'Customer', 'User',
            'RECOVERED_USER',
            NOW(), NOW()
          )
          ON CONFLICT (supabase_user_id) DO NOTHING
          RETURNING *
        `;

        // Create points record
        const pointsRecord = await sql`
          INSERT INTO user_points (supabase_user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
          VALUES (${missing.supabase_user_id}, 0, 0, 0, NOW(), NOW(), NOW())
          ON CONFLICT (supabase_user_id) DO NOTHING
          RETURNING *
        `;

        // Calculate points they should have earned (1 point per dollar)
        const pointsToAward = Math.floor(parseFloat(missing.total_spent));

        // Award points for their historical orders
        if (pointsToAward > 0) {
          await sql`
            UPDATE user_points
            SET points = ${pointsToAward},
                total_earned = ${pointsToAward},
                last_earned_at = NOW(),
                updated_at = NOW()
            WHERE supabase_user_id = ${missing.supabase_user_id}
          `;

          // Create audit records for their orders
          const orders = await sql`
            SELECT id, total
            FROM orders
            WHERE supabase_user_id = ${missing.supabase_user_id}
              AND payment_status = 'succeeded'
          `;

          for (const order of orders) {
            const orderPoints = Math.floor(parseFloat(order.total));
            await sql`
              INSERT INTO points_transactions (user_id, supabase_user_id, order_id, type, points, description, order_amount, created_at)
              VALUES (NULL, ${missing.supabase_user_id}, ${order.id}, 'earned', ${orderPoints}, ${'Order #' + order.id + ' (backfilled)'}, ${order.total}, NOW())
              ON CONFLICT (order_id, supabase_user_id) DO NOTHING
            `;
          }
        }

        fixes.push({
          supabase_user_id: missing.supabase_user_id,
          order_count: missing.order_count,
          total_spent: missing.total_spent,
          points_awarded: pointsToAward,
          user_created: newUser.length > 0,
          points_record_created: pointsRecord.length > 0
        });

        console.log(`✅ Fixed user ${missing.supabase_user_id}: ${pointsToAward} points for $${missing.total_spent} spent`);

      } catch (error) {
        console.error(`❌ Failed to fix user ${missing.supabase_user_id}:`, error);
        fixes.push({
          supabase_user_id: missing.supabase_user_id,
          error: error.message
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: `Fixed ${fixes.length} users with missing records`,
        diagnostics: {
          total_order_users: allOrderUsers.length,
          users_with_records: usersWithRecords.length,
          users_with_points: usersWithPoints.length,
          users_missing_records_or_points: ordersWithMissingUsers.length
        },
        detailed_analysis: {
          all_order_users: allOrderUsers,
          users_with_records: usersWithRecords,
          users_with_points: usersWithPoints,
          missing_users: ordersWithMissingUsers
        },
        fixes: fixes,
        summary: {
          total_users_fixed: fixes.filter(f => !f.error).length,
          total_users_failed: fixes.filter(f => f.error).length,
          total_points_awarded: fixes.reduce((sum, f) => sum + (f.points_awarded || 0), 0)
        }
      })
    };

  } catch (error: any) {
    console.error('Fix missing users error:', error);
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