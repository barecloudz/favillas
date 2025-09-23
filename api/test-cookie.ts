import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || 'http://localhost:5173',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Test cookie setting
  const testCookie = 'test-auth=test-token-12345; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax; Secure';

  console.log('🧪 Test cookie setting:', {
    origin: event.headers.origin,
    headers: Object.keys(event.headers),
    cookie: testCookie
  });

  return {
    statusCode: 200,
    headers: {
      ...headers,
      'Set-Cookie': testCookie
    },
    body: JSON.stringify({
      message: 'Test cookie set',
      cookie: testCookie,
      timestamp: new Date().toISOString()
    })
  };
};