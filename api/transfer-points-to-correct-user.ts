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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const sql = getDB();

    const oldUserId = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a';
    const correctUserId = 'fc644776-1ca0-46ad-ae6c-8f753478374b';

    console.log('🔄 Transferring points from', oldUserId, 'to', correctUserId);

    // Perform the transfer in a transaction
    const result = await sql.begin(async (sql) => {
      // Get the old points record
      const oldPoints = await sql`
        SELECT * FROM user_points WHERE supabase_user_id = ${oldUserId}
      `;

      if (oldPoints.length === 0) {
        throw new Error('No points record found for old user ID');
      }

      const pointsToTransfer = oldPoints[0];

      // Update all points transactions to the correct user
      const updatedTransactions = await sql`
        UPDATE points_transactions
        SET supabase_user_id = ${correctUserId}
        WHERE supabase_user_id = ${oldUserId}
        RETURNING COUNT(*)
      `;

      // Check if correct user already has a points record
      const existingCorrectPoints = await sql`
        SELECT * FROM user_points WHERE supabase_user_id = ${correctUserId}
      `;

      if (existingCorrectPoints.length > 0) {
        // Update existing record
        await sql`
          UPDATE user_points
          SET points = points + ${pointsToTransfer.points},
              total_earned = total_earned + ${pointsToTransfer.total_earned},
              total_redeemed = total_redeemed + ${pointsToTransfer.total_redeemed},
              last_earned_at = GREATEST(last_earned_at, ${pointsToTransfer.last_earned_at}),
              updated_at = NOW()
          WHERE supabase_user_id = ${correctUserId}
        `;
      } else {
        // Create new record for correct user
        await sql`
          INSERT INTO user_points (
            supabase_user_id, points, total_earned, total_redeemed,
            last_earned_at, created_at, updated_at
          ) VALUES (
            ${correctUserId}, ${pointsToTransfer.points}, ${pointsToTransfer.total_earned},
            ${pointsToTransfer.total_redeemed}, ${pointsToTransfer.last_earned_at},
            ${pointsToTransfer.created_at}, NOW()
          )
        `;
      }

      // Delete the old points record
      await sql`
        DELETE FROM user_points WHERE supabase_user_id = ${oldUserId}
      `;

      // Get final result
      const finalPoints = await sql`
        SELECT * FROM user_points WHERE supabase_user_id = ${correctUserId}
      `;

      return {
        transferredPoints: pointsToTransfer.points,
        finalRecord: finalPoints[0],
        transactionsUpdated: updatedTransactions.length
      };
    });

    console.log('✅ Points transfer completed successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Points successfully transferred to correct user',
        oldUserId,
        correctUserId,
        result,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Points transfer failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Points transfer failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};