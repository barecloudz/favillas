import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  console.log('🔍 Debug endpoint called successfully');

  try {
    const zones = [
      { id: 1, name: "Test Zone", maxRadius: "5.0", deliveryFee: "3.99", isActive: true, sortOrder: 1 }
    ];

    const settings = {
      restaurantAddress: "Test Address",
      maxDeliveryRadius: "10",
      distanceUnit: "miles",
      isGoogleMapsEnabled: false,
      fallbackDeliveryFee: "5.00"
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ zones, settings, debug: true })
    };

  } catch (error) {
    console.error('❌ Debug error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Debug endpoint failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};