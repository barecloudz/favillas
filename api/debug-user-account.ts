import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken } from './utils/auth';

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
    const targetEmail = 'barecloudz@gmail.com';

    console.log('🔍 DEBUG: Starting comprehensive account debug for:', targetEmail);

    // Test authentication first
    const authResult = await authenticateToken(
      event.headers.authorization || event.headers.Authorization,
      event.headers.cookie || event.headers.Cookie
    );

    console.log('🔑 Auth result:', authResult);

    // 1. Find all user records for this email
    const allUsers = await sql`
      SELECT id, email, supabase_user_id, rewards, created_at, updated_at
      FROM users
      WHERE LOWER(TRIM(email)) = LOWER(TRIM(${targetEmail}))
    `;

    // 2. Check user_points table
    const userPointsRecords = await sql`
      SELECT up.*, u.email
      FROM user_points up
      JOIN users u ON up.user_id = u.id
      WHERE u.email ILIKE ${targetEmail}
    `;

    // 3. Get recent orders for this user
    const recentOrders = await sql`
      SELECT id, user_id, total, status, created_at, payment_status
      FROM orders
      WHERE user_id IN (
        SELECT id FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM(${targetEmail}))
      )
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // 4. Get points transactions
    const pointsTransactions = await sql`
      SELECT pt.*, u.email
      FROM points_transactions pt
      JOIN users u ON pt.user_id = u.id
      WHERE u.email ILIKE ${targetEmail}
      ORDER BY pt.created_at DESC
      LIMIT 20
    `;

    // 5. Check for orders without points awarded
    const ordersWithoutPoints = await sql`
      SELECT o.id, o.total, o.created_at, o.status, o.payment_status
      FROM orders o
      JOIN users u ON o.user_id = u.id
      LEFT JOIN points_transactions pt ON pt.order_id = o.id AND pt.user_id = o.user_id
      WHERE u.email ILIKE ${targetEmail}
        AND pt.id IS NULL
        AND o.total > 0
      ORDER BY o.created_at DESC
    `;

    // 6. Test what user ID conversion would happen for current auth
    let conversionTest = null;
    if (authResult?.isSupabase && authResult?.username) {
      const existingLegacyUser = await sql`
        SELECT id, email, supabase_user_id FROM users
        WHERE LOWER(TRIM(email)) = LOWER(TRIM(${authResult.username}))
        LIMIT 1
      `;
      conversionTest = {
        authEmail: authResult.username,
        foundLegacyUser: existingLegacyUser.length > 0,
        legacyUserId: existingLegacyUser[0]?.id || null
      };
    }

    // 7. Calculate expected points vs actual points
    const totalOrderValue = recentOrders.reduce((sum, order) => sum + parseFloat(order.total || 0), 0);
    const expectedPoints = Math.floor(totalOrderValue);
    const actualPoints = userPointsRecords[0]?.points || 0;

    const debugReport = {
      timestamp: new Date().toISOString(),
      targetEmail,
      authentication: {
        isAuthenticated: !!authResult,
        authType: authResult?.isSupabase ? 'Supabase' : 'Legacy JWT',
        userId: authResult?.userId,
        supabaseUserId: authResult?.supabaseUserId,
        username: authResult?.username,
        conversionTest
      },
      userAccounts: {
        count: allUsers.length,
        users: allUsers
      },
      pointsRecords: {
        count: userPointsRecords.length,
        records: userPointsRecords
      },
      recentOrders: {
        count: recentOrders.length,
        orders: recentOrders,
        totalValue: totalOrderValue
      },
      pointsTransactions: {
        count: pointsTransactions.length,
        transactions: pointsTransactions
      },
      ordersWithoutPoints: {
        count: ordersWithoutPoints.length,
        orders: ordersWithoutPoints
      },
      pointsAnalysis: {
        expectedPointsFromOrders: expectedPoints,
        actualPointsInDatabase: actualPoints,
        pointsDeficit: expectedPoints - actualPoints
      },
      recommendations: []
    };

    // Add recommendations based on findings
    if (allUsers.length === 0) {
      debugReport.recommendations.push("❌ No user found with email " + targetEmail);
    } else if (allUsers.length > 1) {
      debugReport.recommendations.push("⚠️ Multiple user accounts found - potential duplicate issue");
    }

    if (userPointsRecords.length === 0) {
      debugReport.recommendations.push("❌ No user_points record found - user has never earned points");
    }

    if (ordersWithoutPoints.length > 0) {
      debugReport.recommendations.push(`🔧 ${ordersWithoutPoints.length} orders found without points awarded`);
    }

    if (!authResult) {
      debugReport.recommendations.push("🔑 Authentication failed - cannot test live auth flow");
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(debugReport, null, 2)
    };

  } catch (error) {
    console.error('🔍 DEBUG: Account debug error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Account debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};