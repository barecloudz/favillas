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

  // Add caching headers for GET requests
  const headersWithCache = event.httpMethod === 'GET' ? {
    ...headers,
    // Cache categories for 5 minutes with stale-while-revalidate
    'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
    'CDN-Cache-Control': 'max-age=600',
    'Surrogate-Control': 'max-age=3600'
  } : headers;
  
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
      const dbCategories = await sql`
        SELECT * FROM categories
        ORDER BY "order" ASC, name ASC
      `;

      // Transform database fields to match frontend expectations
      const categories = dbCategories.map(cat => ({
        id: cat.id,
        name: cat.name,
        order: cat.order,
        isActive: cat.is_active,
        created_at: cat.created_at
      }));

      return {
        statusCode: 200,
        headers: headersWithCache,
        body: JSON.stringify({ categories })
      };

    } else if (event.httpMethod === 'POST') {
      const { name, order, isActive } = JSON.parse(event.body || '{}');
      
      if (!name) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Name is required' })
        };
      }
      
      const result = await sql`
        INSERT INTO categories (name, "order", is_active, created_at)
        VALUES (${name}, ${order || 1}, ${isActive !== false}, NOW())
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
      const categoryId = urlParts[urlParts.length - 1];

      if (!categoryId || isNaN(parseInt(categoryId))) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid category ID' })
        };
      }

      const updateData = JSON.parse(event.body || '{}');
      const { name, order, isActive } = updateData;

      // Build dynamic update query to avoid undefined values
      const updateFields = [];
      const updateValues = [];

      if (name !== undefined) {
        updateFields.push('name = $' + (updateFields.length + 2)); // +2 because categoryId is $1
        updateValues.push(name);
      }

      if (order !== undefined) {
        updateFields.push('"order" = $' + (updateFields.length + 2));
        updateValues.push(order);
      }

      if (isActive !== undefined) {
        updateFields.push('is_active = $' + (updateFields.length + 2));
        updateValues.push(isActive);
      }

      if (updateFields.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'No valid fields to update' })
        };
      }

      // Construct and execute the dynamic update query
      const query = `
        UPDATE categories
        SET ${updateFields.join(', ')}
        WHERE id = $1
        RETURNING *
      `;

      const result = await sql.unsafe(query, [parseInt(categoryId), ...updateValues]);

      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Category not found' })
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
      const categoryId = urlParts[urlParts.length - 1];
      
      if (!categoryId || isNaN(parseInt(categoryId))) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid category ID' })
        };
      }
      
      const result = await sql`
        DELETE FROM categories 
        WHERE id = ${parseInt(categoryId)}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Category not found' })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Category deleted successfully' })
      };

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ message: 'Method not allowed' })
      };
    }

  } catch (error: any) {
    console.error('Categories API error:', error);
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