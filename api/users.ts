import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, isStaff } from './_shared/auth';

export const handler: Handler = async (event, context) => {
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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

  console.log('🚀 USERS API CALLED');
  console.log('📋 Request Method:', event.httpMethod);

  // Authenticate using Supabase token
  const authPayload = await authenticateToken(event);
  if (!authPayload) {
    console.log('❌ Authentication failed - no valid token');
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  console.log('✅ Authentication successful:', authPayload);

  if (!isStaff(authPayload)) {
    console.log('❌ Authorization failed - insufficient role:', authPayload.role);
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Admin access required' })
    };
  }

  console.log('✅ Authorization successful - user has admin access');

  try {

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL not configured');
    }

    const sql = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
    });

    // GET - List all users (both legacy users and Supabase users)
    if (event.httpMethod === 'GET') {
      console.log('📊 Fetching all users...');

      // Get legacy users
      const legacyUsers = await sql`
        SELECT
          id, username, email, first_name, last_name, phone,
          role, is_admin, is_active, created_at, rewards,
          NULL as supabase_user_id, 'legacy' as user_type
        FROM users
        WHERE supabase_user_id IS NULL
        ORDER BY created_at DESC
      `;

      // Get Supabase users
      const supabaseUsers = await sql`
        SELECT
          id, username, email, first_name, last_name, phone,
          role, is_admin, is_active, created_at, rewards,
          supabase_user_id, 'supabase' as user_type
        FROM users
        WHERE supabase_user_id IS NOT NULL
        ORDER BY created_at DESC
      `;

      console.log(`✅ Found ${legacyUsers.length} legacy users and ${supabaseUsers.length} Supabase users`);

      const allUsers = [...supabaseUsers, ...legacyUsers];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(allUsers.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          role: user.role,
          isAdmin: user.is_admin,
          isActive: user.is_active,
          createdAt: user.created_at,
          rewards: user.rewards || 0,
          supabaseUserId: user.supabase_user_id,
          userType: user.user_type
        })))
      };
    }

    // POST - Create new employee or admin user
    if (event.httpMethod === 'POST') {
      console.log('➕ Creating new user...');
      const requestData = JSON.parse(event.body || '{}');
      const { email, firstName, lastName, phone, role, isAdmin } = requestData;

      console.log('📋 User data:', { email, firstName, lastName, phone, role, isAdmin });

      if (!email || !firstName || !lastName) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Email, firstName, and lastName are required'
          })
        };
      }

      // Check if user already exists
      const existingUser = await sql`
        SELECT id FROM users WHERE email = ${email}
      `;

      if (existingUser.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'User with this email already exists'
          })
        };
      }

      // Determine role and admin status
      const userRole = role || (isAdmin ? 'admin' : 'employee');
      const userIsAdmin = isAdmin || role === 'admin' || role === 'super_admin';

      console.log('👤 Creating user with role:', userRole, 'isAdmin:', userIsAdmin);

      // Create new user record (will be linked to Supabase when they first log in)
      const newUser = await sql`
        INSERT INTO users (
          username, email, first_name, last_name, phone,
          role, is_admin, is_active, rewards, created_at, updated_at
        ) VALUES (
          ${email}, ${email}, ${firstName}, ${lastName}, ${phone || null},
          ${userRole}, ${userIsAdmin}, true, 0, NOW(), NOW()
        ) RETURNING id, username, email, first_name, last_name, phone, role, is_admin, created_at
      `;

      console.log('✅ User created successfully:', newUser[0]);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          message: `${userRole} user created successfully`,
          user: {
            id: newUser[0].id,
            username: newUser[0].username,
            email: newUser[0].email,
            firstName: newUser[0].first_name,
            lastName: newUser[0].last_name,
            phone: newUser[0].phone,
            role: newUser[0].role,
            isAdmin: newUser[0].is_admin,
            isActive: true,
            createdAt: newUser[0].created_at,
            userType: 'pending_supabase' // They need to log in with Google to link Supabase
          }
        })
      };
    }

    // DELETE - Delete user
    if (event.httpMethod === 'DELETE') {
      console.log('🗑️ Deleting user...');
      const requestData = JSON.parse(event.body || '{}');
      const { userId } = requestData;

      console.log('📋 Delete request for user ID:', userId);

      if (!userId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'User ID is required'
          })
        };
      }

      // Check if user exists and get their info
      const userToDelete = await sql`
        SELECT id, username, email, role FROM users WHERE id = ${userId}
      `;

      if (userToDelete.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'User not found'
          })
        };
      }

      // Prevent deleting super_admin users
      if (userToDelete[0].role === 'super_admin') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Cannot delete super admin user'
          })
        };
      }

      // Delete user
      await sql`DELETE FROM users WHERE id = ${userId}`;
      console.log('✅ User deleted successfully:', userToDelete[0]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'User deleted successfully',
          deletedUser: {
            id: userToDelete[0].id,
            username: userToDelete[0].username,
            email: userToDelete[0].email,
            role: userToDelete[0].role
          }
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error: any) {
    console.error('❌ User management error:', error.message);
    console.error('Error stack:', error.stack);
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