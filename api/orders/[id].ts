import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';

// Database connection - serverless optimized
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

function authenticateToken(event: any): { userId: number; username: string; role: string } | null {
  const authHeader = event.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    const cookies = event.headers.cookie;
    if (cookies) {
      const authCookie = cookies.split(';').find((c: string) => c.trim().startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }
  }

  if (!token) return null;

  try {
    // First try to decode as Supabase JWT token
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      console.log('🔍 Supabase token payload:', payload);

      if (payload.iss && payload.iss.includes('supabase')) {
        const supabaseUserId = payload.sub;
        console.log('✅ Supabase user ID:', supabaseUserId);

        return {
          userId: parseInt(supabaseUserId.replace(/-/g, '').substring(0, 8), 16) || 1,
          username: payload.email || 'supabase_user',
          role: 'customer'
        };
      }
    } catch (supabaseError) {
      console.log('Not a Supabase token, trying JWT verification');
    }

    // Fallback to our JWT verification
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    return {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role || 'customer'
    };
  } catch (error) {
    console.error('Token authentication failed:', error);
    return null;
  }
}

export const handler: Handler = async (event, context) => {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, OPTIONS',
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

  const authPayload = authenticateToken(event);
  if (!authPayload) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  const pathParts = event.path.split('/');
  const id = pathParts[pathParts.length - 1];
  const orderId = parseInt(id, 10);

  if (isNaN(orderId)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid order ID' })
    };
  }

  try {
    const sql = getDB();

    switch (event.httpMethod) {
      case 'GET':
        // Get single order
        const orderResult = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
        if (orderResult.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Order not found' })
          };
        }

        const order = orderResult[0];

        // Check if user can access this order
        if (authPayload.role !== 'admin' && authPayload.role !== 'kitchen' && authPayload.role !== 'manager' && order.user_id !== authPayload.userId) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Forbidden' })
          };
        }

        // Get order items with menu item details
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
          WHERE oi.order_id = ${orderId}
        `;

        // Transform the data to match expected frontend structure
        const transformedItems = items.map(item => ({
          ...item,
          name: item.menu_item_name || 'Unknown Item',
          menuItem: item.menu_item_name ? {
            name: item.menu_item_name,
            description: item.menu_item_description,
            price: item.menu_item_price,
            imageUrl: item.menu_item_image_url,
            category: item.menu_item_category
          } : null
        }));

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ ...order, items: transformedItems })
        };

      case 'PATCH':
        // Update order (typically status changes)
        // Only staff can update orders
        if (authPayload.role !== 'admin' && authPayload.role !== 'kitchen' && authPayload.role !== 'manager') {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Forbidden - Staff access required' })
          };
        }

        const patchData = JSON.parse(event.body || '{}');

        // Build the UPDATE query dynamically
        const updateFields = [];
        const updateValues = [];

        if (patchData.status !== undefined) {
          updateFields.push('status = $' + (updateValues.length + 1));
          updateValues.push(patchData.status);
        }
        if (patchData.paymentStatus !== undefined) {
          updateFields.push('payment_status = $' + (updateValues.length + 1));
          updateValues.push(patchData.paymentStatus);
        }

        // Always update the processed_at timestamp for status updates
        updateFields.push('processed_at = NOW()');

        if (updateFields.length === 1) { // Only the timestamp update
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'No valid fields to update' })
          };
        }

        const updateQuery = `
          UPDATE orders
          SET ${updateFields.join(', ')}
          WHERE id = $${updateValues.length + 1}
          RETURNING *
        `;
        updateValues.push(orderId);

        const updatedOrders = await sql.unsafe(updateQuery, updateValues);

        if (updatedOrders.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Order not found' })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updatedOrders[0])
        };

      case 'DELETE':
        // Delete order (admin only)
        if (authPayload.role !== 'admin') {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Forbidden - Admin access required' })
          };
        }

        const deletedOrders = await sql`
          DELETE FROM orders
          WHERE id = ${orderId}
          RETURNING *
        `;

        if (deletedOrders.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Order not found' })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Order deleted', id: orderId })
        };

      default:
        return {
          statusCode: 405,
          headers: { ...headers, 'Allow': 'GET, PATCH, DELETE' },
          body: JSON.stringify({ error: `Method ${event.httpMethod} not allowed` })
        };
    }
  } catch (error) {
    console.error('Order API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}