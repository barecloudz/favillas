import { Handler } from '@netlify/functions';
import { authenticateToken } from './utils/auth';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🧪 AUTH UTILS TEST: Testing utils/auth.ts authenticateToken function');

    // Test the authentication function directly
    const authResult = await authenticateToken(
      event.headers.authorization || event.headers.Authorization,
      event.headers.cookie || event.headers.Cookie
    );

    console.log('🧪 AUTH UTILS TEST: Auth result:', authResult);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        testName: 'Auth Utils Test',
        authResult,
        headers: {
          authorization: event.headers.authorization || event.headers.Authorization,
          cookie: event.headers.cookie || event.headers.Cookie
        },
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('🧪 AUTH UTILS TEST: Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Auth utils test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};