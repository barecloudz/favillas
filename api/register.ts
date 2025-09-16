import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { scrypt, randomBytes } from 'crypto';
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

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
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
    const { firstName, lastName, email, phone, address, password } = JSON.parse(event.body || '{}');
    
    if (!firstName || !lastName || !email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          message: 'Missing required fields: firstName, lastName, email, password' 
        })
      };
    }

    const sql = getDB();
    
    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;
    
    if (existingUser.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'User already exists with this email' })
      };
    }
    
    // Hash password
    const salt = randomBytes(16).toString('hex');
    const hashedPassword = (await scryptAsync(password, salt, 64)) as Buffer;
    const passwordHash = `${hashedPassword.toString('hex')}.${salt}`;
    
    // Create user with proper points initialization
    const result = await sql.begin(async (sql: any) => {
      // Create user
      const userResult = await sql`
        INSERT INTO users (first_name, last_name, email, phone, address, password_hash, role, is_active, rewards, created_at, updated_at)
        VALUES (${firstName}, ${lastName}, ${email}, ${phone || ''}, ${address || ''}, ${passwordHash}, 'customer', true, 0, NOW(), NOW())
        RETURNING id, first_name, last_name, email, phone, address, role, is_active, created_at
      `;
      
      const user = userResult[0];
      
      // Initialize user_points record with 0 points
      await sql`
        INSERT INTO user_points (user_id, points, total_earned, total_redeemed, created_at, updated_at)
        VALUES (${user.id}, 0, 0, 0, NOW(), NOW())
      `;
      
      // Create initial transaction record for audit trail
      await sql`
        INSERT INTO points_transactions (user_id, type, points, description, created_at)
        VALUES (${user.id}, 'signup', 0, 'User account created with 0 points', NOW())
      `;
      
      return user;
    });
    
    const user = result;
    
    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
    }
    
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.email,
        role: user.role 
      },
      jwtSecret,
      { expiresIn: '7d' }
    );
    
    // Return user data without password
    const safeUser = {
      id: user.id,
      username: user.email,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      address: user.address,
      role: user.role,
      isActive: user.is_active,
      createdAt: user.created_at,
      token
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(safeUser)
    };
  } catch (error: any) {
    console.error('Registration error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error.message 
      })
    };
  }
};