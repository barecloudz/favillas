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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Authenticate user - kitchen staff should be authenticated
  const authPayload = await authenticateToken(event);
  if (!authPayload || !isStaff(authPayload)) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized - Kitchen access required' })
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

    // POST - Create new slice
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { name, description, base_price, image_url, category, is_available } = body;

      if (!name || !base_price) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'name and base_price are required' })
        };
      }

      console.log(`🍕 Kitchen Slices: Creating new slice: ${name}`);

      const result = await sql`
        INSERT INTO menu_items (
          name,
          description,
          base_price,
          image_url,
          category,
          is_available,
          is_featured,
          created_at,
          updated_at
        )
        VALUES (
          ${name},
          ${description || ''},
          ${base_price},
          ${image_url || ''},
          ${category || 'Pizza by the Slice'},
          ${is_available !== undefined ? is_available : true},
          false,
          NOW(),
          NOW()
        )
        RETURNING id, name, description, base_price, image_url, is_available
      `;

      console.log(`✅ Created slice: ${result[0].name}`);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          success: true,
          slice: result[0]
        })
      };
    }

    // PUT - Update existing slice
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { sliceId, name, description, base_price, image_url } = body;

      if (!sliceId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'sliceId is required' })
        };
      }

      console.log(`🍕 Kitchen Slices: Updating slice ${sliceId}`);

      const result = await sql`
        UPDATE menu_items
        SET
          name = ${name},
          description = ${description || ''},
          base_price = ${base_price},
          image_url = ${image_url || ''},
          updated_at = NOW()
        WHERE id = ${sliceId} AND category = 'Pizza by the Slice'
        RETURNING id, name, description, base_price, image_url, is_available
      `;

      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Slice not found' })
        };
      }

      console.log(`✅ Updated slice: ${result[0].name}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          slice: result[0]
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
