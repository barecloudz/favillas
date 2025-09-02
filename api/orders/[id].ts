import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { orders, orderItems } from '../../shared/schema';
import jwt from 'jsonwebtoken';

// Database connection - serverless optimized
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
  // CORS headers
  const origin = req.headers.origin || 'http://localhost:3000';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authPayload = authenticateToken(req);
  if (!authPayload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  const orderId = parseInt(id as string, 10);

  if (isNaN(orderId)) {
    return res.status(400).json({ error: 'Invalid order ID' });
  }

  try {
    const db = getDB();

    switch (req.method) {
      case 'GET':
        // Get single order with items
        const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
        if (!order) {
          return res.status(404).json({ error: 'Order not found' });
        }

        // Check if user can access this order
        if (authPayload.role !== 'admin' && authPayload.role !== 'kitchen' && authPayload.role !== 'manager' && order.userId !== authPayload.userId) {
          return res.status(403).json({ error: 'Forbidden' });
        }

        // Get order items
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
        
        return res.status(200).json({ ...order, items });

      case 'PATCH':
        // Update order (typically status changes)
        // Only staff can update orders
        if (authPayload.role !== 'admin' && authPayload.role !== 'kitchen' && authPayload.role !== 'manager') {
          return res.status(403).json({ error: 'Forbidden - Staff access required' });
        }

        const patchData = req.body;
        const [updatedOrder] = await db
          .update(orders)
          .set({
            ...patchData,
            updatedAt: new Date(),
          })
          .where(eq(orders.id, orderId))
          .returning();
          
        if (!updatedOrder) {
          return res.status(404).json({ error: 'Order not found' });
        }
        return res.status(200).json(updatedOrder);

      case 'DELETE':
        // Delete order (admin only)
        if (authPayload.role !== 'admin') {
          return res.status(403).json({ error: 'Forbidden - Admin access required' });
        }

        const [deletedOrder] = await db
          .delete(orders)
          .where(eq(orders.id, orderId))
          .returning();
          
        if (!deletedOrder) {
          return res.status(404).json({ error: 'Order not found' });
        }
        return res.status(200).json({ message: 'Order deleted', id: orderId });

      default:
        res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Order API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}