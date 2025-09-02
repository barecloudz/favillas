import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  // Clear the auth token cookie
  const isProduction = process.env.NODE_ENV === 'production';
  headers['Set-Cookie'] = `auth-token=; HttpOnly; Secure=${isProduction}; SameSite=${isProduction ? 'Strict' : 'Lax'}; Path=/; Max-Age=0`;
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'Logged out successfully' })
  };
};