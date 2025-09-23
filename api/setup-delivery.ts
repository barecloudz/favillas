import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const db = getDB();

    // Check if delivery settings exist
    const existingSettings = await db.select().from(deliverySettings).limit(1);

    if (existingSettings.length === 0) {
      // Create default delivery settings
      await db.insert(deliverySettings).values({
        restaurantAddress: "Favilla's NY Pizza, 123 Main St, New York, NY",
        maxDeliveryRadius: "10.0",
        distanceUnit: "miles",
        isGoogleMapsEnabled: true,
        fallbackDeliveryFee: "5.00"
      });
    } else {
      // Update existing settings to enable Google Maps
      await db
        .update(deliverySettings)
        .set({
          isGoogleMapsEnabled: true,
          restaurantAddress: existingSettings[0].restaurantAddress || "Favilla's NY Pizza, 123 Main St, New York, NY"
        })
        .where(eq(deliverySettings.id, existingSettings[0].id));
    }

    // Check if delivery zones exist
    const existingZones = await db.select().from(deliveryZones);

    if (existingZones.length === 0) {
      // Create default delivery zones
      await db.insert(deliveryZones).values([
        {
          name: "Close Range",
          maxRadius: "3.0",
          deliveryFee: "3.99",
          isActive: true,
          sortOrder: 1
        },
        {
          name: "Standard Range",
          maxRadius: "6.0",
          deliveryFee: "5.99",
          isActive: true,
          sortOrder: 2
        },
        {
          name: "Extended Range",
          maxRadius: "10.0",
          deliveryFee: "7.99",
          isActive: true,
          sortOrder: 3
        }
      ]);
    }

    // Get final configuration
    const finalSettings = await db.select().from(deliverySettings).limit(1);
    const finalZones = await db.select().from(deliveryZones).where(eq(deliveryZones.isActive, true));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Delivery system setup complete',
        settings: finalSettings[0],
        zones: finalZones,
        googleMapsApiKeyConfigured: !!process.env.GOOGLE_MAPS_API_KEY
      })
    };

  } catch (error) {
    console.error('Setup delivery system error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Setup failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};