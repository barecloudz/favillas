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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();
    const targetSupabaseId = 'fc644776-1ca0-46ad-ae6c-8f753478374b';
    const targetUserId = 29;

    console.log('🔧 MANUAL-FINAL: Completing final consolidation');

    // Delete both existing records and create one authoritative record
    await sql.begin(async (tx) => {
      // Delete all existing records
      await tx`DELETE FROM user_points WHERE supabase_user_id = ${targetSupabaseId} OR user_id = ${targetUserId}`;

      // Create single authoritative record with total points: 3292 + 33 = 3325
      const finalRecord = await tx`
        INSERT INTO user_points (
          user_id, supabase_user_id, points, total_earned, total_redeemed,
          created_at, updated_at, last_earned_at
        ) VALUES (
          ${targetUserId}, ${targetSupabaseId}, 3325, 3325, 0,
          NOW(), NOW(), NOW()
        ) RETURNING *
      `;

      // Update users table
      await tx`UPDATE users SET rewards = 3325, updated_at = NOW() WHERE id = ${targetUserId}`;

      return finalRecord[0];
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Final consolidation completed',
        totalPoints: 3325,
        calculation: '3292 (consolidated) + 33 (recent order) = 3325 points'
      })
    };

  } catch (error) {
    console.error('🔧 MANUAL-FINAL: Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed', details: error.message })
    };
  }
};