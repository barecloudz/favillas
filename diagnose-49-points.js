// Diagnose the missing 49 points issue
import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);

async function diagnose49Points() {
  console.log('🔍 Diagnosing the missing 49 points issue...\n');

  try {
    // Look for recent orders around $49
    console.log('1. Looking for recent orders around $49...');
    const recentOrders = await sql`
      SELECT
        id, user_id, supabase_user_id, phone, total, tax, delivery_fee, tip,
        status, payment_status, created_at
      FROM orders
      WHERE created_at > NOW() - INTERVAL '24 hours'
        AND total BETWEEN 45 AND 55
      ORDER BY created_at DESC
      LIMIT 10
    `;

    console.log(`Found ${recentOrders.length} recent orders around $49:`);
    recentOrders.forEach(order => {
      const userInfo = order.user_id ? `user_id=${order.user_id}` : `supabase_id=${order.supabase_user_id?.substring(0, 8)}...`;
      console.log(`   Order ${order.id}: $${order.total} | ${userInfo} | Phone: ${order.phone} | Status: ${order.status}`);
    });

    // Look for 49-point transactions
    console.log('\n2. Looking for 49-point transactions...');
    const pointTransactions = await sql`
      SELECT
        id, user_id, supabase_user_id, order_id, type, points, description, created_at
      FROM points_transactions
      WHERE points = 49
        AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
    `;

    console.log(`Found ${pointTransactions.length} recent 49-point transactions:`);
    pointTransactions.forEach(tx => {
      const userInfo = tx.user_id ? `user_id=${tx.user_id}` : `supabase_id=${tx.supabase_user_id?.substring(0, 8)}...`;
      console.log(`   Transaction ${tx.id}: ${tx.points} pts | ${userInfo} | Order: ${tx.order_id} | ${tx.description}`);
    });

    // Check user_points for the Supabase user from recent orders
    console.log('\n3. Checking user_points for Supabase users from recent orders...');
    const supabaseUserIds = [...new Set(recentOrders.filter(o => o.supabase_user_id).map(o => o.supabase_user_id))];

    for (const supabaseUserId of supabaseUserIds) {
      console.log(`\n   Checking user: ${supabaseUserId.substring(0, 8)}...`);

      // Check user_points
      const userPoints = await sql`
        SELECT * FROM user_points WHERE supabase_user_id = ${supabaseUserId}
      `;

      if (userPoints.length > 0) {
        console.log(`     ✅ user_points: ${userPoints[0].points} current, ${userPoints[0].total_earned} total earned`);
      } else {
        console.log(`     ❌ No user_points record found`);
      }

      // Check transactions for this user
      const userTransactions = await sql`
        SELECT * FROM points_transactions
        WHERE supabase_user_id = ${supabaseUserId}
        ORDER BY created_at DESC
        LIMIT 5
      `;

      console.log(`     📊 ${userTransactions.length} transactions found:`);
      userTransactions.forEach(tx => {
        console.log(`       ${tx.type}: ${tx.points} pts - ${tx.description} (${tx.created_at})`);
      });

      // Calculate expected points from transactions
      const totalFromTransactions = userTransactions.reduce((sum, tx) => {
        return sum + (tx.type === 'earned' ? tx.points : -Math.abs(tx.points));
      }, 0);

      const actualPoints = userPoints.length > 0 ? userPoints[0].points : 0;

      console.log(`     🧮 Calculated from transactions: ${totalFromTransactions}, Actual in user_points: ${actualPoints}`);

      if (totalFromTransactions !== actualPoints) {
        console.log(`     🚨 MISMATCH: Need to sync ${totalFromTransactions - actualPoints} points`);

        if (userPoints.length === 0) {
          console.log(`     💡 FIX: Create user_points record with ${totalFromTransactions} points`);
        } else {
          console.log(`     💡 FIX: Update user_points to ${totalFromTransactions} points`);
        }
      }
    }

    // Summary
    console.log('\n4. Summary and Recommendations:');
    if (pointTransactions.length > 0 && supabaseUserIds.length > 0) {
      console.log('   ✅ Found points transactions for Supabase users');
      console.log('   🎯 The issue is likely that user_points records are missing or out of sync');
      console.log('   💡 Running the user-rewards API should now create/sync the missing records');
    } else {
      console.log('   ⚠️ No recent 49-point transactions found');
      console.log('   💡 The user may need to place another order to trigger points awarding');
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  } finally {
    await sql.end();
  }
}

diagnose49Points().catch(console.error);