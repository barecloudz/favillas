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
      // Get all active rewards (non-expired)
      const rewards = await sql`
        SELECT * FROM rewards 
        WHERE expires_at IS NULL OR expires_at > NOW()
        ORDER BY discount ASC
      `;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(rewards)
      };

    } else if (event.httpMethod === 'POST') {
      const { name, description, type, pointsRequired, discount, freeItem, minOrderAmount, expiresAt } = JSON.parse(event.body || '{}');

      if (!name || !description) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            message: 'Name and description are required'
          })
        };
      }

      const result = await sql`
        INSERT INTO rewards (name, description, type, points_required, discount, free_item, min_order_amount, expires_at, created_at)
        VALUES (${name}, ${description}, ${type || 'discount'}, ${pointsRequired ? parseInt(pointsRequired) : 0}, ${discount ? parseInt(discount) : null}, ${freeItem || null}, ${minOrderAmount ? parseFloat(minOrderAmount) : null}, ${expiresAt || null}, NOW())
        RETURNING *
      `;
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(result[0])
      };

    } else if (event.httpMethod === 'PUT') {
      // Extract ID from URL path
      const pathParts = event.path.split('/');
      const rewardId = pathParts[pathParts.length - 1];
      
      if (!rewardId || isNaN(parseInt(rewardId))) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid reward ID' })
        };
      }
      
      const { name, description, type, pointsRequired, discount, freeItem, minOrderAmount, expiresAt } = JSON.parse(event.body || '{}');

      const result = await sql`
        UPDATE rewards
        SET name = ${name || null},
            description = ${description || null},
            type = ${type || 'discount'},
            points_required = ${pointsRequired ? parseInt(pointsRequired) : null},
            discount = ${discount ? parseInt(discount) : null},
            free_item = ${freeItem || null},
            min_order_amount = ${minOrderAmount ? parseFloat(minOrderAmount) : null},
            expires_at = ${expiresAt || null},
            updated_at = NOW()
        WHERE id = ${parseInt(rewardId)}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Reward not found' })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result[0])
      };

    } else if (event.httpMethod === 'DELETE') {
      // Extract ID from URL path
      const pathParts = event.path.split('/');
      const rewardId = pathParts[pathParts.length - 1];
      
      if (!rewardId || isNaN(parseInt(rewardId))) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid reward ID' })
        };
      }
      
      const result = await sql`
        DELETE FROM rewards 
        WHERE id = ${parseInt(rewardId)}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Reward not found' })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Reward deleted successfully' })
      };

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ message: 'Method not allowed' })
      };
    }

  } catch (error: any) {
    console.error('Rewards API error:', error);
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