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
    const correctUserId = 'fc644776-1ca0-46ad-ae6c-8f753478374b';

    // Check all points records for the correct user
    const allUserPoints = await sql`
      SELECT * FROM user_points WHERE supabase_user_id = ${correctUserId}
      ORDER BY created_at DESC
    `;

    // Check recent transactions
    const recentTransactions = await sql`
      SELECT * FROM points_transactions
      WHERE supabase_user_id = ${correctUserId}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    const result = {
      timestamp: new Date().toISOString(),
      correctUserId,
      pointsRecords: allUserPoints,
      pointsRecordCount: allUserPoints.length,
      totalPoints: allUserPoints.reduce((sum, record) => sum + (record.points || 0), 0),
      recentTransactions: recentTransactions.slice(0, 5),
      summary: {
        hasMultipleRecords: allUserPoints.length > 1,
        totalPointsAcrossAllRecords: allUserPoints.reduce((sum, record) => sum + (record.points || 0), 0)
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result, null, 2)
    };

  } catch (error) {
    console.error('Debug error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};