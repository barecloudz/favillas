import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, isStaff } from './_shared/auth';

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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

  console.log('🔧 FIX DUPLICATE POINTS RECORDS API CALLED');

  // Authenticate - admin only
  const authPayload = await authenticateToken(event);
  if (!authPayload || !isStaff(authPayload)) {
    console.log('❌ Authorization failed - admin access required');
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Admin access required' })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const sql = getDB();
    const requestData = JSON.parse(event.body || '{}');
    const { supabaseUserId, dryRun = true } = requestData;

    if (!supabaseUserId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'supabaseUserId is required' })
      };
    }

    console.log('🔧 Fixing duplicate points for user:', supabaseUserId, 'Dry run:', dryRun);

    // Find all duplicate records
    const duplicateRecords = await sql`
      SELECT * FROM user_points
      WHERE supabase_user_id = ${supabaseUserId}
      ORDER BY created_at ASC, id ASC
    `;

    console.log('📋 Found', duplicateRecords.length, 'records');

    if (duplicateRecords.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'No points records found for this user' })
      };
    }

    if (duplicateRecords.length === 1) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'No duplicates found - only one record exists',
          record: duplicateRecords[0]
        })
      };
    }

    // Get user info
    const users = await sql`
      SELECT id, email, first_name, last_name
      FROM users
      WHERE supabase_user_id = ${supabaseUserId}
    `;

    const user = users[0];
    console.log('👤 User:', user);

    // Find all orders for this user (both with user_id and supabase_user_id)
    const allOrders = await sql`
      SELECT id, total, status, payment_status, created_at
      FROM orders
      WHERE supabase_user_id = ${supabaseUserId}
        OR (${user?.id ? sql`user_id = ${user.id}` : sql`false`})
      ORDER BY created_at ASC
    `;

    console.log('📦 Found', allOrders.length, 'orders');

    // Filter paid orders
    const paidOrders = allOrders.filter(order =>
      ['completed', 'succeeded', 'paid'].includes(order.payment_status || '')
    );

    console.log('💰 Found', paidOrders.length, 'paid orders');

    // Get all existing transactions
    const existingTransactions = await sql`
      SELECT * FROM points_transactions
      WHERE supabase_user_id = ${supabaseUserId}
        OR (${user?.id ? sql`user_id = ${user.id}` : sql`false`})
      ORDER BY created_at ASC
    `;

    console.log('📋 Found', existingTransactions.length, 'existing transactions');

    // Calculate points from existing transactions
    const earnedTransactions = existingTransactions.filter(t =>
      ['earned', 'signup', 'first_order'].includes(t.type)
    );
    const redeemedTransactions = existingTransactions.filter(t => t.type === 'redeemed');

    const totalEarnedFromTransactions = earnedTransactions.reduce((sum, t) => sum + (t.points || 0), 0);
    const totalRedeemedFromTransactions = redeemedTransactions.reduce((sum, t) => sum + (t.points || 0), 0);

    // Find orders without transactions
    const ordersWithoutTransactions = paidOrders.filter(order =>
      !existingTransactions.some(tx => tx.order_id === order.id)
    );

    console.log('⚠️ Found', ordersWithoutTransactions.length, 'paid orders without transactions');

    // Calculate missing points
    const missingPoints = ordersWithoutTransactions.reduce((sum, order) =>
      sum + Math.floor(parseFloat(order.total)), 0
    );

    const correctTotalEarned = totalEarnedFromTransactions + missingPoints;
    const correctTotalRedeemed = totalRedeemedFromTransactions;
    const correctPoints = correctTotalEarned - correctTotalRedeemed;

    const summary = {
      user: user ? {
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      } : null,
      duplicateRecords: {
        count: duplicateRecords.length,
        recordsToDelete: duplicateRecords.length - 1,
        recordToKeep: duplicateRecords[0].id
      },
      orders: {
        total: allOrders.length,
        paid: paidOrders.length,
        withoutTransactions: ordersWithoutTransactions.length
      },
      transactions: {
        existing: existingTransactions.length,
        earned: earnedTransactions.length,
        redeemed: redeemedTransactions.length
      },
      calculations: {
        existingTotalEarned: totalEarnedFromTransactions,
        existingTotalRedeemed: totalRedeemedFromTransactions,
        missingPoints,
        correctTotalEarned,
        correctTotalRedeemed,
        correctPoints
      },
      ordersNeedingTransactions: ordersWithoutTransactions.map(o => ({
        orderId: o.id,
        total: o.total,
        points: Math.floor(parseFloat(o.total)),
        createdAt: o.created_at
      }))
    };

    // If not dry run, apply the fix
    if (!dryRun) {
      console.log('🔧 Applying fix in atomic transaction...');

      await sql.begin(async (sql) => {
        // Step 1: Delete duplicate records (keep the first one)
        const recordsToDelete = duplicateRecords.slice(1).map(r => r.id);

        if (recordsToDelete.length > 0) {
          console.log('🗑️ Deleting', recordsToDelete.length, 'duplicate records:', recordsToDelete);

          await sql`
            DELETE FROM user_points
            WHERE id = ANY(${recordsToDelete})
          `;
        }

        // Step 2: Award missing points for orders without transactions
        for (const order of ordersWithoutTransactions) {
          const pointsToAward = Math.floor(parseFloat(order.total));

          console.log('➕ Awarding', pointsToAward, 'points for order', order.id);

          await sql`
            INSERT INTO points_transactions (
              user_id,
              supabase_user_id,
              order_id,
              type,
              points,
              description,
              order_amount,
              created_at
            ) VALUES (
              ${user?.id || null},
              ${supabaseUserId},
              ${order.id},
              'earned',
              ${pointsToAward},
              ${'RETROACTIVE FIX: Points earned for order #' + order.id},
              ${order.total},
              ${order.created_at}
            )
          `;
        }

        // Step 3: Update the remaining user_points record with correct totals
        console.log('📊 Updating user_points record:', {
          id: duplicateRecords[0].id,
          newPoints: correctPoints,
          newTotalEarned: correctTotalEarned,
          newTotalRedeemed: correctTotalRedeemed
        });

        await sql`
          UPDATE user_points
          SET
            points = ${correctPoints},
            total_earned = ${correctTotalEarned},
            total_redeemed = ${correctTotalRedeemed},
            updated_at = NOW()
          WHERE id = ${duplicateRecords[0].id}
        `;

        // Step 4: Ensure unique constraint exists
        console.log('🔒 Ensuring unique constraint on supabase_user_id...');

        // First drop any existing index
        await sql`
          DROP INDEX IF EXISTS idx_user_points_supabase_user_id
        `;

        // Create unique index
        await sql`
          CREATE UNIQUE INDEX idx_user_points_supabase_user_id
          ON user_points(supabase_user_id)
          WHERE supabase_user_id IS NOT NULL
        `;

        console.log('✅ Fix applied successfully');
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Duplicate points records fixed successfully!',
          summary,
          applied: true
        }, null, 2)
      };
    }

    // Dry run - just return the summary
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Dry run - no changes made',
        summary,
        applied: false,
        note: 'Set dryRun: false to apply the fix'
      }, null, 2)
    };

  } catch (error: any) {
    console.error('❌ Fix duplicate records error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message,
        stack: error.stack
      })
    };
  }
};
