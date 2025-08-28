import { VercelRequest, VercelResponse } from '@vercel/node';
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
    keepalive: false,
  });
  
  dbConnection = drizzle(sql);
  return dbConnection;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers - include credentials for cookie support
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get token from cookies
    const cookies = req.headers.cookie;
    if (!cookies) {
      return res.status(401).json({ message: 'No authentication token' });
    }

    const tokenMatch = cookies.match(/auth-token=([^;]+)/);
    if (!tokenMatch) {
      return res.status(401).json({ message: 'No authentication token' });
    }

    const token = tokenMatch[1];
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      throw new Error('SESSION_SECRET not configured');
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
      return res.status(401).json({ message: 'User not found' });
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

    return res.status(200).json(safeUser);

  } catch (error) {
    console.error('Auth verification error:', error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid authentication token' });
    }
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}