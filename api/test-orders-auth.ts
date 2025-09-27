import { Handler } from '@netlify/functions';
import jwt from 'jsonwebtoken';

function authenticateToken(event: any): { userId: number | null; supabaseUserId: string | null; username: string; role: string; isSupabase: boolean } | null {
  // Check for JWT token in Authorization header first
  const authHeader = event.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // If no Authorization header, check for auth-token cookie
  if (!token) {
    const cookies = event.headers.cookie;
    if (cookies) {
      const authCookie = cookies.split(';').find((c: string) => c.trim().startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }
  }

  if (!token) {
    return null;
  }

  try {
    // First try to decode as Supabase JWT token
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      console.log('🔍 TEST-ORDERS-AUTH: Supabase token payload:', payload);

      if (payload.iss && payload.iss.includes('supabase')) {
        // This is a Supabase token, extract user ID
        const supabaseUserId = payload.sub;
        console.log('✅ TEST-ORDERS-AUTH: Supabase user ID from token:', supabaseUserId);
        console.log('📧 TEST-ORDERS-AUTH: Email from token:', payload.email);

        // For Supabase users, return the UUID directly
        return {
          userId: null, // No integer user ID for Supabase users
          supabaseUserId: supabaseUserId,
          username: payload.email || 'supabase_user',
          role: 'customer',
          isSupabase: true
        };
      }
    } catch (supabaseError) {
      console.log('TEST-ORDERS-AUTH: Not a Supabase token, trying JWT verification');
    }

    // Fallback to our JWT verification
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    return {
      userId: decoded.userId,
      supabaseUserId: null,
      username: decoded.username,
      role: decoded.role || 'customer',
      isSupabase: false
    };
  } catch (error) {
    console.error('TEST-ORDERS-AUTH: Token authentication failed:', error);
    return null;
  }
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🧪 TEST-ORDERS-AUTH: Testing authentication with exact orders.ts logic');
    console.log('🧪 TEST-ORDERS-AUTH: Headers received:', {
      authorization: event.headers.authorization ? 'Present' : 'Missing',
      cookie: event.headers.cookie ? 'Present' : 'Missing',
      origin: event.headers.origin
    });

    const authPayload = authenticateToken(event);

    console.log('🧪 TEST-ORDERS-AUTH: Auth result:', {
      success: !!authPayload,
      isSupabase: authPayload?.isSupabase,
      userId: authPayload?.userId,
      supabaseUserId: authPayload?.supabaseUserId,
      username: authPayload?.username,
      role: authPayload?.role
    });

    // Test points eligibility check like in orders.ts
    const shouldAwardPoints = !!(authPayload?.userId || authPayload?.supabaseUserId);
    console.log('🎁 TEST-ORDERS-AUTH: Points eligibility:', shouldAwardPoints);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        authenticated: !!authPayload,
        authPayload: authPayload || null,
        shouldAwardPoints: shouldAwardPoints,
        testResult: authPayload ? 'AUTHENTICATION SUCCESS - Points would be awarded' : 'AUTHENTICATION FAILED - No points awarded',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('🧪 TEST-ORDERS-AUTH: Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Test auth failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};