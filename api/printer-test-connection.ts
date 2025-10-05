import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const { ipAddress, port } = JSON.parse(event.body || '{}');

    if (!ipAddress || !port) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          message: 'Missing required fields: ipAddress, port' 
        })
      };
    }

    // For now, just return success
    // TODO: Implement actual printer connection test when printer server is available
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully connected to printer at ${ipAddress}:${port}`
      })
    };

  } catch (error) {
    console.error('Printer test connection error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}
