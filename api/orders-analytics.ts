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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  // Check authentication
  const authPayload = authenticateToken(event);
  if (!authPayload) {
    // Return empty analytics data instead of 401 for unauthenticated users
    const emptyAnalytics = {
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
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(emptyAnalytics)
    };
  }

  // Only admin, manager, and kitchen staff can view analytics
  if (!['admin', 'manager', 'kitchen'].includes(authPayload.role)) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Admin, Manager, or Kitchen access required' })
    };
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
      
      await sql.end();
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(sampleAnalytics)
      };
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

    await sql.end();
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(analytics)
    };
  } catch (error) {
    console.error('Analytics API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Failed to fetch analytics',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};