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
    max: 1, idle_timeout: 20, connect_timeout: 10, prepare: false, keep_alive: false,
  });
  return dbConnection;
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();
    const userId = 29;
    const supabaseUserId = 'fc644776-1ca0-46ad-ae6c-8f753478374b';

    // Get current user points
    const userPoints = await sql`
      SELECT points, total_earned, last_earned_at
      FROM user_points
      WHERE user_id = ${userId} OR supabase_user_id = ${supabaseUserId}
    `;

    // Get recent orders
    const recentOrders = await sql`
      SELECT id, total, created_at, status
      FROM orders
      WHERE user_id = ${userId} OR supabase_user_id = ${supabaseUserId}
      ORDER BY created_at DESC
      LIMIT 5
    `;

    // Get recent points transactions
    const recentTransactions = await sql`
      SELECT id, order_id, points, description, created_at
      FROM points_transactions
      WHERE user_id = ${userId} OR supabase_user_id = ${supabaseUserId}
      ORDER BY created_at DESC
      LIMIT 5
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        currentPoints: userPoints[0]?.points || 0,
        totalEarned: userPoints[0]?.total_earned || 0,
        lastEarned: userPoints[0]?.last_earned_at || null,
        recentOrders: recentOrders.map(o => ({
          id: o.id,
          total: o.total,
          expectedPoints: Math.floor(parseFloat(o.total)),
          created_at: o.created_at,
          status: o.status
        })),
        recentTransactions: recentTransactions.map(t => ({
          id: t.id,
          order_id: t.order_id,
          points: t.points,
          description: t.description,
          created_at: t.created_at
        }))
      })
    };

  } catch (error) {
    console.error('🔧 Check current points error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to check points', details: error.message })
    };
  }
};