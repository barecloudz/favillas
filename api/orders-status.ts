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
    
    const decoded = jwt.verify(token, jwtSecret) as any;
    return {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role || 'customer'
    };
  } catch (error) {
    return null;
  }
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
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

  // Check authentication
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

  try {
    const sql = getDB();
    
    // Extract order ID from query parameters or path
    const orderId = parseInt(event.queryStringParameters?.orderId || '0');
    const { status } = JSON.parse(event.body || '{}');

    if (isNaN(orderId) || orderId <= 0) {
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

    const validStatuses = ['pending', 'processing', 'preparing', 'ready', 'completed', 'cancelled'];
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

    // Get the current order first
    const currentOrder = await sql`
      SELECT * FROM orders 
      WHERE id = ${orderId}
      LIMIT 1
    `;

    if (currentOrder.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Order not found' })
      };
    }

    // Update the order status
    const updatedOrder = await sql`
      UPDATE orders 
      SET status = ${status}, 
          updated_at = NOW(),
          completed_at = ${status === 'completed' ? 'NOW()' : null}
      WHERE id = ${orderId}
      RETURNING *
    `;

    if (updatedOrder.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Order not found' })
      };
    }

    // Award points if order is being completed and has a user
    if (status === 'completed' && 
        currentOrder[0].status !== 'completed' && 
        currentOrder[0].user_id) {
      try {
        const orderTotal = parseFloat(currentOrder[0].total);
        const pointsToAward = Math.floor(orderTotal * 10); // 10 points per dollar
        
        await sql`
          INSERT INTO rewards (user_id, order_id, points_earned, description, created_at)
          VALUES (${currentOrder[0].user_id}, ${orderId}, ${pointsToAward}, 'Order completion bonus', NOW())
        `;
        
        console.log(`Points awarded for order ${orderId}: ${pointsToAward} points`);
      } catch (pointsError) {
        // Log error but don't fail the status update
        console.error(`Error awarding points for order ${orderId}:`, pointsError);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(updatedOrder[0])
    };

  } catch (error) {
    console.error('Order status update error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Failed to update order status',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
