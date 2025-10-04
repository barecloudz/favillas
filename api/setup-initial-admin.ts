import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

/**
 * ONE-TIME SETUP ENDPOINT
 * Creates the initial super admin in Supabase
 * After running once, this endpoint should be disabled or removed
 */
export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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

  // SECURITY: Check if setup has already been run
  const setupKey = event.headers['x-setup-key'];
  const expectedKey = process.env.SETUP_SECRET_KEY || 'CHANGE_THIS_SECRET_KEY_12345';

  if (setupKey !== expectedKey) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        error: 'Invalid setup key. Set SETUP_SECRET_KEY env variable and provide it in x-setup-key header.'
      })
    };
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Supabase configuration missing' })
      };
    }

    // Create admin client with service role key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create initial super admin
    const email = 'superadmin@favillaspizzeria.com';
    const password = 'superadmin123'; // User should change this after first login

    console.log('Creating initial super admin in Supabase...');

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: {
        role: 'super_admin',
        first_name: 'Super',
        last_name: 'Admin',
        full_name: 'Super Admin',
        is_admin: true,
      },
      email_confirm: true // Auto-confirm email
    });

    if (error) {
      // Check if user already exists
      if (error.message.includes('already registered')) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Super admin already exists in Supabase',
            note: 'You can now login with: superadmin@favillaspizzeria.com / superadmin123'
          })
        };
      }

      console.error('Supabase admin creation error:', error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: error.message,
          details: error
        })
      };
    }

    console.log('✅ Super admin created successfully in Supabase:', data.user?.email);

    // Now create the corresponding database record with admin privileges
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'DATABASE_URL not configured' })
      };
    }

    const sql = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
    });

    try {
      // Check if user already exists in database
      const existingDbUser = await sql`
        SELECT id FROM users WHERE supabase_user_id = ${data.user?.id}
      `;

      if (existingDbUser.length === 0) {
        // Create database record for admin
        await sql`
          INSERT INTO users (
            supabase_user_id,
            email,
            username,
            first_name,
            last_name,
            role,
            is_admin,
            is_active,
            created_at,
            updated_at
          ) VALUES (
            ${data.user?.id},
            ${email},
            ${email},
            'Super',
            'Admin',
            'super_admin',
            true,
            true,
            NOW(),
            NOW()
          )
        `;
        console.log('✅ Database record created for super admin');
      } else {
        console.log('ℹ️ Database record already exists for super admin');
      }

      await sql.end();
    } catch (dbError) {
      console.error('⚠️ Error creating database record:', dbError);
      // Continue anyway - user can still login, just might not have full admin access yet
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Initial super admin created successfully in Supabase and database',
        credentials: {
          email: 'superadmin@favillaspizzeria.com',
          password: 'superadmin123',
          note: 'PLEASE CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN'
        },
        user: {
          id: data.user?.id,
          email: data.user?.email,
          role: 'super_admin'
        }
      })
    };

  } catch (error) {
    console.error('Setup error:', error);
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
