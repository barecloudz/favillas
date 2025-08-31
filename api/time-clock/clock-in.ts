import { VercelRequest, VercelResponse } from '@vercel/node';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';

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

  const authPayload = authenticateToken(req);
  if (!authPayload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const sql = getDB();

    // Check if user is already clocked in
    const existingEntry = await sql`
      SELECT * FROM time_tracking 
      WHERE user_id = ${authPayload.userId} AND clock_out_time IS NULL
      ORDER BY clock_in_time DESC 
      LIMIT 1
    `;

    if (existingEntry.length > 0) {
      return res.status(400).json({ 
        message: 'Already clocked in',
        clockInTime: existingEntry[0].clock_in_time
      });
    }

    // Create new clock in entry
    const result = await sql`
      INSERT INTO time_tracking (user_id, clock_in_time, created_at)
      VALUES (${authPayload.userId}, NOW(), NOW())
      RETURNING *
    `;

    const clockInEntry = result[0];

    return res.status(200).json({
      message: 'Clocked in successfully',
      clockInTime: clockInEntry.clock_in_time,
      entryId: clockInEntry.id
    });

  } catch (error: any) {
    console.error('Clock in error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}