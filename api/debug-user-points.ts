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
    const supabaseUserId = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a';

    // Check all points records for this user
    const allUserPoints = await sql`
      SELECT * FROM user_points WHERE supabase_user_id = ${supabaseUserId}
    `;

    // Check user record
    const userRecord = await sql`
      SELECT * FROM users WHERE supabase_user_id = ${supabaseUserId}
    `;

    // Check points transactions count
    const transactionCount = await sql`
      SELECT COUNT(*) as count FROM points_transactions WHERE supabase_user_id = ${supabaseUserId}
    `;

    const result = {
      timestamp: new Date().toISOString(),
      supabaseUserId,
      userRecord: userRecord[0] || null,
      pointsRecords: allUserPoints,
      transactionCount: transactionCount[0]?.count || 0,
      summary: {
        hasUserRecord: userRecord.length > 0,
        pointsRecordCount: allUserPoints.length,
        totalPoints: allUserPoints.reduce((sum, record) => sum + (record.points || 0), 0)
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