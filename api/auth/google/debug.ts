import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const vercelUrl = process.env.VERCEL_URL;
  
  // Build the callback URL
  let baseUrl;
  if (vercelUrl) {
    baseUrl = `https://${vercelUrl}`;
  } else if (event.headers.host) {
    const protocol = event.headers['x-forwarded-proto'] || 'https';
    baseUrl = `${protocol}://${event.headers.host}`;
  } else {
    baseUrl = 'Unable to determine';
  }
  
  const callbackUrl = `${baseUrl}/api/auth/google/callback`;

  return {
    statusCode: 200,
    body: JSON.stringify({
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
      host: event.headers.host,
      protocol: event.headers['x-forwarded-proto'],
      userAgent: event.headers['user-agent']?.substring(0, 50)
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
    })
  };
}