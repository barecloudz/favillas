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
    const postgres = require('postgres');
    const sql = postgres(process.env.DATABASE_URL, {
      max: 1,
      idle_timeout: 5,
      connect_timeout: 5,
      prepare: false,
      keep_alive: false,
    });

    // Test database connection and check menu items
    const menuItems = await sql`SELECT COUNT(*) as count FROM menu_items`;
    const categories = await sql`SELECT COUNT(*) as count FROM categories`;

    await sql.end();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        database_connected: true,
        menu_items_count: menuItems[0]?.count || 0,
        categories_count: categories[0]?.count || 0,
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