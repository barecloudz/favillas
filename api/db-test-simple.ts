import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Check environment variables
    const dbUrl = process.env.DATABASE_URL;

    if (!dbUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'DATABASE_URL not configured',
          envVars: Object.keys(process.env).filter(key => key.includes('DATABASE'))
        })
      };
    }

    // Try to connect to database
    const postgres = require('postgres');
    const sql = postgres(dbUrl, {
      max: 1,
      idle_timeout: 5,
      connect_timeout: 5,
      prepare: false,
      keep_alive: false,
    });

    // Simple test query
    const result = await sql`SELECT COUNT(*) as count FROM menu_items`;
    await sql.end();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Database connection successful',
        menuItemCount: result[0]?.count || 0,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};