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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();

    const legacyUserId = 29;
    const supabaseUserId = 'fc644776-1ca0-46ad-ae6c-8f753478374b';

    console.log('🔄 Starting points transfer from legacy to Supabase account');

    // Get current points from legacy account
    const legacyPoints = await sql`
      SELECT points, total_earned FROM user_points WHERE user_id = ${legacyUserId}
    `;

    if (legacyPoints.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Legacy points account not found' })
      };
    }

    const pointsToTransfer = legacyPoints[0].points;
    const earnedToTransfer = legacyPoints[0].total_earned;

    console.log('💰 Transferring', pointsToTransfer, 'points from legacy to Supabase account');

    // Add points to Supabase account
    await sql`
      UPDATE user_points
      SET
        points = points + ${pointsToTransfer},
        total_earned = total_earned + ${earnedToTransfer},
        updated_at = NOW()
      WHERE supabase_user_id = ${supabaseUserId}
    `;

    // Create transfer transaction record
    await sql`
      INSERT INTO points_transactions (supabase_user_id, type, points, description, created_at)
      VALUES (${supabaseUserId}, 'earned', ${pointsToTransfer}, 'Points transferred from legacy account (user_id: ${legacyUserId})', NOW())
    `;

    // Clear legacy account
    await sql`
      UPDATE user_points
      SET
        points = 0,
        updated_at = NOW()
      WHERE user_id = ${legacyUserId}
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        pointsTransferred: pointsToTransfer,
        earnedTransferred: earnedToTransfer,
        fromAccount: 'legacy',
        toAccount: 'supabase'
      })
    };

  } catch (error) {
    console.error('❌ Points transfer error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to transfer points',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};