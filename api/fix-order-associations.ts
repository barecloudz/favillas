import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';

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

function authenticateToken(event: any): { userId: string; username: string; role: string; isSupabaseUser: boolean } | null {
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
    // First try to decode as Supabase JWT token
    try {
      if (token && token.includes('.')) {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          // Add proper base64 padding if missing
          let payloadB64 = tokenParts[1];
          while (payloadB64.length % 4) {
            payloadB64 += '=';
          }

          const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());

          if (payload.iss && payload.iss.includes('supabase')) {
            const supabaseUserId = payload.sub;

            return {
              userId: supabaseUserId,
              username: payload.email || 'supabase_user',
              role: 'customer',
              isSupabaseUser: true
            };
          }
        }
      }
    } catch (supabaseError) {
      console.log('Not a Supabase token, trying JWT verification:', supabaseError);
    }

    // Fallback to our JWT verification
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    return {
      userId: decoded.userId.toString(),
      username: decoded.username,
      role: decoded.role || 'customer',
      isSupabaseUser: false
    };
  } catch (error) {
    console.error('Token authentication failed:', error);
    return null;
  }
}

export const handler: Handler = async (event, context) => {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  // Authenticate user
  const authPayload = authenticateToken(event);
  if (!authPayload) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  // Only allow superadmin to use this endpoint
  if (authPayload.role !== 'superadmin' && authPayload.username !== 'superadmin') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Superadmin access required' })
    };
  }

  try {
    const sql = getDB();

    if (event.httpMethod === 'GET') {
      // Analyze the current state of order associations
      const analysis = {
        timestamp: new Date().toISOString(),
        ordersByType: null,
        orphanedOrders: null,
        googleUsers: null,
        recentOrders: null,
        possibleMatches: null
      };

      // 1. Orders by user type
      analysis.ordersByType = await sql`
        SELECT
          CASE
            WHEN user_id IS NOT NULL AND supabase_user_id IS NULL THEN 'legacy_only'
            WHEN user_id IS NULL AND supabase_user_id IS NOT NULL THEN 'supabase_only'
            WHEN user_id IS NOT NULL AND supabase_user_id IS NOT NULL THEN 'both'
            ELSE 'neither'
          END as user_type,
          COUNT(*) as count
        FROM orders
        GROUP BY user_type
        ORDER BY count DESC
      `;

      // 2. Orders without supabase_user_id (orphaned from Google users)
      analysis.orphanedOrders = await sql`
        SELECT
          id,
          user_id,
          total,
          status,
          phone,
          created_at,
          special_instructions
        FROM orders
        WHERE supabase_user_id IS NULL
        ORDER BY created_at DESC
        LIMIT 20
      `;

      // 3. Google users in the system
      analysis.googleUsers = await sql`
        SELECT
          id,
          username,
          email,
          phone,
          supabase_user_id,
          created_at
        FROM users
        WHERE supabase_user_id IS NOT NULL
        ORDER BY created_at DESC
      `;

      // 4. Recent orders for context
      analysis.recentOrders = await sql`
        SELECT
          id,
          user_id,
          supabase_user_id,
          total,
          phone,
          created_at
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '14 days'
        ORDER BY created_at DESC
        LIMIT 10
      `;

      // 5. Possible matches between orphaned orders and Google users by phone
      analysis.possibleMatches = await sql`
        SELECT
          o.id as order_id,
          o.phone as order_phone,
          o.total,
          o.created_at as order_date,
          u.id as user_id,
          u.username,
          u.email,
          u.supabase_user_id
        FROM orders o
        JOIN users u ON o.phone = u.phone
        WHERE o.supabase_user_id IS NULL
        AND u.supabase_user_id IS NOT NULL
        ORDER BY o.created_at DESC
        LIMIT 20
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(analysis, null, 2)
      };

    } else if (event.httpMethod === 'POST') {
      // Fix order associations based on provided mapping
      const requestBody = JSON.parse(event.body || '{}');
      const { action, supabaseUserId, phoneNumber, orderIds } = requestBody;

      if (action === 'fix_by_phone' && supabaseUserId && phoneNumber) {
        // Update all orders with the given phone number to associate with the Supabase user ID
        const updatedOrders = await sql`
          UPDATE orders
          SET supabase_user_id = ${supabaseUserId}
          WHERE phone = ${phoneNumber}
          AND supabase_user_id IS NULL
          RETURNING id, phone, total, created_at
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Updated ${updatedOrders.length} orders for phone ${phoneNumber}`,
            updatedOrders
          })
        };

      } else if (action === 'fix_specific_orders' && supabaseUserId && orderIds && Array.isArray(orderIds)) {
        // Update specific order IDs to associate with the Supabase user ID
        const updatedOrders = await sql`
          UPDATE orders
          SET supabase_user_id = ${supabaseUserId}
          WHERE id = ANY(${orderIds})
          AND supabase_user_id IS NULL
          RETURNING id, phone, total, created_at
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Updated ${updatedOrders.length} specific orders`,
            updatedOrders
          })
        };

      } else {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Invalid action or missing parameters',
            expectedActions: ['fix_by_phone', 'fix_specific_orders'],
            requiredParams: {
              fix_by_phone: ['supabaseUserId', 'phoneNumber'],
              fix_specific_orders: ['supabaseUserId', 'orderIds']
            }
          })
        };
      }

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

  } catch (error) {
    console.error('Fix order associations API error:', error);
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