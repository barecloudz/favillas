import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { eq } from 'drizzle-orm';
import postgres from 'postgres';

// Define users table inline
const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").default("customer").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  rewards: integer("rewards").default(0).notNull(),
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { username, password } = req.query;

    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Username and password query parameters required',
        example: '/api/login-get-test?username=superadmin&password=password'
      });
    }

    console.log('GET Login attempt:', username);
    
    const db = getDB();
    
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, username as string))
      .limit(1)
      .then(rows => rows[0]);

    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid credentials - user not found' 
      });
    }

    // For testing, let's see what we get without password validation first
    const { password: _, ...userWithoutPassword } = user;
    
    return res.status(200).json({
      message: 'User found (password check skipped for GET test)',
      user: userWithoutPassword,
      debug: {
        isAdmin: user.isAdmin,
        role: user.role,
        hasPassword: !!user.password
      }
    });
    
  } catch (error) {
    console.error('GET Login error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}