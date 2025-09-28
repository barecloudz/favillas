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

export const handler: Handler = async (event) => {
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

    console.log('🔍 DEBUG: Starting user orders issue investigation...');

    // Check order 209
    const order209 = await sql`
      SELECT id, user_id, supabase_user_id, email, phone, total, status, created_at
      FROM orders
      WHERE id = 209
    `;

    // Check user_id 30
    const user30 = await sql`
      SELECT id, username, email, supabase_user_id, role, created_at
      FROM users
      WHERE id = 30
    `;

    // Check user by email
    const userByEmail = await sql`
      SELECT id, username, email, supabase_user_id, role, created_at
      FROM users
      WHERE email = 'logacaw345@rograc.com'
    `;

    // Check all orders for user_id 30
    const ordersForUser30 = await sql`
      SELECT id, user_id, supabase_user_id, email, total, status, created_at
      FROM orders
      WHERE user_id = 30
      ORDER BY created_at DESC
    `;

    // Check points transactions for user_id 30 and order 209
    const pointsTransactions = await sql`
      SELECT id, user_id, supabase_user_id, order_id, points, description, created_at
      FROM points_transactions
      WHERE user_id = 30 OR order_id = 209
      ORDER BY created_at DESC
    `;

    // Check if there are any orders for the email address (regardless of user_id)
    const ordersByEmail = await sql`
      SELECT id, user_id, supabase_user_id, email, total, status, created_at
      FROM orders
      WHERE email = 'logacaw345@rograc.com'
      ORDER BY created_at DESC
    `;

    // Check all users with similar email patterns
    const similarUsers = await sql`
      SELECT id, username, email, supabase_user_id, role, created_at
      FROM users
      WHERE email ILIKE '%logacaw345%' OR email ILIKE '%rograc%'
    `;

    const debugInfo = {
      timestamp: new Date().toISOString(),
      investigation: {
        order209: order209,
        user30: user30,
        userByEmail: userByEmail,
        ordersForUser30: ordersForUser30,
        pointsTransactions: pointsTransactions,
        ordersByEmail: ordersByEmail,
        similarUsers: similarUsers
      },
      analysis: {
        order209Exists: order209.length > 0,
        user30Exists: user30.length > 0,
        userByEmailExists: userByEmail.length > 0,
        ordersForUser30Count: ordersForUser30.length,
        pointsTransactionsCount: pointsTransactions.length,
        ordersByEmailCount: ordersByEmail.length,
        similarUsersCount: similarUsers.length
      }
    };

    console.log('🔍 DEBUG: Investigation complete:', JSON.stringify(debugInfo.analysis, null, 2));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(debugInfo, null, 2)
    };

  } catch (error) {
    console.error('❌ DEBUG: Database investigation failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Database investigation failed',
        details: error.message
      })
    };
  }
};