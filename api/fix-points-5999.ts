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

  console.log('🔧 FIX POINTS API CALLED');

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
    const { userEmail, dryRun = true } = requestData;

    if (!userEmail) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'userEmail is required' })
      };
    }

    console.log('🔧 Fixing points for user:', userEmail, 'Dry run:', dryRun);

    // Find the user
    const users = await sql`
      SELECT id, supabase_user_id, email, first_name, last_name
      FROM users
      WHERE email = ${userEmail}
    `;

    if (users.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User not found' })
      };
    }

    const user = users[0];
    console.log('👤 Found user:', user);

    // Get current points record
    const pointsRecords = await sql`
      SELECT * FROM user_points
      WHERE user_id = ${user.id} OR supabase_user_id = ${user.supabase_user_id}
    `;

    if (pointsRecords.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'User points record not found' })
      };
    }

    const currentPoints = pointsRecords[0];
    console.log('📊 Current points record:', currentPoints);

    // Get all transactions for this user
    const transactions = await sql`
      SELECT * FROM points_transactions
      WHERE user_id = ${user.id} OR supabase_user_id = ${user.supabase_user_id}
      ORDER BY created_at ASC
    `;

    console.log('📋 Found', transactions.length, 'transactions');

    // Calculate correct points from transactions
    const earnedTransactions = transactions.filter(t =>
      t.type === 'earned' || t.type === 'signup' || t.type === 'first_order'
    );
    const redeemedTransactions = transactions.filter(t => t.type === 'redeemed');

    const correctTotalEarned = earnedTransactions.reduce((sum, t) => sum + (t.points || 0), 0);
    const correctTotalRedeemed = redeemedTransactions.reduce((sum, t) => sum + (t.points || 0), 0);
    const correctPoints = correctTotalEarned - correctTotalRedeemed;

    console.log('🧮 Calculated correct values:', {
      correctTotalEarned,
      correctTotalRedeemed,
      correctPoints
    });

    // Find orders without points transactions
    const allOrders = await sql`
      SELECT id, total, status, payment_status, created_at
      FROM orders
      WHERE (user_id = ${user.id} OR supabase_user_id = ${user.supabase_user_id})
      AND payment_status IN ('completed', 'succeeded', 'paid')
      ORDER BY created_at ASC
    `;

    const ordersWithoutPoints = [];
    let missingPoints = 0;

    for (const order of allOrders) {
      const hasTransaction = transactions.some(t => t.order_id === order.id);
      if (!hasTransaction) {
        const expectedPoints = Math.floor(parseFloat(order.total));
        ordersWithoutPoints.push({
          orderId: order.id,
          total: order.total,
          expectedPoints,
          createdAt: order.created_at
        });
        missingPoints += expectedPoints;
      }
    }

    console.log('📦 Orders without points:', ordersWithoutPoints.length, 'Missing points:', missingPoints);

    const summary = {
      user: {
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      },
      current: {
        points: currentPoints.points,
        totalEarned: currentPoints.total_earned,
        totalRedeemed: currentPoints.total_redeemed
      },
      calculated: {
        points: correctPoints,
        totalEarned: correctTotalEarned,
        totalRedeemed: correctTotalRedeemed
      },
      missingOrders: {
        count: ordersWithoutPoints.length,
        missingPoints,
        orders: ordersWithoutPoints
      },
      needsUpdate: {
        pointsNeedUpdate: currentPoints.points !== correctPoints + missingPoints,
        earnedNeedUpdate: currentPoints.total_earned !== correctTotalEarned + missingPoints,
        redeemedNeedUpdate: currentPoints.total_redeemed !== correctTotalRedeemed
      },
      suggestedFix: {
        newPoints: correctPoints + missingPoints,
        newTotalEarned: correctTotalEarned + missingPoints,
        newTotalRedeemed: correctTotalRedeemed
      }
    };

    // If not dry run, apply the fix
    if (!dryRun) {
      console.log('🔧 Applying fix...');

      await sql.begin(async (sql) => {
        // Award missing points for orders
        for (const missingOrder of ordersWithoutPoints) {
          console.log('➕ Awarding', missingOrder.expectedPoints, 'points for order', missingOrder.orderId);

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
              ${user.id},
              ${user.supabase_user_id},
              ${missingOrder.orderId},
              'earned',
              ${missingOrder.expectedPoints},
              ${'RETROACTIVE FIX: Points earned for order #' + missingOrder.orderId},
              ${missingOrder.total},
              ${missingOrder.createdAt}
            )
          `;
        }

        // Update user_points record with correct totals
        const newPoints = correctPoints + missingPoints;
        const newTotalEarned = correctTotalEarned + missingPoints;

        console.log('📊 Updating user_points record:', {
          newPoints,
          newTotalEarned,
          newTotalRedeemed: correctTotalRedeemed
        });

        if (user.supabase_user_id) {
          await sql`
            UPDATE user_points
            SET
              points = ${newPoints},
              total_earned = ${newTotalEarned},
              total_redeemed = ${correctTotalRedeemed},
              updated_at = NOW()
            WHERE supabase_user_id = ${user.supabase_user_id}
          `;
        } else {
          await sql`
            UPDATE user_points
            SET
              points = ${newPoints},
              total_earned = ${newTotalEarned},
              total_redeemed = ${correctTotalRedeemed},
              updated_at = NOW()
            WHERE user_id = ${user.id}
          `;
        }

        console.log('✅ Fix applied successfully');
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Points fixed successfully',
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
    console.error('❌ Fix points error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};
