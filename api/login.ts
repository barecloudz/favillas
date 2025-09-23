import { Handler } from '@netlify/functions';
import jwt from 'jsonwebtoken';

export const handler: Handler = async (event, context) => {
  console.log('🚀 Login function called:', {
    method: event.httpMethod,
    origin: event.headers.origin,
    hasBody: !!event.body,
    bodyLength: event.body?.length || 0
  });

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
    console.log('🔐 Login attempt:', { username: username || 'MISSING', hasPassword: !!password });

    // Admin credentials for production
    if (username === 'superadmin' && password === 'superadmin123') {
      const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
      if (!jwtSecret) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Server configuration error' })
        };
      }

      const userPayload = {
        userId: 1,
        username: 'superadmin',
        role: 'super_admin'
      };

      const token = jwt.sign(userPayload, jwtSecret, { expiresIn: '7d' });

      // Set cookie for authentication - always use Secure for Netlify production
      const cookieOptions = `auth-token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax; Secure`;

      console.log('🍪 Setting cookie for superadmin:', {
        origin: event.headers.origin,
        host: event.headers.host,
        cookieOptions: cookieOptions.replace(token, 'TOKEN_HIDDEN'),
        tokenLength: token.length
      });

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Set-Cookie': cookieOptions
        },
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
      const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
      if (!jwtSecret) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ message: 'Server configuration error' })
        };
      }

      const userPayload = {
        userId: 2,
        username: 'admin',
        role: 'admin'
      };

      const token = jwt.sign(userPayload, jwtSecret, { expiresIn: '7d' });

      // Set cookie for authentication
      const isProduction = event.headers.origin?.includes('netlify.app') || event.headers.origin?.includes('favillasnypizza');
      const cookieOptions = `auth-token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax${isProduction ? '; Secure' : ''}`;

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Set-Cookie': cookieOptions
        },
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