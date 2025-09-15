import { Handler } from '@netlify/functions';
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
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'PATCH') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
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

  // Only staff can update order status
  if (authPayload.role !== 'admin' && authPayload.role !== 'kitchen' && authPayload.role !== 'manager') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Staff access required' })
    };
  }

  const pathParts = event.path.split('/');
  const id = pathParts[pathParts.length - 2]; // Get ID from path like /orders/123/status
  const orderId = parseInt(id, 10);
  const { status } = JSON.parse(event.body || '{}');

  if (isNaN(orderId)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid order ID' })
    };
  }

  if (!status) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Status is required' })
    };
  }

  const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ 
        error: 'Invalid status', 
        validStatuses 
      })
    };
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
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Order not found' })
      };
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
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Order not found' })
      };
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

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(updatedOrder)
    };
  } catch (error) {
    console.error('Order status update error:', error);
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