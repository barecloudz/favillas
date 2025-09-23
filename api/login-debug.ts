import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  console.log('Debug login endpoint hit');

  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || 'http://localhost:5173',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
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
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    console.log('Processing login request');
    const requestData = JSON.parse(event.body || '{}');
    console.log('Request data received:', { username: requestData.username, hasPassword: !!requestData.password });

    // Just return a simple test response without database lookup
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Debug login endpoint working',
        receivedData: {
          username: requestData.username,
          hasPassword: !!requestData.password
        }
      })
    };

  } catch (error) {
    console.error('Debug login error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Debug login error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};