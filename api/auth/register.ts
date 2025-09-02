import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users } from '../../shared/schema';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import { awardSignupPoints } from '../utils/rewards';

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

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || 'http://localhost:3000';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, email, password, firstName, lastName, role, marketingOptIn } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  try {
    const db = getDB();
    
    // Check if username already exists
    const [existingUser] = await db.select().from(users).where(eq(users.username, username));
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Check if email already exists
    const [existingEmail] = await db.select().from(users).where(eq(users.email, email));
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const hashedPassword = await hashPassword(password);

    const [newUser] = await db.insert(users).values({
      username,
      email,
      password: hashedPassword,
      firstName: firstName || '',
      lastName: lastName || '',
      role: role || 'customer',
      isActive: true,
      marketingOptIn: marketingOptIn !== undefined ? marketingOptIn : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
    }

    const token = jwt.sign(
      { 
        userId: newUser.id, 
        username: newUser.username, 
        role: newUser.role 
      },
      jwtSecret,
      { expiresIn: '7d' }
    );

    const { password: _, ...userWithoutPassword } = newUser;

    // Award signup points for customer accounts
    let signupPointsAwarded = 0;
    if (newUser.role === 'customer') {
      try {
        signupPointsAwarded = await awardSignupPoints(newUser.id);
        console.log(`Awarded ${signupPointsAwarded} signup points to user ${newUser.id}`);
      } catch (pointsError) {
        // Log error but don't fail registration
        console.error(`Error awarding signup points to user ${newUser.id}:`, pointsError);
      }
    }

    return res.status(201).json({
      user: userWithoutPassword,
      token,
      signupPointsAwarded,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}