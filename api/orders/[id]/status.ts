import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { orders } from '../../../shared/schema';
import jwt from 'jsonwebtoken';
import { awardPointsForOrderCompletion } from '../../utils/rewards';

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
  
  dbConnection = drizzle(sql, { schema: { orders } });
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
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authPayload = authenticateToken(req);
  if (!authPayload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only staff can update order status
  if (authPayload.role !== 'admin' && authPayload.role !== 'kitchen' && authPayload.role !== 'manager') {
    return res.status(403).json({ error: 'Forbidden - Staff access required' });
  }

  const { id } = req.query;
  const orderId = parseInt(id as string, 10);
  const { status } = req.body;

  if (isNaN(orderId)) {
    return res.status(400).json({ error: 'Invalid order ID' });
  }

  if (!status) {
    return res.status(400).json({ error: 'Status is required' });
  }

  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      error: 'Invalid status', 
      validStatuses 
    });
  }

  try {
    const db = getDB();

    // Get the current order first to check the current status
    const [currentOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!currentOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const [updatedOrder] = await db
      .update(orders)
      .set({
        status,
        updatedAt: new Date(),
        completedAt: status === 'completed' ? new Date() : undefined,
      })
      .where(eq(orders.id, orderId))
      .returning();
      
    if (!updatedOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Award points if order is being completed and has a user
    if (status === 'completed' && 
        currentOrder.status !== 'completed' && 
        updatedOrder.userId) {
      try {
        const orderTotal = parseFloat(updatedOrder.total);
        const pointsResult = await awardPointsForOrderCompletion(
          updatedOrder.userId,
          updatedOrder.id,
          orderTotal
        );
        
        console.log(`Points awarded for order ${orderId}:`, pointsResult);
      } catch (pointsError) {
        // Log error but don't fail the status update
        console.error(`Error awarding points for order ${orderId}:`, pointsError);
      }
    }

    return res.status(200).json(updatedOrder);
  } catch (error) {
    console.error('Order status update error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}