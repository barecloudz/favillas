import { Handler } from '@netlify/functions';
import postgres from 'postgres';

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

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    // Cache for 5 minutes to reduce load
    'Cache-Control': 'public, max-age=300, s-maxage=300'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const sql = getDB();

    // Get pickup time setting
    const settings = await sql`
      SELECT setting_value FROM admin_settings
      WHERE setting_key = 'pickup_time_minutes'
    `;

    const pickupTimeMinutes = settings.length > 0 ? parseInt(settings[0].setting_value) : 25;

    // Calculate pickup time from now
    const now = new Date();
    const pickupTime = new Date(now.getTime() + (pickupTimeMinutes * 60 * 1000));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        pickupTimeMinutes,
        estimatedPickupTime: pickupTime.toISOString(),
        formattedPickupTime: pickupTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      })
    };

  } catch (error: any) {
    console.error('Pickup time API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        // Fallback to default 25 minutes
        pickupTimeMinutes: 25,
        estimatedPickupTime: new Date(Date.now() + 25 * 60 * 1000).toISOString()
      })
    };
  }
};