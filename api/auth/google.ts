import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const vercelUrl = process.env.VERCEL_URL;
  
  if (!googleClientId) {
    return res.status(500).json({ 
      message: 'Google OAuth not configured - GOOGLE_CLIENT_ID missing' 
    });
  }

  // Build the callback URL
  const baseUrl = vercelUrl 
    ? `https://${vercelUrl}` 
    : `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;
  
  const callbackUrl = `${baseUrl}/api/auth/google/callback`;

  // Google OAuth URL
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleAuthUrl.searchParams.set('client_id', googleClientId);
  googleAuthUrl.searchParams.set('redirect_uri', callbackUrl);
  googleAuthUrl.searchParams.set('response_type', 'code');
  googleAuthUrl.searchParams.set('scope', 'email profile');
  googleAuthUrl.searchParams.set('access_type', 'offline');
  googleAuthUrl.searchParams.set('prompt', 'consent');

  console.log('Redirecting to Google OAuth:', googleAuthUrl.toString());
  console.log('Callback URL:', callbackUrl);

  // Redirect to Google OAuth
  res.redirect(302, googleAuthUrl.toString());
}