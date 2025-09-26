// Points System Analysis Script
// Run this to analyze the critical points system failure

import postgres from 'postgres';
import fs from 'fs';

// Database connection
const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

const phone = '8039774285';
const supabaseUserId = 'bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a';

async function runAnalysis() {
  console.log('🔍 PIZZA REWARDS POINTS SYSTEM ANALYSIS');
  console.log('=====================================');
  console.log(`Phone: ${phone}`);
  console.log(`Supabase User ID: ${supabaseUserId}`);
  console.log('');

  try {
    // 1. Orders Analysis
    console.log('1️⃣ ORDERS ANALYSIS (Last 30 Days)');
    console.log('-----------------------------------');

    const orders = await sql`
      SELECT
        id as order_id,
        user_id,
        supabase_user_id,
        status,
        payment_status,
        total,
        created_at,
        FLOOR(total::numeric) as expected_points
      FROM orders
      WHERE phone = ${phone}
        AND created_at >= NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
    `;

    console.log(`Found ${orders.length} orders for phone ${phone}:`);

    let totalSpent = 0;
    let totalExpectedPoints = 0;

    orders.forEach(order => {
      totalSpent += parseFloat(order.total);
      totalExpectedPoints += parseInt(order.expected_points);
      console.log(`  Order #${order.order_id}: $${order.total} (${order.expected_points} pts) - ${order.status}/${order.payment_status} - ${order.created_at.toISOString().split('T')[0]}`);
    });

    console.log(`  📊 SUMMARY: ${orders.length} orders, $${totalSpent.toFixed(2)} spent, ${totalExpectedPoints} points expected`);
    console.log('');

    // 2. Points Transactions Analysis
    console.log('2️⃣ POINTS TRANSACTIONS ANALYSIS');
    console.log('--------------------------------');

    const transactions = await sql`
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

    console.log(`Found ${transactions.length} points transactions:`);

    let totalEarned = 0;
    let totalRedeemed = 0;

    transactions.forEach(tx => {
      if (tx.type === 'earned') {
        totalEarned += tx.points;
      } else if (tx.type === 'redeemed') {
        totalRedeemed += tx.points;
      }
      console.log(`  TX #${tx.id}: ${tx.type} ${tx.points} pts (Order #${tx.order_id || 'N/A'}) - ${tx.description} - ${tx.created_at.toISOString().split('T')[0]}`);
    });

    console.log(`  📊 SUMMARY: ${totalEarned} earned, ${totalRedeemed} redeemed, ${totalEarned - totalRedeemed} net`);
    console.log('');

    // 3. Current Points Balance
    console.log('3️⃣ CURRENT POINTS BALANCE');
    console.log('--------------------------');

    const userPoints = await sql`
      SELECT
        points as current_points,
        total_earned,
        total_redeemed,
        last_earned_at,
        created_at,
        updated_at
      FROM user_points
      WHERE supabase_user_id = ${supabaseUserId}
    `;

    if (userPoints.length > 0) {
      const points = userPoints[0];
      console.log(`  Current Points: ${points.current_points}`);
      console.log(`  Total Earned: ${points.total_earned}`);
      console.log(`  Total Redeemed: ${points.total_redeemed}`);
      console.log(`  Last Earned: ${points.last_earned_at ? points.last_earned_at.toISOString().split('T')[0] : 'Never'}`);
      console.log(`  Account Created: ${points.created_at.toISOString().split('T')[0]}`);
      console.log(`  Last Updated: ${points.updated_at.toISOString().split('T')[0]}`);
    } else {
      console.log('  ❌ NO USER POINTS RECORD FOUND');
    }
    console.log('');

    // 4. Missing Transactions Analysis
    console.log('4️⃣ MISSING TRANSACTIONS ANALYSIS');
    console.log('----------------------------------');

    const missingTransactions = await sql`
      SELECT
        o.id as order_id,
        o.total,
        o.status,
        o.payment_status,
        o.created_at as order_date,
        FLOOR(o.total::numeric) as should_award_points,
        pt.id as transaction_id,
        pt.points as actual_points_awarded
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

    let missingCount = 0;
    let mismatchCount = 0;

    console.log('  Order vs Transaction Status:');
    missingTransactions.forEach(row => {
      const status = row.transaction_id ?
        (row.actual_points_awarded === row.should_award_points ? '✅ OK' : '⚠️ MISMATCH') :
        '❌ MISSING';

      if (!row.transaction_id) missingCount++;
      if (row.transaction_id && row.actual_points_awarded !== row.should_award_points) mismatchCount++;

      console.log(`  Order #${row.order_id}: $${row.total} → ${row.should_award_points} pts | TX: ${row.transaction_id || 'NONE'} | ${status}`);
    });

    console.log(`  📊 SUMMARY: ${missingCount} missing transactions, ${mismatchCount} mismatches`);
    console.log('');

    // 5. Root Cause Analysis
    console.log('5️⃣ ROOT CAUSE ANALYSIS');
    console.log('-----------------------');

    console.log('  📊 EXPECTED vs ACTUAL COMPARISON:');
    console.log(`     Expected Points (from orders): ${totalExpectedPoints}`);
    console.log(`     Actual Points (from user_points): ${userPoints[0]?.current_points || 0}`);
    console.log(`     Points from Transactions: ${totalEarned - totalRedeemed}`);
    console.log(`     Discrepancy: ${totalExpectedPoints - (userPoints[0]?.current_points || 0)} points`);
    console.log('');

    console.log('  🔍 IDENTIFIED ISSUES:');
    if (missingCount > 0) {
      console.log(`     ❌ ${missingCount} orders have NO points transactions`);
    }
    if (mismatchCount > 0) {
      console.log(`     ⚠️ ${mismatchCount} orders have INCORRECT points amounts`);
    }
    if (userPoints.length === 0) {
      console.log(`     ❌ No user_points record exists for this user`);
    }
    if (totalExpectedPoints !== (totalEarned - totalRedeemed)) {
      console.log(`     ❌ Transaction totals don't match expected points`);
    }

    console.log('');
    console.log('6️⃣ RECOMMENDED FIXES');
    console.log('--------------------');

    if (missingCount > 0) {
      console.log('  1. Create missing points transactions for orders without them');
      console.log('  2. Update user_points table with correct totals');
    }

    if (userPoints.length === 0) {
      console.log('  3. Create user_points record for this user');
    }

    console.log('  4. Implement better error handling in orders API points awarding');
    console.log('  5. Add database constraints to prevent missing transactions');

  } catch (error) {
    console.error('Analysis error:', error);
  } finally {
    await sql.end();
  }
}

// Run the analysis
runAnalysis().catch(console.error);