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

      // Check if we already have 3 zones (limit)
      const existingZones = await sql`SELECT COUNT(*) as count FROM delivery_zones`;
      const zoneCount = parseInt(existingZones[0].count);

      if (zoneCount >= 3) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Maximum of 3 delivery zones allowed',
            currentCount: zoneCount,
            maxAllowed: 3
          })
        };
      }

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

    } else if (event.httpMethod === 'PUT') {
      const requestData = JSON.parse(event.body || '{}');

      // Check if this is a settings update or zone update
      if (requestData.type === 'settings') {
        console.log('⚙️ Updating delivery settings...');

        const {
          restaurantAddress,
          googleMapsApiKey,
          maxDeliveryRadius,
          distanceUnit,
          isGoogleMapsEnabled,
          fallbackDeliveryFee
        } = requestData;

        console.log('🔄 Updating settings with data:', {
          restaurantAddress,
          googleMapsApiKey: googleMapsApiKey ? '[REDACTED]' : undefined,
          maxDeliveryRadius,
          distanceUnit,
          isGoogleMapsEnabled,
          fallbackDeliveryFee
        });

        // Try to update existing settings, or insert if none exist
        const existingSettings = await sql`SELECT id FROM delivery_settings LIMIT 1`;

        let updatedSettingsRaw;

        if (existingSettings.length > 0) {
          // Update existing settings
          updatedSettingsRaw = await sql`
            UPDATE delivery_settings
            SET
              restaurant_address = ${restaurantAddress || ''},
              google_maps_api_key = ${googleMapsApiKey || ''},
              max_delivery_radius = ${maxDeliveryRadius || '10'},
              distance_unit = ${distanceUnit || 'miles'},
              is_google_maps_enabled = ${isGoogleMapsEnabled || false},
              fallback_delivery_fee = ${fallbackDeliveryFee || '5.00'},
              updated_at = NOW()
            WHERE id = ${existingSettings[0].id}
            RETURNING *
          `;
        } else {
          // Insert new settings
          updatedSettingsRaw = await sql`
            INSERT INTO delivery_settings (
              restaurant_address, google_maps_api_key, max_delivery_radius,
              distance_unit, is_google_maps_enabled, fallback_delivery_fee,
              created_at, updated_at
            ) VALUES (
              ${restaurantAddress || ''},
              ${googleMapsApiKey || ''},
              ${maxDeliveryRadius || '10'},
              ${distanceUnit || 'miles'},
              ${isGoogleMapsEnabled || false},
              ${fallbackDeliveryFee || '5.00'},
              NOW(),
              NOW()
            )
            RETURNING *
          `;
        }

        const updatedSettings = {
          id: updatedSettingsRaw[0].id,
          restaurantAddress: updatedSettingsRaw[0].restaurant_address,
          restaurantLat: updatedSettingsRaw[0].restaurant_lat,
          restaurantLng: updatedSettingsRaw[0].restaurant_lng,
          googleMapsApiKey: updatedSettingsRaw[0].google_maps_api_key,
          maxDeliveryRadius: updatedSettingsRaw[0].max_delivery_radius,
          distanceUnit: updatedSettingsRaw[0].distance_unit,
          isGoogleMapsEnabled: updatedSettingsRaw[0].is_google_maps_enabled,
          fallbackDeliveryFee: updatedSettingsRaw[0].fallback_delivery_fee,
          createdAt: updatedSettingsRaw[0].created_at,
          updatedAt: updatedSettingsRaw[0].updated_at
        };

        console.log('✅ Settings updated successfully');

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updatedSettings)
        };

      } else {
        // Handle zone update
        console.log('✏️ Updating delivery zone...');

        const { id, name, maxRadius, deliveryFee, isActive, sortOrder } = requestData;

        if (!id) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Zone ID is required for updates' })
          };
        }

        console.log('🔄 Updating zone with data:', { id, name, maxRadius, deliveryFee, isActive, sortOrder });

        const updatedZoneRaw = await sql`
          UPDATE delivery_zones
          SET
            name = ${name},
            max_radius = ${maxRadius},
            delivery_fee = ${deliveryFee},
            is_active = ${isActive !== undefined ? isActive : true},
            sort_order = ${sortOrder || 0},
            updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;

        if (updatedZoneRaw.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Delivery zone not found' })
          };
        }

        const updatedZone = {
          id: updatedZoneRaw[0].id,
          name: updatedZoneRaw[0].name,
          maxRadius: updatedZoneRaw[0].max_radius,
          deliveryFee: updatedZoneRaw[0].delivery_fee,
          isActive: updatedZoneRaw[0].is_active,
          sortOrder: updatedZoneRaw[0].sort_order,
          createdAt: updatedZoneRaw[0].created_at,
          updatedAt: updatedZoneRaw[0].updated_at
        };

        console.log('✅ Zone updated successfully:', updatedZone);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updatedZone)
        };
      }

    } else if (event.httpMethod === 'DELETE') {
      console.log('🗑️ Processing DELETE request...');

      // Check if this is a delete by ID (query parameter) or delete all
      const zoneId = event.queryStringParameters?.id;

      if (zoneId) {
        console.log('🗑️ Deleting individual delivery zone:', zoneId);

        const deletedZone = await sql`
          DELETE FROM delivery_zones
          WHERE id = ${zoneId}
          RETURNING *
        `;

        if (deletedZone.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Delivery zone not found' })
          };
        }

        console.log('✅ Individual zone deleted:', deletedZone[0]);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: `Successfully deleted delivery zone: ${deletedZone[0].name}`,
            deletedZone: {
              id: deletedZone[0].id,
              name: deletedZone[0].name,
              maxRadius: deletedZone[0].max_radius,
              deliveryFee: deletedZone[0].delivery_fee,
              isActive: deletedZone[0].is_active,
              sortOrder: deletedZone[0].sort_order
            }
          })
        };
      } else {
        console.log('🗑️ Deleting all delivery zones...');

        // Delete all delivery zones
        const deletedZones = await sql`DELETE FROM delivery_zones RETURNING *`;
        console.log('✅ Deleted zones:', deletedZones.length, 'zones deleted');

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: `Successfully deleted ${deletedZones.length} delivery zones`,
            deletedCount: deletedZones.length
          })
        };
      }

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