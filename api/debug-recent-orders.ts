import { Handler } from '@netlify/functions';
import postgres from 'postgres';

let dbConnection: any = null;

function getDB() {
  if (dbConnection) return dbConnection;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL required');

  dbConnection = postgres(databaseUrl, {
    max: 1, idle_timeout: 20, connect_timeout: 10, prepare: false, keep_alive: false,
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

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const sql = getDB();

    console.log('🔍 Fetching recent orders for debugging...');

    // Get recent orders with user information
    const recentOrders = await sql`
      SELECT
        id, user_id, supabase_user_id, total,
        created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // Get recent points transactions
    const recentTransactions = await sql`
      SELECT
        id, user_id, supabase_user_id, type, points,
        description, created_at
      FROM points_transactions
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // Get user points summary
    const userPoints = await sql`
      SELECT
        user_id, supabase_user_id, points, total_earned,
        total_redeemed, updated_at
      FROM user_points
      ORDER BY updated_at DESC
      LIMIT 10
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        recentOrders,
        recentTransactions,
        userPoints,
        debug: 'Recent data for authentication debugging'
      }, null, 2)
    };

  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Debug failed', details: error.message })
    };
  }
};