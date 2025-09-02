import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, desc, like, or } from 'drizzle-orm';
import { userPoints, pointsTransactions, users } from '../../shared/schema';
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
  
  dbConnection = drizzle(sql, { schema: { userPoints, pointsTransactions, users } });
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authPayload = authenticateToken(req);
  if (!authPayload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only admin can manage points
  if (authPayload.role !== 'admin' && authPayload.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }

  try {
    const db = getDB();

    if (req.method === 'GET') {
      const { search, userId } = req.query;

      if (userId) {
        // Get specific user's points and transaction history
        const targetUserId = parseInt(userId as string, 10);
        
        if (isNaN(targetUserId)) {
          return res.status(400).json({ error: 'Invalid user ID' });
        }

        // Get user details
        const [user] = await db
          .select({
            id: users.id,
            username: users.username,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
          })
          .from(users)
          .where(eq(users.id, targetUserId))
          .limit(1);

        if (!user) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Get user's points
        const [userPointsData] = await db
          .select()
          .from(userPoints)
          .where(eq(userPoints.userId, targetUserId))
          .limit(1);

        // Get transaction history
        const transactions = await db
          .select()
          .from(pointsTransactions)
          .where(eq(pointsTransactions.userId, targetUserId))
          .orderBy(desc(pointsTransactions.createdAt))
          .limit(50);

        return res.status(200).json({
          user,
          points: userPointsData || null,
          transactions,
        });
      } else {
        // Get all users with points data
        const searchTerm = search as string;
        let usersQuery = db
          .select({
            id: users.id,
            username: users.username,
            email: users.email,
            firstName: users.firstName,
            lastName: users.lastName,
            points: userPoints.points,
            totalEarned: userPoints.totalEarned,
            totalRedeemed: userPoints.totalRedeemed,
            lastEarnedAt: userPoints.lastEarnedAt,
          })
          .from(users)
          .leftJoin(userPoints, eq(users.id, userPoints.userId))
          .where(eq(users.role, 'customer'));

        if (searchTerm) {
          usersQuery = usersQuery.where(
            or(
              like(users.username, `%${searchTerm}%`),
              like(users.email, `%${searchTerm}%`),
              like(users.firstName, `%${searchTerm}%`),
              like(users.lastName, `%${searchTerm}%`)
            )
          );
        }

        const usersWithPoints = await usersQuery.limit(100);

        return res.status(200).json({ users: usersWithPoints });
      }

    } else if (req.method === 'POST') {
      // Award points to a user
      const { userId, points, description, type = 'bonus' } = req.body;

      if (!userId || !points || !description) {
        return res.status(400).json({ 
          error: 'User ID, points amount, and description are required' 
        });
      }

      if (typeof points !== 'number' || points === 0) {
        return res.status(400).json({ error: 'Points must be a non-zero number' });
      }

      const targetUserId = parseInt(userId, 10);
      if (isNaN(targetUserId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      // Check if user exists
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get or create user points record
      let [userPointsData] = await db
        .select()
        .from(userPoints)
        .where(eq(userPoints.userId, targetUserId))
        .limit(1);

      if (!userPointsData) {
        [userPointsData] = await db
          .insert(userPoints)
          .values({
            userId: targetUserId,
            points: 0,
            totalEarned: 0,
            totalRedeemed: 0,
          })
          .returning();
      }

      // Calculate new balances
      const newPoints = Math.max(0, userPointsData.points + points);
      const newTotalEarned = points > 0 ? userPointsData.totalEarned + points : userPointsData.totalEarned;
      const newTotalRedeemed = points < 0 ? userPointsData.totalRedeemed + Math.abs(points) : userPointsData.totalRedeemed;

      // Update user points
      const [updatedPoints] = await db
        .update(userPoints)
        .set({
          points: newPoints,
          totalEarned: newTotalEarned,
          totalRedeemed: newTotalRedeemed,
          lastEarnedAt: points > 0 ? new Date() : userPointsData.lastEarnedAt,
          updatedAt: new Date(),
        })
        .where(eq(userPoints.userId, targetUserId))
        .returning();

      // Create transaction record
      await db
        .insert(pointsTransactions)
        .values({
          userId: targetUserId,
          type: points > 0 ? type : 'adjustment',
          points,
          description: `Admin adjustment: ${description}`,
        });

      return res.status(200).json({
        success: true,
        message: `Successfully ${points > 0 ? 'awarded' : 'deducted'} ${Math.abs(points)} points`,
        updatedPoints,
      });

    } else if (req.method === 'PATCH') {
      // Update user points directly
      const { userId, points, totalEarned, totalRedeemed, reason } = req.body;

      if (!userId || points === undefined) {
        return res.status(400).json({ 
          error: 'User ID and points are required' 
        });
      }

      const targetUserId = parseInt(userId, 10);
      if (isNaN(targetUserId) || typeof points !== 'number' || points < 0) {
        return res.status(400).json({ error: 'Invalid user ID or points value' });
      }

      // Check if user exists
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, targetUserId))
        .limit(1);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Get current points
      const [currentPoints] = await db
        .select()
        .from(userPoints)
        .where(eq(userPoints.userId, targetUserId))
        .limit(1);

      if (!currentPoints) {
        return res.status(404).json({ error: 'User points record not found' });
      }

      // Update user points
      const updateData: any = {
        points,
        updatedAt: new Date(),
      };

      if (totalEarned !== undefined) updateData.totalEarned = totalEarned;
      if (totalRedeemed !== undefined) updateData.totalRedeemed = totalRedeemed;

      const [updatedPoints] = await db
        .update(userPoints)
        .set(updateData)
        .where(eq(userPoints.userId, targetUserId))
        .returning();

      // Create transaction record for the adjustment
      const pointsDifference = points - currentPoints.points;
      if (pointsDifference !== 0) {
        await db
          .insert(pointsTransactions)
          .values({
            userId: targetUserId,
            type: 'adjustment',
            points: pointsDifference,
            description: `Admin direct update: ${reason || 'Points balance adjusted'}`,
          });
      }

      return res.status(200).json({
        success: true,
        message: 'Points updated successfully',
        updatedPoints,
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Admin points API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}