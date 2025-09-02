import { VercelRequest, VercelResponse } from '@vercel/node';
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  const origin = req.headers.origin || 'http://localhost:5001';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Login attempt started');

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Username and password are required' 
      });
    }

    console.log('Attempting login for username:', username);
    
    // Get database connection
    const sql = getDB();
    
    // Query the actual database structure - handle the messy schema
    const users = await sql`
      SELECT 
        COALESCE(id::integer, (id::text)::integer) as id,
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

    console.log('Query executed, found users:', users.length);

    if (users.length === 0) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    const user = users[0];
    console.log('User found:', !!user, 'Has password:', !!user.password);

    // Check password
    const isValidPassword = await comparePasswords(password, user.password);
    console.log('Password validation result:', isValidPassword);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
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
    
    console.log('Safe user object created for:', safeUser.username);
    
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
      { expiresIn: '7d' }
    );
    
    // Set token as HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.setHeader('Set-Cookie', `auth-token=${token}; HttpOnly; Secure=${isProduction}; SameSite=${isProduction ? 'Strict' : 'Lax'}; Path=/; Max-Age=${7 * 24 * 60 * 60}`);
    
    return res.status(200).json(safeUser);
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
}