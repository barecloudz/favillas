import { Handler } from '@netlify/functions';
import { authenticateToken } from './_shared/auth';

export const handler: Handler = async (event, context) => {
  console.log('🧪 TEST-AUTH-TOKEN endpoint called');

  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🔑 Environment check:', {
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasSessionSecret: !!process.env.SESSION_SECRET,
      cookieHeader: event.headers.cookie ? 'present' : 'missing'
    });

    const authPayload = await authenticateToken(event);

    console.log('🔍 Auth result:', {
      authenticated: !!authPayload,
      role: authPayload?.role,
      username: authPayload?.username
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        authenticated: !!authPayload,
        user: authPayload ? {
          username: authPayload.username,
          role: authPayload.role,
          userId: authPayload.userId
        } : null,
        timestamp: new Date().toISOString(),
        environment: {
          hasJwtSecret: !!process.env.JWT_SECRET,
          hasSessionSecret: !!process.env.SESSION_SECRET
        }
      })
    };
  } catch (error) {
    console.error('🔥 Auth test error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Authentication test failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};