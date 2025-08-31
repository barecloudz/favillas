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
      const choiceGroups = await sql`
        SELECT * FROM choice_groups 
        ORDER BY name ASC
      `;
      
      return res.status(200).json(choiceGroups);

    } else if (req.method === 'POST') {
      const { name, description, minSelections, maxSelections, isRequired } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'Name is required' });
      }
      
      const result = await sql`
        INSERT INTO choice_groups (name, description, min_selections, max_selections, is_required, created_at, updated_at)
        VALUES (${name}, ${description || ''}, ${minSelections || 0}, ${maxSelections || 1}, ${isRequired || false}, NOW(), NOW())
        RETURNING *
      `;
      
      return res.status(201).json(result[0]);

    } else if (req.method === 'PUT') {
      // Extract ID from URL path
      const urlParts = req.url?.split('/') || [];
      const groupId = urlParts[urlParts.length - 1];
      
      if (!groupId || isNaN(parseInt(groupId))) {
        return res.status(400).json({ message: 'Invalid choice group ID' });
      }
      
      const { name, description, minSelections, maxSelections, isRequired } = req.body;
      
      const result = await sql`
        UPDATE choice_groups 
        SET name = ${name}, description = ${description}, min_selections = ${minSelections}, 
            max_selections = ${maxSelections}, is_required = ${isRequired}, updated_at = NOW()
        WHERE id = ${parseInt(groupId)}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return res.status(404).json({ message: 'Choice group not found' });
      }
      
      return res.status(200).json(result[0]);

    } else if (req.method === 'DELETE') {
      // Extract ID from URL path
      const urlParts = req.url?.split('/') || [];
      const groupId = urlParts[urlParts.length - 1];
      
      if (!groupId || isNaN(parseInt(groupId))) {
        return res.status(400).json({ message: 'Invalid choice group ID' });
      }
      
      const result = await sql`
        DELETE FROM choice_groups 
        WHERE id = ${parseInt(groupId)}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return res.status(404).json({ message: 'Choice group not found' });
      }
      
      return res.status(200).json({ message: 'Choice group deleted successfully' });

    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Choice Groups API error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}