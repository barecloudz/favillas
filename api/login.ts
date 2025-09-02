import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';

const scryptAsync = promisify(scrypt);

// Database connection
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

async function comparePasswords(supplied: string, stored: string) {
  try {
    if (!stored) return false;
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) return false;
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    console.log('Login attempt started');
    console.log('Environment check - DATABASE_URL exists:', !!process.env.DATABASE_URL);

    const { username, password } = JSON.parse(event.body || '{}');

    if (!username || !password) {
      console.log('Missing username or password');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          message: 'Username and password are required' 
        })
      };
    }

    console.log('Attempting login for username:', username);
    
    // Get database connection
    const sql = getDB();
    
    // Query user data - simplified query
    const users = await sql`
      SELECT 
        id,
        username,
        password,
        email,
        first_name,
        last_name,
        phone,
        address,
        city,
        state,
        zip_code,
        role,
        is_admin,
        is_active,
        rewards,
        stripe_customer_id,
        marketing_opt_in,
        created_at
      FROM users 
      WHERE username = ${username}
      LIMIT 1
    `;

    const user = users[0];

    console.log('User found:', !!user, 'Has password:', !!user.password);

    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          message: 'Invalid credentials' 
        })
      };
    }

    console.log('User found:', !!user, 'Has password:', !!user.password);

    // Check password
    const isValidPassword = await comparePasswords(password, user.password);
    console.log('Password validation result:', isValidPassword);
    
    if (!isValidPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          message: 'Invalid credentials' 
        })
      };
    }

    console.log('Login successful for user:', user.username);
    
    // Return user data (excluding password)
    const safeUser = {
      id: user.id,
      username: user.username || 'unknown',
      email: user.email || 'no-email',
      firstName: user.first_name || 'Unknown',
      lastName: user.last_name || 'User',
      phone: user.phone || null,
      address: user.address || null,
      city: user.city || null,
      state: user.state || null,
      zipCode: user.zip_code || null,
      role: user.role || 'customer',
      isAdmin: user.is_admin || false,
      isActive: user.is_active !== false,
      rewards: user.rewards || 0,
      stripeCustomerId: user.stripe_customer_id || null,
      marketingOptIn: user.marketing_opt_in !== false,
      createdAt: user.created_at
    };
    
    console.log('Safe user object:', JSON.stringify(safeUser, null, 2));
    
    // Create JWT token
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      throw new Error('SESSION_SECRET not configured');
    }
    
    const token = jwt.sign(
      { 
        userId: safeUser.id,
        username: safeUser.username,
        role: safeUser.role,
        isAdmin: safeUser.isAdmin 
      },
      secret,
      { expiresIn: '7d' } // Token expires in 7 days
    );
    
    // Set token as HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieHeader = `auth-token=${token}; HttpOnly; Secure=${isProduction}; SameSite=${isProduction ? 'Strict' : 'Lax'}; Path=/; Max-Age=${7 * 24 * 60 * 60}`;
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Set-Cookie': cookieHeader
      },
      body: JSON.stringify(safeUser)
    };
    
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      })
    };
  }
};