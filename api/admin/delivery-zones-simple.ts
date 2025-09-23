import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';

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
  let token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    const cookies = event.headers.cookie;
    if (cookies) {
      const authCookie = cookies.split(';').find((c: string) => c.trim().startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }
  }

  if (!token) return null;

  try {
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) throw new Error('JWT_SECRET or SESSION_SECRET required');
    const payload = jwt.verify(token, jwtSecret) as { userId: number; username: string; role: string };
    return payload;
  } catch (error) {
    return null;
  }
}

export const handler: Handler = async (event, context) => {
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const authPayload = authenticateToken(event);
  if (!authPayload) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  if (authPayload.role !== 'admin' && authPayload.role !== 'super_admin') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Admin access required' })
    };
  }

  console.log('✅ Admin authenticated:', authPayload.username, authPayload.role);

  try {
    const sql = getDB();
    console.log('✅ Database connection established');

    if (event.httpMethod === 'GET') {
      console.log('🔍 Fetching delivery zones and settings...');

      // Get delivery zones
      let zones = [];
      try {
        zones = await sql`SELECT * FROM delivery_zones ORDER BY sort_order`;
        console.log('✅ Found', zones.length, 'delivery zones');
      } catch (error) {
        console.error('❌ Error fetching zones:', error);
        zones = [];
      }

      // Get delivery settings
      let settings = null;
      try {
        const settingsResult = await sql`SELECT * FROM delivery_settings LIMIT 1`;
        settings = settingsResult[0] || null;
        console.log('✅ Found delivery settings:', !!settings);
      } catch (error) {
        console.error('❌ Error fetching settings:', error);
        settings = null;
      }

      const response = {
        zones,
        settings: settings || {
          id: null,
          restaurantAddress: '5 Regent Park Blvd, Asheville, NC 28806',
          maxDeliveryRadius: '10',
          distanceUnit: 'miles',
          isGoogleMapsEnabled: true,
          fallbackDeliveryFee: '5.00'
        }
      };

      console.log('✅ Returning response with', zones.length, 'zones and settings');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response)
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed for simple endpoint' })
    };

  } catch (error) {
    console.error('❌ Admin delivery zones API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch delivery zones',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};