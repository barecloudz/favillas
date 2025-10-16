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
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();

    console.log('🔍 Diagnosing user with 5999 points...');

    // Find user(s) with exactly 5999 points
    const usersWithPoints = await sql`
      SELECT
        up.id as points_record_id,
        up.user_id,
        up.supabase_user_id,
        up.points,
        up.total_earned,
        up.total_redeemed,
        up.last_earned_at,
        up.updated_at,
        u.email,
        u.first_name,
        u.last_name
      FROM user_points up
      LEFT JOIN users u ON up.user_id = u.id OR up.supabase_user_id = u.supabase_user_id
      WHERE up.points = 5999
      ORDER BY up.updated_at DESC
    `;

    if (usersWithPoints.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'No users found with exactly 5999 points',
          timestamp: new Date().toISOString()
        })
      };
    }

    const diagnostics = [];

    for (const user of usersWithPoints) {
      // Get all points transactions for this user
      const transactions = await sql`
        SELECT * FROM points_transactions
        WHERE user_id = ${user.user_id} OR supabase_user_id = ${user.supabase_user_id}
        ORDER BY created_at DESC
        LIMIT 20
      `;

      // Calculate expected points from transactions
      const earnedTransactions = transactions.filter(t => t.type === 'earned' || t.type === 'signup' || t.type === 'first_order');
      const redeemedTransactions = transactions.filter(t => t.type === 'redeemed');

      const calculatedEarned = earnedTransactions.reduce((sum, t) => sum + (t.points || 0), 0);
      const calculatedRedeemed = redeemedTransactions.reduce((sum, t) => sum + (t.points || 0), 0);
      const calculatedPoints = calculatedEarned - calculatedRedeemed;

      // Check their recent orders
      const recentOrders = await sql`
        SELECT id, total, status, payment_status, created_at
        FROM orders
        WHERE user_id = ${user.user_id} OR supabase_user_id = ${user.supabase_user_id}
        ORDER BY created_at DESC
        LIMIT 10
      `;

      // Check if any recent orders don't have points transactions
      const ordersWithoutPoints = [];
      for (const order of recentOrders) {
        const hasTransaction = transactions.some(t => t.order_id === order.id);
        if (!hasTransaction && ['completed', 'succeeded', 'paid'].includes(order.payment_status || '')) {
          ordersWithoutPoints.push({
            orderId: order.id,
            total: order.total,
            expectedPoints: Math.floor(parseFloat(order.total)),
            createdAt: order.created_at
          });
        }
      }

      diagnostics.push({
        user: {
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          userId: user.user_id,
          supabaseUserId: user.supabase_user_id
        },
        pointsRecord: {
          currentPoints: user.points,
          totalEarned: user.total_earned,
          totalRedeemed: user.total_redeemed,
          lastEarnedAt: user.last_earned_at,
          updatedAt: user.updated_at
        },
        calculations: {
          earnedFromTransactions: calculatedEarned,
          redeemedFromTransactions: calculatedRedeemed,
          expectedPoints: calculatedPoints,
          storedPoints: user.points,
          storedTotalEarned: user.total_earned,
          storedTotalRedeemed: user.total_redeemed,
          mismatch: {
            pointsMismatch: calculatedPoints !== user.points,
            earnedMismatch: calculatedEarned !== user.total_earned,
            redeemedMismatch: calculatedRedeemed !== user.total_redeemed
          }
        },
        recentActivity: {
          totalTransactions: transactions.length,
          lastTransaction: transactions[0] || null,
          lastFiveTransactions: transactions.slice(0, 5),
          ordersWithoutPointsAwarded: ordersWithoutPoints,
          recentOrdersCount: recentOrders.length
        },
        diagnosis: {
          issue: calculatedPoints !== user.points ? 'POINTS_MISMATCH' :
                  calculatedEarned !== user.total_earned ? 'EARNED_MISMATCH' :
                  ordersWithoutPoints.length > 0 ? 'MISSING_POINTS_FOR_ORDERS' : 'NO_OBVIOUS_ISSUE',
          recommendation: calculatedPoints !== user.points ?
            'Points field does not match transaction history. Should be recalculated.' :
            calculatedEarned !== user.total_earned ?
            'total_earned field does not match transaction history. Should be recalculated.' :
            ordersWithoutPoints.length > 0 ?
            `${ordersWithoutPoints.length} paid orders missing points transactions. Points should be awarded retroactively.` :
            'Data appears consistent. Issue may be with new orders not awarding points.'
        }
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        usersFound: usersWithPoints.length,
        diagnostics
      }, null, 2)
    };

  } catch (error) {
    console.error('❌ Diagnosis error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to diagnose points issue',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
