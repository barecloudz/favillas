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

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Get coordinates from address using a geocoding service
async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // For production, you'd use Google Geocoding API, MapBox, or similar
    // For now, we'll use a simple regex to extract coordinates if they're provided
    // or return null to indicate we need coordinates from the frontend

    // This is a fallback - in production you'd implement proper geocoding
    console.log(`🗺️ Geocoding address: ${address}`);
    return null; // Frontend should provide coordinates
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
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
    const { address, latitude, longitude, zipCode } = JSON.parse(event.body || '{}');

    if (!address && (!latitude || !longitude)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Address or coordinates required',
          details: 'Provide either address string or latitude/longitude coordinates'
        })
      };
    }

    const sql = getDB();

    // Get store location
    const storeResult = await sql`
      SELECT latitude, longitude, address, store_name
      FROM store_settings
      ORDER BY id
      LIMIT 1
    `;

    if (storeResult.length === 0) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Store location not configured' })
      };
    }

    const store = storeResult[0];
    let deliveryLat: number;
    let deliveryLng: number;

    // Use provided coordinates or try to geocode address
    if (latitude && longitude) {
      deliveryLat = parseFloat(latitude);
      deliveryLng = parseFloat(longitude);
    } else {
      const coords = await geocodeAddress(address);
      if (!coords) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Unable to determine delivery location',
            details: 'Please provide latitude and longitude coordinates with your address'
          })
        };
      }
      deliveryLat = coords.lat;
      deliveryLng = coords.lng;
    }

    // Calculate distance from store to delivery address
    const distance = calculateDistance(
      parseFloat(store.latitude),
      parseFloat(store.longitude),
      deliveryLat,
      deliveryLng
    );

    console.log(`📍 Distance calculation: ${distance} miles from ${store.store_name} to ${address || `${latitude}, ${longitude}`}`);

    // Check if address is within delivery range
    const maxDeliveryDistance = 10.0;
    if (distance > maxDeliveryDistance) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          canDeliver: false,
          distance,
          maxDistance: maxDeliveryDistance,
          deliveryFee: 0,
          estimatedTime: 0,
          message: `Sorry, we don't deliver to locations more than ${maxDeliveryDistance} miles away. You are ${distance} miles from our store.`
        })
      };
    }

    // Check for blackout areas by zip code
    if (zipCode) {
      const blackoutResult = await sql`
        SELECT area_name, reason
        FROM delivery_blackouts
        WHERE is_active = true
        AND ${zipCode} = ANY(zip_codes)
        LIMIT 1
      `;

      if (blackoutResult.length > 0) {
        const blackout = blackoutResult[0];
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            canDeliver: false,
            distance,
            deliveryFee: 0,
            estimatedTime: 0,
            message: `Sorry, we don't currently deliver to ${blackout.area_name}. ${blackout.reason || ''}`
          })
        };
      }
    }

    // Find appropriate delivery zone
    const zoneResult = await sql`
      SELECT zone_name, delivery_fee, estimated_time_minutes
      FROM delivery_zones
      WHERE is_active = true
      AND ${distance} >= min_distance_miles
      AND ${distance} < max_distance_miles
      ORDER BY min_distance_miles
      LIMIT 1
    `;

    if (zoneResult.length === 0) {
      // Fallback to highest zone if no exact match
      const fallbackZone = await sql`
        SELECT zone_name, delivery_fee, estimated_time_minutes
        FROM delivery_zones
        WHERE is_active = true
        ORDER BY max_distance_miles DESC
        LIMIT 1
      `;

      if (fallbackZone.length === 0) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'No delivery zones configured' })
        };
      }

      const zone = fallbackZone[0];
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          canDeliver: true,
          distance,
          deliveryFee: parseFloat(zone.delivery_fee),
          estimatedTime: zone.estimated_time_minutes,
          zoneName: zone.zone_name,
          message: `Delivery available to your area (${distance} miles away)`
        })
      };
    }

    const zone = zoneResult[0];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        canDeliver: true,
        distance,
        deliveryFee: parseFloat(zone.delivery_fee),
        estimatedTime: zone.estimated_time_minutes,
        zoneName: zone.zone_name,
        message: `Delivery available to your area (${distance} miles away)`
      })
    };

  } catch (error: any) {
    console.error('💥 Delivery fee calculation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};