import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { menuItems } from '../../shared/schema';

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
  
  dbConnection = drizzle(sql, { schema: { menuItems } });
  return dbConnection;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  const origin = req.headers.origin || 'http://localhost:3000';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  const itemId = parseInt(id as string, 10);

  if (isNaN(itemId)) {
    return res.status(400).json({ error: 'Invalid menu item ID' });
  }

  try {
    const db = getDB();

    switch (req.method) {
      case 'GET':
        // Get single menu item
        const [item] = await db.select().from(menuItems).where(eq(menuItems.id, itemId));
        if (!item) {
          return res.status(404).json({ error: 'Menu item not found' });
        }
        return res.status(200).json(item);

      case 'PUT':
        // Full update of menu item
        const updateData = req.body;
        const [updatedItem] = await db
          .update(menuItems)
          .set({
            ...updateData,
            updatedAt: new Date(),
          })
          .where(eq(menuItems.id, itemId))
          .returning();
          
        if (!updatedItem) {
          return res.status(404).json({ error: 'Menu item not found' });
        }
        return res.status(200).json(updatedItem);

      case 'PATCH':
        // Partial update of menu item
        const patchData = req.body;
        const [patchedItem] = await db
          .update(menuItems)
          .set({
            ...patchData,
            updatedAt: new Date(),
          })
          .where(eq(menuItems.id, itemId))
          .returning();
          
        if (!patchedItem) {
          return res.status(404).json({ error: 'Menu item not found' });
        }
        return res.status(200).json(patchedItem);

      case 'DELETE':
        // Delete menu item
        const [deletedItem] = await db
          .delete(menuItems)
          .where(eq(menuItems.id, itemId))
          .returning();
          
        if (!deletedItem) {
          return res.status(404).json({ error: 'Menu item not found' });
        }
        return res.status(200).json({ message: 'Menu item deleted', id: itemId });

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'PATCH', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('Menu item API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}