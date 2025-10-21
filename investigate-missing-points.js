import postgres from 'postgres';
import 'dotenv/config';

const sql = postgres(process.env.DATABASE_URL);

async function investigateMissingPoints() {
  try {
    console.log('🔍 INVESTIGATING MISSING POINTS FOR USER 25\n');
    console.log('Expected: 5849 points');
    console.log('Current: 613 points');
    console.log('Missing: 5236 points\n');
    console.log('='.repeat(60));

    // Get ALL transactions for user 25
    console.log('\n📊 ALL POINTS TRANSACTIONS FOR USER 25:\n');
    const allTransactions = await sql`
      SELECT * FROM points_transactions
      WHERE user_id = 25
      ORDER BY created_at ASC
    `;

    console.log(`Total transactions found: ${allTransactions.length}\n`);

    let runningTotal = 0;
    allTransactions.forEach((tx, i) => {
      if (tx.type === 'earned') {
        runningTotal += parseInt(tx.points);
        console.log(`${i + 1}. ${tx.created_at.toISOString().split('T')[0]} - EARNED ${tx.points} points (Order #${tx.order_id}) - Running total: ${runningTotal}`);
      } else if (tx.type === 'redeemed') {
        runningTotal -= Math.abs(parseInt(tx.points));
        console.log(`${i + 1}. ${tx.created_at.toISOString().split('T')[0]} - REDEEMED ${Math.abs(tx.points)} points - Running total: ${runningTotal}`);
      }
    });

    console.log('\n' + '='.repeat(60));
    console.log(`FINAL BALANCE FROM TRANSACTIONS: ${runningTotal} points\n`);

    // Check if there are orders WITHOUT points transactions
    console.log('='.repeat(60));
    console.log('\n🔍 CHECKING FOR ORDERS WITHOUT POINTS TRANSACTIONS:\n');

    const ordersWithoutPoints = await sql`
      SELECT o.id, o.total, o.created_at, o.payment_status
      FROM orders o
      WHERE o.user_id = 25
      AND o.payment_status = 'succeeded'
      AND NOT EXISTS (
        SELECT 1 FROM points_transactions pt
        WHERE pt.order_id = o.id AND pt.user_id = 25
      )
      ORDER BY o.created_at ASC
    `;

    if (ordersWithoutPoints.length > 0) {
      console.log(`⚠️ Found ${ordersWithoutPoints.length} orders WITHOUT points transactions:\n`);
      let missingPoints = 0;
      ordersWithoutPoints.forEach(order => {
        const points = Math.floor(parseFloat(order.total));
        missingPoints += points;
        console.log(`  Order #${order.id}: $${order.total} = ${points} points (${order.created_at.toISOString().split('T')[0]})`);
      });
      console.log(`\n  Total missing points from these orders: ${missingPoints}`);
    } else {
      console.log('✅ All orders have points transactions\n');
    }

    // Check old user_points snapshot from before the fix
    console.log('='.repeat(60));
    console.log('\n📸 CHECKING BACKUP/HISTORY:\n');
    console.log('Looking at what the old balance was...');
    console.log('Old balance: 5849 points (5999 earned - 150 redeemed)');
    console.log('Current calculated: 613 points (833 earned - 220 redeemed)\n');
    console.log('Difference in earned: 5999 - 833 = 5166 points missing');
    console.log('Difference in redeemed: 220 - 150 = 70 points extra redemptions\n');

    // Check if there's a data corruption issue
    console.log('='.repeat(60));
    console.log('\n🔍 POSSIBLE CAUSES:\n');
    console.log('1. ❓ Were there test orders that got deleted from orders table but transactions remain?');
    console.log('2. ❓ Was the points_transactions table truncated/reset at some point?');
    console.log('3. ❓ Were there bulk points awards that are not in points_transactions?');
    console.log('4. ❓ Was there a different user_id mapping before consolidation?\n');

    // Check for any orphaned transactions
    const orphanedTransactions = await sql`
      SELECT pt.*, o.id as order_exists
      FROM points_transactions pt
      LEFT JOIN orders o ON pt.order_id = o.id
      WHERE pt.user_id = 25 AND pt.type = 'earned'
    `;

    const orphaned = orphanedTransactions.filter(tx => !tx.order_exists);
    if (orphaned.length > 0) {
      console.log('='.repeat(60));
      console.log('\n⚠️ FOUND ORPHANED TRANSACTIONS (orders deleted):\n');
      orphaned.forEach(tx => {
        console.log(`  Transaction #${tx.id}: ${tx.points} points for Order #${tx.order_id} (order not found)`);
      });
    }

    await sql.end();
    console.log('\n✅ Investigation complete');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    await sql.end();
    process.exit(1);
  }
}

investigateMissingPoints();
