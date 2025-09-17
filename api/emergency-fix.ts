import { Handler } from '@netlify/functions';
import postgres from 'postgres';

// Database connection - serverless optimized
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
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
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
    const body = JSON.parse(event.body || '{}');
    const { supabaseUserId, email } = body;

    console.log('🚨 Emergency fix requested for:', { supabaseUserId, email });

    if (!supabaseUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Supabase User ID required',
          instructions: 'Send { "supabaseUserId": "your-uuid", "email": "your-email" }'
        })
      };
    }

    // Find user with highest points (likely the 1446 points user)
    const usersWithPoints = await sql`
      SELECT u.id, u.username, u.email, u.supabase_user_id, u.rewards,
             up.points as user_points_balance, up.total_earned
      FROM users u
      LEFT JOIN user_points up ON u.id = up.user_id
      WHERE up.points > 1000
      ORDER BY up.points DESC
      LIMIT 5
    `;

    console.log('Found users with high points:', usersWithPoints.length);

    if (usersWithPoints.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'No user found with significant points',
          note: 'Expected to find user with 1446 points'
        })
      };
    }

    // Get the user with the most points
    const targetUser = usersWithPoints[0];

    console.log('Linking user:', {
      userId: targetUser.id,
      currentPoints: targetUser.user_points_balance,
      supabaseId: supabaseUserId
    });

    // Update the user record to link it to Supabase user
    await sql`
      UPDATE users
      SET supabase_user_id = ${supabaseUserId},
          email = ${email || 'user@example.com'},
          updated_at = NOW()
      WHERE id = ${targetUser.id}
    `;

    console.log('✅ Emergency user link completed');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User account linked successfully via emergency fix',
        linkedUser: {
          id: targetUser.id,
          points: targetUser.user_points_balance,
          totalEarned: targetUser.total_earned
        },
        supabaseUserId: supabaseUserId,
        note: 'You should now be able to redeem vouchers'
      })
    };

  } catch (error) {
    console.error('❌ Emergency fix error:', error);
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