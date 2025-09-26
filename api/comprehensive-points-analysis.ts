import { Handler } from '@netlify/functions';
import postgres from 'postgres';

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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  try {
    const sql = getDB();

    // Critical case analysis for phone 8039774285 and user bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a
    const phone = '8039774285';
    const supabaseUserId = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a';

    console.log('🔍 Starting comprehensive points analysis for phone:', phone, 'user:', supabaseUserId);

    // 1. Get all orders for this phone number (last 30 days)
    const orders = await sql`
      SELECT
        id as order_id,
        user_id,
        supabase_user_id,
        status,
        payment_status,
        total,
        tax,
        delivery_fee,
        tip,
        order_type,
        phone,
        created_at,
        FLOOR(total::numeric) as expected_points
      FROM orders
      WHERE phone = ${phone}
        AND created_at >= NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
    `;

    // 2. Get all points transactions for this Supabase user
    const pointsTransactions = await sql`
      SELECT
        id,
        user_id,
        supabase_user_id,
        order_id,
        type,
        points,
        description,
        order_amount,
        created_at
      FROM points_transactions
      WHERE supabase_user_id = ${supabaseUserId}
      ORDER BY created_at DESC
    `;

    // 3. Get current points balance
    const userPoints = await sql`
      SELECT
        id,
        user_id,
        supabase_user_id,
        points as current_points,
        total_earned,
        total_redeemed,
        last_earned_at,
        created_at,
        updated_at
      FROM user_points
      WHERE supabase_user_id = ${supabaseUserId}
    `;

    // 4. Check for missing transactions
    const missingTransactions = await sql`
      SELECT
        o.id as order_id,
        o.total,
        o.status,
        o.payment_status,
        o.created_at as order_date,
        FLOOR(o.total::numeric) as should_award_points,
        pt.id as transaction_id,
        pt.points as actual_points_awarded,
        CASE
          WHEN pt.id IS NULL THEN 'MISSING'
          WHEN pt.points != FLOOR(o.total::numeric) THEN 'MISMATCH'
          ELSE 'OK'
        END as status
      FROM orders o
      LEFT JOIN points_transactions pt ON (
        o.id = pt.order_id
        AND pt.supabase_user_id = ${supabaseUserId}
      )
      WHERE (o.supabase_user_id = ${supabaseUserId} OR o.phone = ${phone})
        AND o.status != 'cancelled'
        AND o.payment_status IN ('completed', 'succeeded', 'paid')
      ORDER BY o.created_at DESC
    `;

    // 5. Calculate totals
    const totalSpent = orders.reduce((sum, order) => sum + parseFloat(order.total), 0);
    const totalExpectedPoints = orders.reduce((sum, order) => sum + parseInt(order.expected_points), 0);

    const earnedPoints = pointsTransactions
      .filter(tx => tx.type === 'earned')
      .reduce((sum, tx) => sum + tx.points, 0);

    const redeemedPoints = pointsTransactions
      .filter(tx => tx.type === 'redeemed')
      .reduce((sum, tx) => sum + tx.points, 0);

    const missingCount = missingTransactions.filter(tx => tx.status === 'MISSING').length;
    const mismatchCount = missingTransactions.filter(tx => tx.status === 'MISMATCH').length;

    // 6. User record lookup
    const userRecord = await sql`
      SELECT id, username, email, first_name, last_name, phone, created_at
      FROM users
      WHERE supabase_user_id = ${supabaseUserId}
    `;

    // Prepare comprehensive analysis
    const analysis = {
      metadata: {
        phone: phone,
        supabaseUserId: supabaseUserId,
        analysisTimestamp: new Date().toISOString(),
        description: 'Comprehensive analysis of points system failure'
      },

      userInfo: {
        hasUserRecord: userRecord.length > 0,
        userRecord: userRecord[0] || null,
        hasPointsRecord: userPoints.length > 0
      },

      ordersSummary: {
        totalOrders: orders.length,
        totalSpent: totalSpent.toFixed(2),
        totalExpectedPoints: totalExpectedPoints,
        orderDateRange: orders.length > 0 ? {
          first: orders[orders.length - 1].created_at,
          last: orders[0].created_at
        } : null
      },

      pointsTransactionsSummary: {
        totalTransactions: pointsTransactions.length,
        earnedPoints: earnedPoints,
        redeemedPoints: redeemedPoints,
        netPoints: earnedPoints - redeemedPoints
      },

      currentPointsBalance: userPoints[0] || null,

      discrepancy: {
        expectedPoints: totalExpectedPoints,
        actualPoints: userPoints[0]?.current_points || 0,
        transactionNetPoints: earnedPoints - redeemedPoints,
        mainDiscrepancy: totalExpectedPoints - (userPoints[0]?.current_points || 0),
        transactionDiscrepancy: totalExpectedPoints - (earnedPoints - redeemedPoints)
      },

      issues: {
        missingTransactions: missingCount,
        mismatchedTransactions: mismatchCount,
        noUserPointsRecord: userPoints.length === 0,
        noUserRecord: userRecord.length === 0
      },

      detailedOrders: orders.map(order => ({
        orderId: order.order_id,
        total: parseFloat(order.total),
        expectedPoints: order.expected_points,
        status: order.status,
        paymentStatus: order.payment_status,
        createdAt: order.created_at,
        userAssociation: order.user_id ? 'legacy' : (order.supabase_user_id ? 'supabase' : 'none')
      })),

      detailedTransactions: pointsTransactions.map(tx => ({
        transactionId: tx.id,
        orderId: tx.order_id,
        type: tx.type,
        points: tx.points,
        description: tx.description,
        orderAmount: tx.order_amount,
        createdAt: tx.created_at
      })),

      missingTransactionDetails: missingTransactions.filter(tx => tx.status !== 'OK').map(tx => ({
        orderId: tx.order_id,
        orderTotal: parseFloat(tx.total),
        shouldAwardPoints: tx.should_award_points,
        actualPointsAwarded: tx.actual_points_awarded,
        status: tx.status,
        orderDate: tx.order_date,
        orderStatus: tx.status,
        paymentStatus: tx.payment_status
      })),

      recommendedFixes: [
        missingCount > 0 ? `Create ${missingCount} missing points transactions` : null,
        mismatchCount > 0 ? `Fix ${mismatchCount} mismatched point amounts` : null,
        userPoints.length === 0 ? 'Create user_points record' : null,
        userRecord.length === 0 ? 'Create user profile record' : null,
        'Implement better error handling in orders API',
        'Add database constraints to prevent missing transactions'
      ].filter(Boolean)
    };

    console.log('✅ Comprehensive analysis completed');
    console.log('📊 Key findings:');
    console.log(`   - Expected points: ${analysis.discrepancy.expectedPoints}`);
    console.log(`   - Actual points: ${analysis.discrepancy.actualPoints}`);
    console.log(`   - Missing transactions: ${analysis.issues.missingTransactions}`);
    console.log(`   - Main discrepancy: ${analysis.discrepancy.mainDiscrepancy} points`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(analysis, null, 2)
    };

  } catch (error) {
    console.error('❌ Comprehensive analysis error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to perform comprehensive analysis',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};