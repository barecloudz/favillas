import { Handler } from '@netlify/functions';
import { authenticateToken, isStaff } from './_shared/auth';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    console.log('=== DEBUG UPLOAD AUTH ===');
    console.log('Headers:', JSON.stringify(event.headers, null, 2));
    console.log('Cookies:', event.headers.cookie);

    // Parse all cookies
    const cookies = event.headers.cookie;
    const allCookies: { [key: string]: string } = {};

    if (cookies) {
      cookies.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && value) {
          allCookies[name] = value;
        }
      });
    }

    console.log('Parsed cookies:', allCookies);

    // Test authentication
    const authPayload = authenticateToken(event);
    console.log('Auth payload:', authPayload);

    // Test staff check
    const isStaffUser = isStaff(authPayload);
    console.log('Is staff:', isStaffUser);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        debug: {
          hasAuthHeader: !!event.headers.authorization,
          hasCookies: !!event.headers.cookie,
          allCookies: allCookies,
          authPayload: authPayload,
          isStaff: isStaffUser,
          message: authPayload
            ? (isStaffUser ? 'Authentication successful' : 'User is not staff')
            : 'No authentication found'
        }
      })
    };

  } catch (error: any) {
    console.error('Debug auth error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};