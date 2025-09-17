import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  try {
    // Get auth header
    const authHeader = event.headers.authorization;
    let token = authHeader && authHeader.split(' ')[1];

    // Check for cookie as fallback - try multiple cookie names
    if (!token) {
      const cookies = event.headers.cookie;
      if (cookies) {
        console.log('🍪 Available cookies:', cookies.split(';').map(c => c.trim().split('=')[0]));

        // Try different cookie names that Supabase might use
        const cookieNames = ['auth-token', 'sb-access-token', 'supabase-auth-token', 'access-token', 'sb-auth-token'];

        for (const cookieName of cookieNames) {
          const authCookie = cookies.split(';').find((c: string) => c.trim().startsWith(cookieName + '='));
          if (authCookie) {
            token = authCookie.split('=')[1];
            console.log(`✅ Found token in cookie: ${cookieName}`);
            break;
          }
        }

        // If still no token, try to find any JWT-like cookie (contains dots)
        if (!token) {
          const jwtCookies = cookies.split(';').filter(c => c.includes('.') && c.split('.').length >= 3);
          if (jwtCookies.length > 0) {
            const jwtCookie = jwtCookies[0];
            token = jwtCookie.split('=')[1];
            console.log('🔍 Found JWT-like cookie:', jwtCookie.split('=')[0]);
          }
        }
      }
    }

    console.log('🔍 Auth test:', {
      hasAuthHeader: !!authHeader,
      authHeaderPreview: authHeader ? authHeader.substring(0, 50) + '...' : null,
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      tokenPreview: token ? token.substring(0, 50) + '...' : null,
      hasCookies: !!event.headers.cookie,
      cookiePreview: event.headers.cookie ? event.headers.cookie.substring(0, 100) + '...' : null
    });

    if (!token) {
      const cookieNames = event.headers.cookie
        ? event.headers.cookie.split(';').map(c => c.trim().split('=')[0])
        : [];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'No token found',
          authHeader: !!authHeader,
          cookies: !!event.headers.cookie,
          availableCookies: cookieNames,
          debug: {
            headers: Object.keys(event.headers),
            authHeaderExists: !!authHeader,
            cookieExists: !!event.headers.cookie,
            cookieCount: cookieNames.length
          }
        })
      };
    }

    // Try to decode token
    try {
      if (token && token.includes('.')) {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          // Add proper base64 padding if missing
          let payloadB64 = tokenParts[1];
          while (payloadB64.length % 4) {
            payloadB64 += '=';
          }

          const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());

          console.log('✅ Token decoded successfully:', {
            iss: payload.iss,
            sub: payload.sub ? payload.sub.substring(0, 8) + '...' : null,
            email: payload.email,
            exp: payload.exp,
            isSupabase: payload.iss && payload.iss.includes('supabase')
          });

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              status: 'Token decoded successfully',
              tokenInfo: {
                issuer: payload.iss,
                userIdPreview: payload.sub ? payload.sub.substring(0, 8) + '...' : null,
                email: payload.email,
                expiration: payload.exp,
                isSupabase: payload.iss && payload.iss.includes('supabase'),
                tokenType: payload.iss && payload.iss.includes('supabase') ? 'Supabase' : 'JWT'
              }
            })
          };
        }
      }
    } catch (decodeError) {
      console.error('❌ Token decode failed:', decodeError);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          status: 'Token decode failed',
          error: decodeError instanceof Error ? decodeError.message : 'Unknown decode error',
          tokenLength: token.length,
          tokenParts: token.split('.').length
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'Token found but invalid format',
        tokenLength: token.length,
        hasDotsInToken: token.includes('.'),
        tokenParts: token.split('.').length
      })
    };

  } catch (error) {
    console.error('❌ Auth test error:', error);
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