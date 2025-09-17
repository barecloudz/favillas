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
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const sql = getDB();

    // Investigation queries
    const results = {
      timestamp: new Date().toISOString(),
      totalOrders: null,
      ordersByType: null,
      recentOrders: null,
      googleOrders: null,
      specificOrders: {},
      orphanedOrders: null,
      duplicateMappings: null
    };

    // 1. Total order count
    const totalOrdersResult = await sql`SELECT COUNT(*) as count FROM orders`;
    results.totalOrders = parseInt(totalOrdersResult[0].count);

    // 2. Orders by user type
    results.ordersByType = await sql`
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

    // 3. Recent orders (last 7 days)
    results.recentOrders = await sql`
      SELECT
        id,
        user_id,
        supabase_user_id,
        total,
        status,
        payment_status,
        created_at,
        phone
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 20
    `;

    // 4. Google/Supabase orders
    results.googleOrders = await sql`
      SELECT
        id,
        user_id,
        supabase_user_id,
        total,
        status,
        created_at,
        phone
      FROM orders
      WHERE supabase_user_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 20
    `;

    // 5. Check specific order IDs
    const specificOrderIds = [92, 93, 94, 97];
    for (const orderId of specificOrderIds) {
      const order = await sql`
        SELECT
          id,
          user_id,
          supabase_user_id,
          total,
          status,
          payment_status,
          created_at,
          phone
        FROM orders
        WHERE id = ${orderId}
      `;
      results.specificOrders[orderId] = order.length > 0 ? order[0] : null;
    }

    // 6. Orphaned orders
    results.orphanedOrders = await sql`
      SELECT
        id,
        total,
        status,
        created_at,
        phone
      FROM orders
      WHERE user_id IS NULL AND supabase_user_id IS NULL
    `;

    // 7. Duplicate mappings
    results.duplicateMappings = await sql`
      SELECT
        supabase_user_id,
        COUNT(*) as order_count,
        COUNT(DISTINCT user_id) as legacy_user_count,
        ARRAY_AGG(DISTINCT user_id) as legacy_user_ids,
        ARRAY_AGG(id ORDER BY created_at DESC) as order_ids
      FROM orders
      WHERE supabase_user_id IS NOT NULL
      GROUP BY supabase_user_id
      HAVING COUNT(*) > 1
      ORDER BY order_count DESC
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results, null, 2)
    };

  } catch (error) {
    console.error('Debug orders API error:', error);
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