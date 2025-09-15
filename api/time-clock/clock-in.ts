import { Handler } from '@netlify/functions';
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

function authenticateToken(event: any): { userId: number; username: string; role: string } | null {
  const authHeader = event.headers.authorization;
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

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
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

  const authPayload = authenticateToken(event);
  if (!authPayload) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
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
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          message: 'Already clocked in',
          clockInTime: existingEntry[0].clock_in_time
        })
      };
    }

    // Create new clock in entry
    const result = await sql`
      INSERT INTO time_tracking (user_id, clock_in_time, created_at)
      VALUES (${authPayload.userId}, NOW(), NOW())
      RETURNING *
    `;

    const clockInEntry = result[0];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Clocked in successfully',
        clockInTime: clockInEntry.clock_in_time,
        entryId: clockInEntry.id
      })
    };

  } catch (error: any) {
    console.error('Clock in error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error.message 
      })
    };
  }
}