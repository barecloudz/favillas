import { Handler } from '@netlify/functions';
import jwt from 'jsonwebtoken';

function authenticateToken(event: any): { userId: number; username: string; role: string } | null {
  // First try to get token from Authorization header
  let token = null;
  const authHeader = event.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }
  
  // If no token in header, try to get from cookies
  if (!token) {
    const cookies = event.headers.cookie;
    if (cookies) {
      const authCookie = cookies.split(';').find(cookie => cookie.trim().startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }
  }

  if (!token) {
    return null;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
    }

    const payload = jwt.verify(token, jwtSecret) as { userId: number; username: string; role: string };
    return payload;
  } catch (error) {
    return null;
  }
}

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Extract menu item ID from URL path
  const urlParts = event.path?.split('/') || [];
  const menuId = urlParts[urlParts.length - 1];
  
  if (!menuId || isNaN(parseInt(menuId))) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Invalid menu item ID' })
    };
  }

  // Check authentication for non-GET requests
  if (event.httpMethod !== 'GET') {
    const authPayload = authenticateToken(event);
    if (!authPayload) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    // Only admins can modify menu items
    if (!['admin', 'manager'].includes(authPayload.role)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Forbidden - Admin or Manager access required' })
      };
    }
  }

  try {
    // Import dependencies dynamically
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres = (await import('postgres')).default;
    const { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } = await import("drizzle-orm/pg-core");
    const { eq } = await import('drizzle-orm');
    
    // Define menuItems table inline to avoid import issues
    const menuItems = pgTable("menu_items", {
      id: serial("id").primaryKey(),
      name: text("name").notNull(),
      description: text("description").notNull(),
      imageUrl: text("image_url"),
      basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
      category: text("category").notNull(),
      isPopular: boolean("is_popular").default(false).notNull(),
      isNew: boolean("is_new").default(false).notNull(),
      isBestSeller: boolean("is_best_seller").default(false).notNull(),
      isAvailable: boolean("is_available").default(true).notNull(),
      options: jsonb("options"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
    });
    
    // Create database connection
    const sql = postgres(process.env.DATABASE_URL!, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
      types: {
        bigint: postgres.BigInt,
      },
    });
    
    const db = drizzle(sql);

    if (event.httpMethod === 'GET') {
      // Get specific menu item
      const menuItem = await db
        .select()
        .from(menuItems)
        .where(eq(menuItems.id, parseInt(menuId)))
        .limit(1);

      await sql.end();

      if (!menuItem || menuItem.length === 0) {
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
    } else if (event.httpMethod === 'PUT') {
      // Update menu item
      const updateData = JSON.parse(event.body || '{}');
      
      const updatedMenuItem = await db
        .update(menuItems)
        .set({
          name: updateData.name,
          description: updateData.description,
          imageUrl: updateData.imageUrl,
          basePrice: updateData.basePrice,
          category: updateData.category,
          isPopular: updateData.isPopular,
          isNew: updateData.isNew,
          isBestSeller: updateData.isBestSeller,
          isAvailable: updateData.isAvailable,
          options: updateData.options,
        })
        .where(eq(menuItems.id, parseInt(menuId)))
        .returning();

      await sql.end();

      if (updatedMenuItem.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Menu item not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedMenuItem[0])
      };
    } else if (event.httpMethod === 'DELETE') {
      // Delete menu item
      const deletedMenuItem = await db
        .delete(menuItems)
        .where(eq(menuItems.id, parseInt(menuId)))
        .returning();

      await sql.end();

      if (deletedMenuItem.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Menu item not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Menu item deleted successfully' })
      };
    } else {
      await sql.end();
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ message: 'Method not allowed' })
      };
    }
  } catch (error) {
    console.error('Menu item API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Failed to process menu item request',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};



