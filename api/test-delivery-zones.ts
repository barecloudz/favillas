import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, asc } from 'drizzle-orm';
import { deliveryZones, deliverySettings } from '../shared/schema';

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

  dbConnection = drizzle(sql, {
    schema: { deliveryZones, deliverySettings }
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
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const db = getDB();
    console.log('✅ Database connection established');

    // Test basic query first
    const zones = await db.select().from(deliveryZones).orderBy(asc(deliveryZones.sortOrder));
    console.log('✅ Zones query successful, found', zones.length, 'zones');

    const [settings] = await db.select().from(deliverySettings).limit(1);
    console.log('✅ Settings query successful, settings:', settings ? 'found' : 'not found');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        zones,
        settings: settings || {
          restaurantAddress: '',
          maxDeliveryRadius: '10',
          distanceUnit: 'miles',
          isGoogleMapsEnabled: false,
          fallbackDeliveryFee: '5.00'
        },
        debug: {
          zonesCount: zones.length,
          hasSettings: !!settings,
          databaseUrl: !!process.env.DATABASE_URL
        }
      })
    };

  } catch (error) {
    console.error('❌ Test delivery zones error:', error);
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