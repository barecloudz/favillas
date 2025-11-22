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
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Require staff authentication
  const authPayload = await authenticateToken(event);
  if (!authPayload || !isStaff(authPayload)) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized - staff access required' })
    };
  }

  try {
    const sql = getDB();

    // Get current date in EST from database
    // Database is configured with EST timezone
    const result = await sql`
      SELECT TO_CHAR(CURRENT_DATE, 'YYYY-MM-DD') as current_date
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        currentDate: result[0].current_date
      })
    };

  } catch (error: any) {
    console.error('❌ Error getting current date:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get current date',
        details: error.message
      })
    };
  }
};
