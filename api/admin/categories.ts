import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { categories } from '../../shared/schema';
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
  
  dbConnection = drizzle(sql, { schema: { categories } });
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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authPayload = authenticateToken(req);
  if (!authPayload) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only admin and manager can manage categories
  if (authPayload.role !== 'admin' && authPayload.role !== 'manager') {
    return res.status(403).json({ error: 'Forbidden - Admin or Manager access required' });
  }

  try {
    const db = getDB();

    if (req.method === 'GET') {
      // Get all categories
      const allCategories = await db.select().from(categories).orderBy(categories.order, categories.name);
      
      // If no categories exist, create default ones
      if (allCategories.length === 0) {
        const defaultCategories = [
          { name: 'Pizza', order: 1, isActive: true },
          { name: 'Appetizers', order: 2, isActive: true },
          { name: 'Salads', order: 3, isActive: true },
          { name: 'Pasta', order: 4, isActive: true },
          { name: 'Beverages', order: 5, isActive: true },
          { name: 'Desserts', order: 6, isActive: true },
        ];
        
        const createdCategories = [];
        for (const categoryData of defaultCategories) {
          const [newCategory] = await db
            .insert(categories)
            .values({
              ...categoryData,
              createdAt: new Date(),
            })
            .returning();
          createdCategories.push(newCategory);
        }
        
        return res.status(200).json(createdCategories);
      }
      
      return res.status(200).json(allCategories);
      
    } else if (req.method === 'POST') {
      // Create new category
      const categoryData = req.body;
      
      // Check if category name already exists
      const [existingCategory] = await db.select().from(categories).where(eq(categories.name, categoryData.name));
      if (existingCategory) {
        return res.status(400).json({ error: 'Category name already exists' });
      }
      
      const [newCategory] = await db
        .insert(categories)
        .values({
          ...categoryData,
          createdAt: new Date(),
        })
        .returning();

      return res.status(201).json(newCategory);
      
    } else if (req.method === 'PUT') {
      // Update category
      const { id, ...categoryData } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'Category ID is required' });
      }
      
      const [updatedCategory] = await db
        .update(categories)
        .set(categoryData)
        .where(eq(categories.id, id))
        .returning();

      if (!updatedCategory) {
        return res.status(404).json({ error: 'Category not found' });
      }

      return res.status(200).json(updatedCategory);
      
    } else if (req.method === 'DELETE') {
      // Delete category
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ error: 'Category ID is required' });
      }
      
      const [deletedCategory] = await db
        .delete(categories)
        .where(eq(categories.id, parseInt(id as string)))
        .returning();

      if (!deletedCategory) {
        return res.status(404).json({ error: 'Category not found' });
      }

      return res.status(200).json({ message: 'Category deleted successfully' });
      
    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Categories API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}