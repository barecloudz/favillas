import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, isStaff } from './_shared/auth';

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
  console.log('🚀 DELIVERY ZONES API CALLED');
  console.log('📋 Request Method:', event.httpMethod);
  console.log('📋 Request Path:', event.path);
  console.log('📋 Request Headers:', JSON.stringify(event.headers, null, 2));
  console.log('📋 Request Body:', event.body);

  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  };

  console.log('🌐 CORS Headers set:', JSON.stringify(headers, null, 2));

  if (event.httpMethod === 'OPTIONS') {
    console.log('✅ OPTIONS request - returning CORS headers');
    return { statusCode: 200, headers, body: '' };
  }

  console.log('🔐 Starting authentication...');
  const authPayload = await authenticateToken(event);

  if (!authPayload) {
    console.log('❌ Authentication failed - no valid token');
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  console.log('✅ Authentication successful:', authPayload);

  if (!isStaff(authPayload)) {
    console.log('❌ Authorization failed - insufficient role:', authPayload.role);
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Admin access required' })
    };
  }

  console.log('✅ Authorization successful - user has admin access');

  try {
    console.log('🗄️ Connecting to database...');
    const sql = getDB();
    console.log('✅ Database connection established');

    if (event.httpMethod === 'GET') {
      console.log('📊 Fetching delivery zones...');
      const zonesRaw = await sql`SELECT * FROM delivery_zones ORDER BY sort_order`;
      console.log('✅ Zones fetched:', zonesRaw.length, 'zones found');
      console.log('🔍 Raw zones data:', JSON.stringify(zonesRaw, null, 2));

      console.log('⚙️ Fetching delivery settings...');
      const settingsRaw = await sql`SELECT * FROM delivery_settings LIMIT 1`;
      console.log('✅ Settings fetched:', settingsRaw.length, 'settings found');
      console.log('🔍 Raw settings data:', JSON.stringify(settingsRaw, null, 2));

      console.log('🔄 Converting zones from snake_case to camelCase...');
      // Convert snake_case to camelCase for zones
      const zones = zonesRaw.map(zone => ({
        id: zone.id,
        name: zone.name,
        maxRadius: zone.max_radius,
        deliveryFee: zone.delivery_fee,
        isActive: zone.is_active,
        sortOrder: zone.sort_order,
        createdAt: zone.created_at,
        updatedAt: zone.updated_at
      }));

      // Convert snake_case to camelCase for settings
      const settings = settingsRaw[0] ? {
        id: settingsRaw[0].id,
        restaurantAddress: settingsRaw[0].restaurant_address,
        restaurantLat: settingsRaw[0].restaurant_lat,
        restaurantLng: settingsRaw[0].restaurant_lng,
        googleMapsApiKey: settingsRaw[0].google_maps_api_key,
        maxDeliveryRadius: settingsRaw[0].max_delivery_radius,
        distanceUnit: settingsRaw[0].distance_unit,
        isGoogleMapsEnabled: settingsRaw[0].is_google_maps_enabled,
        fallbackDeliveryFee: settingsRaw[0].fallback_delivery_fee,
        createdAt: settingsRaw[0].created_at,
        updatedAt: settingsRaw[0].updated_at
      } : {
        restaurantAddress: '5 Regent Park Blvd, Asheville, NC 28806',
        maxDeliveryRadius: '10',
        distanceUnit: 'miles',
        isGoogleMapsEnabled: true,
        fallbackDeliveryFee: '5.00'
      };

      console.log('✅ Data conversion complete');
      console.log('📤 Final zones data:', JSON.stringify(zones, null, 2));
      console.log('📤 Final settings data:', JSON.stringify(settings, null, 2));

      const responseData = { zones, settings };
      console.log('🚀 Sending successful response:', JSON.stringify(responseData, null, 2));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(responseData)
      };

    } else if (event.httpMethod === 'POST') {
      const zoneData = JSON.parse(event.body || '{}');

      const [newZoneRaw] = await sql`
        INSERT INTO delivery_zones (name, max_radius, delivery_fee, is_active, sort_order)
        VALUES (${zoneData.name}, ${zoneData.maxRadius}, ${zoneData.deliveryFee}, ${zoneData.isActive !== undefined ? zoneData.isActive : true}, ${zoneData.sortOrder || 0})
        RETURNING *
      `;

      const newZone = {
        id: newZoneRaw.id,
        name: newZoneRaw.name,
        maxRadius: newZoneRaw.max_radius,
        deliveryFee: newZoneRaw.delivery_fee,
        isActive: newZoneRaw.is_active,
        sortOrder: newZoneRaw.sort_order,
        createdAt: newZoneRaw.created_at,
        updatedAt: newZoneRaw.updated_at
      };

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(newZone)
      };

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

  } catch (error) {
    console.error('❌ CRITICAL ERROR in admin delivery zones API:');
    console.error('Error object:', error);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch delivery zones',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    };
  }
};