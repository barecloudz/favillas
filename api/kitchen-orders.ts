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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  // Authenticate user - kitchen staff should be authenticated
  const authPayload = await authenticateToken(event);
  if (!authPayload || !isStaff(authPayload)) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized - Kitchen access required' })
    };
  }

  try {
    const sql = getDB();
    
    // Get active kitchen orders with customer names (pending, cooking, completed)
    const kitchenOrders = await sql`
      SELECT
        o.*,
        u.first_name,
        u.last_name
      FROM orders o
      LEFT JOIN users u ON (o.user_id = u.id OR o.supabase_user_id = u.supabase_user_id)
      WHERE o.status IN ('pending', 'cooking', 'completed', 'picked_up')
      ORDER BY o.created_at ASC
    `;
    
    console.log(`[API] Fetching active orders... Found ${kitchenOrders.length} orders`);
    
    // Get order items for each order with menu item details
    const ordersWithItems = await Promise.all(
      kitchenOrders.map(async (order) => {
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
        const transformedItems = items.map(item => {
          // Parse options if they're a JSON string
          let parsedOptions = item.options;
          if (typeof item.options === 'string' && item.options) {
            try {
              parsedOptions = JSON.parse(item.options);
            } catch (e) {
              console.error(`Failed to parse options for item ${item.id}:`, e);
              parsedOptions = null;
            }
          }

          return {
            ...item,
            options: parsedOptions,
            menuItem: item.menu_item_name ? {
              name: item.menu_item_name,
              description: item.menu_item_description,
              price: item.menu_item_price,
              imageUrl: item.menu_item_image_url,
              category: item.menu_item_category
            } : null
          };
        });

        // Get points earned for this order
        let pointsEarned = 0;
        if (order.user_id || order.supabase_user_id) {
          const pointsQuery = order.user_id
            ? await sql`SELECT points FROM points_transactions WHERE order_id = ${order.id} AND user_id = ${order.user_id} AND type = 'earned'`
            : await sql`SELECT points FROM points_transactions WHERE order_id = ${order.id} AND supabase_user_id = ${order.supabase_user_id} AND type = 'earned'`;

          if (pointsQuery.length > 0) {
            pointsEarned = parseInt(pointsQuery[0].points);
          }
        }

        // Extract first name from customer_name field or use first_name from user profile
        let displayName = 'Guest';
        if (order.customer_name) {
          // Extract first word/name from customer_name (handles both "John Doe" and "John")
          displayName = order.customer_name.trim().split(/\s+/)[0];
        } else if (order.first_name) {
          // Fallback to first_name from user profile
          displayName = order.first_name;
        }

        return {
          ...order,
          items: transformedItems,
          pointsEarned: pointsEarned,
          customerName: displayName,
          // Transform snake_case to camelCase for frontend
          fulfillmentTime: order.fulfillment_time,
          scheduledTime: order.scheduled_time
        };
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