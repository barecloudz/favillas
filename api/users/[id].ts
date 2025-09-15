import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../../shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';

const scryptAsync = promisify(scrypt);

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
  
  dbConnection = drizzle(sql, { schema: { users } });
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

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export const handler: Handler = async (event, context) => {
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
  const userId = parseInt(id, 10);

  if (isNaN(userId)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid user ID' })
    };
  }

  // Users can only access their own data unless they're admin
  if (authPayload.userId !== userId && authPayload.role !== 'admin') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden' })
    };
  }

  try {
    const db = getDB();

    switch (event.httpMethod) {
      case 'GET':
        // Get single user
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (!user) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'User not found' })
          };
        }
        
        const { password: _, ...userWithoutPassword } = user;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(userWithoutPassword)
        };

      case 'PUT':
      case 'PATCH':
        // Update user
        const updateData = JSON.parse(event.body || '{}');
        
        // Hash password if it's being updated
        if (updateData.password) {
          updateData.password = await hashPassword(updateData.password);
        }

        const [updatedUser] = await db
          .update(users)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId))
          .returning();
          
        if (!updatedUser) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'User not found' })
          };
        }

        const { password: __, ...updatedUserWithoutPassword } = updatedUser;
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updatedUserWithoutPassword)
        };

      case 'DELETE':
        // Delete user (admin only or self-deletion)
        if (authPayload.role !== 'admin' && authPayload.userId !== userId) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Forbidden' })
          };
        }

        const [deletedUser] = await db
          .delete(users)
          .where(eq(users.id, userId))
          .returning();
          
        if (!deletedUser) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'User not found' })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'User deleted', id: userId })
        };

      default:
        return {
          statusCode: 405,
          headers: { ...headers, 'Allow': 'GET, PUT, PATCH, DELETE' },
          body: JSON.stringify({ error: `Method ${event.httpMethod} not allowed` })
        };
    }
  } catch (error) {
    console.error('User API error:', error);
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