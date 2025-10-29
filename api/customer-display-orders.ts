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
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  // NO AUTHENTICATION REQUIRED - This is a public display

  try {
    const sql = getDB();

    // Get only cooking and completed orders for customer display (no pending or picked_up)
    const displayOrders = await sql`
      SELECT
        o.*,
        u.first_name,
        u.last_name
      FROM orders o
      LEFT JOIN users u ON (o.user_id = u.id OR o.supabase_user_id = u.supabase_user_id)
      WHERE o.status IN ('cooking', 'completed')
      ORDER BY o.created_at ASC
    `;

    console.log(`[Customer Display API] Fetching display orders... Found ${displayOrders.length} orders`);

    // Get order items for each order with menu item details
    const ordersWithItems = await Promise.all(
      displayOrders.map(async (order) => {
        const items = await sql`
          SELECT
            oi.*,
            mi.name as menu_item_name,
            mi.description as menu_item_description,
            mi.base_price as menu_item_price,
            mi.image_url as menu_item_image_url,
            mi.category as menu_item_category
          FROM order_items oi
          LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
          WHERE oi.order_id = ${order.id}
        `;

        // Transform the data to match expected frontend structure
        const transformedItems = items.map(item => ({
          ...item,
          menuItem: item.menu_item_name ? {
            name: item.menu_item_name,
            description: item.menu_item_description,
            price: item.menu_item_price,
            imageUrl: item.menu_item_image_url,
            category: item.menu_item_category
          } : null
        }));

        // Extract first name from customer_name field or use first_name from user profile
        let firstName = '';
        if (order.customer_name) {
          // Extract first word/name from customer_name (handles both "John Doe" and "John")
          firstName = order.customer_name.trim().split(/\s+/)[0];
        } else if (order.first_name) {
          // Fallback to first_name from user profile
          firstName = order.first_name;
        }

        return {
          ...order,
          items: transformedItems,
          first_name: firstName,  // Override with extracted first name
          last_name: ''  // Clear last name since we're only showing first name
        };
      })
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(ordersWithItems)
    };
  } catch (error) {
    console.error('Customer Display Orders API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Failed to fetch display orders',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
