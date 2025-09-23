import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { deliveryZones, deliverySettings } from '../shared/schema';
import { asc, eq } from 'drizzle-orm';

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

// Function to calculate distance using Google Maps Distance Matrix API
async function calculateDistance(origin: string, destination: string, apiKey: string): Promise<number> {
  const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&units=imperial&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      throw new Error(`Google Maps API error: ${data.status}`);
    }

    const element = data.rows[0]?.elements[0];
    if (!element || element.status !== 'OK') {
      throw new Error(`Distance calculation failed: ${element?.status || 'Unknown error'}`);
    }

    // Convert meters to miles (1 meter = 0.000621371 miles)
    const distanceInMeters = element.distance.value;
    const distanceInMiles = distanceInMeters * 0.000621371;

    return distanceInMiles;
  } catch (error) {
    console.error('Google Maps API error:', error);
    throw error;
  }
}

// Function to determine delivery fee based on distance and zones
function calculateDeliveryFee(distance: number, zones: any[], fallbackFee: number): { fee: number; zone: any | null } {
  // Sort zones by radius (closest first)
  const sortedZones = zones.sort((a, b) => parseFloat(a.maxRadius) - parseFloat(b.maxRadius));

  // Find the appropriate zone
  for (const zone of sortedZones) {
    if (distance <= parseFloat(zone.maxRadius)) {
      return {
        fee: parseFloat(zone.deliveryFee),
        zone: zone
      };
    }
  }

  // If distance exceeds all zones, return null (delivery not available)
  return {
    fee: 0,
    zone: null
  };
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    const { address } = JSON.parse(event.body || '{}');

    if (!address) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Address is required' })
      };
    }

    const db = getDB();

    // Get delivery settings
    const [settings] = await db.select().from(deliverySettings).limit(1);
    if (!settings) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Delivery settings not configured' })
      };
    }

    // Get active delivery zones
    const zones = await db
      .select()
      .from(deliveryZones)
      .where(deliveryZones.isActive.eq(true))
      .orderBy(asc(deliveryZones.sortOrder));

    // Get Google Maps API key from environment or database settings
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || settings.googleMapsApiKey;

    if (!settings.isGoogleMapsEnabled || !googleMapsApiKey) {
      // Return fallback fee if Google Maps is disabled or no API key available
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          distance: null,
          deliveryFee: parseFloat(settings.fallbackDeliveryFee),
          zone: null,
          isEstimate: true,
          message: 'Delivery fee calculated using fallback pricing'
        })
      };
    }

    // Calculate distance using Google Maps
    let distance: number;
    try {
      distance = await calculateDistance(
        settings.restaurantAddress,
        address,
        googleMapsApiKey
      );
    } catch (error) {
      // Fallback to default fee if API fails
      console.error('Google Maps API failed, using fallback fee:', error);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          distance: null,
          deliveryFee: parseFloat(settings.fallbackDeliveryFee),
          zone: null,
          isEstimate: true,
          message: 'Delivery fee calculated using fallback pricing (API unavailable)'
        })
      };
    }

    // Check if distance exceeds maximum delivery radius
    if (distance > parseFloat(settings.maxDeliveryRadius)) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          distance,
          deliveryFee: 0,
          zone: null,
          isEstimate: false,
          message: `Delivery not available. Address is ${distance.toFixed(2)} miles away (max: ${settings.maxDeliveryRadius} miles)`
        })
      };
    }

    // Calculate delivery fee based on zones
    const { fee, zone } = calculateDeliveryFee(distance, zones, parseFloat(settings.fallbackDeliveryFee));

    if (!zone) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          distance,
          deliveryFee: 0,
          zone: null,
          isEstimate: false,
          message: `Delivery not available to this location (${distance.toFixed(2)} miles)`
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
        deliveryFee: fee,
        zone: {
          id: zone.id,
          name: zone.name,
          maxRadius: zone.maxRadius
        },
        isEstimate: false,
        message: `Delivery available to ${zone.name} (${distance.toFixed(2)} miles away)`
      })
    };

  } catch (error) {
    console.error('Delivery fee calculation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};