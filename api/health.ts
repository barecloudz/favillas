import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // Simple health check endpoint for monitoring
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    // Cache health check for 1 minute to reduce load
    'Cache-Control': 'public, max-age=60, s-maxage=60'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod === 'GET') {
    // Basic health check - could be extended to check database connectivity
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'healthy',
        service: 'pizza-spin-rewards-api',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        version: process.env.BUILD_ID || 'unknown'
      })
    };
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ message: 'Method not allowed' })
  };
};