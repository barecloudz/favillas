import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300'
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
    const { menuItems } = await import('../shared/schema.js');
    
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
    const allMenuItems = await db.select().from(menuItems);
    
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
  } catch (error) {
    console.error('Menu API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Failed to fetch menu items',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};