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
    const correctUserId = 'fc644776-1ca0-46ad-ae6c-8f753478374b';

    console.log('🔧 Consolidating points records for user:', correctUserId);

    // Perform consolidation in a transaction
    const result = await sql.begin(async (sql) => {
      // Get all points records for this user
      const allPointsRecords = await sql`
        SELECT * FROM user_points WHERE supabase_user_id = ${correctUserId}
        ORDER BY created_at ASC
      `;

      if (allPointsRecords.length <= 1) {
        return {
          message: 'No consolidation needed',
          recordsFound: allPointsRecords.length,
          finalRecord: allPointsRecords[0] || null
        };
      }

      // Calculate totals
      const totalPoints = allPointsRecords.reduce((sum, record) => sum + (record.points || 0), 0);
      const totalEarned = allPointsRecords.reduce((sum, record) => sum + (record.total_earned || 0), 0);
      const totalRedeemed = allPointsRecords.reduce((sum, record) => sum + (record.total_redeemed || 0), 0);
      const lastEarnedAt = allPointsRecords.reduce((latest, record) => {
        return record.last_earned_at > latest ? record.last_earned_at : latest;
      }, allPointsRecords[0].last_earned_at);

      // Keep the first record and update it with consolidated totals
      const keepRecord = allPointsRecords[0];
      await sql`
        UPDATE user_points
        SET points = ${totalPoints},
            total_earned = ${totalEarned},
            total_redeemed = ${totalRedeemed},
            last_earned_at = ${lastEarnedAt},
            updated_at = NOW()
        WHERE id = ${keepRecord.id}
      `;

      // Delete the duplicate records
      const recordsToDelete = allPointsRecords.slice(1);
      for (const record of recordsToDelete) {
        await sql`
          DELETE FROM user_points WHERE id = ${record.id}
        `;
      }

      // Get the final consolidated record
      const finalRecord = await sql`
        SELECT * FROM user_points WHERE supabase_user_id = ${correctUserId}
      `;

      return {
        message: 'Consolidation successful',
        originalRecords: allPointsRecords.length,
        recordsDeleted: recordsToDelete.length,
        consolidatedTotals: {
          points: totalPoints,
          totalEarned: totalEarned,
          totalRedeemed: totalRedeemed
        },
        finalRecord: finalRecord[0]
      };
    });

    console.log('✅ Points consolidation completed');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        userId: correctUserId,
        result,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Points consolidation failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Points consolidation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};