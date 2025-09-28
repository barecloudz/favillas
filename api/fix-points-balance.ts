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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  try {
    const sql = getDB();
    const supabaseUserId = 'fc644776-1ca0-46ad-ae6c-8f753478374b';
    const pointsToAdd = 1295; // From legacy account

    console.log('🔧 FIXING POINTS BALANCE: Adding', pointsToAdd, 'points to Supabase account');

    // Add the missing points to your main Supabase account
    await sql`
      UPDATE user_points
      SET
        points = points + ${pointsToAdd},
        total_earned = total_earned + ${pointsToAdd},
        updated_at = NOW()
      WHERE supabase_user_id = ${supabaseUserId}
    `;

    // Create transaction record
    await sql`
      INSERT INTO points_transactions (supabase_user_id, type, points, description, created_at)
      VALUES (${supabaseUserId}, 'earned', ${pointsToAdd}, 'Balance correction - consolidated legacy account points', NOW())
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        pointsAdded: pointsToAdd,
        message: 'Points balance corrected',
        newExpectedBalance: 4452 + pointsToAdd
      })
    };

  } catch (error) {
    console.error('❌ Fix points error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fix points', details: error.message })
    };
  }
};