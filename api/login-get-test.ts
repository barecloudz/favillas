import { Handler } from '@netlify/functions';
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
    keep_alive: false,
  });
  
  dbConnection = drizzle(sql);
  return dbConnection;
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const urlParams = new URLSearchParams(event.rawQuery || '');
    const username = urlParams.get('username');
    const password = urlParams.get('password');

    if (!username || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          message: 'Username and password query parameters required',
          example: '/api/login-get-test?username=superadmin&password=password'
        })
      };
    }

    console.log('GET Login attempt:', username);
    
    const db = getDB();
    
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1)
      .then(rows => rows[0]);

    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          message: 'Invalid credentials - user not found' 
        })
      };
    }

    // For testing, let's see what we get without password validation first
    const { password: _, ...userWithoutPassword } = user;
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'User found (password check skipped for GET test)',
        user: userWithoutPassword,
        debug: {
          isAdmin: user.isAdmin,
          role: user.role,
          hasPassword: !!user.password
        }
      })
    };
    
  } catch (error) {
    console.error('GET Login error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}