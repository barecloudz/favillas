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
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const sql = getDB();

    console.log('🔍 Debugging voucher table...');

    // Test the Supabase UUID conversion
    const testUuid = '1422df18-924e-47ae-af1b-6d1f2b4b659b';
    const numericId = parseInt(testUuid.replace(/-/g, '').substring(0, 8), 16);

    // Get all vouchers in the table
    const allVouchers = await sql`
      SELECT
        id, user_id, supabase_user_id, reward_id, voucher_code,
        points_used, status, created_at
      FROM user_vouchers
      ORDER BY created_at DESC
    `;

    // Get vouchers for the specific UUID
    const vouchersByUuid = await sql`
      SELECT * FROM user_vouchers
      WHERE supabase_user_id = ${testUuid}
    `;

    // Get vouchers for the converted numeric ID
    const vouchersByNumericId = await sql`
      SELECT * FROM user_vouchers
      WHERE user_id = ${numericId}
    `;

    // Count by reward ID for the user
    const rewardCounts = await sql`
      SELECT reward_id, COUNT(*) as count
      FROM user_vouchers
      WHERE user_id = ${numericId}
      GROUP BY reward_id
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        debug: {
          testUuid,
          numericId,
          totalVouchers: allVouchers.length
        },
        allVouchers: allVouchers.slice(0, 10), // Show first 10
        vouchersByUuid: vouchersByUuid,
        vouchersByNumericId: vouchersByNumericId,
        rewardCounts: rewardCounts,
        analysis: {
          hasVouchersByUuid: vouchersByUuid.length > 0,
          hasVouchersByNumericId: vouchersByNumericId.length > 0,
          totalForUser: vouchersByNumericId.length + vouchersByUuid.length
        }
      })
    };

  } catch (error) {
    console.error('❌ Debug vouchers error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};