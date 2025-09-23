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

    console.log('🚚 Running delivery zones migration...');

    // Create delivery_settings table (matching our schema)
    await sql`
      CREATE TABLE IF NOT EXISTS delivery_settings (
        id SERIAL PRIMARY KEY,
        restaurant_address TEXT NOT NULL,
        restaurant_lat DECIMAL(10, 8),
        restaurant_lng DECIMAL(11, 8),
        google_maps_api_key TEXT,
        max_delivery_radius DECIMAL(8, 2) NOT NULL DEFAULT 10,
        distance_unit VARCHAR(20) NOT NULL DEFAULT 'miles',
        is_google_maps_enabled BOOLEAN NOT NULL DEFAULT FALSE,
        fallback_delivery_fee DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create delivery_zones table (matching our schema)
    await sql`
      CREATE TABLE IF NOT EXISTS delivery_zones (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        max_radius DECIMAL(8, 2) NOT NULL,
        delivery_fee DECIMAL(10, 2) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Insert default delivery settings
    await sql`
      INSERT INTO delivery_settings (
        restaurant_address,
        max_delivery_radius,
        distance_unit,
        is_google_maps_enabled,
        fallback_delivery_fee
      ) VALUES (
        '5 Regent Park Blvd, Asheville, NC 28806',
        10.0,
        'miles',
        TRUE,
        5.00
      ) ON CONFLICT DO NOTHING
    `;

    // Insert default delivery zones (3-tier pricing as requested)
    await sql`
      INSERT INTO delivery_zones (name, max_radius, delivery_fee, is_active, sort_order) VALUES
      ('Close Range', 3.0, 2.99, TRUE, 1),
      ('Medium Range', 6.0, 4.99, TRUE, 2),
      ('Far Range', 10.0, 7.99, TRUE, 3)
      ON CONFLICT DO NOTHING
    `;

    // Add indexes for performance
    await sql`CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON delivery_zones(is_active)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_delivery_zones_sort_order ON delivery_zones(sort_order)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_delivery_zones_radius ON delivery_zones(max_radius)`;

    // Verify the results
    const zones = await sql`SELECT * FROM delivery_zones ORDER BY sort_order`;
    const settings = await sql`SELECT * FROM delivery_settings LIMIT 1`;

    console.log('✅ Delivery zones migration completed successfully!');
    console.log('📦 Created zones:', zones);
    console.log('⚙️ Settings:', settings[0]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Delivery zones migration completed successfully',
        deliveryZones: zones,
        deliverySettings: settings[0]
      })
    };

  } catch (error: any) {
    console.error('❌ Delivery zones migration failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Migration failed',
        details: error.message
      })
    };
  }
};