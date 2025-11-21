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

  // CRITICAL: Require staff authentication
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

    // Fetch all refunds with order details
    const refunds = await sql`
      SELECT
        r.id,
        r.order_id,
        r.refund_id,
        r.amount,
        r.reason,
        r.refund_type,
        r.processed_by,
        r.created_at,
        o.customer_name,
        o.phone,
        o.total as order_total,
        o.status as order_status
      FROM order_refunds r
      JOIN orders o ON r.order_id = o.id
      ORDER BY r.created_at DESC
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(refunds)
    };

  } catch (error: any) {
    console.error('❌ Error fetching refunds:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch refunds',
        details: error.message
      })
    };
  }
};
