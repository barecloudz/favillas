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
      // Get all active rewards
      const rewards = await sql`
        SELECT * FROM rewards 
        WHERE is_active = true
        ORDER BY points_cost ASC
      `;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(rewards)
      };

    } else if (event.httpMethod === 'POST') {
      const { name, description, pointsCost, isActive = true } = JSON.parse(event.body || '{}');
      
      if (!name || !description || !pointsCost) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            message: 'Name, description, and points cost are required' 
          })
        };
      }
      
      const result = await sql`
        INSERT INTO rewards (name, description, points_cost, is_active, created_at, updated_at)
        VALUES (${name}, ${description}, ${pointsCost}, ${isActive}, NOW(), NOW())
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
      
      const { name, description, pointsCost, isActive } = JSON.parse(event.body || '{}');
      
      const result = await sql`
        UPDATE rewards 
        SET name = ${name || null}, 
            description = ${description || null}, 
            points_cost = ${pointsCost || null}, 
            is_active = ${isActive !== undefined ? isActive : null},
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