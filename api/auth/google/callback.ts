import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';

// Define users table inline
const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  googleId: text("google_id").unique(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  role: text("role").default("customer").notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  rewards: integer("rewards").default(0).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  marketingOptIn: boolean("marketing_opt_in").default(true).notNull(),
});

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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
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