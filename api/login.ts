import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';

const scryptAsync = promisify(scrypt);

// Define users table inline - comprehensive schema
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

// Database connection - self-contained
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

async function comparePasswords(supplied: string, stored: string) {
  try {
    const [hashed, salt] = stored.split(".");
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Login attempt started');
    console.log('Environment check - DATABASE_URL exists:', !!process.env.DATABASE_URL);

    const { username, password } = req.body;

    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ 
        message: 'Username and password are required' 
      });
    }

    console.log('Querying user:', username);
    
    // Get database connection
    const db = getDB();
    
    // Find user by username
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1)
      .then(rows => rows[0]);

    console.log('User found:', !!user);
    console.log('User object keys:', user ? Object.keys(user) : 'no user');
    console.log('User data:', user ? JSON.stringify(user, null, 2) : 'no user');

    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isValidPassword = await comparePasswords(password, user.password);
    console.log('Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    console.log('User authenticated successfully');
    
    // Return user data (excluding password) with safe handling
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
    res.setHeader('Set-Cookie', `auth-token=${token}; HttpOnly; Secure=${process.env.NODE_ENV === 'production'}; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`);
    
    // Frontend expects just the user object, not nested in a response
    return res.status(200).json(safeUser);
    
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
}