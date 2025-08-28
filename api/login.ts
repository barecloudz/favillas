import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../server/db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
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
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        message: 'Username and password are required' 
      });
    }

    // Find user by username or email
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1)
      .then(rows => rows[0]);

    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isValidPassword = await comparePasswords(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Return user data (excluding password)
    const { password: _, ...userWithoutPassword } = user;
    
    return res.status(200).json({
      message: 'Login successful',
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}