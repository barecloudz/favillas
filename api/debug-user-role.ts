import { Handler } from '@netlify/functions';
import postgres from 'postgres';

// Database connection
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
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

  try {
    const sql = getDB();

    if (event.httpMethod === 'GET') {
      // Show current user roles
      const users = await sql`
        SELECT id, email, role, supabase_user_id, first_name, last_name, rewards
        FROM users
        WHERE role = 'admin' OR email LIKE '%blake%'
        ORDER BY id DESC
        LIMIT 10
      `;

      const supabaseUsers = await sql`
        SELECT up.supabase_user_id, up.points, up.total_earned, u.email, u.role
        FROM user_points up
        LEFT JOIN users u ON u.supabase_user_id = up.supabase_user_id
        WHERE up.supabase_user_id IS NOT NULL
        ORDER BY up.total_earned DESC
        LIMIT 10
      `;

      // Also show recent orders for debugging
      const recentOrders = await sql`
        SELECT id, user_id, supabase_user_id, total, status, payment_status, created_at
        FROM orders
        WHERE created_at > NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC
        LIMIT 5
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          legacyUsers: users,
          supabaseUsers: supabaseUsers,
          recentOrders: recentOrders,
          message: 'Current user roles, points, and recent orders',
          instructions: {
            changeRole: 'POST with { "action": "changeRole", "supabaseUserId": "your-id", "newRole": "customer" }',
            testTheory: 'The theory is that admin users are not earning points because they have role="admin" instead of role="customer"'
          }
        })
      };
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { action, supabaseUserId, newRole } = body;

      if (action === 'changeRole' && supabaseUserId && newRole) {
        // Change user role temporarily
        const result = await sql`
          UPDATE users
          SET role = ${newRole}, updated_at = NOW()
          WHERE supabase_user_id = ${supabaseUserId}
          RETURNING id, email, role, supabase_user_id
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Role changed to ${newRole}`,
            user: result[0] || null
          })
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid action or missing parameters' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error: any) {
    console.error('Debug user role error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};