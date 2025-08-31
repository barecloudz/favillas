import { VercelRequest, VercelResponse } from '@vercel/node';
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
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
    const { firstName, lastName, email, phone, address, password } = req.body;
    
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        message: 'Missing required fields: firstName, lastName, email, password' 
      });
    }

    const sql = getDB();
    
    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM users WHERE email = ${email}
    `;
    
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    // Hash password
    const salt = randomBytes(16).toString('hex');
    const hashedPassword = (await scryptAsync(password, salt, 64)) as Buffer;
    const passwordHash = `${hashedPassword.toString('hex')}.${salt}`;
    
    // Create user
    const result = await sql`
      INSERT INTO users (first_name, last_name, email, phone, address, password_hash, role, is_active)
      VALUES (${firstName}, ${lastName}, ${email}, ${phone || ''}, ${address || ''}, ${passwordHash}, 'customer', true)
      RETURNING id, first_name, last_name, email, phone, address, role, is_active, created_at
    `;
    
    const user = result[0];
    
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
    
    res.json(safeUser);
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}