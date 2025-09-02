import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Import dependencies dynamically
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres = (await import('postgres')).default;
    const { orders } = await import('../../shared/schema.js');
    
    // Create database connection
    const sql = postgres(process.env.DATABASE_URL!, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
    });
    
    const db = drizzle(sql);

    // Get active kitchen orders (pending, preparing, ready)
    const { or, eq, inArray } = await import('drizzle-orm');
    const kitchenOrders = await db
      .select()
      .from(orders)
      .where(
        or(
          eq(orders.status, 'pending'),
          eq(orders.status, 'preparing'),
          eq(orders.status, 'ready')
        )
      );
    
    console.log(`[API] Fetching active orders...`);
    
    // If no orders, return empty array
    if (!kitchenOrders || kitchenOrders.length === 0) {
      return res.status(200).json([]);
    }

    res.status(200).json(kitchenOrders);
    await sql.end();
  } catch (error) {
    console.error('Kitchen Orders API error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch kitchen orders',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}