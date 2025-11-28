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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
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

  // Check if user is staff (admin, manager, or kitchen staff)
  if (!isStaff(authResult.user)) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Staff access required' })
    };
  }

  try {
    const sql = getDB();

    // GET - Fetch all Pizza by the Slice items
    if (event.httpMethod === 'GET') {
      const slices = await sql`
        SELECT
          id,
          name,
          description,
          base_price,
          is_available,
          image_url,
          is_popular,
          is_new,
          category
        FROM menu_items
        WHERE category = 'Pizza by the Slice'
        ORDER BY name
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(slices)
      };
    }

    // PATCH - Toggle availability for a specific slice
    if (event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}');
      const { sliceId, isAvailable } = body;

      if (!sliceId || isAvailable === undefined) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'sliceId and isAvailable are required' })
        };
      }

      console.log(`🍕 Kitchen Slices: ${isAvailable ? 'Enabling' : 'Disabling'} slice ${sliceId}`);

      // Update slice availability
      const result = await sql`
        UPDATE menu_items
        SET is_available = ${isAvailable}
        WHERE id = ${sliceId} AND category = 'Pizza by the Slice'
        RETURNING id, name, is_available
      `;

      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Slice not found' })
        };
      }

      console.log(`✅ Slice ${result[0].name} is now ${isAvailable ? 'AVAILABLE' : 'UNAVAILABLE'}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          slice: {
            id: result[0].id,
            name: result[0].name,
            isAvailable: result[0].is_available
          }
        })
      };
    }

    // POST - Toggle multiple slices at once
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { slices } = body; // Array of { sliceId, isAvailable }

      if (!slices || !Array.isArray(slices)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'slices array is required' })
        };
      }

      console.log(`🍕 Kitchen Slices: Batch updating ${slices.length} slices`);

      const results = [];
      for (const slice of slices) {
        const result = await sql`
          UPDATE menu_items
          SET is_available = ${slice.isAvailable}
          WHERE id = ${slice.sliceId} AND category = 'Pizza by the Slice'
          RETURNING id, name, is_available
        `;
        if (result.length > 0) {
          results.push(result[0]);
        }
      }

      console.log(`✅ Updated ${results.length} slices`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          updated: results.length,
          slices: results
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error: any) {
    console.error('❌ Kitchen slices error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
