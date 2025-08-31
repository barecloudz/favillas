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
      const choiceItems = await sql`
        SELECT * FROM choice_items 
        ORDER BY choice_group_id ASC, name ASC
      `;
      
      return res.status(200).json(choiceItems);

    } else if (req.method === 'POST') {
      const { choiceGroupId, name, price, isDefault, isAvailable } = req.body;
      
      if (!choiceGroupId || !name) {
        return res.status(400).json({ message: 'Choice group ID and name are required' });
      }
      
      const result = await sql`
        INSERT INTO choice_items (choice_group_id, name, price, is_default, is_available, created_at, updated_at)
        VALUES (${choiceGroupId}, ${name}, ${price || 0}, ${isDefault || false}, ${isAvailable !== false}, NOW(), NOW())
        RETURNING *
      `;
      
      return res.status(201).json(result[0]);

    } else if (req.method === 'PUT') {
      // Extract ID from URL path
      const urlParts = req.url?.split('/') || [];
      const itemId = urlParts[urlParts.length - 1];
      
      if (!itemId || isNaN(parseInt(itemId))) {
        return res.status(400).json({ message: 'Invalid choice item ID' });
      }
      
      const { choiceGroupId, name, price, isDefault, isAvailable } = req.body;
      
      const result = await sql`
        UPDATE choice_items 
        SET choice_group_id = ${choiceGroupId}, name = ${name}, price = ${price}, 
            is_default = ${isDefault}, is_available = ${isAvailable}, updated_at = NOW()
        WHERE id = ${parseInt(itemId)}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return res.status(404).json({ message: 'Choice item not found' });
      }
      
      return res.status(200).json(result[0]);

    } else if (req.method === 'DELETE') {
      // Extract ID from URL path
      const urlParts = req.url?.split('/') || [];
      const itemId = urlParts[urlParts.length - 1];
      
      if (!itemId || isNaN(parseInt(itemId))) {
        return res.status(400).json({ message: 'Invalid choice item ID' });
      }
      
      const result = await sql`
        DELETE FROM choice_items 
        WHERE id = ${parseInt(itemId)}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return res.status(404).json({ message: 'Choice item not found' });
      }
      
      return res.status(200).json({ message: 'Choice item deleted successfully' });

    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Choice Items API error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}