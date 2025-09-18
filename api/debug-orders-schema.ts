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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();

    // Get orders table schema
    const schema = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'orders'
      ORDER BY ordinal_position
    `;

    // Get a sample order to see the data
    const sampleOrders = await sql`SELECT * FROM orders LIMIT 3`;

    // Check if there are any orders with user ID patterns we're looking for
    const userIdChecks = {
      old_id: [],
      new_id: [],
      uuid_string: [],
      recent_orders: []
    };

    try {
      userIdChecks.new_id = await sql`SELECT id, user_id, created_at FROM orders WHERE user_id = 13402295 ORDER BY created_at DESC LIMIT 5`;
    } catch (e) {
      console.log('New ID search failed:', e.message);
    }

    try {
      userIdChecks.recent_orders = await sql`
        SELECT id, user_id, email, created_at
        FROM orders
        WHERE created_at > NOW() - INTERVAL '30 days'
        ORDER BY created_at DESC
        LIMIT 10
      `;
    } catch (e) {
      console.log('Recent orders search failed:', e.message);
    }

    // Total orders count
    const totalCount = await sql`SELECT COUNT(*) as count FROM orders`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ordersTableSchema: schema,
        sampleOrders,
        userIdChecks,
        totalOrdersCount: totalCount[0].count,
        searchTargets: {
          newUserId: 13402295,
          userEmail: 'blake@martindale.co',
          userUuid: 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a'
        }
      })
    };

  } catch (error) {
    console.error('❌ Schema debug failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Schema debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};