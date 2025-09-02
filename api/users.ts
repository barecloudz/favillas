import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';

const scryptAsync = promisify(scrypt);

function authenticateToken(event: any): { userId: number; username: string; role: string } | null {
  // First try to get token from Authorization header
  let token = null;
  const authHeader = event.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  
  // If no token in header, try to get from cookies
  if (!token) {
    const cookies = event.headers.cookie;
    if (cookies) {
      const authCookie = cookies.split(';').find(cookie => cookie.trim().startsWith('auth-token='));
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
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

  const authPayload = authenticateToken(event);
  console.log('Auth payload:', authPayload);
  
  if (!authPayload) {
    console.log('No auth payload found');
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    // Import dependencies dynamically
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres = (await import('postgres')).default;
    const { users } = await import('../shared/schema');
    
    // Create database connection
    const sql = postgres(process.env.DATABASE_URL!, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
      types: {
        bigint: postgres.BigInt,
      },
    });
    
    const db = drizzle(sql);

    if (event.httpMethod === 'GET') {
      // Only admins can get all users
      if (authPayload.role !== 'admin') {
        await sql.end();
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Forbidden - Admin access required' })
        };
      }
      // Get all users (excluding passwords)
      const allUsers = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        role: users.role,
        isAdmin: users.isAdmin,
        isActive: users.isActive,
        rewards: users.rewards,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }).from(users);
      
      await sql.end();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(allUsers)
      };
    } else if (event.httpMethod === 'POST') {
      // Only admins can create users directly
      if (authPayload.role !== 'admin') {
        await sql.end();
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Forbidden - Admin access required' })
        };
      }

      // Create new user
      const userData = JSON.parse(event.body || '{}');
      
      // Hash password if provided
      if (userData.password) {
        userData.password = await hashPassword(userData.password);
      }

      const [newUser] = await db
        .insert(users)
        .values({
          ...userData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Remove password from response
      const { password: _, ...userWithoutPassword } = newUser;
      await sql.end();
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(userWithoutPassword)
      };
    } else {
      await sql.end();
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ message: 'Method not allowed' })
      };
    }
  } catch (error) {
    console.error('Users API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Failed to process users request',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};