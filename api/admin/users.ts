import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, like, or } from 'drizzle-orm';
import { users } from '../../shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';

const scryptAsync = promisify(scrypt);

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
  
  dbConnection = drizzle(sql, { schema: { users } });
  return dbConnection;
}

function authenticateToken(req: VercelRequest): { userId: number; username: string; role: string } | null {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || 'http://localhost:3000';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authPayload = authenticateToken(req);
  if (!authPayload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only admin can manage all users
  if (authPayload.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }

  try {
    const db = getDB();

    if (req.method === 'GET') {
      const { search, role, active } = req.query;
      
      let query = db.select({
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

      // Apply filters
      const conditions = [];
      
      if (search) {
        conditions.push(
          or(
            like(users.username, `%${search}%`),
            like(users.email, `%${search}%`),
            like(users.firstName, `%${search}%`),
            like(users.lastName, `%${search}%`)
          )
        );
      }
      
      if (role) {
        conditions.push(eq(users.role, role as string));
      }
      
      if (active !== undefined) {
        conditions.push(eq(users.isActive, active === 'true'));
      }
      
      if (conditions.length > 0) {
        query = query.where(conditions.length === 1 ? conditions[0] : conditions.reduce((acc, condition) => acc && condition));
      }
      
      const allUsers = await query;
      
      return res.status(200).json(allUsers);
      
    } else if (req.method === 'POST') {
      // Create new user
      const userData = req.body;
      
      // Check if username already exists
      const [existingUser] = await db.select().from(users).where(eq(users.username, userData.username));
      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      // Check if email already exists
      const [existingEmail] = await db.select().from(users).where(eq(users.email, userData.email));
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already exists' });
      }

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
      return res.status(201).json(userWithoutPassword);
      
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Admin users API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}