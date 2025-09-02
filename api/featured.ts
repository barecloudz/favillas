import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    // Import dependencies dynamically
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres = (await import('postgres')).default;
    const { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb } = await import("drizzle-orm/pg-core");
    
    // Define menuItems table inline
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
    });
    
    const db = drizzle(sql);
    
    // Get featured menu items (popular OR best seller items)
    const { or, eq } = await import('drizzle-orm');
    const featuredItems = await db
      .select()
      .from(menuItems)
      .where(
        or(
          eq(menuItems.isPopular, true),
          eq(menuItems.isBestSeller, true)
        )
      )
      .limit(6);
    
    await sql.end();
    
    // If no featured items, return sample ones
    if (!featuredItems || featuredItems.length === 0) {
      const sampleFeatured = [
        {
          id: 1,
          name: "Margherita Pizza",
          description: "Fresh mozzarella, tomato sauce, and basil",
          basePrice: "12.99",
          category: "Traditional Pizza",
          imageUrl: "/images/f1.png",
          isAvailable: true,
          isPopular: true,
          isNew: false,
          isBestSeller: false,
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
        }
      ];
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(sampleFeatured)
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(featuredItems)
    };
  } catch (error) {
    console.error('Featured API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Failed to fetch featured items',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};