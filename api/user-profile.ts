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

function authenticateToken(event: any): { userId: number; username: string; role: string } | null {
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
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
    }

    const payload = jwt.verify(token, jwtSecret) as { userId: number; username: string; role: string };
    return payload;
  } catch (error) {
    return null;
  }
}

export const handler: Handler = async (event, context) => {
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  const authPayload = authenticateToken(event);
  if (!authPayload) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    const sql = getDB();

    if (event.httpMethod === 'GET') {
      // Get user profile
      const user = await sql`
        SELECT id, username, email, phone, address, role, created_at
        FROM users
        WHERE id = ${authPayload.userId}
      `;

      if (user.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'User not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(user[0])
      };

    } else if (event.httpMethod === 'PATCH') {
      // Update user profile
      const { phone, address } = JSON.parse(event.body || '{}');

      console.log('🔄 Updating user profile for user:', authPayload.userId);

      // Check if user exists, if not create them (for Google users)
      const existingUser = await sql`SELECT id FROM users WHERE id = ${authPayload.userId}`;

      if (existingUser.length === 0) {
        console.log('⚠️ User not found, creating Google user account');

        // Create user record for Google login
        await sql`
          INSERT INTO users (id, username, email, role, phone, address, created_at)
          VALUES (
            ${authPayload.userId},
            ${authPayload.username || 'google_user'},
            ${authPayload.username || 'user@example.com'},
            'customer',
            ${phone || ''},
            ${address || ''},
            NOW()
          )
          ON CONFLICT (id) DO NOTHING
        `;

        // Initialize user points
        await sql`
          INSERT INTO user_points (user_id, points_earned, points_redeemed, transaction_type, description, created_at)
          VALUES (${authPayload.userId}, 0, 0, 'earned', 'Account created', NOW())
          ON CONFLICT DO NOTHING
        `;

        console.log('✅ Created Google user account with points system');
      }

      // Update user profile
      const updatedUser = await sql`
        UPDATE users
        SET
          phone = ${phone || ''},
          address = ${address || ''},
          updated_at = NOW()
        WHERE id = ${authPayload.userId}
        RETURNING id, username, email, phone, address, role, created_at, updated_at
      `;

      if (updatedUser.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'User not found' })
        };
      }

      console.log('✅ User profile updated successfully');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedUser[0])
      };

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

  } catch (error: any) {
    console.error('User profile API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};