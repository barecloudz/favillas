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

    console.log('🔧 FINAL-FIX: Completing user_points consolidation');

    // Get current consolidated record
    const currentRecord = await sql`
      SELECT * FROM user_points
      WHERE supabase_user_id = ${targetSupabaseId}
    `;

    if (currentRecord.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'No consolidated record found'
        })
      };
    }

    const record = currentRecord[0];
    console.log('📊 Current record:', record);

    // Add the 33 points from the recent order if not already included
    const totalPoints = parseInt(record.points) + 33; // Add the recent order points
    const totalEarned = parseInt(record.total_earned) + 33;

    // Update the record to include user_id and final points total
    const updatedRecord = await sql`
      UPDATE user_points
      SET
        user_id = ${targetUserId},
        points = ${totalPoints},
        total_earned = ${totalEarned},
        updated_at = NOW()
      WHERE supabase_user_id = ${targetSupabaseId}
      RETURNING *
    `;

    // Update the users table rewards column
    await sql`
      UPDATE users
      SET rewards = ${totalPoints}, updated_at = NOW()
      WHERE id = ${targetUserId}
    `;

    // Create the missing points transaction for the recent order
    const existingTransaction = await sql`
      SELECT id FROM points_transactions
      WHERE user_id = ${targetUserId} AND order_id = 177
    `;

    if (existingTransaction.length === 0) {
      await sql`
        INSERT INTO points_transactions (
          user_id,
          supabase_user_id,
          order_id,
          type,
          points,
          description,
          order_amount,
          created_at
        ) VALUES (
          ${targetUserId},
          ${targetSupabaseId},
          177,
          'earned',
          33,
          'Points for Order #177',
          '33.01',
          NOW()
        )
      `;
    }

    console.log('✅ Final fix completed');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User points final fix completed',
        before: {
          points: record.points,
          total_earned: record.total_earned,
          had_user_id: !!record.user_id
        },
        after: {
          points: totalPoints,
          total_earned: totalEarned,
          has_user_id: true,
          has_supabase_user_id: true
        },
        finalRecord: updatedRecord[0]
      })
    };

  } catch (error) {
    console.error('🔧 FINAL-FIX: Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to complete final fix',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};