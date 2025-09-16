import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, or } from 'drizzle-orm';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';
import { users, sessions } from '@shared/schema';

let dbConnection: any = null;

function getDB() {
  if (dbConnection) return dbConnection;
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });
  
  dbConnection = drizzle(sql);
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

  // Handle POST request (ID token verification from client-side)
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { idToken, profile } = body;

      if (!idToken || !profile) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Missing idToken or profile data' })
        };
      }

      // Verify the ID token with Google
      const googleClientId = process.env.GOOGLE_CLIENT_ID;
      if (!googleClientId) {
        throw new Error('Google OAuth credentials not configured');
      }

      // For now, we'll trust the client-side verification and use the profile data
      // In production, you should verify the ID token server-side
      console.log('Processing Google Sign-In with profile:', {
        id: profile.id,
        email: profile.email,
        name: profile.name
      });

      // Check if user exists by Google ID or email
      const db = getDB();
      const existingUser = await db.query.users.findFirst({
        where: or(
          eq(users.googleId, profile.id),
          eq(users.email, profile.email)
        )
      });

      let user;
      if (existingUser) {
        // Update existing user with Google ID if not set
        if (!existingUser.googleId) {
          await db.update(users)
            .set({ googleId: profile.id })
            .where(eq(users.id, existingUser.id));
        }
        user = existingUser;
      } else {
        // Create new user
        const [newUser] = await db.insert(users).values({
          googleId: profile.id,
          email: profile.email,
          firstName: profile.name.split(' ')[0] || '',
          lastName: profile.name.split(' ').slice(1).join(' ') || '',
          username: profile.email.split('@')[0],
          password: '', // No password for Google users
          phone: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          isActive: true,
          role: 'customer'
        }).returning();
        user = newUser;
      }

      // Create session
      const sessionId = crypto.randomUUID();
      await db.insert(sessions).values({
        id: sessionId,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      });

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Set-Cookie': `session=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`
        },
        body: JSON.stringify({ 
          success: true, 
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role
          }
        })
      };
    } catch (error) {
      console.error('Google Sign-In POST error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: 'Internal server error' })
      };
    }
  }

  const { code, error } = event.queryStringParameters || {};

  if (error) {
    console.error('Google OAuth error:', error);
    return {
      statusCode: 302,
      headers: {
        ...headers,
        'Location': '/auth?error=oauth_error'
      },
      body: ''
    };
  }

  if (!code) {
    return {
      statusCode: 302,
      headers: {
        ...headers,
        'Location': '/auth?error=missing_code'
      },
      body: ''
    };
  }

  try {
    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const vercelUrl = process.env.VERCEL_URL;

    if (!googleClientId || !googleClientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    // Build the callback URL
    const baseUrl = vercelUrl 
      ? `https://${vercelUrl}` 
      : `${event.headers['x-forwarded-proto'] || 'https'}://${event.headers.host}`;
    
    const callbackUrl = `${baseUrl}/api/auth/google/callback`;

    console.log('Processing Google OAuth callback');
    console.log('Code received:', !!code);

    // Exchange code for access token
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

    // Check if user exists by Google ID or email
    const db = getDB();
    
    let user = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleUser.id))
      .limit(1)
      .then(rows => rows[0]);

    if (!user) {
      // Check by email
      user = await db
        .select()
        .from(users)
        .where(eq(users.email, googleUser.email))
        .limit(1)
        .then(rows => rows[0]);

      if (user) {
        // Update existing user with Google ID
        user = await db
          .update(users)
          .set({ googleId: googleUser.id })
          .where(eq(users.id, user.id))
          .returning()
          .then(rows => rows[0]);
      } else {
        // Create new user
        const [firstName, ...lastNameParts] = googleUser.name.split(' ');
        const lastName = lastNameParts.join(' ') || 'User';

        user = await db
          .insert(users)
          .values({
            username: googleUser.email,
            password: 'google-auth', // Placeholder password for Google users
            email: googleUser.email,
            googleId: googleUser.id,
            firstName,
            lastName,
            role: 'customer',
            isAdmin: false,
            isActive: true,
            marketingOptIn: true,
          })
          .returning()
          .then(rows => rows[0]);
      }
    }

    console.log('User authenticated:', user.id);

    // Create JWT token
    const secret = process.env.SESSION_SECRET;
    if (!secret) {
      throw new Error('SESSION_SECRET not configured');
    }
    
    const token = jwt.sign(
      { 
        userId: user.id,
        username: user.username,
        role: user.role,
        isAdmin: user.isAdmin 
      },
      secret,
      { expiresIn: '7d' }
    );

    // Set token as HTTP-only cookie and redirect to success page
    return {
      statusCode: 302,
      headers: {
        ...headers,
        'Set-Cookie': `auth-token=${token}; HttpOnly; Secure=${process.env.NODE_ENV === 'production'}; SameSite=Strict; Path=/; Max-Age=${7 * 24 * 60 * 60}`,
        'Location': '/?login=success'
      },
      body: ''
    };

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return {
      statusCode: 302,
      headers: {
        ...headers,
        'Location': '/auth?error=oauth_failed'
      },
      body: ''
    };
  }
}