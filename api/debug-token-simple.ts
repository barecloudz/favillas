import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const authHeader = event.headers.authorization;
    let token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          error: 'No token provided',
          authHeader: authHeader || 'missing',
          hasBearer: authHeader?.includes('Bearer') || false
        })
      };
    }

    // Try to decode the token using EXACT same logic as user-rewards API
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

      const isSupabase = payload.iss && payload.iss.includes('supabase');
      const userId = isSupabase ? payload.sub : null;
      const numericId = isSupabase ? parseInt(userId.replace(/-/g, '').substring(0, 8), 16) : null;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          tokenLength: token.length,
          isSupabase: isSupabase,
          issuer: payload.iss,
          supabaseUserId: userId,
          numericUserId: numericId,
          email: payload.email,
          exp: payload.exp,
          iat: payload.iat
        })
      };
    } catch (decodeError) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          error: 'Token decode failed',
          tokenLength: token.length,
          tokenPreview: token.substring(0, 50) + '...',
          decodeError: decodeError instanceof Error ? decodeError.message : 'Unknown decode error'
        })
      };
    }
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