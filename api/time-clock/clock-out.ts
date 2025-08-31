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

    // Find the most recent clock in entry without clock out
    const clockInEntry = await sql`
      SELECT * FROM time_tracking 
      WHERE user_id = ${authPayload.userId} AND clock_out_time IS NULL
      ORDER BY clock_in_time DESC 
      LIMIT 1
    `;

    if (clockInEntry.length === 0) {
      return res.status(400).json({ 
        message: 'No active clock in entry found. Please clock in first.'
      });
    }

    const entry = clockInEntry[0];

    // Update the entry with clock out time
    const result = await sql`
      UPDATE time_tracking 
      SET clock_out_time = NOW(), updated_at = NOW()
      WHERE id = ${entry.id}
      RETURNING *
    `;

    const updatedEntry = result[0];

    // Calculate total hours worked
    const clockIn = new Date(updatedEntry.clock_in_time);
    const clockOut = new Date(updatedEntry.clock_out_time);
    const hoursWorked = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

    return res.status(200).json({
      message: 'Clocked out successfully',
      clockInTime: updatedEntry.clock_in_time,
      clockOutTime: updatedEntry.clock_out_time,
      hoursWorked: Math.round(hoursWorked * 100) / 100, // Round to 2 decimal places
      entryId: updatedEntry.id
    });

  } catch (error: any) {
    console.error('Clock out error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}