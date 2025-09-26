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
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
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

    // UPDATED: Transfer points to correct user ID
    const userPhone = '8039774285';
    const oldSupabaseUserId = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a'; // Old incorrect ID
    const correctSupabaseUserId = 'fc644776-1ca0-46ad-ae6c-8f753478374b'; // Correct current ID

    console.log('🔄 TRANSFERRING POINTS from', oldSupabaseUserId, 'to', correctSupabaseUserId);

    console.log('🎁 EMERGENCY POINTS FIX: Starting massive points award for user:', correctSupabaseUserId);

    // Get all orders that need points
    const ordersNeedingPoints = [
      { id: 169, total: 24.89, pointsToAward: 24 },
      { id: 168, total: 29.76, pointsToAward: 29 },
      { id: 167, total: 33.01, pointsToAward: 33 },
      { id: 166, total: 29.76, pointsToAward: 29 },
      { id: 165, total: 17.85, pointsToAward: 17 },
      { id: 164, total: 17.85, pointsToAward: 17 },
      { id: 163, total: 22.18, pointsToAward: 22 },
      { id: 162, total: 24.35, pointsToAward: 24 },
      { id: 161, total: 22.18, pointsToAward: 22 },
      { id: 160, total: 55.73, pointsToAward: 55 },
      { id: 159, total: 24.35, pointsToAward: 24 },
      { id: 158, total: 24.35, pointsToAward: 24 },
      { id: 157, total: 24.35, pointsToAward: 24 },
      { id: 156, total: 24.35, pointsToAward: 24 },
      { id: 155, total: 24.35, pointsToAward: 24 },
      { id: 154, total: 24.35, pointsToAward: 24 },
      { id: 153, total: 24.35, pointsToAward: 24 },
      { id: 152, total: 24.89, pointsToAward: 24 },
      { id: 151, total: 17.85, pointsToAward: 17 },
      { id: 150, total: 22.18, pointsToAward: 22 },
      { id: 149, total: 31.88, pointsToAward: 31 },
      { id: 148, total: 51.35, pointsToAward: 51 },
      { id: 147, total: 51.35, pointsToAward: 51 },
      { id: 146, total: 51.35, pointsToAward: 51 },
      { id: 145, total: 24.84, pointsToAward: 24 },
      { id: 144, total: 17.85, pointsToAward: 17 },
      { id: 143, total: 17.85, pointsToAward: 17 },
      { id: 142, total: 17.85, pointsToAward: 17 },
      { id: 141, total: 135.2, pointsToAward: 135 },
      { id: 140, total: 35.65, pointsToAward: 35 },
      { id: 139, total: 60.54, pointsToAward: 60 },
      { id: 138, total: 49.73, pointsToAward: 49 },
      { id: 137, total: 49.73, pointsToAward: 49 }
    ];

    const totalPointsToAward = ordersNeedingPoints.reduce((sum, order) => sum + order.pointsToAward, 0);

    console.log('🎁 EMERGENCY POINTS FIX: Awarding', totalPointsToAward, 'points across', ordersNeedingPoints.length, 'orders');

    // Award all points in one massive atomic transaction
    const result = await sql.begin(async (sql) => {
      let transactionCount = 0;

      // Create points transactions for each order
      for (const order of ordersNeedingPoints) {
        // Check if points transaction already exists for either user ID
        const existingTransaction = await sql`
          SELECT id FROM points_transactions
          WHERE order_id = ${order.id} AND (supabase_user_id = ${correctSupabaseUserId} OR supabase_user_id = ${oldSupabaseUserId})
        `;

        if (existingTransaction.length === 0) {
          await sql`
            INSERT INTO points_transactions (supabase_user_id, order_id, type, points, description, order_amount, created_at)
            VALUES (${correctSupabaseUserId}, ${order.id}, 'earned', ${order.pointsToAward}, ${'Order #' + order.id + ' (TRANSFERRED TO CORRECT USER)'}, ${order.total}, NOW())
          `;
          transactionCount++;
        } else {
          // Update existing transaction to correct user ID
          await sql`
            UPDATE points_transactions
            SET supabase_user_id = ${correctSupabaseUserId},
                description = description || ' (TRANSFERRED TO CORRECT USER)'
            WHERE order_id = ${order.id} AND supabase_user_id = ${oldSupabaseUserId}
          `;
        }
      }

      // Transfer points balance to correct user
      // First get old points record
      const oldPoints = await sql`
        SELECT points, total_earned, total_redeemed FROM user_points WHERE supabase_user_id = ${oldSupabaseUserId}
      `;

      // Check if correct user already has points record
      const existingCorrectPoints = await sql`
        SELECT points, total_earned FROM user_points WHERE supabase_user_id = ${correctSupabaseUserId}
      `;

      let finalBalance;

      if (oldPoints.length > 0) {
        if (existingCorrectPoints.length > 0) {
          // Merge old points into existing correct user record
          finalBalance = await sql`
            UPDATE user_points
            SET points = points + ${oldPoints[0].points},
                total_earned = total_earned + ${oldPoints[0].total_earned},
                total_redeemed = total_redeemed + ${oldPoints[0].total_redeemed},
                last_earned_at = NOW(),
                updated_at = NOW()
            WHERE supabase_user_id = ${correctSupabaseUserId}
            RETURNING points, total_earned
          `;
        } else {
          // Transfer old points record to correct user
          finalBalance = await sql`
            UPDATE user_points
            SET supabase_user_id = ${correctSupabaseUserId},
                updated_at = NOW()
            WHERE supabase_user_id = ${oldSupabaseUserId}
            RETURNING points, total_earned
          `;
        }
      } else {
        // No old points found, create new record for correct user
        finalBalance = await sql`
          INSERT INTO user_points (supabase_user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
          VALUES (${correctSupabaseUserId}, ${totalPointsToAward}, ${totalPointsToAward}, 0, NOW(), NOW(), NOW())
          RETURNING points, total_earned
        `;
      }

      return {
        transactionsCreated: transactionCount,
        pointsAwarded: totalPointsToAward,
        newBalance: finalBalance[0]
      };
    });

    console.log('🎉 EMERGENCY POINTS FIX COMPLETE!');
    console.log('Points awarded:', result.pointsAwarded);
    console.log('New balance:', result.newBalance.points);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'EMERGENCY POINTS FIX COMPLETE! All missing points have been awarded.',
        ordersFixed: ordersNeedingPoints.length,
        transactionsCreated: result.transactionsCreated,
        totalPointsAwarded: result.pointsAwarded,
        newPointsBalance: result.newBalance.points,
        totalEarned: result.newBalance.total_earned,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ EMERGENCY POINTS FIX FAILED:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Emergency points fix failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};