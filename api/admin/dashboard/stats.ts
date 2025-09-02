import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { count, sum, eq, gte, sql } from 'drizzle-orm';
import { orders, users, menuItems } from '../../../shared/schema';
import jwt from 'jsonwebtoken';

let dbConnection: any = null;

function getDB() {
  if (dbConnection) return dbConnection;
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  const sqlClient = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });
  
  dbConnection = drizzle(sqlClient, { schema: { orders, users, menuItems } });
  return dbConnection;
}

function authenticateToken(req: VercelRequest): { userId: number; username: string; role: string } | null {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || 'http://localhost:3000';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authPayload = authenticateToken(req);
  if (!authPayload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only admin and manager can access dashboard stats
  if (authPayload.role !== 'admin' && authPayload.role !== 'manager') {
    return res.status(403).json({ error: 'Forbidden - Admin or Manager access required' });
  }

  try {
    const db = getDB();
    
    // Get today's date and 30 days ago
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    // Total orders count
    const [totalOrdersResult] = await db
      .select({ count: count() })
      .from(orders);
    
    // Total revenue
    const [totalRevenueResult] = await db
      .select({ total: sum(orders.total) })
      .from(orders)
      .where(eq(orders.status, 'delivered'));
    
    // Orders today
    const [todayOrdersResult] = await db
      .select({ count: count() })
      .from(orders)
      .where(gte(orders.createdAt, today));
    
    // Revenue today
    const [todayRevenueResult] = await db
      .select({ total: sum(orders.total) })
      .from(orders)
      .where(
        sql`${orders.createdAt} >= ${today} AND ${orders.status} = 'delivered'`
      );
    
    // Total active users
    const [totalUsersResult] = await db
      .select({ count: count() })
      .from(users)
      .where(eq(users.isActive, true));
    
    // Total menu items
    const [totalMenuItemsResult] = await db
      .select({ count: count() })
      .from(menuItems)
      .where(eq(menuItems.isActive, true));
    
    // Recent orders (last 10)
    const recentOrders = await db
      .select()
      .from(orders)
      .orderBy(orders.createdAt)
      .limit(10);

    // Order status breakdown
    const orderStatusBreakdown = await db
      .select({
        status: orders.status,
        count: count()
      })
      .from(orders)
      .groupBy(orders.status);
    
    const stats = {
      totalOrders: totalOrdersResult?.count || 0,
      totalRevenue: parseFloat(totalRevenueResult?.total || '0'),
      ordersToday: todayOrdersResult?.count || 0,
      revenueToday: parseFloat(todayRevenueResult?.total || '0'),
      totalUsers: totalUsersResult?.count || 0,
      totalMenuItems: totalMenuItemsResult?.count || 0,
      recentOrders,
      orderStatusBreakdown: orderStatusBreakdown.reduce((acc, item) => {
        acc[item.status] = item.count;
        return acc;
      }, {} as Record<string, number>)
    };

    return res.status(200).json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}