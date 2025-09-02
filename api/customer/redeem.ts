import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { userPoints, pointsRewards, userPointsRedemptions, pointsTransactions } from '../../shared/schema';
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
  
  dbConnection = drizzle(sql, { schema: { userPoints, pointsRewards, userPointsRedemptions, pointsTransactions } });
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authPayload = authenticateToken(req);
  if (!authPayload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { rewardId, orderId } = req.body;

  if (!rewardId) {
    return res.status(400).json({ error: 'Reward ID is required' });
  }

  try {
    const db = getDB();
    const userId = authPayload.userId;

    // Start transaction
    const sql = postgres(process.env.DATABASE_URL!, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
    });

    const result = await sql.begin(async (sql) => {
      const transactionDb = drizzle(sql, { schema: { userPoints, pointsRewards, userPointsRedemptions, pointsTransactions } });

      // Get user's current points with row lock
      const [currentUserPoints] = await transactionDb
        .select()
        .from(userPoints)
        .where(eq(userPoints.userId, userId))
        .for('update');

      if (!currentUserPoints) {
        throw new Error('User points record not found');
      }

      // Get reward details with row lock
      const [reward] = await transactionDb
        .select()
        .from(pointsRewards)
        .where(and(
          eq(pointsRewards.id, rewardId),
          eq(pointsRewards.isActive, true)
        ))
        .for('update');

      if (!reward) {
        throw new Error('Reward not found or inactive');
      }

      // Validate user has enough points
      if (currentUserPoints.points < reward.pointsRequired) {
        throw new Error(`Insufficient points. Need ${reward.pointsRequired}, have ${currentUserPoints.points}`);
      }

      // Check redemption limits
      if (reward.maxRedemptions && reward.currentRedemptions >= reward.maxRedemptions) {
        throw new Error('Reward redemption limit reached');
      }

      // Calculate new points balance
      const newPoints = currentUserPoints.points - reward.pointsRequired;
      const newTotalRedeemed = currentUserPoints.totalRedeemed + reward.pointsRequired;

      // Update user points
      await transactionDb
        .update(userPoints)
        .set({
          points: newPoints,
          totalRedeemed: newTotalRedeemed,
          updatedAt: new Date(),
        })
        .where(eq(userPoints.userId, userId));

      // Update reward redemption count
      await transactionDb
        .update(pointsRewards)
        .set({
          currentRedemptions: reward.currentRedemptions + 1,
          updatedAt: new Date(),
        })
        .where(eq(pointsRewards.id, rewardId));

      // Create redemption record
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // Expire in 30 days

      const [redemption] = await transactionDb
        .insert(userPointsRedemptions)
        .values({
          userId,
          pointsRewardId: rewardId,
          orderId: orderId || null,
          pointsSpent: reward.pointsRequired,
          expiresAt,
        })
        .returning();

      // Create points transaction record
      await transactionDb
        .insert(pointsTransactions)
        .values({
          userId,
          orderId: orderId || null,
          type: 'redeemed',
          points: -reward.pointsRequired,
          description: `Redeemed: ${reward.name}`,
        });

      return { redemption, reward, newPoints };
    });

    return res.status(200).json({
      success: true,
      message: 'Reward redeemed successfully',
      redemption: result.redemption,
      reward: {
        id: result.reward.id,
        name: result.reward.name,
        description: result.reward.description,
        rewardType: result.reward.rewardType,
        rewardValue: result.reward.rewardValue,
      },
      newPointsBalance: result.newPoints,
    });

  } catch (error) {
    console.error('Points redemption error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('Insufficient points') || 
          error.message.includes('not found') ||
          error.message.includes('limit reached')) {
        return res.status(400).json({ error: error.message });
      }
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}