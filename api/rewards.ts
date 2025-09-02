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
      // Get all active rewards
      const rewards = await sql`
        SELECT * FROM rewards 
        WHERE is_active = true
        ORDER BY points_cost ASC
      `;
      
      return res.status(200).json(rewards);

    } else if (req.method === 'POST') {
      const { name, description, pointsCost, isActive = true } = req.body;
      
      if (!name || !description || !pointsCost) {
        return res.status(400).json({ 
          message: 'Name, description, and points cost are required' 
        });
      }
      
      const result = await sql`
        INSERT INTO rewards (name, description, points_cost, is_active, created_at, updated_at)
        VALUES (${name}, ${description}, ${pointsCost}, ${isActive}, NOW(), NOW())
        RETURNING *
      `;
      
      return res.status(201).json(result[0]);

    } else if (req.method === 'PUT') {
      // Extract ID from URL path
      const urlParts = req.url?.split('/') || [];
      const rewardId = urlParts[urlParts.length - 1];
      
      if (!rewardId || isNaN(parseInt(rewardId))) {
        return res.status(400).json({ message: 'Invalid reward ID' });
      }
      
      const { name, description, pointsCost, isActive } = req.body;
      
      // Build dynamic update query
      const updates = [];
      const values = [];
      
      if (name !== undefined) {
        updates.push('name = $' + (values.length + 1));
        values.push(name);
      }
      if (description !== undefined) {
        updates.push('description = $' + (values.length + 1));
        values.push(description);
      }
      if (pointsCost !== undefined) {
        updates.push('points_cost = $' + (values.length + 1));
        values.push(pointsCost);
      }
      if (isActive !== undefined) {
        updates.push('is_active = $' + (values.length + 1));
        values.push(isActive);
      }
      
      if (updates.length === 0) {
        return res.status(400).json({ message: 'No valid fields to update' });
      }
      
      updates.push('updated_at = NOW()');
      values.push(parseInt(rewardId));
      
      const result = await sql`
        UPDATE rewards 
        SET ${sql(updates.join(', '))}
        WHERE id = ${parseInt(rewardId)}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return res.status(404).json({ message: 'Reward not found' });
      }
      
      return res.status(200).json(result[0]);

    } else if (req.method === 'DELETE') {
      // Extract ID from URL path
      const urlParts = req.url?.split('/') || [];
      const rewardId = urlParts[urlParts.length - 1];
      
      if (!rewardId || isNaN(parseInt(rewardId))) {
        return res.status(400).json({ message: 'Invalid reward ID' });
      }
      
      const result = await sql`
        DELETE FROM rewards 
        WHERE id = ${parseInt(rewardId)}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return res.status(404).json({ message: 'Reward not found' });
      }
      
      return res.status(200).json({ message: 'Reward deleted successfully' });

    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Rewards API error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}