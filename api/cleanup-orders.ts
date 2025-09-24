import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, isStaff } from './_shared/auth';

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
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Authenticate - only staff can cleanup orders
  const authPayload = await authenticateToken(event);
  if (!authPayload || !isStaff(authPayload)) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized - Admin access required' })
    };
  }

  try {
    const sql = getDB();

    const requestData = JSON.parse(event.body || '{}');
    const keepRecent = requestData.keepRecent || 5;

    console.log(`🧹 Starting order cleanup - keeping ${keepRecent} most recent orders`);

    // Get total count before cleanup
    const totalBefore = await sql`SELECT COUNT(*) as count FROM orders`;
    console.log(`📊 Total orders before cleanup: ${totalBefore[0].count}`);

    // Get the IDs of orders to delete (all except the most recent N)
    const ordersToDelete = await sql`
      SELECT id FROM orders
      ORDER BY created_at DESC
      OFFSET ${keepRecent}
    `;

    const idsToDelete = ordersToDelete.map(order => order.id);
    console.log(`🗑️ Found ${idsToDelete.length} orders to delete`);

    if (idsToDelete.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'No orders to delete - already at target count',
          deletedCount: 0,
          remainingCount: parseInt(totalBefore[0].count)
        })
      };
    }

    let deletedCount = 0;

    // Delete in batches to avoid overwhelming the database
    const batchSize = 50;
    for (let i = 0; i < idsToDelete.length; i += batchSize) {
      const batch = idsToDelete.slice(i, i + batchSize);

      // Delete related records first
      await sql`DELETE FROM order_items WHERE order_id = ANY(${batch})`;

      // Delete the orders
      const deletedOrders = await sql`DELETE FROM orders WHERE id = ANY(${batch}) RETURNING id`;
      deletedCount += deletedOrders.length;

      console.log(`✅ Deleted batch ${Math.floor(i/batchSize) + 1}: ${deletedOrders.length} orders`);
    }

    // Get final count
    const totalAfter = await sql`SELECT COUNT(*) as count FROM orders`;

    console.log(`🎉 Cleanup complete! Deleted ${deletedCount} orders, ${totalAfter[0].count} remaining`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: `Successfully cleaned up orders`,
        deletedCount,
        remainingCount: parseInt(totalAfter[0].count),
        keptRecent: keepRecent
      })
    };

  } catch (error) {
    console.error('❌ Order cleanup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to cleanup orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};