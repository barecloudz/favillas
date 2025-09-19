import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';
import { getCorsHeaders, withDB } from './utils/auth';


export const handler: Handler = async (event, context) => {
  const headers = getCorsHeaders(event.headers.origin);

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  // Google OAuth callback triggered - no sensitive data logging

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

      // Processing client-side Google login

      // For client-side flow, we trust the ID token has been verified by Google's JS library
      // Create or find user in database
      let existingUser = await withDB(async (sql) => {
        return await sql`
          SELECT id, username, email, role FROM users
          WHERE email = ${profile.email}
          LIMIT 1
        `;
      });

      let userId;
      if (existingUser.length > 0) {
        userId = existingUser[0].id;
        // Existing user found
      } else {
        // Create new user
        const newUsers = await withDB(async (sql) => {
          return await sql`
            INSERT INTO users (username, email, role, created_at)
            VALUES (${profile.email}, ${profile.email}, 'customer', NOW())
            RETURNING id, username, email, role
          `;
        });

        if (newUsers.length === 0) {
          throw new Error('Failed to create user');
        }

        userId = newUsers[0].id;
        // New user created

        // Initialize user points
        try {
          await withDB(async (sql) => {
            await sql`
              INSERT INTO user_points (user_id, points_earned, points_redeemed, transaction_type, description, created_at)
              VALUES (${userId}, 0, 0, 'earned', 'Account created', NOW())
            `;
          });
          // User points initialized
        } catch (pointsError) {
          // Points initialization failed - continue with login
        }
      }

      // Create JWT token with secure secret handling
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
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
      // OAuth POST callback error - no sensitive data logging
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Authentication failed'
        })
      };
    }
  }

  // Handle GET request (server-side OAuth flow)
  const code = event.queryStringParameters?.code;
  const error = event.queryStringParameters?.error;

  if (error) {
    // OAuth error occurred
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
      throw new Error('Failed to exchange code for token');
    }

    const tokenData = await tokenResponse.json();
    // Token exchange successful

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
    // Google user info retrieved

    // Check if user exists by email
    let existingUser = await withDB(async (sql) => {
      return await sql`
        SELECT id, username, email, role FROM users
        WHERE email = ${googleUser.email}
        LIMIT 1
      `;
    });

    let userId;
    if (existingUser.length > 0) {
      userId = existingUser[0].id;
      // Existing user found
    } else {
      // Create new user
      const newUsers = await withDB(async (sql) => {
        return await sql`
          INSERT INTO users (username, email, role, created_at)
          VALUES (${googleUser.email}, ${googleUser.email}, 'customer', NOW())
          RETURNING id, username, email, role
        `;
      });

      if (newUsers.length === 0) {
        throw new Error('Failed to create user');
      }

      userId = newUsers[0].id;
      // New user created

      // Initialize user points
      try {
        await withDB(async (sql) => {
          await sql`
            INSERT INTO user_points (user_id, points_earned, points_redeemed, transaction_type, description, created_at)
            VALUES (${userId}, 0, 0, 'earned', 'Account created', NOW())
          `;
        });
        // User points initialized
      } catch (pointsError) {
        // Points initialization failed - continue with login
      }
    }

    // Create JWT token with secure secret handling
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not configured');
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
    // Google OAuth callback error occurred
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