import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken, isStaff } from './_shared/auth';
import postgres from 'postgres';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Check authentication - only admins can create other admins
  const authPayload = await authenticateToken(event);
  if (!authPayload) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  if (!isStaff(authPayload)) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Admin access required' })
    };
  }

  try {
    const { email, password, role = 'admin', firstName, lastName } = JSON.parse(event.body || '{}');

    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email and password are required' })
      };
    }

    if (password.length < 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Password must be at least 8 characters' })
      };
    }

    // Connect to database
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database configuration missing' })
      };
    }

    const sql = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
    });

    // Check if user already exists
    const existingUser = await sql`SELECT id FROM users WHERE email = ${email}`;
    if (existingUser.length > 0) {
      await sql.end();
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'User with this email already exists' })
      };
    }

    // First, create user in Supabase Auth (REQUIRED for /auth login to work)
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      await sql.end();
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Supabase configuration missing' })
      };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { data: supabaseData, error: supabaseError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        role: role,
        first_name: firstName || 'Admin',
        last_name: lastName || 'User',
        full_name: `${firstName || 'Admin'} ${lastName || 'User'}`,
      },
      email_confirm: true
    });

    if (supabaseError || !supabaseData.user) {
      await sql.end();
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Failed to create user in authentication system',
          details: supabaseError?.message || 'Unknown error'
        })
      };
    }

    const supabaseUserId = supabaseData.user.id;
    console.log('✅ User created in Supabase Auth:', supabaseUserId);

    // Determine if user should be admin
    const userIsAdmin = role === 'admin' || role === 'super_admin' || role === 'manager';

    // Now create the user in local database with supabase_user_id linked
    const newUser = await sql`
      INSERT INTO users (
        username, email, first_name, last_name, supabase_user_id,
        role, is_admin, is_active, rewards,
        created_at, updated_at
      ) VALUES (
        ${email}, ${email}, ${firstName || 'Admin'}, ${lastName || 'User'}, ${supabaseUserId},
        ${role}, ${userIsAdmin}, true, 0,
        NOW(), NOW()
      ) RETURNING id, username, email, first_name, last_name, role, is_admin, created_at
    `;

    console.log('✅ Admin user created in local database and linked to Supabase:', newUser[0]);

    await sql.end();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `${role} user created successfully`,
        user: {
          id: newUser[0].id,
          email: newUser[0].email,
          firstName: newUser[0].first_name,
          lastName: newUser[0].last_name,
          role: newUser[0].role,
          isAdmin: newUser[0].is_admin,
          supabaseUserId: supabaseUserId
        }
      })
    };

  } catch (error) {
    console.error('Create admin error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};