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

    // UUID: bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a
    const oldUserId = 3174987662; // Original 8-char conversion (would have caused overflow)
    const newUserId = 13402295;   // New safe 6-char conversion
    const uuid = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a';

    console.log('🔍 Searching for orders with different user ID formats...');

    // Search for orders with various possible user ID formats
    const searchResults = {
      uuid_string: [],
      old_user_id: [],
      new_user_id: [],
      all_orders_count: 0
    };

    try {
      // Try with UUID string
      const uuidOrders = await sql`SELECT * FROM orders WHERE user_id = ${uuid} OR user_id::text = ${uuid}`;
      searchResults.uuid_string = uuidOrders;
      console.log(`Found ${uuidOrders.length} orders with UUID string`);
    } catch (e) {
      console.log('UUID string search failed:', e.message);
    }

    try {
      // Try with old user ID (this might fail due to integer overflow)
      const oldOrders = await sql`SELECT * FROM orders WHERE user_id = ${oldUserId}`;
      searchResults.old_user_id = oldOrders;
      console.log(`Found ${oldOrders.length} orders with old user ID ${oldUserId}`);
    } catch (e) {
      console.log('Old user ID search failed:', e.message);
    }

    try {
      // Try with new user ID
      const newOrders = await sql`SELECT * FROM orders WHERE user_id = ${newUserId}`;
      searchResults.new_user_id = newOrders;
      console.log(`Found ${newOrders.length} orders with new user ID ${newUserId}`);
    } catch (e) {
      console.log('New user ID search failed:', e.message);
    }

    // Get total orders count for reference
    try {
      const allOrders = await sql`SELECT COUNT(*) as count FROM orders`;
      searchResults.all_orders_count = parseInt(allOrders[0].count);
      console.log(`Total orders in database: ${searchResults.all_orders_count}`);
    } catch (e) {
      console.log('Total count failed:', e.message);
    }

    // Search for orders with email address as fallback
    try {
      const emailOrders = await sql`
        SELECT o.*, o.user_id as stored_user_id
        FROM orders o
        WHERE o.customer_email = 'blake@martindale.co'
        ORDER BY o.created_at DESC
        LIMIT 20
      `;
      searchResults.email_orders = emailOrders;
      console.log(`Found ${emailOrders.length} orders with email blake@martindale.co`);
    } catch (e) {
      console.log('Email search failed:', e.message);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        uuid,
        oldUserId,
        newUserId,
        searchResults,
        summary: {
          uuid_orders: searchResults.uuid_string?.length || 0,
          old_id_orders: searchResults.old_user_id?.length || 0,
          new_id_orders: searchResults.new_user_id?.length || 0,
          email_orders: searchResults.email_orders?.length || 0,
          total_orders: searchResults.all_orders_count
        }
      })
    };

  } catch (error) {
    console.error('❌ Debug search failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Debug search failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};