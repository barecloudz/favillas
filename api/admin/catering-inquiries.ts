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

function authenticateAdmin(event: any): { userId: number; username: string; role: string } | null {
  const authHeader = event.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    const cookies = event.headers.cookie;
    if (cookies) {
      const authCookie = cookies.split(';').find((c: string) => c.trim().startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }
  }

  if (!token) return null;

  try {
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
    }

    const decoded = jwt.verify(token, jwtSecret) as any;

    // Check if user has admin privileges
    if (!['admin', 'manager', 'kitchen'].includes(decoded.role)) {
      return null;
    }

    return {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role
    };
  } catch (error) {
    console.error('Admin token authentication failed:', error);
    return null;
  }
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
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

  const authPayload = authenticateAdmin(event);
  if (!authPayload) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    const sql = getDB();

    if (event.httpMethod === 'GET') {
      // Fetch all catering inquiries with counts by status
      console.log('📋 Admin: Fetching catering inquiries');

      const inquiries = await sql`
        SELECT
          id,
          event_type,
          custom_event_type,
          service_type,
          event_date,
          event_time,
          guest_count,
          custom_guest_count,
          menu_style,
          budget_range,
          full_name,
          phone_number,
          email,
          preferred_contact,
          best_time_to_call,
          status,
          created_at,
          updated_at
        FROM catering_inquiries
        ORDER BY created_at DESC
      `;

      // Count inquiries by status
      const statusCounts = await sql`
        SELECT
          status,
          COUNT(*) as count
        FROM catering_inquiries
        GROUP BY status
      `;

      const counts = statusCounts.reduce((acc: any, row: any) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {});

      // Calculate pending count (not contacted yet)
      const pendingCount = counts.pending || 0;

      console.log('✅ Admin: Found catering inquiries:', {
        total: inquiries.length,
        pending: pendingCount,
        statusBreakdown: counts
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          inquiries,
          counts,
          pendingCount,
          total: inquiries.length
        })
      };

    } else if (event.httpMethod === 'PATCH') {
      // Update catering inquiry status
      const { id, status } = JSON.parse(event.body || '{}');

      if (!id || !status) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing id or status' })
        };
      }

      const validStatuses = ['pending', 'contacted', 'quoted', 'confirmed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid status' })
        };
      }

      console.log('📝 Admin: Updating catering inquiry status:', { id, status, admin: authPayload.username });

      const result = await sql`
        UPDATE catering_inquiries
        SET
          status = ${status},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING id, status, updated_at
      `;

      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Catering inquiry not found' })
        };
      }

      console.log('✅ Admin: Updated catering inquiry status:', result[0]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          inquiry: result[0]
        })
      };

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

  } catch (error: any) {
    console.error('❌ Admin catering inquiries API error:', error);
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