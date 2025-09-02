import { Handler } from '@netlify/functions';

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
    // Import dependencies dynamically
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres = (await import('postgres')).default;
    const { orders } = await import('../../shared/schema.js');
    
    // Create database connection
    const sql = postgres(process.env.DATABASE_URL!, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
    });
    
    const db = drizzle(sql);

    // Get active kitchen orders (pending, preparing, ready)
    const { or, eq, inArray } = await import('drizzle-orm');
    const kitchenOrders = await db
      .select()
      .from(orders)
      .where(
        or(
          eq(orders.status, 'pending'),
          eq(orders.status, 'preparing'),
          eq(orders.status, 'ready')
        )
      );
    
    console.log(`[API] Fetching active orders...`);
    
    // If no orders, return empty array
    if (!kitchenOrders || kitchenOrders.length === 0) {
      await sql.end();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([])
      };
    }

    await sql.end();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(kitchenOrders)
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