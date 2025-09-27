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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();
    const supabaseUserId = 'fc644776-1ca0-46ad-ae6c-8f753478374b';

    // Get the latest order
    const latestOrder = await sql`
      SELECT * FROM orders
      ORDER BY created_at DESC
      LIMIT 1
    `;

    // Get user's current points
    const userPoints = await sql`
      SELECT * FROM user_points
      WHERE supabase_user_id = ${supabaseUserId}
    `;

    // Get recent points transactions
    const recentTransactions = await sql`
      SELECT * FROM points_transactions
      WHERE supabase_user_id = ${supabaseUserId}
      ORDER BY created_at DESC
      LIMIT 5
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        latestOrder: latestOrder[0] || null,
        userPoints: userPoints[0] || null,
        recentTransactions: recentTransactions,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Get latest order error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get latest order',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};