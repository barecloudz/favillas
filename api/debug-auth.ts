import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const authHeader = event.headers.authorization;
    let token = authHeader && authHeader.split(' ')[1];

    console.log('🔍 Auth Debug:', {
      hasAuthHeader: !!authHeader,
      authHeaderPreview: authHeader?.substring(0, 50) + '...',
      hasToken: !!token,
      tokenLength: token?.length
    });

    if (!token) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          error: 'No token found',
          authHeader: authHeader ? 'present' : 'missing',
          headers: event.headers
        })
      };
    }

    // Try to decode token
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        // Add proper base64 padding if missing
        let payloadB64 = tokenParts[1];
        while (payloadB64.length % 4) {
          payloadB64 += '=';
        }

        const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());

        console.log('✅ Token decoded successfully:', payload);

        if (payload.iss && payload.iss.includes('supabase')) {
          const supabaseUserId = payload.sub;
          const numericUserId = parseInt(supabaseUserId.replace(/-/g, '').substring(0, 8), 16);

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              tokenValid: true,
              payload: payload,
              supabaseUserId: supabaseUserId,
              numericUserId: numericUserId,
              email: payload.email
            })
          };
        } else {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: false,
              error: 'Not a Supabase token',
              payload: payload
            })
          };
        }
      } else {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: false,
            error: 'Invalid token format',
            tokenParts: tokenParts.length
          })
        };
      }
    } catch (decodeError) {
      console.error('❌ Token decode error:', decodeError);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Token decode failed',
          details: decodeError instanceof Error ? decodeError.message : 'Unknown error'
        })
      };
    }

  } catch (error) {
    console.error('❌ Debug auth error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};