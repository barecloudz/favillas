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

      // First, get the current category to check if name is changing
      const currentCategory = await sql`
        SELECT * FROM categories WHERE id = ${parseInt(categoryId)}
      `;

      if (currentCategory.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Category not found' })
        };
      }

      const oldCategoryName = currentCategory[0].name;

      // Use simple, direct update queries instead of complex dynamic queries
      let result = currentCategory; // Default to current category
      let updatedMenuItems = 0;

      try {
        // Update category name if provided
        if (name !== undefined) {
          result = await sql`
            UPDATE categories
            SET name = ${name}
            WHERE id = ${parseInt(categoryId)}
            RETURNING *
          `;

          // If category name update succeeded and name actually changed, update menu items
          if (result.length > 0 && name !== oldCategoryName) {
            const menuItemsUpdate = await sql`
              UPDATE menu_items
              SET category = ${name}
              WHERE category = ${oldCategoryName}
            `;
            updatedMenuItems = menuItemsUpdate.count || 0;
            console.log(`Successfully updated ${updatedMenuItems} menu items from "${oldCategoryName}" to "${name}"`);
          }
        }

        // Update order if provided (separate query)
        if (order !== undefined && result.length > 0) {
          result = await sql`
            UPDATE categories
            SET "order" = ${order}
            WHERE id = ${parseInt(categoryId)}
            RETURNING *
          `;
        }

        // Update active status if provided (separate query)
        if (isActive !== undefined && result.length > 0) {
          result = await sql`
            UPDATE categories
            SET is_active = ${isActive}
            WHERE id = ${parseInt(categoryId)}
            RETURNING *
          `;
        }

      } catch (error: any) {
        console.error('Category update error:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            message: 'Category update failed',
            error: error.message
          })
        };
      }

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
        body: JSON.stringify({
          ...result[0],
          updatedMenuItems: updatedMenuItems
        })
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