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

    console.log('🔍 TEST-DB-ORDERS: Checking recent orders and user data');

    // Get recent orders
    const recentOrders = await sql`
      SELECT id, user_id, supabase_user_id, status, total, created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // Check user conversion for barecloudz@gmail.com
    const supabaseUserId = 'fc644776-1ca0-46ad-ae6c-8f753478374b';
    const userEmail = 'barecloudz@gmail.com';

    // Check if legacy user exists by email
    const legacyUserByEmail = await sql`
      SELECT id, email, supabase_user_id, created_at
      FROM users
      WHERE email = ${userEmail}
    `;

    // Check if Supabase user exists by UUID
    const supabaseUserRecord = await sql`
      SELECT id, email, supabase_user_id, created_at
      FROM users
      WHERE supabase_user_id = ${supabaseUserId}
    `;

    // Check points records
    const pointsRecords = await sql`
      SELECT user_id, supabase_user_id, points, total_earned
      FROM user_points
      WHERE user_id IN (SELECT id FROM users WHERE email = ${userEmail})
         OR supabase_user_id = ${supabaseUserId}
    `;

    const result = {
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        user_id: order.user_id,
        supabase_user_id: order.supabase_user_id,
        status: order.status,
        total: order.total,
        created_at: order.created_at
      })),
      userConversionCheck: {
        email: userEmail,
        supabaseUserId: supabaseUserId,
        legacyUserByEmail: legacyUserByEmail,
        supabaseUserRecord: supabaseUserRecord,
        pointsRecords: pointsRecords
      },
      analysis: {
        hasLegacyUserByEmail: legacyUserByEmail.length > 0,
        hasSupabaseUserRecord: supabaseUserRecord.length > 0,
        expectedLegacyUserId: legacyUserByEmail.length > 0 ? legacyUserByEmail[0].id : null,
        recentOrdersWithNullUserId: recentOrders.filter(o => o.user_id === null && o.supabase_user_id).length
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result, null, 2)
    };

  } catch (error) {
    console.error('🔍 TEST-DB-ORDERS: Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Database test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};