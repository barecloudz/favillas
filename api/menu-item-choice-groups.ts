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
      const menuItemChoiceGroups = await sql`
        SELECT micg.*, mi.name as menu_item_name, cg.name as choice_group_name
        FROM menu_item_choice_groups micg
        LEFT JOIN menu_items mi ON micg.menu_item_id = mi.id
        LEFT JOIN choice_groups cg ON micg.choice_group_id = cg.id
        ORDER BY micg.menu_item_id ASC, micg.order ASC
      `;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(menuItemChoiceGroups)
      };

    } else if (event.httpMethod === 'POST') {
      const requestBody = JSON.parse(event.body || '{}');
      const { menuItemId, choiceGroupId, order = 0, isRequired = false } = requestBody;
      
      if (!menuItemId || !choiceGroupId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Menu item ID and choice group ID are required' })
        };
      }
      
      // Check if association already exists
      const existing = await sql`
        SELECT * FROM menu_item_choice_groups 
        WHERE menu_item_id = ${menuItemId} AND choice_group_id = ${choiceGroupId}
      `;
      
      if (existing.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Association already exists' })
        };
      }
      
      const result = await sql`
        INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, "order", is_required, created_at)
        VALUES (${menuItemId}, ${choiceGroupId}, ${order}, ${isRequired}, NOW())
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
        DELETE FROM menu_item_choice_groups 
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
    console.error('Menu Item Choice Groups API error:', error);
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