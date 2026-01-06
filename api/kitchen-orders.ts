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

    // OPTIMIZED: Get all data in 3 queries instead of N+1

    // Query 1: Get active kitchen orders with customer names
    const kitchenOrders = await sql`
      SELECT
        o.*,
        u.first_name,
        u.last_name
      FROM orders o
      LEFT JOIN users u ON (o.user_id = u.id OR o.supabase_user_id = u.supabase_user_id)
      WHERE o.status IN ('pending', 'cooking', 'completed', 'picked_up', 'cancelled')
        AND o.payment_status != 'pending_payment_link'
      ORDER BY o.created_at ASC
    `;

    console.log(`[API] Fetching active orders... Found ${kitchenOrders.length} orders`);

    if (kitchenOrders.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify([])
      };
    }

    // Get all order IDs for batch queries
    const orderIds = kitchenOrders.map(o => o.id);

    // Query 2: Get ALL order items for all orders in one query
    const allItems = await sql`
      SELECT
        oi.*,
        mi.name as menu_item_name,
        mi.description as menu_item_description,
        mi.base_price as menu_item_price,
        mi.image_url as menu_item_image_url,
        mi.category as menu_item_category
      FROM order_items oi
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = ANY(${orderIds})
    `;

    // Query 3: Get ALL points transactions for all orders in one query
    const allPoints = await sql`
      SELECT order_id, user_id, supabase_user_id, points
      FROM points_transactions
      WHERE order_id = ANY(${orderIds}) AND type = 'earned'
    `;

    // Group items by order_id
    const itemsByOrderId: Record<number, any[]> = {};
    for (const item of allItems) {
      if (!itemsByOrderId[item.order_id]) {
        itemsByOrderId[item.order_id] = [];
      }
      itemsByOrderId[item.order_id].push(item);
    }

    // Group points by order_id
    const pointsByOrderId: Record<number, number> = {};
    for (const pt of allPoints) {
      pointsByOrderId[pt.order_id] = parseInt(pt.points);
    }

    // Build the response
    const ordersWithItems = kitchenOrders.map((order) => {
      const items = itemsByOrderId[order.id] || [];

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

        // Parse half_and_half if it's a JSON string
        let parsedHalfAndHalf = item.half_and_half;
        if (typeof item.half_and_half === 'string' && item.half_and_half) {
          try {
            parsedHalfAndHalf = JSON.parse(item.half_and_half);
          } catch (e) {
            console.error(`Failed to parse half_and_half for item ${item.id}:`, e);
            parsedHalfAndHalf = null;
          }
        }

        return {
          ...item,
          options: parsedOptions,
          halfAndHalf: parsedHalfAndHalf,
          menuItem: item.menu_item_name ? {
            name: item.menu_item_name,
            description: item.menu_item_description,
            price: item.menu_item_price,
            imageUrl: item.menu_item_image_url,
            category: item.menu_item_category
          } : null
        };
      });

      // Get points earned for this order from our pre-fetched data
      const pointsEarned = pointsByOrderId[order.id] || 0;

      // Extract first name from customer_name field or use first_name from user profile
      let displayName = 'Guest';
      if (order.customer_name) {
        displayName = order.customer_name.trim().split(/\s+/)[0];
      } else if (order.first_name) {
        displayName = order.first_name;
      }

      return {
        ...order,
        items: transformedItems,
        pointsEarned: pointsEarned,
        customerName: displayName,
        fulfillmentTime: order.fulfillment_time,
        scheduledTime: order.scheduled_time
      };
    });

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
