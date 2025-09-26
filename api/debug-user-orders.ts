import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, AuthPayload } from './_shared/auth';

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
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Require authentication
  const authPayload = await authenticateToken(event);
  if (!authPayload || !authPayload.isSupabase) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    const sql = getDB();
    const supabaseUserId = authPayload.supabaseUserId;

    console.log('🔍 DEBUG: Analyzing orders for Supabase user:', supabaseUserId);

    // Get user profile info
    const userProfile = await sql`
      SELECT id, phone, supabase_user_id, username, email FROM users WHERE supabase_user_id = ${supabaseUserId}
    `;

    if (userProfile.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User profile not found' })
      };
    }

    const user = userProfile[0];
    const userPhone = user.phone;

    console.log('👤 User info:', { id: user.id, phone: userPhone, email: user.email });

    // Get all orders with this phone number (last 30 days)
    const allOrdersWithPhone = await sql`
      SELECT id, user_id, supabase_user_id, total, phone, created_at, status
      FROM orders
      WHERE phone = ${userPhone}
        AND created_at > NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
    `;

    // Get points transactions for this user
    const pointsTransactions = await sql`
      SELECT order_id, points, description, created_at
      FROM points_transactions
      WHERE supabase_user_id = ${supabaseUserId}
      ORDER BY created_at DESC
    `;

    // Get current points balance
    const pointsBalance = await sql`
      SELECT points, total_earned, total_redeemed
      FROM user_points
      WHERE supabase_user_id = ${supabaseUserId}
    `;

    // Calculate missing points
    const orderIds = allOrdersWithPhone.map(o => o.id);
    const ordersWithPoints = pointsTransactions.map(pt => pt.order_id);
    const ordersWithoutPoints = allOrdersWithPhone.filter(order => !ordersWithPoints.includes(order.id));

    const totalSpent = allOrdersWithPhone.reduce((sum, order) => sum + parseFloat(order.total), 0);
    const expectedPoints = Math.floor(totalSpent);
    const actualPoints = pointsBalance[0]?.points || 0;
    const missingPoints = expectedPoints - actualPoints;

    const debugInfo = {
      user: {
        id: user.id,
        supabaseUserId: user.supabase_user_id,
        phone: userPhone,
        email: user.email
      },
      summary: {
        totalOrders: allOrdersWithPhone.length,
        ordersWithoutPoints: ordersWithoutPoints.length,
        totalSpent: totalSpent.toFixed(2),
        expectedPoints,
        actualPoints,
        missingPoints
      },
      orderDetails: allOrdersWithPhone.map(order => ({
        id: order.id,
        total: parseFloat(order.total),
        hasPoints: ordersWithPoints.includes(order.id),
        associatedWithUser: !!order.supabase_user_id,
        created: order.created_at,
        status: order.status
      })),
      ordersNeedingPoints: ordersWithoutPoints.map(order => ({
        id: order.id,
        total: parseFloat(order.total),
        pointsToAward: Math.floor(parseFloat(order.total)),
        associatedWithUser: !!order.supabase_user_id
      }))
    };

    console.log('📊 DEBUG: Order analysis complete:', debugInfo);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(debugInfo)
    };

  } catch (error) {
    console.error('❌ DEBUG: Error analyzing orders:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to analyze orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};