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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();

    // User details
    const userEmail = 'blake@martindale.co';
    const userUuid = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a';
    const newUserId = 13402295; // New safe user ID

    console.log(`🔍 Searching for orders for user: ${userEmail}`);

    // Search for orders by multiple strategies since there's no email column
    let ordersToMigrate = [];

    // Strategy 1: Search by supabase_user_id
    try {
      const ordersBySupabaseId = await sql`
        SELECT * FROM orders
        WHERE supabase_user_id = ${userUuid}
        ORDER BY created_at DESC
      `;
      ordersToMigrate = ordersToMigrate.concat(ordersBySupabaseId);
      console.log(`📦 Found ${ordersBySupabaseId.length} orders by Supabase UUID`);
    } catch (e) {
      console.log('Supabase UUID search failed:', e.message);
    }

    // Strategy 2: Check recent orders that might be yours (last 30 days)
    try {
      const recentOrders = await sql`
        SELECT * FROM orders
        WHERE created_at > NOW() - INTERVAL '30 days'
        ORDER BY created_at DESC
      `;
      console.log(`📦 Found ${recentOrders.length} recent orders to analyze`);

      // Add any recent orders that don't have a user_id set (might be guest orders)
      const guestOrders = recentOrders.filter(order => !order.user_id || order.user_id === null);
      ordersToMigrate = ordersToMigrate.concat(guestOrders);
      console.log(`📦 Found ${guestOrders.length} recent guest orders`);
    } catch (e) {
      console.log('Recent orders search failed:', e.message);
    }

    // Remove duplicates
    const uniqueOrders = ordersToMigrate.filter((order, index, arr) =>
      arr.findIndex(o => o.id === order.id) === index
    );

    console.log(`📦 Found ${uniqueOrders.length} orders total after deduplication`);

    if (uniqueOrders.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'No orders found to migrate',
          ordersFound: 0,
          ordersMigrated: 0
        })
      };
    }

    // Begin transaction to migrate orders
    const result = await sql.begin(async (transaction: any) => {
      let ordersMigrated = 0;
      const migratedOrders = [];

      for (const order of uniqueOrders) {
        console.log(`🔄 Migrating order ${order.id} from user_id ${order.user_id} to ${newUserId}`);

        // Update order to use new user ID
        await transaction`
          UPDATE orders
          SET user_id = ${newUserId}, updated_at = NOW()
          WHERE id = ${order.id}
        `;

        ordersMigrated++;
        migratedOrders.push({
          orderId: order.id,
          originalUserId: order.user_id,
          newUserId: newUserId,
          orderTotal: order.final_total,
          orderDate: order.created_at
        });

        console.log(`✅ Migrated order ${order.id}`);
      }

      // Calculate points that should have been earned
      const totalOrderValue = uniqueOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
      const pointsEarned = Math.floor(totalOrderValue); // 1 point per dollar

      console.log(`💰 Total order value: $${totalOrderValue}, Points earned: ${pointsEarned}`);

      // Update user points to reflect order history
      const currentPoints = await transaction`SELECT points FROM user_points WHERE user_id = ${newUserId}`;
      const currentBalance = currentPoints.length > 0 ? currentPoints[0].points : 0;

      // Add the historical points to current balance
      const newTotalEarned = pointsEarned;
      const newCurrentPoints = currentBalance; // Keep current points (already has 1446)

      await transaction`
        UPDATE user_points
        SET total_earned = GREATEST(total_earned, ${newTotalEarned}),
            updated_at = NOW()
        WHERE user_id = ${newUserId}
      `;

      // Add transaction record for the migrated orders
      const migrationDescription = `Historical orders migrated - ${ordersMigrated} orders totaling $${totalOrderValue}`;
      await transaction`
        INSERT INTO points_transactions (user_id, type, points, description, created_at)
        VALUES (${newUserId}, 'order_migration', 0, ${migrationDescription}, NOW())
      `;

      return {
        ordersFound: uniqueOrders.length,
        ordersMigrated,
        migratedOrders,
        totalOrderValue,
        pointsEarned,
        newCurrentPoints
      };
    });

    console.log('✅ Order migration completed successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully migrated ${result.ordersMigrated} orders for user ${userEmail}`,
        details: result
      })
    };

  } catch (error) {
    console.error('❌ Order migration failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Order migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};