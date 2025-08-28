import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const vercelUrl = process.env.VERCEL_URL;
  
  // Build the callback URL
  let baseUrl;
  if (vercelUrl) {
    baseUrl = `https://${vercelUrl}`;
  } else if (req.headers.host) {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    baseUrl = `${protocol}://${req.headers.host}`;
  } else {
    baseUrl = 'Unable to determine';
  }
  
  const callbackUrl = `${baseUrl}/api/auth/google/callback`;

  return res.status(200).json({
    message: 'Google OAuth Configuration Debug',
    timestamp: new Date().toISOString(),
    configuration: {
      hasClientId: !!googleClientId,
      hasClientSecret: !!googleClientSecret,
      clientIdLength: googleClientId?.length || 0,
      clientIdStart: googleClientId?.substring(0, 20) || 'missing',
      clientIdEnd: googleClientId?.substring(-20) || 'missing'
    },
    urls: {
      baseUrl,
      callbackUrl,
      loginUrl: `${baseUrl}/api/auth/google`,
      vercelUrl: vercelUrl || 'not set'
    },
    headers: {
      host: req.headers.host,
      protocol: req.headers['x-forwarded-proto'],
      userAgent: req.headers['user-agent']?.substring(0, 50)
    },
    instructions: {
      step1: 'Set GOOGLE_CLIENT_ID in Vercel environment variables',
      step2: 'Set GOOGLE_CLIENT_SECRET in Vercel environment variables', 
      step3: `Add this callback URL in Google Console: ${callbackUrl}`,
      step4: 'Make sure OAuth consent screen is configured',
      step5: 'Verify domain ownership in Google Console (if required)'
    },
    commonIssues: {
      invalidClient: 'Client ID doesn\'t match or callback URL not registered',
      unauthorizedDomain: 'Domain not added to authorized domains',
      consentScreen: 'OAuth consent screen not properly configured',
      environment: 'Environment variables not set in Vercel'
    }
  });
}