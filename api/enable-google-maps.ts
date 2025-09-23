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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const sql = getDB();

    console.log('🗺️ Enabling Google Maps...');

    // Update delivery settings to enable Google Maps
    const result = await sql`
      UPDATE delivery_settings
      SET is_google_maps_enabled = TRUE,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = (SELECT id FROM delivery_settings LIMIT 1)
    `;

    // Get current settings
    const settings = await sql`SELECT * FROM delivery_settings LIMIT 1`;
    const zones = await sql`SELECT * FROM delivery_zones WHERE is_active = true ORDER BY sort_order`;

    console.log('✅ Google Maps enabled successfully!');
    console.log('⚙️ Current settings:', settings[0]);
    console.log('🗺️ Google Maps API Key available:', !!process.env.GOOGLE_MAPS_API_KEY);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Google Maps enabled successfully',
        settings: settings[0],
        zones: zones,
        googleMapsApiKeyConfigured: !!process.env.GOOGLE_MAPS_API_KEY,
        updateCount: result.count
      })
    };

  } catch (error: any) {
    console.error('❌ Failed to enable Google Maps:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to enable Google Maps',
        details: error.message
      })
    };
  }
};