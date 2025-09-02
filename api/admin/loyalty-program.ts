import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { loyaltyProgram } from '../../shared/schema';
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
  
  dbConnection = drizzle(sql, { schema: { loyaltyProgram } });
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

  // Only admin can manage loyalty program
  if (authPayload.role !== 'admin' && authPayload.role !== 'super_admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }

  try {
    const db = getDB();

    if (req.method === 'GET') {
      // Get current loyalty program configuration
      const [program] = await db
        .select()
        .from(loyaltyProgram)
        .where(eq(loyaltyProgram.isActive, true))
        .limit(1);

      if (!program) {
        // Return default configuration if none exists
        return res.status(200).json({
          program: null,
          defaultConfig: {
            name: "Favilla's Loyalty Program",
            description: "Earn points with every order and redeem for rewards!",
            pointsPerDollar: "1.00",
            bonusPointsThreshold: "50.00",
            bonusPointsMultiplier: "1.50",
            pointsForSignup: 100,
            pointsForFirstOrder: 50,
            isActive: true,
          }
        });
      }

      return res.status(200).json({ program });

    } else if (req.method === 'POST') {
      // Create new loyalty program configuration
      const {
        name = "Favilla's Loyalty Program",
        description,
        pointsPerDollar = "1.00",
        bonusPointsThreshold = "50.00",
        bonusPointsMultiplier = "1.50",
        pointsForSignup = 100,
        pointsForFirstOrder = 50,
        isActive = true,
      } = req.body;

      // Validate numeric values
      if (isNaN(parseFloat(pointsPerDollar)) || parseFloat(pointsPerDollar) <= 0) {
        return res.status(400).json({ error: 'Points per dollar must be a positive number' });
      }
      if (isNaN(parseFloat(bonusPointsThreshold)) || parseFloat(bonusPointsThreshold) < 0) {
        return res.status(400).json({ error: 'Bonus points threshold must be a non-negative number' });
      }
      if (isNaN(parseFloat(bonusPointsMultiplier)) || parseFloat(bonusPointsMultiplier) <= 0) {
        return res.status(400).json({ error: 'Bonus points multiplier must be a positive number' });
      }
      if (typeof pointsForSignup !== 'number' || pointsForSignup < 0) {
        return res.status(400).json({ error: 'Points for signup must be a non-negative number' });
      }
      if (typeof pointsForFirstOrder !== 'number' || pointsForFirstOrder < 0) {
        return res.status(400).json({ error: 'Points for first order must be a non-negative number' });
      }

      // Deactivate existing program if creating a new active one
      if (isActive) {
        await db
          .update(loyaltyProgram)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(loyaltyProgram.isActive, true));
      }

      const [newProgram] = await db
        .insert(loyaltyProgram)
        .values({
          name,
          description,
          pointsPerDollar,
          bonusPointsThreshold,
          bonusPointsMultiplier,
          pointsForSignup,
          pointsForFirstOrder,
          isActive,
        })
        .returning();

      return res.status(201).json({
        success: true,
        message: 'Loyalty program created successfully',
        program: newProgram,
      });

    } else if (req.method === 'PATCH') {
      // Update existing loyalty program
      const {
        name,
        description,
        pointsPerDollar,
        bonusPointsThreshold,
        bonusPointsMultiplier,
        pointsForSignup,
        pointsForFirstOrder,
        isActive,
      } = req.body;

      // Get current active program
      const [currentProgram] = await db
        .select()
        .from(loyaltyProgram)
        .where(eq(loyaltyProgram.isActive, true))
        .limit(1);

      if (!currentProgram) {
        return res.status(404).json({ error: 'No active loyalty program found' });
      }

      // Build update object with only provided fields
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      
      if (pointsPerDollar !== undefined) {
        if (isNaN(parseFloat(pointsPerDollar)) || parseFloat(pointsPerDollar) <= 0) {
          return res.status(400).json({ error: 'Points per dollar must be a positive number' });
        }
        updateData.pointsPerDollar = pointsPerDollar;
      }
      
      if (bonusPointsThreshold !== undefined) {
        if (isNaN(parseFloat(bonusPointsThreshold)) || parseFloat(bonusPointsThreshold) < 0) {
          return res.status(400).json({ error: 'Bonus points threshold must be a non-negative number' });
        }
        updateData.bonusPointsThreshold = bonusPointsThreshold;
      }
      
      if (bonusPointsMultiplier !== undefined) {
        if (isNaN(parseFloat(bonusPointsMultiplier)) || parseFloat(bonusPointsMultiplier) <= 0) {
          return res.status(400).json({ error: 'Bonus points multiplier must be a positive number' });
        }
        updateData.bonusPointsMultiplier = bonusPointsMultiplier;
      }
      
      if (pointsForSignup !== undefined) {
        if (typeof pointsForSignup !== 'number' || pointsForSignup < 0) {
          return res.status(400).json({ error: 'Points for signup must be a non-negative number' });
        }
        updateData.pointsForSignup = pointsForSignup;
      }
      
      if (pointsForFirstOrder !== undefined) {
        if (typeof pointsForFirstOrder !== 'number' || pointsForFirstOrder < 0) {
          return res.status(400).json({ error: 'Points for first order must be a non-negative number' });
        }
        updateData.pointsForFirstOrder = pointsForFirstOrder;
      }
      
      if (isActive !== undefined) updateData.isActive = isActive;

      const [updatedProgram] = await db
        .update(loyaltyProgram)
        .set(updateData)
        .where(eq(loyaltyProgram.id, currentProgram.id))
        .returning();

      return res.status(200).json({
        success: true,
        message: 'Loyalty program updated successfully',
        program: updatedProgram,
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Loyalty program API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}