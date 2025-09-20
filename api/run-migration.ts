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

    console.log('🔗 Running delivery settings migration...');

    // Create store_settings table
    await sql`
      CREATE TABLE IF NOT EXISTS store_settings (
        id SERIAL PRIMARY KEY,
        store_name VARCHAR(255) NOT NULL DEFAULT 'Favillas NY Pizza',
        address TEXT NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        phone VARCHAR(20),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create delivery_zones table
    await sql`
      CREATE TABLE IF NOT EXISTS delivery_zones (
        id SERIAL PRIMARY KEY,
        zone_name VARCHAR(100) NOT NULL,
        min_distance_miles DECIMAL(4, 2) NOT NULL DEFAULT 0.0,
        max_distance_miles DECIMAL(4, 2) NOT NULL,
        delivery_fee DECIMAL(6, 2) NOT NULL,
        estimated_time_minutes INTEGER NOT NULL DEFAULT 30,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Create delivery_blackouts table
    await sql`
      CREATE TABLE IF NOT EXISTS delivery_blackouts (
        id SERIAL PRIMARY KEY,
        area_name VARCHAR(255) NOT NULL,
        zip_codes TEXT[],
        reason VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    // Insert store location
    await sql`
      INSERT INTO store_settings (store_name, address, latitude, longitude, phone) VALUES
      ('Favillas NY Pizza', '5 Regent Park Blvd #107, Asheville, NC 28806', 35.59039, -82.58198, '(828) 225-2885')
      ON CONFLICT DO NOTHING
    `;

    // Insert delivery zones with new pricing
    await sql`
      INSERT INTO delivery_zones (zone_name, min_distance_miles, max_distance_miles, delivery_fee, estimated_time_minutes) VALUES
      ('Close Zone', 0.0, 5.0, 6.99, 30),
      ('Medium Zone', 5.0, 8.0, 9.49, 40),
      ('Far Zone', 8.0, 10.0, 11.99, 50)
      ON CONFLICT DO NOTHING
    `;

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_delivery_zones_distance ON delivery_zones(min_distance_miles, max_distance_miles)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON delivery_zones(is_active)`;

    // Verify the results
    const zones = await sql`SELECT * FROM delivery_zones ORDER BY min_distance_miles`;
    const store = await sql`SELECT * FROM store_settings LIMIT 1`;

    console.log('✅ Migration completed successfully!');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Migration completed successfully',
        deliveryZones: zones,
        storeLocation: store[0]
      })
    };

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
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