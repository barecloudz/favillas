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
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    const sql = getDB();
    
    // Get active kitchen orders (pending, preparing, ready)
    const kitchenOrders = await sql`
      SELECT * FROM orders 
      WHERE status IN ('pending', 'preparing', 'ready')
      ORDER BY created_at ASC
    `;
    
    console.log(`[API] Fetching active orders... Found ${kitchenOrders.length} orders`);
    
    // Get order items for each order
    const ordersWithItems = await Promise.all(
      kitchenOrders.map(async (order) => {
        const items = await sql`SELECT * FROM order_items WHERE order_id = ${order.id}`;
        return { ...order, items };
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(ordersWithItems)
    };
  } catch (error) {
    console.error('Kitchen Orders API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Failed to fetch kitchen orders',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};