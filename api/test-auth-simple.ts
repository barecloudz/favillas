import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Just return what we receive without processing
    const authHeader = event.headers.authorization;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        received_auth_header: authHeader || 'missing',
        all_headers: event.headers,
        has_bearer: authHeader?.includes('Bearer'),
        token_length: authHeader?.split(' ')[1]?.length || 0
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};