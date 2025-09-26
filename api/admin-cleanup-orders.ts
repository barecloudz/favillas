import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, isStaff, AuthPayload } from './_shared/auth';

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

  // Require admin authentication
  const authPayload = await authenticateToken(event);
  if (!authPayload || !isStaff(authPayload)) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Admin access required' })
    };
  }

  try {
    const sql = getDB();
    const { action, confirmCode } = JSON.parse(event.body || '{}');

    // Safety check - require confirmation code
    if (confirmCode !== 'DELETE_ALL_ORDERS_CONFIRMED') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid confirmation code. Use "DELETE_ALL_ORDERS_CONFIRMED" to confirm.',
          requiredCode: 'DELETE_ALL_ORDERS_CONFIRMED'
        })
      };
    }

    if (action === 'DELETE_ALL_ORDERS') {
      console.log('🗑️ ADMIN: Starting complete order cleanup...');

      // Get counts before deletion
      const orderCount = await sql`SELECT COUNT(*) as count FROM orders`;
      const orderItemsCount = await sql`SELECT COUNT(*) as count FROM order_items`;
      const pointsTransactionsCount = await sql`SELECT COUNT(*) as count FROM points_transactions`;

      console.log('📊 Pre-deletion counts:', {
        orders: orderCount[0].count,
        orderItems: orderItemsCount[0].count,
        pointsTransactions: pointsTransactionsCount[0].count
      });

      // Perform atomic deletion in correct order (foreign key constraints)
      const result = await sql.begin(async (sql) => {
        // Delete order items first (references orders)
        const deletedOrderItems = await sql`DELETE FROM order_items RETURNING id`;

        // Delete points transactions (references orders)
        const deletedPointsTransactions = await sql`DELETE FROM points_transactions RETURNING id`;

        // Delete orders last
        const deletedOrders = await sql`DELETE FROM orders RETURNING id`;

        // Reset user points to 0
        await sql`UPDATE user_points SET points = 0, total_earned = 0, total_redeemed = 0, last_earned_at = NULL, updated_at = NOW()`;

        // Reset legacy rewards column
        await sql`UPDATE users SET rewards = 0, updated_at = NOW()`;

        return {
          ordersDeleted: deletedOrders.length,
          orderItemsDeleted: deletedOrderItems.length,
          pointsTransactionsDeleted: deletedPointsTransactions.length
        };
      });

      console.log('✅ ADMIN: Order cleanup completed:', result);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'All orders, order items, and points transactions deleted successfully',
          result,
          timestamp: new Date().toISOString(),
          performedBy: authPayload.username || 'Admin'
        })
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Invalid action. Use "DELETE_ALL_ORDERS" with proper confirmation code.',
        availableActions: ['DELETE_ALL_ORDERS'],
        requiredConfirmation: 'DELETE_ALL_ORDERS_CONFIRMED'
      })
    };

  } catch (error) {
    console.error('❌ ADMIN: Order cleanup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to perform cleanup',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};