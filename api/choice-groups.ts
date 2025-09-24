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
      const dbChoiceGroups = await sql`
        SELECT * FROM choice_groups
        ORDER BY name ASC
      `;

      // Transform database fields to match frontend expectations
      const choiceGroups = dbChoiceGroups.map(group => ({
        id: group.id,
        name: group.name,
        description: group.description,
        minSelections: group.min_selections,
        maxSelections: group.max_selections,
        isRequired: group.is_required,
        created_at: group.created_at
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(choiceGroups)
      };

    } else if (event.httpMethod === 'POST') {
      const { name, description, minSelections, maxSelections, isRequired } = JSON.parse(event.body || '{}');
      
      if (!name) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Name is required' })
        };
      }
      
      const result = await sql`
        INSERT INTO choice_groups (name, description, min_selections, max_selections, is_required, created_at)
        VALUES (${name}, ${description || ''}, ${minSelections || 0}, ${maxSelections || 1}, ${isRequired || false}, NOW())
        RETURNING *
      `;
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(result[0])
      };

    } else if (event.httpMethod === 'PUT') {
      // Extract ID from URL path
      const urlParts = event.path?.split('/') || [];
      const groupId = urlParts[urlParts.length - 1];
      
      if (!groupId || isNaN(parseInt(groupId))) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid choice group ID' })
        };
      }
      
      const { name, description, minSelections, maxSelections, isRequired } = JSON.parse(event.body || '{}');
      
      const result = await sql`
        UPDATE choice_groups
        SET name = ${name}, description = ${description}, min_selections = ${minSelections},
            max_selections = ${maxSelections}, is_required = ${isRequired}
        WHERE id = ${parseInt(groupId)}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Choice group not found' })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result[0])
      };

    } else if (event.httpMethod === 'DELETE') {
      // Extract ID from URL path
      const urlParts = event.path?.split('/') || [];
      const groupId = urlParts[urlParts.length - 1];
      
      if (!groupId || isNaN(parseInt(groupId))) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid choice group ID' })
        };
      }
      
      const result = await sql`
        DELETE FROM choice_groups 
        WHERE id = ${parseInt(groupId)}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Choice group not found' })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Choice group deleted successfully' })
      };

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ message: 'Method not allowed' })
      };
    }

  } catch (error: any) {
    console.error('Choice Groups API error:', error);
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