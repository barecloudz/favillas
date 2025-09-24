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
      const dbChoiceItems = await sql`
        SELECT * FROM choice_items
        ORDER BY choice_group_id ASC, name ASC
      `;

      // Transform database fields to match frontend expectations
      const choiceItems = dbChoiceItems.map(item => ({
        id: item.id,
        choiceGroupId: item.choice_group_id,
        name: item.name,
        price: item.price,
        isDefault: item.is_default,
        created_at: item.created_at
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(choiceItems)
      };

    } else if (event.httpMethod === 'POST') {
      const { choiceGroupId, name, price, isDefault } = JSON.parse(event.body || '{}');
      
      if (!choiceGroupId || !name) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Choice group ID and name are required' })
        };
      }
      
      const result = await sql`
        INSERT INTO choice_items (choice_group_id, name, price, is_default, created_at)
        VALUES (${choiceGroupId}, ${name}, ${price || 0}, ${isDefault || false}, NOW())
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
      const itemId = urlParts[urlParts.length - 1];
      
      if (!itemId || isNaN(parseInt(itemId))) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid choice item ID' })
        };
      }
      
      const { choiceGroupId, name, price, isDefault } = JSON.parse(event.body || '{}');

      const result = await sql`
        UPDATE choice_items
        SET choice_group_id = ${choiceGroupId}, name = ${name}, price = ${price},
            is_default = ${isDefault}
        WHERE id = ${parseInt(itemId)}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Choice item not found' })
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
      const itemId = urlParts[urlParts.length - 1];
      
      if (!itemId || isNaN(parseInt(itemId))) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid choice item ID' })
        };
      }
      
      const result = await sql`
        DELETE FROM choice_items 
        WHERE id = ${parseInt(itemId)}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Choice item not found' })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Choice item deleted successfully' })
      };

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ message: 'Method not allowed' })
      };
    }

  } catch (error: any) {
    console.error('Choice Items API error:', error);
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