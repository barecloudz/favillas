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
    const supabaseUserId = 'fc644776-1ca0-46ad-ae6c-8f753478374b'; // Updated to correct user ID

    // Check user points record
    const userPoints = await sql`
      SELECT * FROM user_points WHERE supabase_user_id = ${supabaseUserId}
    `;

    // Check points transactions
    const pointsTransactions = await sql`
      SELECT * FROM points_transactions
      WHERE supabase_user_id = ${supabaseUserId}
      ORDER BY created_at DESC
    `;

    // Check recent transactions
    const emergencyTransactions = await sql`
      SELECT * FROM points_transactions
      WHERE supabase_user_id = ${supabaseUserId}
      AND description LIKE '%EMERGENCY FIX%'
      ORDER BY created_at DESC
    `;

    // Check all user_points records for debugging
    const allUserPoints = await sql`
      SELECT * FROM user_points
      ORDER BY updated_at DESC
      LIMIT 10
    `;

    const result = {
      timestamp: new Date().toISOString(),
      userPointsRecord: userPoints[0] || null,
      totalTransactions: pointsTransactions.length,
      emergencyTransactions: emergencyTransactions.length,
      recentTransactions: pointsTransactions.slice(0, 10),
      emergencyFixTransactions: emergencyTransactions,
      debugAllUserPoints: allUserPoints,
      summary: {
        currentPoints: userPoints[0]?.points || 0,
        totalEarned: userPoints[0]?.total_earned || 0,
        totalRedeemed: userPoints[0]?.total_redeemed || 0,
        lastEarnedAt: userPoints[0]?.last_earned_at || null
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result, null, 2)
    };

  } catch (error) {
    console.error('Error checking points status:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to check points status',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};