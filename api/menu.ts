import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Import dependencies dynamically
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres = (await import('postgres')).default;
    const { eq } = await import('drizzle-orm');
    const { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } = await import("drizzle-orm/pg-core");

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

    // Extract ID from path if present (e.g., /api/menu/123 -> 123)
    const pathParts = event.path.split('/');
    const itemId = pathParts[pathParts.length - 1];
    const hasId = itemId && !isNaN(Number(itemId));

    // GET - Fetch menu items
    if (event.httpMethod === 'GET') {
      if (hasId) {
        // Get single item by ID
        const items = await db.select().from(menuItems).where(eq(menuItems.id, parseInt(itemId)));
        await sql.end();

        if (items.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ message: 'Menu item not found' })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(items[0])
        };
      } else {
        // Get all items
        const allMenuItems = await db.select().from(menuItems);
        await sql.end();

        // If no menu items exist, return sample items
        if (!allMenuItems || allMenuItems.length === 0) {
          const sampleItems = [
            {
              id: 1,
              name: "Margherita Pizza",
              description: "Fresh mozzarella, tomato sauce, and basil",
              basePrice: "12.99",
              category: "Traditional Pizza",
              imageUrl: "/images/f1.png",
              isAvailable: true,
              isPopular: false,
              isNew: false,
              isBestSeller: false,
              options: null,
              createdAt: new Date()
            },
            {
              id: 2,
              name: "Pepperoni Pizza",
              description: "Classic pepperoni with mozzarella and tomato sauce",
              basePrice: "14.99",
              category: "Traditional Pizza",
              imageUrl: "/images/f2.jpg",
              isAvailable: true,
              isPopular: true,
              isNew: false,
              isBestSeller: true,
              options: null,
              createdAt: new Date()
            }
          ];

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify(sampleItems)
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(allMenuItems)
        };
      }
    }

    // POST - Create new menu item
    if (event.httpMethod === 'POST') {
      if (!event.body) {
        await sql.end();
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Request body is required' })
        };
      }

      const data = JSON.parse(event.body);
      const newItem = await db.insert(menuItems).values(data).returning();
      await sql.end();

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(newItem[0])
      };
    }

    // PATCH/PUT - Update menu item
    if (event.httpMethod === 'PATCH' || event.httpMethod === 'PUT') {
      if (!hasId) {
        await sql.end();
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Item ID is required for update' })
        };
      }

      if (!event.body) {
        await sql.end();
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Request body is required' })
        };
      }

      const data = JSON.parse(event.body);
      const updated = await db.update(menuItems)
        .set(data)
        .where(eq(menuItems.id, parseInt(itemId)))
        .returning();

      await sql.end();

      if (updated.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Menu item not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updated[0])
      };
    }

    // DELETE - Delete menu item
    if (event.httpMethod === 'DELETE') {
      if (!hasId) {
        await sql.end();
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Item ID is required for deletion' })
        };
      }

      const deleted = await db.delete(menuItems)
        .where(eq(menuItems.id, parseInt(itemId)))
        .returning();

      await sql.end();

      if (deleted.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Menu item not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Menu item deleted successfully', item: deleted[0] })
      };
    }

    // If we get here, method is not supported
    await sql.end();
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Menu API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
