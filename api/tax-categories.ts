import { Handler } from '@netlify/functions';
import postgres from 'postgres';

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

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const sql = getDB();

    if (event.httpMethod === 'GET') {
      // Get tax categories
      const categories = await sql`
        SELECT * FROM tax_categories 
        ORDER BY name
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(categories)
      };
    }

    if (event.httpMethod === 'POST') {
      // Create tax category
      const data = JSON.parse(event.body || '{}');
      
      const category = await sql`
        INSERT INTO tax_categories (name, rate, description)
        VALUES (${data.name}, ${data.rate}, ${data.description || ''})
        RETURNING *
      `;

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(category[0])
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Tax Categories API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Failed to process tax categories',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
