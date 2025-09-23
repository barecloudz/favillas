import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, isStaff } from './_shared/auth';

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
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
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

  console.log('📧 SUBSCRIBED USERS API CALLED');
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
    const sql = getDB();

    // GET - List all users subscribed to marketing emails
    if (event.httpMethod === 'GET') {
      console.log('📊 Fetching subscribed users...');

      // Get users who are subscribed to marketing emails
      const subscribedUsers = await sql`
        SELECT
          u.id, u.username, u.email, u.first_name, u.last_name, u.phone,
          u.role, u.created_at, u.marketing_opt_in,
          COALESCE(up.points, 0) as current_points
        FROM users u
        LEFT JOIN user_points up ON u.id = up.user_id
        WHERE u.marketing_opt_in = true
        ORDER BY u.created_at DESC
      `;

      console.log(`✅ Found ${subscribedUsers.length} subscribed users`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(subscribedUsers.map(user => ({
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          role: user.role,
          createdAt: user.created_at,
          currentPoints: parseInt(user.current_points) || 0,
          marketingOptIn: user.marketing_opt_in
        })))
      };
    }

    // PUT - Update user's marketing subscription status
    if (event.httpMethod === 'PUT') {
      console.log('🔄 Updating marketing subscription...');

      // Extract user ID from URL path
      let userId = null;
      const pathParts = event.path.split('/');
      const usersIndex = pathParts.findIndex(part => part === 'subscribed-users');
      if (usersIndex !== -1 && pathParts[usersIndex + 1]) {
        userId = parseInt(pathParts[usersIndex + 1]);
      }

      if (!userId || isNaN(userId)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Valid user ID is required'
          })
        };
      }

      const requestData = JSON.parse(event.body || '{}');
      const { marketingOptIn } = requestData;

      if (typeof marketingOptIn !== 'boolean') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'marketingOptIn must be a boolean value'
          })
        };
      }

      console.log('📋 Update request:', { userId, marketingOptIn });

      // Check if user exists
      const existingUser = await sql`
        SELECT id, email, first_name, last_name FROM users WHERE id = ${userId}
      `;

      if (existingUser.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'User not found'
          })
        };
      }

      // Update marketing opt-in status
      const updatedUser = await sql`
        UPDATE users
        SET marketing_opt_in = ${marketingOptIn}, updated_at = NOW()
        WHERE id = ${userId}
        RETURNING id, email, first_name, last_name, marketing_opt_in
      `;

      console.log('✅ Marketing subscription updated:', updatedUser[0]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: `User ${marketingOptIn ? 'subscribed to' : 'unsubscribed from'} marketing emails`,
          user: {
            id: updatedUser[0].id,
            email: updatedUser[0].email,
            firstName: updatedUser[0].first_name,
            lastName: updatedUser[0].last_name,
            marketingOptIn: updatedUser[0].marketing_opt_in
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
    console.error('❌ Subscribed users error:', error.message);
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