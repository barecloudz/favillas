import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, isStaff } from './_shared/auth';

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

  console.log('🎯 AWARD POINTS API CALLED');
  console.log('📋 Request Method:', event.httpMethod);

  // Authenticate using Supabase token
  const authPayload = await authenticateToken(event);
  if (!authPayload) {
    console.log('❌ Authentication failed - no valid token');
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  console.log('✅ Authentication successful:', authPayload);

  if (!isStaff(authPayload)) {
    console.log('❌ Authorization failed - insufficient role:', authPayload.role);
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Admin access required' })
    };
  }

  console.log('✅ Authorization successful - user has admin access');

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const requestData = JSON.parse(event.body || '{}');
    const { userId, points, reason } = requestData;

    console.log('📋 Award points request:', { userId, points, reason });

    if (!userId || !points || points <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'User ID and positive points amount are required'
        })
      };
    }

    const sql = getDB();

    // Check if user exists
    const user = await sql`SELECT id, first_name, last_name, email FROM users WHERE id = ${userId}`;
    if (user.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'User not found'
        })
      };
    }

    console.log('👤 Found user:', user[0]);

    // Check if user already has points record
    const existingPoints = await sql`SELECT points FROM user_points WHERE user_id = ${userId}`;

    let newTotal;
    if (existingPoints.length === 0) {
      // Create new points record
      const [pointsRecord] = await sql`
        INSERT INTO user_points (user_id, points, created_at, updated_at)
        VALUES (${userId}, ${points}, NOW(), NOW())
        RETURNING points
      `;
      newTotal = pointsRecord.points;
      console.log('➕ Created new points record with:', points, 'points');
    } else {
      // Update existing points record
      const [pointsRecord] = await sql`
        UPDATE user_points
        SET points = points + ${points}, updated_at = NOW()
        WHERE user_id = ${userId}
        RETURNING points
      `;
      newTotal = pointsRecord.points;
      console.log('➕ Updated points. New total:', newTotal);
    }

    // Create points transaction record
    await sql`
      INSERT INTO points_transactions (
        user_id, points, type, description, created_at
      ) VALUES (
        ${userId}, ${points}, 'admin_award', ${reason || 'Points awarded by admin'}, NOW()
      )
    `;

    console.log('✅ Points awarded successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Points awarded successfully',
        user: {
          id: user[0].id,
          firstName: user[0].first_name,
          lastName: user[0].last_name,
          email: user[0].email
        },
        pointsAwarded: points,
        newTotal: newTotal,
        reason: reason || 'Points awarded by admin'
      })
    };

  } catch (error: any) {
    console.error('❌ Award points error:', error.message);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};