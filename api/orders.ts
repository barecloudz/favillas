import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Import dependencies dynamically
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres = (await import('postgres')).default;
    const { orders } = await import('../shared/schema.js');
    
    // Create database connection
    const sql = postgres(process.env.DATABASE_URL!, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keepalive: false,
    });
    
    const db = drizzle(sql);

    if (req.method === 'GET') {
      // Get all orders
      const allOrders = await db.select().from(orders);
      
      // If no orders, return empty array
      if (!allOrders || allOrders.length === 0) {
        return res.status(200).json([]);
      }

      res.status(200).json(allOrders);
    } else if (req.method === 'POST') {
      // Create new order
      const orderData = req.body;
      
      const { insertInto } = await import('drizzle-orm');
      const newOrder = await db
        .insert(orders)
        .values({
          ...orderData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      res.status(201).json(newOrder[0]);
    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    await sql.end();
  } catch (error) {
    console.error('Orders API error:', error);
    res.status(500).json({ 
      message: 'Failed to process orders request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}