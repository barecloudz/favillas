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
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();
    const customerUserId = 'fc644776-1ca0-46ad-ae6c-8f753478374b';

    console.log('🔍 Debug: Checking points data for customer:', customerUserId);

    // Get user points record
    const userPoints = await sql`
      SELECT * FROM user_points WHERE supabase_user_id = ${customerUserId}
    `;

    // Get all points transactions for this user
    const pointsTransactions = await sql`
      SELECT * FROM points_transactions
      WHERE supabase_user_id = ${customerUserId}
      ORDER BY created_at DESC
    `;

    // Get all orders for this user
    const orders = await sql`
      SELECT id, total, payment_status, created_at
      FROM orders
      WHERE supabase_user_id = ${customerUserId}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // Check which orders have points transactions
    const orderIds = orders.map(o => o.id);
    const ordersWithPoints = await sql`
      SELECT DISTINCT order_id
      FROM points_transactions
      WHERE order_id = ANY(${orderIds}) AND supabase_user_id = ${customerUserId}
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        customer_id: customerUserId,
        user_points: userPoints,
        points_transactions: pointsTransactions,
        recent_orders: orders,
        orders_with_points: ordersWithPoints.map(o => o.order_id),
        missing_points_orders: orderIds.filter(id => !ordersWithPoints.find(o => o.order_id === id)),
        analysis: {
          total_orders: orders.length,
          total_transactions: pointsTransactions.length,
          current_points: userPoints[0]?.points || 0,
          total_earned: userPoints[0]?.total_earned || 0
        }
      })
    };

  } catch (error: any) {
    console.error('Debug points error:', error);
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