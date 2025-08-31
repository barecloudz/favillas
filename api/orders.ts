import { VercelRequest, VercelResponse } from '@vercel/node';
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

function authenticateToken(req: VercelRequest): { userId: number; username: string; role: string } | null {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || 'http://localhost:3000';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authPayload = authenticateToken(req);

  try {
    const sql = getDB();

    if (req.method === 'GET') {
      // GET requests require authentication
      if (!authPayload) {
        return res.status(401).json({ error: 'Unauthorized' });
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

      return res.status(200).json(ordersWithItems);
      
    } else if (req.method === 'POST') {
      // Create new order - support both authenticated users and guests
      const { items, ...orderData } = req.body;
      
      // Validate required fields
      if (!orderData.total || !orderData.tax || !orderData.orderType || !orderData.phone) {
        return res.status(400).json({ 
          error: 'Missing required fields: total, tax, orderType, phone' 
        });
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
            return res.status(400).json({ 
              error: 'Invalid order item: missing menuItemId, quantity, or price' 
            });
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
      
      return res.status(201).json({ ...newOrder, items: orderItems });
      
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Orders API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}