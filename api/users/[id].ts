import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authPayload = authenticateToken(req);
  if (!authPayload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.query;
  const userId = parseInt(id as string, 10);

  if (isNaN(userId)) {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  // Users can only access their own data unless they're admin
  if (authPayload.userId !== userId && authPayload.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const db = getDB();

    switch (req.method) {
      case 'GET':
        // Get single user
        const [user] = await db.select().from(users).where(eq(users.id, userId));
        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }
        
        const { password: _, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);

      case 'PUT':
      case 'PATCH':
        // Update user
        const updateData = req.body;
        
        // Hash password if it's being updated
        if (updateData.password) {
          updateData.password = await hashPassword(updateData.password);
        }

        const [updatedUser] = await db
          .update(users)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userId))
          .returning();
          
        if (!updatedUser) {
          return res.status(404).json({ error: 'User not found' });
        }

        const { password: __, ...updatedUserWithoutPassword } = updatedUser;
        return res.status(200).json(updatedUserWithoutPassword);

      case 'DELETE':
        // Delete user (admin only or self-deletion)
        if (authPayload.role !== 'admin' && authPayload.userId !== userId) {
          return res.status(403).json({ error: 'Forbidden' });
        }

        const [deletedUser] = await db
          .delete(users)
          .where(eq(users.id, userId))
          .returning();
          
        if (!deletedUser) {
          return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json({ message: 'User deleted', id: userId });

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('User API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}