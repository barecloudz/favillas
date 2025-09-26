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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();

    // Just get orders with your phone number - no auth needed
    const userPhone = '8039774285';

    const orders = await sql`
      SELECT id, user_id, supabase_user_id, total, phone, created_at, status
      FROM orders
      WHERE phone = ${userPhone}
        AND created_at > NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
    `;

    const pointsTransactions = await sql`
      SELECT order_id, points, description, created_at
      FROM points_transactions
      WHERE order_id IN (${orders.map(o => o.id)})
      ORDER BY created_at DESC
    `;

    const ordersWithPoints = pointsTransactions.map(pt => pt.order_id);
    const ordersWithoutPoints = orders.filter(order => !ordersWithPoints.includes(order.id));

    const totalSpent = orders.reduce((sum, order) => sum + parseFloat(order.total), 0);
    const expectedPoints = Math.floor(totalSpent);

    const result = {
      phone: userPhone,
      totalOrders: orders.length,
      ordersWithoutPoints: ordersWithoutPoints.length,
      totalSpent: totalSpent.toFixed(2),
      expectedPoints,
      missingPointsValue: ordersWithoutPoints.reduce((sum, o) => sum + Math.floor(parseFloat(o.total)), 0),
      orders: orders.map(order => ({
        id: order.id,
        total: parseFloat(order.total),
        hasPoints: ordersWithPoints.includes(order.id),
        pointsToAward: Math.floor(parseFloat(order.total)),
        associatedWithUser: !!order.supabase_user_id,
        created: order.created_at
      })),
      ordersNeedingPoints: ordersWithoutPoints.map(order => ({
        id: order.id,
        total: parseFloat(order.total),
        pointsToAward: Math.floor(parseFloat(order.total))
      }))
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result, null, 2)
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get order data',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};