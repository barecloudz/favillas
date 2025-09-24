import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, isStaff } from '../_shared/auth';

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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    // Authenticate admin user
    const authPayload = await authenticateToken(event);
    if (!authPayload || !isStaff(authPayload)) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized - Admin access required' })
      };
    }

    const sql = getDB();
    const queryParams = new URLSearchParams(event.queryStringParameters || '');
    const unreadOnly = queryParams.get('unreadOnly') === 'true';

    // For now, return an empty array since there's no alerts table yet
    // In a full implementation, you'd query an alerts/notifications table
    console.log('📢 Fetching admin alerts...', { unreadOnly });

    // This would be the actual query when alerts table exists:
    // const alerts = await sql`
    //   SELECT
    //     id,
    //     alert_type as alertType,
    //     message,
    //     created_at as createdAt,
    //     read_at as readAt,
    //     employee_id as employeeId
    //   FROM admin_alerts
    //   WHERE ${unreadOnly ? sql`read_at IS NULL` : sql`1=1`}
    //   ORDER BY created_at DESC
    //   LIMIT 50
    // `;

    // For now, return sample alerts or empty array
    const sampleAlerts = [
      // Uncomment to test with sample data:
      // {
      //   id: 1,
      //   alertType: 'late_clock_in',
      //   message: 'John Doe clocked in 15 minutes late',
      //   createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      //   readAt: null,
      //   employeeId: 1
      // },
      // {
      //   id: 2,
      //   alertType: 'overtime',
      //   message: 'Jane Smith worked 10.5 hours today',
      //   createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      //   readAt: null,
      //   employeeId: 2
      // }
    ];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(sampleAlerts)
    };
  } catch (error) {
    console.error('Admin Alerts API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Failed to fetch alerts',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};