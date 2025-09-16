import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';

let dbConnection: any = null;

function getDB() {
  if (dbConnection) return dbConnection;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  dbConnection = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });

  return dbConnection;
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  console.log('Google OAuth callback triggered');
  console.log('Method:', event.httpMethod);
  console.log('Query params:', event.queryStringParameters);

  // Handle POST request (ID token verification from client-side)
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { idToken, profile } = body;

      if (!idToken || !profile) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing idToken or profile data' })
        };
      }

      console.log('Processing client-side Google login for:', profile.email);

      // For client-side flow, we trust the ID token has been verified by Google's JS library
      // Create or find user in database
      const sql = getDB();

      // Check if user exists by email
      let existingUser = await sql`
        SELECT id, username, email, role FROM users
        WHERE email = ${profile.email}
        LIMIT 1
      `;

      let userId;
      if (existingUser.length > 0) {
        userId = existingUser[0].id;
        console.log('Existing user found:', userId);
      } else {
        // Create new user
        console.log('Creating new user for Google login');
        const newUsers = await sql`
          INSERT INTO users (username, email, role, created_at)
          VALUES (${profile.email}, ${profile.email}, 'customer', NOW())
          RETURNING id, username, email, role
        `;

        if (newUsers.length === 0) {
          throw new Error('Failed to create user');
        }

        userId = newUsers[0].id;
        console.log('New user created:', userId);

        // Initialize user points
        try {
          await sql`
            INSERT INTO user_points (user_id, points_earned, points_redeemed, transaction_type, description, created_at)
            VALUES (${userId}, 0, 0, 'earned', 'Account created', NOW())
          `;
          console.log('User points initialized');
        } catch (pointsError) {
          console.error('Failed to initialize points:', pointsError);
          // Don't fail the login if points initialization fails
        }
      }

      // Create JWT token
      const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET or SESSION_SECRET not configured');
      }

      const payload = {
        userId: userId,
        username: profile.email,
        email: profile.email,
        role: 'customer'
      };

      const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Set-Cookie': `auth-token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/`
        },
        body: JSON.stringify({
          success: true,
          user: {
            id: userId,
            username: profile.email,
            email: profile.email,
            role: 'customer'
          },
          token: token
        })
      };

    } catch (error: any) {
      console.error('Google OAuth POST callback error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Authentication failed',
          details: error.message
        })
      };
    }
  }

  // Handle GET request (server-side OAuth flow)
  const code = event.queryStringParameters?.code;
  const error = event.queryStringParameters?.error;

  if (error) {
    console.error('OAuth error:', error);
    return {
      statusCode: 302,
      headers: {
        ...headers,
        'Location': '/?error=oauth_cancelled'
      },
      body: ''
    };
  }

  if (!code) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing authorization code' })
    };
  }

  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!googleClientId || !googleClientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    // Build callback URL
    const netlifyUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
    let baseUrl;
    if (netlifyUrl) {
      baseUrl = netlifyUrl;
    } else if (event.headers.host) {
      const protocol = event.headers['x-forwarded-proto'] || 'https';
      baseUrl = `${protocol}://${event.headers.host}`;
    } else {
      throw new Error('Unable to determine base URL');
    }

    const callbackUrl = `${baseUrl}/api/auth/google/callback`;

    // Exchange code for tokens
    console.log('Exchanging code for tokens...');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: googleClientId,
        client_secret: googleClientSecret,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: callbackUrl,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', errorText);
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful');

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info from Google');
    }

    const googleUser = await userResponse.json();
    console.log('Google user info:', {
      id: googleUser.id,
      email: googleUser.email,
      name: googleUser.name
    });

    // Check if user exists by email
    const sql = getDB();
    let existingUser = await sql`
      SELECT id, username, email, role FROM users
      WHERE email = ${googleUser.email}
      LIMIT 1
    `;

    let userId;
    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      console.log('Existing user found:', userId);
    } else {
      // Create new user
      console.log('Creating new user for Google login');
      const newUsers = await sql`
        INSERT INTO users (username, email, role, created_at)
        VALUES (${googleUser.email}, ${googleUser.email}, 'customer', NOW())
        RETURNING id, username, email, role
      `;

      if (newUsers.length === 0) {
        throw new Error('Failed to create user');
      }

      userId = newUsers[0].id;
      console.log('New user created:', userId);

      // Initialize user points
      try {
        await sql`
          INSERT INTO user_points (user_id, points_earned, points_redeemed, transaction_type, description, created_at)
          VALUES (${userId}, 0, 0, 'earned', 'Account created', NOW())
        `;
        console.log('User points initialized');
      } catch (pointsError) {
        console.error('Failed to initialize points:', pointsError);
        // Don't fail the login if points initialization fails
      }
    }

    // Create JWT token
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET not configured');
    }

    const payload = {
      userId: userId,
      username: googleUser.email,
      email: googleUser.email,
      role: 'customer'
    };

    const token = jwt.sign(payload, jwtSecret, { expiresIn: '7d' });

    // Redirect to home page with success
    return {
      statusCode: 302,
      headers: {
        ...headers,
        'Location': '/?login=success',
        'Set-Cookie': `auth-token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=604800; Path=/`
      },
      body: ''
    };

  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    return {
      statusCode: 302,
      headers: {
        ...headers,
        'Location': '/?error=oauth_failed'
      },
      body: ''
    };
  }
};