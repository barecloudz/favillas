import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, asc, gte } from 'drizzle-orm';
import { pointsRewards, userPoints } from '../../shared/schema';
import jwt from 'jsonwebtoken';

// Database connection - serverless optimized
let dbConnection: any = null;

function getDB() {
  if (dbConnection) return dbConnection;
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });
  
  dbConnection = drizzle(sql, { schema: { pointsRewards, userPoints } });
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
  // CORS headers
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

  try {
    const db = getDB();
    const userId = authPayload.userId;

    // Get user's current points balance
    const [userPointsData] = await db
      .select()
      .from(userPoints)
      .where(eq(userPoints.userId, userId))
      .limit(1);

    const currentPoints = userPointsData?.points || 0;

    // Get all active rewards
    const activeRewards = await db
      .select()
      .from(pointsRewards)
      .where(eq(pointsRewards.isActive, true))
      .orderBy(asc(pointsRewards.pointsRequired));

    // Categorize rewards based on user's current points
    const availableRewards = activeRewards.filter(reward => 
      currentPoints >= reward.pointsRequired && 
      (!reward.maxRedemptions || reward.currentRedemptions < reward.maxRedemptions)
    );

    const upcomingRewards = activeRewards.filter(reward => 
      currentPoints < reward.pointsRequired &&
      (!reward.maxRedemptions || reward.currentRedemptions < reward.maxRedemptions)
    );

    return res.status(200).json({
      currentPoints,
      availableRewards,
      upcomingRewards,
    });
  } catch (error) {
    console.error('Customer rewards API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}