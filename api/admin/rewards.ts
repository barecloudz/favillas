import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, asc, desc } from 'drizzle-orm';
import { pointsRewards, userPointsRedemptions } from '../../shared/schema';
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
  
  dbConnection = drizzle(sql, { schema: { pointsRewards, userPointsRedemptions } });
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authPayload = authenticateToken(req);
  if (!authPayload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only admin can manage rewards
  if (authPayload.role !== 'admin' && authPayload.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }

  try {
    const db = getDB();

    if (req.method === 'GET') {
      const { id } = req.query;

      if (id) {
        // Get specific reward with redemption stats
        const rewardId = parseInt(id as string, 10);
        
        if (isNaN(rewardId)) {
          return res.status(400).json({ error: 'Invalid reward ID' });
        }

        const [reward] = await db
          .select()
          .from(pointsRewards)
          .where(eq(pointsRewards.id, rewardId))
          .limit(1);

        if (!reward) {
          return res.status(404).json({ error: 'Reward not found' });
        }

        // Get redemption history for this reward
        const redemptions = await db
          .select()
          .from(userPointsRedemptions)
          .where(eq(userPointsRedemptions.pointsRewardId, rewardId))
          .orderBy(desc(userPointsRedemptions.createdAt))
          .limit(50);

        return res.status(200).json({
          reward,
          redemptions,
          redemptionCount: redemptions.length,
        });
      } else {
        // Get all rewards
        const rewards = await db
          .select()
          .from(pointsRewards)
          .orderBy(asc(pointsRewards.pointsRequired));

        return res.status(200).json({ rewards });
      }

    } else if (req.method === 'POST') {
      // Create new reward
      const {
        name,
        description,
        pointsRequired,
        rewardType,
        rewardValue,
        rewardDescription,
        isActive = true,
        maxRedemptions,
      } = req.body;

      if (!name || !description || !pointsRequired || !rewardType) {
        return res.status(400).json({ 
          error: 'Name, description, points required, and reward type are required' 
        });
      }

      if (typeof pointsRequired !== 'number' || pointsRequired <= 0) {
        return res.status(400).json({ error: 'Points required must be a positive number' });
      }

      const validRewardTypes = ['discount', 'free_item', 'free_delivery', 'percentage_discount'];
      if (!validRewardTypes.includes(rewardType)) {
        return res.status(400).json({ 
          error: 'Invalid reward type', 
          validTypes: validRewardTypes 
        });
      }

      const [newReward] = await db
        .insert(pointsRewards)
        .values({
          name,
          description,
          pointsRequired,
          rewardType,
          rewardValue: rewardValue?.toString() || null,
          rewardDescription,
          isActive,
          maxRedemptions,
          currentRedemptions: 0,
        })
        .returning();

      return res.status(201).json({
        success: true,
        message: 'Reward created successfully',
        reward: newReward,
      });

    } else if (req.method === 'PATCH') {
      // Update existing reward
      const { id } = req.query;
      const rewardId = parseInt(id as string, 10);

      if (isNaN(rewardId)) {
        return res.status(400).json({ error: 'Invalid reward ID' });
      }

      const {
        name,
        description,
        pointsRequired,
        rewardType,
        rewardValue,
        rewardDescription,
        isActive,
        maxRedemptions,
      } = req.body;

      // Build update object with only provided fields
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (pointsRequired !== undefined) {
        if (typeof pointsRequired !== 'number' || pointsRequired <= 0) {
          return res.status(400).json({ error: 'Points required must be a positive number' });
        }
        updateData.pointsRequired = pointsRequired;
      }
      if (rewardType !== undefined) {
        const validRewardTypes = ['discount', 'free_item', 'free_delivery', 'percentage_discount'];
        if (!validRewardTypes.includes(rewardType)) {
          return res.status(400).json({ 
            error: 'Invalid reward type', 
            validTypes: validRewardTypes 
          });
        }
        updateData.rewardType = rewardType;
      }
      if (rewardValue !== undefined) updateData.rewardValue = rewardValue?.toString() || null;
      if (rewardDescription !== undefined) updateData.rewardDescription = rewardDescription;
      if (isActive !== undefined) updateData.isActive = isActive;
      if (maxRedemptions !== undefined) updateData.maxRedemptions = maxRedemptions;

      const [updatedReward] = await db
        .update(pointsRewards)
        .set(updateData)
        .where(eq(pointsRewards.id, rewardId))
        .returning();

      if (!updatedReward) {
        return res.status(404).json({ error: 'Reward not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Reward updated successfully',
        reward: updatedReward,
      });

    } else if (req.method === 'DELETE') {
      // Delete reward
      const { id } = req.query;
      const rewardId = parseInt(id as string, 10);

      if (isNaN(rewardId)) {
        return res.status(400).json({ error: 'Invalid reward ID' });
      }

      // Check if reward has been redeemed
      const redemptions = await db
        .select()
        .from(userPointsRedemptions)
        .where(eq(userPointsRedemptions.pointsRewardId, rewardId))
        .limit(1);

      if (redemptions.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot delete reward that has been redeemed. Consider deactivating it instead.' 
        });
      }

      const result = await db
        .delete(pointsRewards)
        .where(eq(pointsRewards.id, rewardId))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ error: 'Reward not found' });
      }

      return res.status(200).json({
        success: true,
        message: 'Reward deleted successfully',
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Admin rewards API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}