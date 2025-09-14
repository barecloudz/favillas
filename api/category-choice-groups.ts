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

  try {
    const sql = getDB();

    if (event.httpMethod === 'GET') {
      const categoryChoiceGroups = await sql`
        SELECT ccg.*, c.name as category_name, cg.name as choice_group_name
        FROM category_choice_groups ccg
        LEFT JOIN categories c ON ccg.category_id = c.id
        LEFT JOIN choice_groups cg ON ccg.choice_group_id = cg.id
        ORDER BY ccg.category_id ASC, ccg.choice_group_id ASC
      `;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(categoryChoiceGroups)
      };

    } else if (event.httpMethod === 'POST') {
      const requestBody = JSON.parse(event.body || '{}');
      const { categoryId, choiceGroupId } = requestBody;
      
      if (!categoryId || !choiceGroupId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Category ID and choice group ID are required' })
        };
      }
      
      // Check if association already exists
      const existing = await sql`
        SELECT * FROM category_choice_groups 
        WHERE category_id = ${categoryId} AND choice_group_id = ${choiceGroupId}
      `;
      
      if (existing.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Association already exists' })
        };
      }
      
      const result = await sql`
        INSERT INTO category_choice_groups (category_id, choice_group_id, created_at)
        VALUES (${categoryId}, ${choiceGroupId}, NOW())
        RETURNING *
      `;
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(result[0])
      };

    } else if (event.httpMethod === 'DELETE') {
      // Extract ID from URL path
      const urlParts = event.path?.split('/') || [];
      const associationId = urlParts[urlParts.length - 1];
      
      if (!associationId || isNaN(parseInt(associationId))) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid association ID' })
        };
      }
      
      const result = await sql`
        DELETE FROM category_choice_groups 
        WHERE id = ${parseInt(associationId)}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Association not found' })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Association deleted successfully' })
      };

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ message: 'Method not allowed' })
      };
    }

  } catch (error: any) {
    console.error('Category Choice Groups API error:', error);
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