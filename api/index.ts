import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Simple API info endpoint
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ 
      message: 'Pizza Spin Rewards API', 
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      status: 'active',
      endpoints: {
        auth: '/api/auth/*',
        users: '/api/user',
        test: '/api/test'
      }
    })
  };
}