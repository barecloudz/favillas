import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken } from './_shared/auth';

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
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  const authPayload = await authenticateToken(event);
  if (!authPayload) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    const sql = getDB();

    console.log('🔍 Creating user record for:', {
      isSupabase: authPayload.isSupabase,
      supabaseUserId: authPayload.supabaseUserId,
      userId: authPayload.userId,
      username: authPayload.username,
      email: authPayload.email,
      role: authPayload.role
    });

    if (authPayload.isSupabase && authPayload.supabaseUserId) {
      // Check if user already exists
      const existingUser = await sql`
        SELECT id FROM users WHERE supabase_user_id = ${authPayload.supabaseUserId}
      `;

      if (existingUser.length > 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'User already exists',
            userId: existingUser[0].id
          })
        };
      }

      // Create new Supabase user record
      const newUser = await sql`
        INSERT INTO users (
          supabase_user_id, username, email, role, phone, address, city, state, zip_code,
          first_name, last_name, password, created_at, updated_at
        ) VALUES (
          ${authPayload.supabaseUserId},
          ${authPayload.email || authPayload.username || 'google_user'},
          ${authPayload.email || authPayload.username || 'user@example.com'},
          ${authPayload.role || 'customer'},
          '',
          '',
          '',
          '',
          '',
          ${authPayload.firstName || (authPayload.fullName ? authPayload.fullName.split(' ')[0] : 'User')},
          ${authPayload.lastName || (authPayload.fullName ? authPayload.fullName.split(' ').slice(1).join(' ') : 'Customer')},
          'GOOGLE_USER',
          NOW(),
          NOW()
        )
        RETURNING *
      `;

      console.log('✅ Created Supabase user record:', newUser[0]);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          message: 'User created successfully',
          user: newUser[0]
        })
      };

    } else {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Only Supabase users can be created with this endpoint' })
      };
    }

  } catch (error: any) {
    console.error('Create user error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to create user',
        details: error.message
      })
    };
  }
};