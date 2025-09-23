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
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();
    console.log('🔍 Testing admin delivery zones API');

    // Get delivery zones and settings using raw SQL
    const zones = await sql`SELECT * FROM delivery_zones ORDER BY sort_order`;
    console.log('✅ Zones:', zones.length);

    const settings = await sql`SELECT * FROM delivery_settings LIMIT 1`;
    console.log('✅ Settings:', settings.length);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        zones,
        settings: settings[0] || {
          restaurantAddress: '',
          maxDeliveryRadius: '10',
          distanceUnit: 'miles',
          isGoogleMapsEnabled: false,
          fallbackDeliveryFee: '5.00'
        }
      })
    };

  } catch (error) {
    console.error('❌ Test admin delivery zones error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    };
  }
};