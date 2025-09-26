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

    console.log('🔧 FINAL FIX: Transferring points record user ID');

    // Simple direct update - change the user ID on the record with 2180 points
    const result = await sql.begin(async (sql) => {
      // Update the points record to the correct user ID
      const updatedRecord = await sql`
        UPDATE user_points
        SET supabase_user_id = ${correctUserId}
        WHERE supabase_user_id = ${oldUserId} AND points = 2180
        RETURNING *
      `;

      // Update all transactions to the correct user ID
      const updatedTransactions = await sql`
        UPDATE points_transactions
        SET supabase_user_id = ${correctUserId}
        WHERE supabase_user_id = ${oldUserId}
        RETURNING COUNT(*)
      `;

      // Delete any duplicate 0-point records for the correct user ID
      const deletedDuplicates = await sql`
        DELETE FROM user_points
        WHERE supabase_user_id = ${correctUserId} AND points = 0
        RETURNING COUNT(*)
      `;

      return {
        updatedRecord: updatedRecord[0],
        transactionsUpdated: updatedTransactions.length,
        duplicatesDeleted: deletedDuplicates.length
      };
    });

    console.log('✅ User ID transfer completed');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User ID successfully transferred',
        oldUserId,
        correctUserId,
        result,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ User ID transfer failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'User ID transfer failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};