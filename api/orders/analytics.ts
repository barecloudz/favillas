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
      keepalive: false,
    });
    
    const db = drizzle(sql);

    // Get basic analytics - for now return sample data if no orders exist
    const allOrders = await db.select().from(orders);
    
    if (!allOrders || allOrders.length === 0) {
      // Return sample analytics data
      const sampleAnalytics = {
        totalOrders: 0,
        totalRevenue: 0,
        averageOrderValue: 0,
        ordersToday: 0,
        revenueToday: 0,
        topItems: [],
        hourlyStats: Array.from({ length: 24 }, (_, i) => ({
          hour: i,
          orders: 0,
          revenue: 0
        })),
        dailyStats: Array.from({ length: 30 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - i);
          return {
            date: date.toISOString().split('T')[0],
            orders: 0,
            revenue: 0
          };
        }).reverse()
      };
      
      return res.status(200).json(sampleAnalytics);
    }

    // Calculate basic analytics from orders
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders.reduce((sum, order) => sum + parseFloat(order.total || '0'), 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayOrders = allOrders.filter(order => 
      new Date(order.createdAt!) >= today
    );
    const ordersToday = todayOrders.length;
    const revenueToday = todayOrders.reduce((sum, order) => sum + parseFloat(order.total || '0'), 0);

    const analytics = {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      ordersToday,
      revenueToday,
      topItems: [], // Could be calculated from order items
      hourlyStats: Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        orders: 0,
        revenue: 0
      })),
      dailyStats: Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return {
          date: date.toISOString().split('T')[0],
          orders: 0,
          revenue: 0
        };
      }).reverse()
    };

    res.status(200).json(analytics);
    await sql.end();
  } catch (error) {
    console.error('Analytics API error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch analytics',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}