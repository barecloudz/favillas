import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const vercelUrl = process.env.VERCEL_URL;
  
  const baseUrl = vercelUrl 
    ? `https://${vercelUrl}` 
    : `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`;

  return res.status(200).json({
    message: 'Google OAuth Configuration Test',
    config: {
      hasClientId: !!googleClientId,
      hasClientSecret: !!googleClientSecret,
      clientIdLength: googleClientId?.length || 0,
      baseUrl,
      callbackUrl: `${baseUrl}/api/auth/google/callback`,
      loginUrl: `${baseUrl}/api/auth/google`
    },
    instructions: [
      'Set GOOGLE_CLIENT_ID in environment variables',
      'Set GOOGLE_CLIENT_SECRET in environment variables',
      'Configure OAuth callback URL in Google Console',
      'Test by visiting /api/auth/google'
    ]
  });
}