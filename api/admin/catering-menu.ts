import { Handler } from '@netlify/functions';
import postgres from 'postgres';

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
    'Access-Control-Allow-Methods': 'GET, PUT, PATCH, OPTIONS',
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

    // GET - Fetch all catering menu categories
    if (event.httpMethod === 'GET') {
      const categories = await sql`
        SELECT
          id,
          category_key,
          category_name,
          items,
          is_enabled,
          display_order
        FROM catering_menu
        ORDER BY display_order ASC
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          categories
        })
      };
    }

    // PUT - Update a category (enable/disable or update items)
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, is_enabled, items, category_name } = body;

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Category ID is required' })
        };
      }

      // Build update query dynamically based on what's provided
      let updateResult;

      if (is_enabled !== undefined && items !== undefined) {
        updateResult = await sql`
          UPDATE catering_menu
          SET is_enabled = ${is_enabled}, items = ${JSON.stringify(items)}, updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;
      } else if (is_enabled !== undefined) {
        updateResult = await sql`
          UPDATE catering_menu
          SET is_enabled = ${is_enabled}, updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;
      } else if (items !== undefined) {
        updateResult = await sql`
          UPDATE catering_menu
          SET items = ${JSON.stringify(items)}, updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;
      } else if (category_name !== undefined) {
        updateResult = await sql`
          UPDATE catering_menu
          SET category_name = ${category_name}, updated_at = NOW()
          WHERE id = ${id}
          RETURNING *
        `;
      } else {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No update fields provided' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          category: updateResult[0]
        })
      };
    }

    // PATCH - Toggle category enabled status
    if (event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}');
      const { id, is_enabled } = body;

      if (!id || is_enabled === undefined) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Category ID and is_enabled are required' })
        };
      }

      const updateResult = await sql`
        UPDATE catering_menu
        SET is_enabled = ${is_enabled}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          category: updateResult[0]
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Catering menu error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process catering menu request',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
