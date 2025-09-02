import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { restaurantSettings } from '../shared/schema';
import jwt from 'jsonwebtoken';

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
  
  dbConnection = drizzle(sql, { schema: { restaurantSettings } });
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authPayload = authenticateToken(req);
  if (!authPayload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only admin can manage restaurant settings
  if (authPayload.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' });
  }

  try {
    const db = getDB();

    if (req.method === 'GET') {
      // Get restaurant settings (return first record or default)
      const [settings] = await db.select().from(restaurantSettings).limit(1);
      
      if (!settings) {
        // Return default settings if none exist
        const defaultSettings = {
          id: 1,
          restaurantName: "Favilla's NY Pizza",
          address: "123 Main Street, New York, NY 10001",
          phone: "(555) 123-4567",
          email: "info@favillas.com",
          website: "https://favillas.com",
          currency: "USD",
          timezone: "America/New_York",
          deliveryFee: "3.99",
          minimumOrder: "15.00",
          autoAcceptOrders: true,
          sendOrderNotifications: true,
          sendCustomerNotifications: true,
          outOfStockEnabled: false,
          deliveryEnabled: true,
          pickupEnabled: true,
          orderSchedulingEnabled: false,
          maxAdvanceOrderHours: 24,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        // Create default settings
        const [newSettings] = await db
          .insert(restaurantSettings)
          .values(defaultSettings)
          .returning();
          
        return res.status(200).json(newSettings);
      }
      
      return res.status(200).json(settings);
      
    } else if (req.method === 'PUT' || req.method === 'PATCH') {
      // Update restaurant settings
      const settingsData = req.body;
      
      // Check if settings exist
      const [existingSettings] = await db.select().from(restaurantSettings).limit(1);
      
      if (!existingSettings) {
        // Create new settings if none exist
        const [newSettings] = await db
          .insert(restaurantSettings)
          .values({
            ...settingsData,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
          
        return res.status(201).json(newSettings);
      } else {
        // Update existing settings
        const [updatedSettings] = await db
          .update(restaurantSettings)
          .set({
            ...settingsData,
            updatedAt: new Date(),
          })
          .where(eq(restaurantSettings.id, existingSettings.id))
          .returning();
          
        return res.status(200).json(updatedSettings);
      }
      
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Restaurant settings API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}