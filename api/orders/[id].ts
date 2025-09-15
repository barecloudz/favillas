import { Handler } from '@netlify/functions';
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

function authenticateToken(event: any): { userId: number; username: string; role: string } | null {
  const authHeader = event.headers.authorization;
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

export const handler: Handler = async (event, context) => {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, OPTIONS',
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
    const db = getDB();

    switch (event.httpMethod) {
      case 'GET':
        // Get single order with items
        const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
        if (!order) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Order not found' })
          };
        }

        // Check if user can access this order
        if (authPayload.role !== 'admin' && authPayload.role !== 'kitchen' && authPayload.role !== 'manager' && order.userId !== authPayload.userId) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Forbidden' })
          };
        }

        // Get order items
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ ...order, items })
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
        const [updatedOrder] = await db
          .update(orders)
          .set({
            ...patchData,
            updatedAt: new Date(),
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
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updatedOrder)
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

        const [deletedOrder] = await db
          .delete(orders)
          .where(eq(orders.id, orderId))
          .returning();
          
        if (!deletedOrder) {
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