import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { verifyAdminAuth } from './utils/auth';

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
  });

  return dbConnection;
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();

    // GET - Fetch all FAQs (public endpoint, but we keep it here for admin too)
    if (event.httpMethod === 'GET') {
      const faqs = await sql`
        SELECT id, question, answer, display_order, is_active, created_at, updated_at
        FROM faqs
        ORDER BY display_order ASC, id ASC
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(faqs)
      };
    }

    // All other methods require admin authentication
    const authResult = await verifyAdminAuth(event);
    if (!authResult.isValid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: authResult.error || 'Unauthorized' })
      };
    }

    // POST - Create new FAQ
    if (event.httpMethod === 'POST') {
      const { question, answer, display_order, is_active } = JSON.parse(event.body || '{}');

      if (!question || !answer) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Question and answer are required' })
        };
      }

      const result = await sql`
        INSERT INTO faqs (question, answer, display_order, is_active)
        VALUES (${question}, ${answer}, ${display_order || 0}, ${is_active !== false})
        RETURNING *
      `;

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(result[0])
      };
    }

    // PUT - Update FAQ
    if (event.httpMethod === 'PUT') {
      // Try to get ID from path (e.g., /api/admin-faqs/123) or from body
      const pathMatch = event.path.match(/\/admin-faqs\/(\d+)$/);
      const pathId = pathMatch ? parseInt(pathMatch[1]) : null;

      const body = JSON.parse(event.body || '{}');
      const id = pathId || body.id;
      const { question, answer, display_order, is_active } = body;

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'FAQ ID is required' })
        };
      }

      const result = await sql`
        UPDATE faqs
        SET
          question = COALESCE(${question}, question),
          answer = COALESCE(${answer}, answer),
          display_order = COALESCE(${display_order}, display_order),
          is_active = COALESCE(${is_active}, is_active),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'FAQ not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result[0])
      };
    }

    // DELETE - Delete FAQ
    if (event.httpMethod === 'DELETE') {
      // Try to get ID from path (e.g., /api/admin-faqs/123) or from query params
      const pathMatch = event.path.match(/\/admin-faqs\/(\d+)$/);
      const pathId = pathMatch ? parseInt(pathMatch[1]) : null;
      const id = pathId || event.queryStringParameters?.id;

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'FAQ ID is required' })
        };
      }

      const result = await sql`
        DELETE FROM faqs
        WHERE id = ${id}
        RETURNING id
      `;

      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'FAQ not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'FAQ deleted successfully' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };

  } catch (error: any) {
    console.error('FAQ API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.message
      })
    };
  }
};
