import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken } from './_shared/auth';

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
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  // Add caching headers for GET requests
  const headersWithCache = event.httpMethod === 'GET' ? {
    ...headers,
    // Cache menu items for 5 minutes with stale-while-revalidate
    'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=60',
    'CDN-Cache-Control': 'max-age=600',
    'Surrogate-Control': 'max-age=3600',
    // Add ETag support for conditional requests
    'Vary': 'Accept-Encoding'
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
      // Get all menu items
      const menuItems = await sql`
        SELECT * FROM menu_items
        ORDER BY category, name
      `;

      return {
        statusCode: 200,
        headers: headersWithCache,
        body: JSON.stringify(menuItems)
      };
    }

    if (event.httpMethod === 'POST') {
      // Create menu item (admin only)
      const authPayload = await authenticateToken(event);
      if (!authPayload || (authPayload.role !== 'admin' && authPayload.role !== 'super_admin')) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized - Admin access required' })
        };
      }

      const data = JSON.parse(event.body || '{}');
      
      const menuItem = await sql`
        INSERT INTO menu_items (name, description, base_price, category, is_available, image_url)
        VALUES (${data.name}, ${data.description || ''}, ${data.basePrice}, ${data.category}, ${data.isAvailable !== false}, ${data.imageUrl || ''})
        RETURNING *
      `;

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(menuItem[0])
      };
    }

    if (event.httpMethod === 'PUT') {
      // Update menu item (admin only)
      const authPayload = await authenticateToken(event);
      if (!authPayload || (authPayload.role !== 'admin' && authPayload.role !== 'super_admin')) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized - Admin access required' })
        };
      }

      const data = JSON.parse(event.body || '{}');
      const id = parseInt(event.path.split('/').pop() || '0');
      
      const menuItem = await sql`
        UPDATE menu_items
        SET name = ${data.name},
            description = ${data.description || ''},
            base_price = ${data.basePrice},
            category = ${data.category},
            is_available = ${data.isAvailable !== false},
            image_url = ${data.imageUrl || ''}
        WHERE id = ${id}
        RETURNING *
      `;

      if (menuItem.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Menu item not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(menuItem[0])
      };
    }

    if (event.httpMethod === 'PATCH') {
      // Partial update menu item (admin only)
      const authPayload = await authenticateToken(event);
      if (!authPayload || (authPayload.role !== 'admin' && authPayload.role !== 'super_admin')) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized - Admin access required' })
        };
      }

      const data = JSON.parse(event.body || '{}');
      const id = parseInt(event.path.split('/').pop() || '0');
      
      const updateFields = [];
      const updateValues = [];
      
      if (data.name !== undefined) {
        updateFields.push('name = $' + (updateValues.length + 1));
        updateValues.push(data.name);
      }
      if (data.description !== undefined) {
        updateFields.push('description = $' + (updateValues.length + 1));
        updateValues.push(data.description);
      }
      if (data.basePrice !== undefined) {
        updateFields.push('base_price = $' + (updateValues.length + 1));
        updateValues.push(data.basePrice);
      }
      if (data.categoryId !== undefined) {
        updateFields.push('category_id = $' + (updateValues.length + 1));
        updateValues.push(data.categoryId);
      }
      if (data.isAvailable !== undefined) {
        updateFields.push('is_available = $' + (updateValues.length + 1));
        updateValues.push(data.isAvailable);
      }
      if (data.imageUrl !== undefined) {
        updateFields.push('image_url = $' + (updateValues.length + 1));
        updateValues.push(data.imageUrl);
      }

      if (updateFields.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'No fields to update' })
        };
      }

      const menuItem = await sql`
        UPDATE menu_items 
        SET ${sql.unsafe(updateFields.join(', '))}
        WHERE id = ${id}
        RETURNING *
      `;

      if (menuItem.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Menu item not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(menuItem[0])
      };
    }

    if (event.httpMethod === 'DELETE') {
      // Delete menu item (admin only)
      const authPayload = await authenticateToken(event);
      if (!authPayload || (authPayload.role !== 'admin' && authPayload.role !== 'super_admin')) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized - Admin access required' })
        };
      }

      const id = parseInt(event.path.split('/').pop() || '0');
      
      const result = await sql`
        DELETE FROM menu_items 
        WHERE id = ${id}
        RETURNING id
      `;

      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Menu item not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Menu item deleted' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Menu Items API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Failed to process menu items',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
