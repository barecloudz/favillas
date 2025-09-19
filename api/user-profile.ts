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

function authenticateToken(event: any): { userId: number | null; supabaseUserId: string | null; username: string; role: string; isSupabase: boolean } | null {
  const authHeader = event.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    const cookies = event.headers.cookie;
    if (cookies) {
      const authCookie = cookies.split(';').find((c: string) => c.trim().startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }
  }

  if (!token) return null;

  try {
    // First try to decode as Supabase JWT token
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

      if (payload.iss && payload.iss.includes('supabase')) {
        const supabaseUserId = payload.sub;

        return {
          userId: null, // No integer user ID for Supabase users
          supabaseUserId: supabaseUserId,
          username: payload.email || 'supabase_user',
          role: 'customer',
          isSupabase: true
        };
      }
    } catch (supabaseError) {
      console.log('Not a Supabase token, trying JWT verification');
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
    console.error('Token authentication failed:', error);
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
      // Get user profile - support both authentication types
      let user;

      if (authPayload.isSupabase) {
        console.log('📝 Getting Supabase user profile:', authPayload.supabaseUserId);
        user = await sql`
          SELECT id, username, email, phone, address, city, state, zip_code, role, created_at, supabase_user_id
          FROM users
          WHERE supabase_user_id = ${authPayload.supabaseUserId}
        `;
      } else {
        console.log('📝 Getting legacy user profile:', authPayload.userId);
        user = await sql`
          SELECT id, username, email, phone, address, city, state, zip_code, role, created_at
          FROM users
          WHERE id = ${authPayload.userId}
        `;
      }

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
      // Update user profile - support comprehensive contact information
      const { phone, address, city, state, zip_code } = JSON.parse(event.body || '{}');

      console.log('🔄 Updating user profile:', {
        userId: authPayload.userId,
        supabaseUserId: authPayload.supabaseUserId,
        isSupabase: authPayload.isSupabase,
        contactData: { phone, address, city, state, zip_code }
      });

      if (authPayload.isSupabase) {
        // Handle Supabase user profile update
        const existingSupabaseUser = await sql`
          SELECT id FROM users WHERE supabase_user_id = ${authPayload.supabaseUserId}
        `;

        if (existingSupabaseUser.length === 0) {
          console.log('⚠️ Supabase user not found, creating user account');

          // Create user record for Supabase user
          await sql`
            INSERT INTO users (
              supabase_user_id, username, email, role, phone, address, city, state, zip_code,
              first_name, last_name, password, created_at, updated_at
            ) VALUES (
              ${authPayload.supabaseUserId},
              ${authPayload.username || 'google_user'},
              ${authPayload.username || 'user@example.com'},
              'customer',
              ${phone || ''},
              ${address || ''},
              ${city || ''},
              ${state || ''},
              ${zip_code || ''},
              ${authPayload.username?.split('@')[0] || 'User'},
              'Customer',
              'GOOGLE_USER',
              NOW(),
              NOW()
            )
            ON CONFLICT (supabase_user_id) DO NOTHING
          `;

          // Initialize user points using correct schema for Supabase user
          await sql`
            INSERT INTO user_points (supabase_user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
            VALUES (${authPayload.supabaseUserId}, 0, 0, 0, NOW(), NOW(), NOW())
            ON CONFLICT DO NOTHING
          `;

          console.log('✅ Created Supabase user account with points system');
        }

        // Update Supabase user profile - allow setting to empty values
        const updatedUser = await sql`
          UPDATE users
          SET
            phone = ${phone || ''},
            address = ${address || ''},
            city = ${city || ''},
            state = ${state || ''},
            zip_code = ${zip_code || ''},
            updated_at = NOW()
          WHERE supabase_user_id = ${authPayload.supabaseUserId}
          RETURNING id, username, email, phone, address, city, state, zip_code, role, created_at, updated_at, supabase_user_id
        `;

        if (updatedUser.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'User not found' })
          };
        }

        console.log('✅ Supabase user profile updated successfully');

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updatedUser[0])
        };

      } else {
        // Handle legacy user profile update
        const existingUser = await sql`SELECT id FROM users WHERE id = ${authPayload.userId}`;

        if (existingUser.length === 0) {
          console.log('⚠️ Legacy user not found, creating user account');

          // Create user record for legacy user
          await sql`
            INSERT INTO users (
              id, username, email, role, phone, address, city, state, zip_code,
              first_name, last_name, password, created_at, updated_at
            ) VALUES (
              ${authPayload.userId},
              ${authPayload.username || 'user'},
              ${authPayload.username || 'user@example.com'},
              'customer',
              ${phone || ''},
              ${address || ''},
              ${city || ''},
              ${state || ''},
              ${zip_code || ''},
              ${authPayload.username?.split('@')[0] || 'User'},
              'Customer',
              'AUTH_USER',
              NOW(),
              NOW()
            )
            ON CONFLICT (id) DO NOTHING
          `;

          // Initialize user points using correct schema for legacy user
          await sql`
            INSERT INTO user_points (user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
            VALUES (${authPayload.userId}, 0, 0, 0, NOW(), NOW(), NOW())
            ON CONFLICT (user_id) DO NOTHING
          `;

          console.log('✅ Created legacy user account with points system');
        }

        // Update legacy user profile - allow setting to empty values
        const updatedUser = await sql`
          UPDATE users
          SET
            phone = ${phone || ''},
            address = ${address || ''},
            city = ${city || ''},
            state = ${state || ''},
            zip_code = ${zip_code || ''},
            updated_at = NOW()
          WHERE id = ${authPayload.userId}
          RETURNING id, username, email, phone, address, city, state, zip_code, role, created_at, updated_at
        `;

        if (updatedUser.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'User not found' })
          };
        }

        console.log('✅ Legacy user profile updated successfully');

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updatedUser[0])
        };
      }

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