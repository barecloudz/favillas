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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();
    const targetEmail = 'barecloudz@gmail.com';
    const targetSupabaseId = 'fc644776-1ca0-46ad-ae6c-8f753478374b';

    console.log('🔍 DEBUG-ALL: Finding ALL user_points records related to barecloudz@gmail.com');

    // Get ALL user_points records
    const allUserPoints = await sql`
      SELECT
        up.id,
        up.user_id,
        up.supabase_user_id,
        up.points,
        up.total_earned,
        up.total_redeemed,
        up.created_at,
        up.updated_at,
        u.email as user_email,
        u.id as linked_user_id
      FROM user_points up
      LEFT JOIN users u ON (up.user_id = u.id OR up.supabase_user_id = u.supabase_user_id)
      WHERE
        up.supabase_user_id = ${targetSupabaseId}
        OR up.user_id IN (SELECT id FROM users WHERE email ILIKE ${targetEmail})
        OR up.supabase_user_id IN (SELECT supabase_user_id FROM users WHERE email ILIKE ${targetEmail})
      ORDER BY up.points DESC, up.created_at DESC
    `;

    // Also check for points records with 3292 points specifically
    const points3292Records = await sql`
      SELECT
        up.id,
        up.user_id,
        up.supabase_user_id,
        up.points,
        up.total_earned,
        up.total_redeemed,
        up.created_at,
        up.updated_at,
        u.email as user_email
      FROM user_points up
      LEFT JOIN users u ON (up.user_id = u.id OR up.supabase_user_id = u.supabase_user_id)
      WHERE up.points = 3292
    `;

    // Check what the user-rewards endpoint would return for Supabase user
    const supabaseUserPointsQuery = await sql`
      SELECT
        SUM(points) as points,
        SUM(total_earned) as total_earned,
        SUM(total_redeemed) as total_redeemed,
        MAX(last_earned_at) as last_earned_at,
        MAX(updated_at) as updated_at,
        COUNT(*) as record_count
      FROM user_points
      WHERE supabase_user_id = ${targetSupabaseId}
      GROUP BY supabase_user_id
    `;

    const report = {
      timestamp: new Date().toISOString(),
      targetEmail: targetEmail,
      targetSupabaseId: targetSupabaseId,
      allUserPointsRecords: {
        count: allUserPoints.length,
        records: allUserPoints
      },
      points3292Records: {
        count: points3292Records.length,
        records: points3292Records
      },
      supabaseUserRewardsQuery: {
        count: supabaseUserPointsQuery.length,
        data: supabaseUserPointsQuery[0] || null
      },
      analysis: {
        hasSupabaseRecord: allUserPoints.some(r => r.supabase_user_id === targetSupabaseId),
        hasLegacyRecord: allUserPoints.some(r => r.user_id === 29),
        totalPointsAllRecords: allUserPoints.reduce((sum, r) => sum + (parseInt(r.points) || 0), 0),
        maxPointsRecord: allUserPoints.length > 0 ? Math.max(...allUserPoints.map(r => parseInt(r.points) || 0)) : 0
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(report, null, 2)
    };

  } catch (error) {
    console.error('🔍 DEBUG-ALL: Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Debug all user points failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};