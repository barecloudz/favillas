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
  // Check for JWT token in Authorization header first
  const authHeader = event.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // If no Authorization header, check for auth-token cookie
  if (!token) {
    const cookies = event.headers.cookie;
    if (cookies) {
      const authCookie = cookies.split(';').find((c: string) => c.trim().startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }
  }

  if (!token) {
    return null;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
    }

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
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Temporarily disable auth completely for debugging
  console.log('🔍 Starting delivery zones API handler');

  try {
    console.log('🔍 About to process request method:', event.httpMethod);

    if (event.httpMethod === 'GET') {
      console.log('🔍 Simple delivery zones fetch...');

      // Return hardcoded data first to test if the issue is with database queries
      const zones = [
        {
          id: 1,
          name: "Close Range",
          maxRadius: "3.0",
          deliveryFee: "2.99",
          isActive: true,
          sortOrder: 1
        },
        {
          id: 2,
          name: "Medium Range",
          maxRadius: "6.0",
          deliveryFee: "4.99",
          isActive: true,
          sortOrder: 2
        },
        {
          id: 3,
          name: "Far Range",
          maxRadius: "10.0",
          deliveryFee: "7.99",
          isActive: true,
          sortOrder: 3
        }
      ];

      const settings = {
        id: 1,
        restaurantAddress: "5 Regent Park Blvd, Asheville, NC 28806",
        maxDeliveryRadius: "10",
        distanceUnit: "miles",
        isGoogleMapsEnabled: true,
        fallbackDeliveryFee: "5.00"
      };

      console.log('✅ Returning hardcoded data for testing');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          zones,
          settings
        })
      };

    } else if (event.httpMethod === 'POST') {
      // Create new delivery zone
      const zoneData = JSON.parse(event.body || '{}');

      const [newZoneRaw] = await sql`
        INSERT INTO delivery_zones (name, max_radius, delivery_fee, is_active, sort_order)
        VALUES (${zoneData.name}, ${zoneData.maxRadius}, ${zoneData.deliveryFee}, ${zoneData.isActive !== undefined ? zoneData.isActive : true}, ${zoneData.sortOrder || 0})
        RETURNING *
      `;

      // Convert snake_case to camelCase
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
      // Update delivery zone or settings
      const updateData = JSON.parse(event.body || '{}');

      if (updateData.type === 'settings') {
        // Update delivery settings
        const existingSettings = await sql`SELECT * FROM delivery_settings LIMIT 1`;

        if (existingSettings.length === 0) {
          // Create new settings
          const [newSettings] = await sql`
            INSERT INTO delivery_settings (
              restaurant_address, restaurant_lat, restaurant_lng, google_maps_api_key,
              max_delivery_radius, distance_unit, is_google_maps_enabled, fallback_delivery_fee
            ) VALUES (
              ${updateData.restaurantAddress}, ${updateData.restaurantLat}, ${updateData.restaurantLng}, ${updateData.googleMapsApiKey},
              ${updateData.maxDeliveryRadius}, ${updateData.distanceUnit}, ${updateData.isGoogleMapsEnabled}, ${updateData.fallbackDeliveryFee}
            ) RETURNING *
          `;

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(newSettings)
          };
        } else {
          // Update existing settings
          const [updatedSettings] = await sql`
            UPDATE delivery_settings
            SET restaurant_address = ${updateData.restaurantAddress},
                restaurant_lat = ${updateData.restaurantLat},
                restaurant_lng = ${updateData.restaurantLng},
                google_maps_api_key = ${updateData.googleMapsApiKey},
                max_delivery_radius = ${updateData.maxDeliveryRadius},
                distance_unit = ${updateData.distanceUnit},
                is_google_maps_enabled = ${updateData.isGoogleMapsEnabled},
                fallback_delivery_fee = ${updateData.fallbackDeliveryFee},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ${existingSettings[0].id}
            RETURNING *
          `;

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(updatedSettings)
          };
        }
      } else {
        // Update delivery zone
        const zoneId = updateData.id;
        const [updatedZone] = await sql`
          UPDATE delivery_zones
          SET name = ${updateData.name},
              max_radius = ${updateData.maxRadius},
              delivery_fee = ${updateData.deliveryFee},
              is_active = ${updateData.isActive},
              sort_order = ${updateData.sortOrder},
              updated_at = CURRENT_TIMESTAMP
          WHERE id = ${zoneId}
          RETURNING *
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updatedZone)
        };
      }

    } else if (event.httpMethod === 'DELETE') {
      // Delete delivery zone
      const { id } = JSON.parse(event.body || '{}');

      await sql`DELETE FROM delivery_zones WHERE id = ${id}`;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true })
      };

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }
  } catch (error) {
    console.error('Delivery zones API error:', error);
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