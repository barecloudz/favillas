import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';

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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();

    if (event.httpMethod === 'GET') {
      // Show all users with negative points
      const negativePointsUsers = await sql`
        SELECT id, user_id, supabase_user_id, points, total_earned, total_redeemed, created_at, updated_at
        FROM user_points
        WHERE points < 0
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Users with negative points',
          count: negativePointsUsers.length,
          users: negativePointsUsers
        })
      };
    }

    if (event.httpMethod === 'POST') {
      // Fix negative points - set them to 55 (100 original - 50 redeemed + 5 buffer)
      const fixResult = await sql`
        UPDATE user_points
        SET points = 55, updated_at = NOW()
        WHERE points < 0
        RETURNING id, user_id, supabase_user_id, points
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Fixed negative points',
          fixed_users: fixResult
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };

  } catch (error: any) {
    console.error('Debug points error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};