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
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();
    const legacyUserId = 29; // From the logs: user_id: 29
    const supabaseUserId = 'fc644776-1ca0-46ad-ae6c-8f753478374b'; // From previous debug

    console.log('🔍 Debug: Checking points data for both user types');

    // Get user points record for legacy user
    const userPointsLegacy = await sql`
      SELECT * FROM user_points WHERE user_id = ${legacyUserId}
    `;

    // Get user points record for Supabase user
    const userPointsSupabase = await sql`
      SELECT * FROM user_points WHERE supabase_user_id = ${supabaseUserId}
    `;

    // Get ALL user_points records that might be related
    const allUserPoints = await sql`
      SELECT * FROM user_points
      WHERE user_id = ${legacyUserId} OR supabase_user_id = ${supabaseUserId}
    `;

    // Get all points transactions for legacy user
    const pointsTransactionsLegacy = await sql`
      SELECT * FROM points_transactions
      WHERE user_id = ${legacyUserId}
      ORDER BY created_at DESC
    `;

    // Get all points transactions for Supabase user
    const pointsTransactionsSupabase = await sql`
      SELECT * FROM points_transactions
      WHERE supabase_user_id = ${supabaseUserId}
      ORDER BY created_at DESC
    `;

    // Get all orders for this user
    const ordersLegacy = await sql`
      SELECT id, total, payment_status, status, created_at
      FROM orders
      WHERE user_id = ${legacyUserId}
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // Check the most recent orders (196, 197 from logs)
    const order196 = await sql`
      SELECT * FROM orders WHERE id = 196
    `;

    const order197 = await sql`
      SELECT * FROM orders WHERE id = 197
    `;

    // Check if orders have points transactions
    const order196Points = await sql`
      SELECT * FROM points_transactions WHERE order_id = 196
    `;

    const order197Points = await sql`
      SELECT * FROM points_transactions WHERE order_id = 197
    `;

    // Check which orders have points transactions
    const orderIds = ordersLegacy.map(o => o.id);
    const ordersWithPoints = await sql`
      SELECT DISTINCT order_id
      FROM points_transactions
      WHERE order_id = ANY(${orderIds}) AND user_id = ${legacyUserId}
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        legacy_user_id: legacyUserId,
        supabase_user_id: supabaseUserId,
        user_points_legacy: userPointsLegacy,
        user_points_supabase: userPointsSupabase,
        all_user_points: allUserPoints,
        points_transactions_legacy: pointsTransactionsLegacy.slice(0, 5), // First 5 for brevity
        points_transactions_supabase: pointsTransactionsSupabase.slice(0, 5),
        recent_orders: ordersLegacy,
        order_196: order196,
        order_197: order197,
        order_196_points: order196Points,
        order_197_points: order197Points,
        orders_with_points: ordersWithPoints.map(o => o.order_id),
        missing_points_orders: orderIds.filter(id => !ordersWithPoints.find(o => o.order_id === id)),
        analysis: {
          total_orders: ordersLegacy.length,
          legacy_transactions: pointsTransactionsLegacy.length,
          supabase_transactions: pointsTransactionsSupabase.length,
          legacy_points: userPointsLegacy[0]?.points || 0,
          supabase_points: userPointsSupabase[0]?.points || 0,
          total_points_records: allUserPoints.length,
          combined_points: (userPointsLegacy[0]?.points || 0) + (userPointsSupabase[0]?.points || 0),
          order_196_exists: order196.length > 0,
          order_196_has_points: order196Points.length > 0,
          order_197_has_points: order197Points.length > 0,
          discrepancy_explanation: "Check if frontend reads from different source or sums multiple records"
        }
      })
    };

  } catch (error: any) {
    console.error('Debug points error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};