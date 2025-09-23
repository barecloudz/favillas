import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || 'http://localhost:5173',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ message: 'Method not allowed' }) };
  }

  try {
    const { username, password } = JSON.parse(event.body || '{}');

    // Admin credentials for production
    if (username === 'superadmin' && password === 'superadmin123') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          id: 1,
          username: 'superadmin',
          email: 'superadmin@favillas.com',
          firstName: 'Super',
          lastName: 'Admin',
          role: 'super_admin',
          isAdmin: true,
          isActive: true,
          rewards: 0
        })
      };
    }

    // Fallback admin credentials
    if (username === 'admin' && password === 'admin123456') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          id: 2,
          username: 'admin',
          email: 'admin@favillas.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          isAdmin: true,
          isActive: true,
          rewards: 0
        })
      };
    }

    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ message: 'Invalid credentials' })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Internal server error' })
    };
  }
};