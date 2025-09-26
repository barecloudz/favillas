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
    const supabaseUserId = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a';

    console.log('🧪 Testing points awarding system for user:', supabaseUserId);

    // Simulate the order creation and points awarding logic from the fixed code
    const testOrderAmount = 25.50;
    const pointsToAward = Math.floor(testOrderAmount);

    const result = await sql.begin(async (sql) => {
      console.log('🔒 Starting atomic transaction for test points award');

      // Test: Ensure user exists in users table
      const userExists = await sql`SELECT id FROM users WHERE supabase_user_id = ${supabaseUserId}`;
      console.log('👤 Supabase user exists check:', userExists.length > 0);

      if (userExists.length === 0) {
        console.log('📝 Creating test user record...');
        await sql`
          INSERT INTO users (
            supabase_user_id, username, email, role, phone, address, city, state, zip_code,
            first_name, last_name, password, created_at, updated_at
          ) VALUES (
            ${supabaseUserId},
            'test_customer',
            'test@example.com',
            'customer',
            '', '', '', '', '',
            'Test', 'Customer',
            'SUPABASE_USER',
            NOW(), NOW()
          )
          ON CONFLICT (supabase_user_id) DO UPDATE SET
            email = EXCLUDED.email,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            updated_at = NOW()
        `;
        console.log('✅ Test user record created/updated');
      }

      // Test: Create a dummy points transaction (without actual order)
      const testTransactionId = `TEST_${Date.now()}`;
      const pointsTransaction = await sql`
        INSERT INTO points_transactions (
          user_id, supabase_user_id, order_id, type, points, description, order_amount, created_at
        ) VALUES (
          NULL, ${supabaseUserId}, NULL, 'earned', ${pointsToAward},
          'TEST TRANSACTION - ' + ${testTransactionId}, ${testOrderAmount}, NOW()
        )
        RETURNING id
      `;
      console.log('✅ Test points transaction created:', pointsTransaction[0]?.id);

      // Test: Update user points with UPSERT
      const userPointsUpdate = await sql`
        INSERT INTO user_points (
          user_id, supabase_user_id, points, total_earned, total_redeemed,
          last_earned_at, created_at, updated_at
        ) VALUES (
          NULL, ${supabaseUserId}, ${pointsToAward}, ${pointsToAward}, 0,
          NOW(), NOW(), NOW()
        )
        ON CONFLICT (supabase_user_id) DO UPDATE SET
          points = COALESCE(user_points.points, 0) + ${pointsToAward},
          total_earned = COALESCE(user_points.total_earned, 0) + ${pointsToAward},
          last_earned_at = NOW(),
          updated_at = NOW()
        RETURNING supabase_user_id, points, total_earned
      `;
      console.log('✅ Test user points updated:', userPointsUpdate[0]);

      return {
        success: true,
        testTransactionId: pointsTransaction[0]?.id,
        pointsAwarded: pointsToAward,
        newBalance: userPointsUpdate[0]?.points || 0,
        totalEarned: userPointsUpdate[0]?.total_earned || 0
      };
    });

    // Get final user points status to verify
    const finalUserPoints = await sql`
      SELECT * FROM user_points WHERE supabase_user_id = ${supabaseUserId}
    `;

    // Get recent transactions to verify
    const recentTransactions = await sql`
      SELECT id, type, points, description, created_at
      FROM points_transactions
      WHERE supabase_user_id = ${supabaseUserId}
      ORDER BY created_at DESC
      LIMIT 5
    `;

    console.log('🎉 Test completed successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Points awarding test completed successfully',
        timestamp: new Date().toISOString(),
        testResult: result,
        verification: {
          userPointsRecord: finalUserPoints[0] || null,
          recentTransactions: recentTransactions
        },
        success: true
      }, null, 2)
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Points awarding test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        constraint: error.constraint || null,
        table: error.table || null,
        column: error.column || null,
        success: false
      })
    };
  }
};