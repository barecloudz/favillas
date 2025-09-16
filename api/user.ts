import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';

// Define users table inline
const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  googleId: text("google_id").unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  role: text("role").default("customer").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  rewards: integer("rewards").default(0).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  marketingOptIn: boolean("marketing_opt_in").default(true).notNull(),
});

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
  
  dbConnection = drizzle(sql);
  return dbConnection;
}

export const handler: Handler = async (event, context) => {
  // Set CORS headers - include credentials for cookie support
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  try {
    // Try to get token from Authorization header first, then cookies
    let token = null;
    
    // Check Authorization header
    const authHeader = event.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
      console.log('Token found in Authorization header');
    } else {
      // Check cookies as fallback
      const cookies = event.headers.cookie;
      if (cookies) {
        const tokenMatch = cookies.match(/auth-token=([^;]+)/);
        if (tokenMatch) {
          token = tokenMatch[1];
          console.log('Token found in cookies');
        }
      }
    }
    
    console.log('Token found:', !!token);
    
    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'No authentication token' })
      };
    }
    
    const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET or SESSION_SECRET not configured');
    }

    // Verify JWT token
    const decoded = jwt.verify(token, secret) as any;
    console.log('Decoded JWT:', decoded);

    // Get fresh user data from database
    const db = getDB();
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, decoded.userId))
      .limit(1)
      .then(rows => rows[0]);

    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'User not found' })
      };
    }

    // Return user data (excluding password)
    const { password: _, ...userWithoutPassword } = user;
    
    // Ensure we have required fields with defaults
    const safeUser = {
      id: userWithoutPassword.id,
      username: userWithoutPassword.username || 'unknown',
      email: userWithoutPassword.email || 'no-email',
      firstName: userWithoutPassword.firstName || 'Unknown',
      lastName: userWithoutPassword.lastName || 'User',
      role: userWithoutPassword.role || 'customer',
      isAdmin: userWithoutPassword.isAdmin || false,
      isActive: userWithoutPassword.isActive !== false,
      rewards: userWithoutPassword.rewards || 0,
      createdAt: userWithoutPassword.createdAt,
      marketingOptIn: userWithoutPassword.marketingOptIn !== false
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(safeUser)
    };

  } catch (error) {
    console.error('Auth verification error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'Invalid authentication token' })
      };
    }
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};