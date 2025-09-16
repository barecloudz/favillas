import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const netlifyUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;

  console.log('=== GOOGLE OAUTH DEBUG ===');
  console.log('GOOGLE_CLIENT_ID exists:', !!googleClientId);
  console.log('GOOGLE_CLIENT_ID length:', googleClientId?.length || 0);
  console.log('NETLIFY_URL:', netlifyUrl);
  console.log('Request headers host:', event.headers.host);
  console.log('Request headers x-forwarded-proto:', event.headers['x-forwarded-proto']);

  if (!googleClientId) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Google OAuth not configured - GOOGLE_CLIENT_ID missing',
        debug: {
          hasClientId: !!googleClientId,
          netlifyUrl,
          host: event.headers.host
        }
      })
    };
  }

  // Build the callback URL more reliably for Netlify
  let baseUrl;
  if (netlifyUrl) {
    baseUrl = netlifyUrl;
  } else if (event.headers.host) {
    const protocol = event.headers['x-forwarded-proto'] || 'https';
    baseUrl = `${protocol}://${event.headers.host}`;
  } else {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Unable to determine base URL for OAuth callback',
        debug: {
          netlifyUrl,
          host: event.headers.host,
          protocol: event.headers['x-forwarded-proto']
        }
      })
    };
  }

  const callbackUrl = `${baseUrl}/api/auth/google/callback`;

  console.log('Base URL:', baseUrl);
  console.log('Callback URL:', callbackUrl);
  console.log('Client ID (first 10 chars):', googleClientId.substring(0, 10));

  // Google OAuth URL
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', googleClientId);
  googleAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'email profile');
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'consent');

  console.log('Final OAuth URL:', googleAuthUrl.toString());
  console.log('=== END DEBUG ===');

  // Redirect to Google OAuth
  return {
    statusCode: 302,
    headers: {
      ...headers,
      'Location': googleAuthUrl.toString()
    },
    body: ''
  };
}