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
      body: JSON.stringify({ error: 'Forbidden - Admin access required' })
    };
  }

  try {
    const sql = getDB();

    if (event.httpMethod === 'POST' || event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}');
      const { categoryId, isTemporarilyUnavailable, reason, until } = body;

      if (!categoryId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'categoryId is required' })
        };
      }

      console.log(`📦 Category Availability: ${isTemporarilyUnavailable ? 'Disabling' : 'Enabling'} category ${categoryId}`);

      // Update category availability
      const result = await sql`
        UPDATE categories
        SET
          is_temporarily_unavailable = ${isTemporarilyUnavailable || false},
          unavailability_reason = ${reason || null},
          unavailable_since = ${isTemporarilyUnavailable ? sql`NOW()` : null},
          unavailable_until = ${until || null}
        WHERE id = ${categoryId}
        RETURNING *
      `;

      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Category not found' })
        };
      }

      console.log(`✅ Category ${result[0].name} availability updated`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          category: {
            id: result[0].id,
            name: result[0].name,
            isTemporarilyUnavailable: result[0].is_temporarily_unavailable,
            unavailabilityReason: result[0].unavailability_reason,
            unavailableSince: result[0].unavailable_since,
            unavailableUntil: result[0].unavailable_until
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
    console.error('❌ Category availability error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
