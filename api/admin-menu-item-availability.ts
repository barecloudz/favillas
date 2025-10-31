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
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Authenticate user
  const authResult = await authenticateToken(
    event.headers.authorization || event.headers.Authorization,
    event.headers.cookie || event.headers.Cookie
  );

  if (!authResult.success || !authResult.user) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  // Check if user is staff
  if (!isStaff(authResult.user)) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Staff access required' })
    };
  }

  try {
    const sql = getDB();

    if (event.httpMethod === 'POST' || event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}');
      const { menuItemId, isAvailable } = body;

      if (!menuItemId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'menuItemId is required' })
        };
      }

      console.log(`📦 Menu Item Availability: ${!isAvailable ? 'Disabling' : 'Enabling'} item ${menuItemId}`);

      // Update menu item availability
      const result = await sql`
        UPDATE menu_items
        SET is_available = ${isAvailable}
        WHERE id = ${menuItemId}
        RETURNING *
      `;

      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Menu item not found' })
        };
      }

      console.log(`✅ Menu item ${result[0].name} availability updated`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          menuItem: {
            id: result[0].id,
            name: result[0].name,
            isAvailable: result[0].is_available
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
    console.error('❌ Menu item availability error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
