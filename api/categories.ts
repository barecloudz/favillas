import { VercelRequest, VercelResponse } from '@vercel/node';
import postgres from 'postgres';

// Database connection
let dbConnection: any = null;

function getDB() {
  if (dbConnection) return dbConnection;
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  dbConnection = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });
  
  return dbConnection;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sql = getDB();

    if (req.method === 'GET') {
      const categories = await sql`
        SELECT * FROM categories 
        ORDER BY "order" ASC, name ASC
      `;
      
      return res.status(200).json({ categories });

    } else if (req.method === 'POST') {
      const { name, order, isActive } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'Name is required' });
      }
      
      const result = await sql`
        INSERT INTO categories (name, "order", is_active, created_at, updated_at)
        VALUES (${name}, ${order || 1}, ${isActive !== false}, NOW(), NOW())
        RETURNING *
      `;
      
      return res.status(201).json(result[0]);

    } else if (req.method === 'PUT') {
      // Extract ID from URL path
      const urlParts = req.url?.split('/') || [];
      const categoryId = urlParts[urlParts.length - 1];
      
      if (!categoryId || isNaN(parseInt(categoryId))) {
        return res.status(400).json({ message: 'Invalid category ID' });
      }
      
      const { name, order, isActive } = req.body;
      
      const result = await sql`
        UPDATE categories 
        SET name = ${name}, "order" = ${order}, is_active = ${isActive}, updated_at = NOW()
        WHERE id = ${parseInt(categoryId)}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      return res.status(200).json(result[0]);

    } else if (req.method === 'DELETE') {
      // Extract ID from URL path
      const urlParts = req.url?.split('/') || [];
      const categoryId = urlParts[urlParts.length - 1];
      
      if (!categoryId || isNaN(parseInt(categoryId))) {
        return res.status(400).json({ message: 'Invalid category ID' });
      }
      
      const result = await sql`
        DELETE FROM categories 
        WHERE id = ${parseInt(categoryId)}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return res.status(404).json({ message: 'Category not found' });
      }
      
      return res.status(200).json({ message: 'Category deleted successfully' });

    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Categories API error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}