import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { orders, orderItems } from '../shared/schema';
import jwt from 'jsonwebtoken';

let dbConnection: any = null;

function getDB() {
  if (dbConnection) return dbConnection;
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });
  
  dbConnection = drizzle(sql, { schema: { orders, orderItems } });
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
    const db = getDB();

    if (req.method === 'GET') {
      // GET requests require authentication
      if (!authPayload) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      let allOrders;
      
      if (authPayload.role === 'admin' || authPayload.role === 'kitchen' || authPayload.role === 'manager') {
        // Staff can see all orders
        allOrders = await db.select().from(orders);
      } else {
        // Customers can only see their own orders
        allOrders = await db.select().from(orders).where(eq(orders.userId, authPayload.userId));
      }
      
      // Get order items for each order
      const ordersWithItems = await Promise.all(
        allOrders.map(async (order) => {
          const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
          return { ...order, items };
        })
      );

      return res.status(200).json(ordersWithItems);
      
    } else if (req.method === 'POST') {
      // Create new order - support both authenticated users and guests
      const { items, ...orderData } = req.body;
      
      // Set the userId: use authenticated user ID or null for guests
      orderData.userId = authPayload ? authPayload.userId : orderData.userId;
      
      const [newOrder] = await db
        .insert(orders)
        .values({
          ...orderData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Insert order items if provided
      if (items && items.length > 0) {
        const orderItemsData = items.map((item: any) => ({
          ...item,
          orderId: newOrder.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        }));
        
        await db.insert(orderItems).values(orderItemsData);
      }

      // Fetch the complete order with items
      const orderWithItems = await db.select().from(orderItems).where(eq(orderItems.orderId, newOrder.id));
      
      return res.status(201).json({ ...newOrder, items: orderWithItems });
      
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