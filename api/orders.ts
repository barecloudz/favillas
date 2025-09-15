import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';

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
  // Check for JWT token in Authorization header first
  const authHeader = event.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // If no Authorization header, check for auth-token cookie
  if (!token) {
    const cookies = event.headers.cookie;
    if (cookies) {
      const authCookie = cookies.split(';').find((c: string) => c.trim().startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }
  }

  if (!token) {
    return null;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
    }

    const payload = jwt.verify(token, jwtSecret) as { userId: number; username: string; role: string };
    return payload;
  } catch (error) {
    return null;
  }
}

export const handler: Handler = async (event, context) => {
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  try {
    const sql = getDB();

    if (event.httpMethod === 'GET') {
      // GET requests require authentication
      if (!authPayload) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized' })
        };
      }
      
      let allOrders;
      
      if (authPayload.role === 'admin' || authPayload.role === 'kitchen' || authPayload.role === 'manager') {
        // Staff can see all orders
        allOrders = await sql`SELECT * FROM orders ORDER BY created_at DESC`;
      } else {
        // Customers can only see their own orders
        allOrders = await sql`SELECT * FROM orders WHERE user_id = ${authPayload.userId} ORDER BY created_at DESC`;
      }
      
      // Get order items for each order
      const ordersWithItems = await Promise.all(
        allOrders.map(async (order) => {
          const items = await sql`SELECT * FROM order_items WHERE order_id = ${order.id}`;
          return { ...order, items };
        })
      );

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(ordersWithItems)
      };
      
    } else if (event.httpMethod === 'POST') {
      // Create new order - support both authenticated users and guests
      const { items, ...orderData } = JSON.parse(event.body || '{}');
      
      // Validate required fields
      if (!orderData.total || !orderData.tax || !orderData.orderType || !orderData.phone) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Missing required fields: total, tax, orderType, phone' 
          })
        };
      }
      
      // Set the userId: use authenticated user ID or null for guests
      const userId = authPayload ? authPayload.userId : orderData.userId || null;
      
      // Create the order
      const newOrders = await sql`
        INSERT INTO orders (
          user_id, status, total, tax, delivery_fee, tip, order_type, payment_status, 
          special_instructions, address, address_data, fulfillment_time, scheduled_time, 
          phone, created_at, updated_at
        ) VALUES (
          ${userId}, 
          ${orderData.status || 'pending'}, 
          ${orderData.total}, 
          ${orderData.tax}, 
          ${orderData.deliveryFee || '0'}, 
          ${orderData.tip || '0'}, 
          ${orderData.orderType}, 
          ${orderData.paymentStatus || 'pending'},
          ${orderData.specialInstructions || ''}, 
          ${orderData.address || ''}, 
          ${orderData.addressData ? JSON.stringify(orderData.addressData) : null}, 
          ${orderData.fulfillmentTime || 'asap'}, 
          ${orderData.scheduledTime || null}, 
          ${orderData.phone}, 
          NOW(), 
          NOW()
        ) RETURNING *
      `;

      const newOrder = newOrders[0];
      if (!newOrder) {
        throw new Error('Failed to create order');
      }

      // Insert order items if provided
      if (items && items.length > 0) {
        const orderItemsInserts = [];
        for (const item of items) {
          if (!item.menuItemId || !item.quantity || !item.price) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ 
                error: 'Invalid order item: missing menuItemId, quantity, or price' 
              })
            };
          }
          
          const insertResult = await sql`
            INSERT INTO order_items (
              order_id, menu_item_id, quantity, price, options, special_instructions, created_at
            ) VALUES (
              ${newOrder.id}, 
              ${item.menuItemId}, 
              ${item.quantity}, 
              ${item.price}, 
              ${item.options ? JSON.stringify(item.options) : null}, 
              ${item.specialInstructions || ''}, 
              NOW()
            ) RETURNING *
          `;
          orderItemsInserts.push(insertResult[0]);
        }
      }

      // Fetch the complete order with items
      const orderItems = await sql`SELECT * FROM order_items WHERE order_id = ${newOrder.id}`;
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ ...newOrder, items: orderItems })
      };
      
    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }
  } catch (error) {
    console.error('Orders API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};