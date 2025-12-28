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

    // GET - Fetch all catering packages
    if (event.httpMethod === 'GET') {
      const packages = await sql`
        SELECT
          id,
          package_key,
          package_name,
          description,
          badge_text,
          badge_color,
          items,
          pricing,
          is_enabled,
          display_order
        FROM catering_packages
        ORDER BY display_order ASC
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          packages
        })
      };
    }

    // PUT - Update a package
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const { id, package_name, description, badge_text, badge_color, items, pricing, is_enabled } = body;

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Package ID is required' })
        };
      }

      const updateResult = await sql`
        UPDATE catering_packages
        SET
          package_name = COALESCE(${package_name}, package_name),
          description = COALESCE(${description}, description),
          badge_text = COALESCE(${badge_text}, badge_text),
          badge_color = COALESCE(${badge_color}, badge_color),
          items = COALESCE(${items ? JSON.stringify(items) : null}, items),
          pricing = COALESCE(${pricing ? JSON.stringify(pricing) : null}, pricing),
          is_enabled = COALESCE(${is_enabled}, is_enabled),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          package: updateResult[0]
        })
      };
    }

    // PATCH - Toggle package enabled status
    if (event.httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}');
      const { id, is_enabled } = body;

      if (!id || is_enabled === undefined) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Package ID and is_enabled are required' })
        };
      }

      const updateResult = await sql`
        UPDATE catering_packages
        SET is_enabled = ${is_enabled}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          package: updateResult[0]
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Catering packages error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process catering packages request',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
