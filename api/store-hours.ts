import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { storeHours } from '../shared/schema';
import jwt from 'jsonwebtoken';

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
    types: {
      bigint: postgres.BigInt,
    },
  });

  dbConnection = drizzle(sql, { schema: { storeHours } });
  return dbConnection;
}

function authenticateToken(event: any): { userId: number; username: string; role: string } | null {
  // First try to get token from Authorization header
  let token = null;
  const authHeader = event.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // If no token in header, try to get from cookies
  if (!token) {
    const cookies = event.headers.cookie;
    if (cookies) {
      const authCookie = cookies.split(';').find(cookie => cookie.trim().startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }
  }

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
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const db = getDB();

    if (event.httpMethod === 'GET') {
      // Get all store hours
      const hours = await db.select().from(storeHours).orderBy(storeHours.dayOfWeek);

      // If no hours exist, create default hours for all days
      if (hours.length === 0) {
        const defaultHours = [];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        for (let i = 0; i < 7; i++) {
          const defaultHour = {
            dayOfWeek: i,
            dayName: dayNames[i],
            isOpen: true,
            openTime: '11:00',
            closeTime: '22:00',
            isBreakTime: false,
            breakStartTime: null,
            breakEndTime: null,
          };
          defaultHours.push(defaultHour);
        }

        // Insert default hours
        await db.insert(storeHours).values(defaultHours);

        // Return the default hours
        const newHours = await db.select().from(storeHours).orderBy(storeHours.dayOfWeek);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(newHours)
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(hours)
      };

    } else if (event.httpMethod === 'PUT') {
      // Update store hours - requires admin authentication
      const authPayload = authenticateToken(event);
      if (!authPayload) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized' })
        };
      }

      // Only admin can update store hours
      if (!['admin', 'manager', 'super_admin'].includes(authPayload.role)) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Forbidden - Admin access required' })
        };
      }

      // Extract day ID from URL path
      const urlParts = event.path?.split('/') || [];
      const dayOfWeek = urlParts[urlParts.length - 1];

      if (!dayOfWeek || isNaN(parseInt(dayOfWeek))) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid day of week' })
        };
      }

      const hoursData = JSON.parse(event.body || '{}');

      // Validate required fields
      if (typeof hoursData.isOpen !== 'boolean') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'isOpen field is required and must be boolean' })
        };
      }

      // Update the store hours for the specific day
      const updatedHours = await db
        .update(storeHours)
        .set({
          isOpen: hoursData.isOpen,
          openTime: hoursData.openTime || null,
          closeTime: hoursData.closeTime || null,
          isBreakTime: hoursData.isBreakTime || false,
          breakStartTime: hoursData.breakStartTime || null,
          breakEndTime: hoursData.breakEndTime || null,
          updatedAt: new Date(),
        })
        .where(eq(storeHours.dayOfWeek, parseInt(dayOfWeek)))
        .returning();

      if (updatedHours.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Store hours for this day not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedHours[0])
      };

    } else if (event.httpMethod === 'POST') {
      // Create or update multiple store hours - requires admin authentication
      const authPayload = authenticateToken(event);
      if (!authPayload) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized' })
        };
      }

      // Only admin can update store hours
      if (!['admin', 'manager', 'super_admin'].includes(authPayload.role)) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Forbidden - Admin access required' })
        };
      }

      const hoursDataArray = JSON.parse(event.body || '[]');

      if (!Array.isArray(hoursDataArray)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Request body must be an array of store hours' })
        };
      }

      const results = [];

      for (const hoursData of hoursDataArray) {
        if (typeof hoursData.dayOfWeek !== 'number' || hoursData.dayOfWeek < 0 || hoursData.dayOfWeek > 6) {
          continue; // Skip invalid days
        }

        const updatedHours = await db
          .update(storeHours)
          .set({
            isOpen: hoursData.isOpen || true,
            openTime: hoursData.openTime || '11:00',
            closeTime: hoursData.closeTime || '22:00',
            isBreakTime: hoursData.isBreakTime || false,
            breakStartTime: hoursData.breakStartTime || null,
            breakEndTime: hoursData.breakEndTime || null,
            updatedAt: new Date(),
          })
          .where(eq(storeHours.dayOfWeek, hoursData.dayOfWeek))
          .returning();

        if (updatedHours.length > 0) {
          results.push(updatedHours[0]);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(results)
      };

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }
  } catch (error) {
    console.error('Store hours API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};