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
        SELECT ci.*, cg.name as choice_group_name
        FROM choice_items ci
        JOIN choice_groups cg ON ci.choice_group_id = cg.id
        ORDER BY ci.choice_group_id ASC, ci.name ASC
      `;

      // Transform database fields to match frontend expectations
      const choiceItems = dbChoiceItems.map(item => ({
        id: item.id,
        choiceGroupId: item.choice_group_id,
        name: item.name,
        price: item.price,
        isDefault: item.is_default,
        choice_group_name: item.choice_group_name,
        created_at: item.created_at,
        // Add availability fields
        isActive: item.is_active !== false,
        isTemporarilyUnavailable: item.is_temporarily_unavailable || false,
        unavailabilityReason: item.unavailability_reason,
        unavailableSince: item.unavailable_since
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
      
      const updateData = JSON.parse(event.body || '{}');
      const { choiceGroupId, name, price, isDefault } = updateData;

      // Get current item to check what needs updating
      const currentItem = await sql`
        SELECT * FROM choice_items WHERE id = ${parseInt(itemId)}
      `;

      if (currentItem.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Choice item not found' })
        };
      }

      // Build dynamic update query to avoid undefined values
      const updateFields = [];
      const updateValues = [];
      let parameterIndex = 2; // Start at $2 since $1 is itemId

      if (choiceGroupId !== undefined) {
        updateFields.push('choice_group_id = $' + parameterIndex);
        updateValues.push(choiceGroupId);
        parameterIndex++;
      }

      if (name !== undefined) {
        updateFields.push('name = $' + parameterIndex);
        updateValues.push(name);
        parameterIndex++;
      }

      if (price !== undefined) {
        updateFields.push('price = $' + parameterIndex);
        updateValues.push(price);
        parameterIndex++;
      }

      if (isDefault !== undefined) {
        updateFields.push('is_default = $' + parameterIndex);
        updateValues.push(isDefault);
        parameterIndex++;
      }

      if (updateFields.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'No valid fields to update' })
        };
      }

      // Execute the dynamic update query
      const query = `
        UPDATE choice_items
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;

      const result = await sql.unsafe(query, [parseInt(itemId), ...updateValues]);
      
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