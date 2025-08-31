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
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sql = getDB();

    if (req.method === 'GET') {
      const categoryChoiceGroups = await sql`
        SELECT ccg.*, c.name as category_name, cg.name as choice_group_name
        FROM category_choice_groups ccg
        LEFT JOIN categories c ON ccg.category_id = c.id
        LEFT JOIN choice_groups cg ON ccg.choice_group_id = cg.id
        ORDER BY ccg.category_id ASC, ccg.choice_group_id ASC
      `;
      
      return res.status(200).json(categoryChoiceGroups);

    } else if (req.method === 'POST') {
      const { categoryId, choiceGroupId } = req.body;
      
      if (!categoryId || !choiceGroupId) {
        return res.status(400).json({ message: 'Category ID and choice group ID are required' });
      }
      
      // Check if association already exists
      const existing = await sql`
        SELECT * FROM category_choice_groups 
        WHERE category_id = ${categoryId} AND choice_group_id = ${choiceGroupId}
      `;
      
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Association already exists' });
      }
      
      const result = await sql`
        INSERT INTO category_choice_groups (category_id, choice_group_id, created_at)
        VALUES (${categoryId}, ${choiceGroupId}, NOW())
        RETURNING *
      `;
      
      return res.status(201).json(result[0]);

    } else if (req.method === 'DELETE') {
      // Extract ID from URL path
      const urlParts = req.url?.split('/') || [];
      const associationId = urlParts[urlParts.length - 1];
      
      if (!associationId || isNaN(parseInt(associationId))) {
        return res.status(400).json({ message: 'Invalid association ID' });
      }
      
      const result = await sql`
        DELETE FROM category_choice_groups 
        WHERE id = ${parseInt(associationId)}
        RETURNING *
      `;
      
      if (result.length === 0) {
        return res.status(404).json({ message: 'Association not found' });
      }
      
      return res.status(200).json({ message: 'Association deleted successfully' });

    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('Category Choice Groups API error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}