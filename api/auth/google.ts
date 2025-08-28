import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const vercelUrl = process.env.VERCEL_URL;
  
  console.log('=== GOOGLE OAUTH DEBUG ===');
  console.log('GOOGLE_CLIENT_ID exists:', !!googleClientId);
  console.log('GOOGLE_CLIENT_ID length:', googleClientId?.length || 0);
  console.log('VERCEL_URL:', vercelUrl);
  console.log('Request headers host:', req.headers.host);
  console.log('Request headers x-forwarded-proto:', req.headers['x-forwarded-proto']);
  
  if (!googleClientId) {
    return res.status(500).json({ 
      message: 'Google OAuth not configured - GOOGLE_CLIENT_ID missing',
      debug: {
        hasClientId: !!googleClientId,
        vercelUrl,
        host: req.headers.host
      }
    });
  }

  // Build the callback URL more reliably
  let baseUrl;
  if (vercelUrl) {
    baseUrl = `https://${vercelUrl}`;
  } else if (req.headers.host) {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    baseUrl = `${protocol}://${req.headers.host}`;
  } else {
    return res.status(500).json({
      message: 'Unable to determine base URL for OAuth callback',
      debug: {
        vercelUrl,
        host: req.headers.host,
        protocol: req.headers['x-forwarded-proto']
      }
    });
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
  res.redirect(302, googleAuthUrl.toString());
}