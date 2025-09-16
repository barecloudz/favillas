#!/usr/bin/env node

// Script to analyze order 70 timing vs deployment
import postgres from 'postgres';

console.log('🔍 Analyzing Order 70 Timing vs Deployment');

async function analyzeOrder70() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
  });

  try {
    // Get order 70 details
    console.log('📋 Fetching order 70 details...');
    const order70 = await sql`SELECT * FROM orders WHERE id = 70`;

    if (order70.length === 0) {
      console.log('❌ Order 70 not found');
      return;
    }

    const order = order70[0];
    console.log('📋 Order 70 Details:');
    console.log('   - ID:', order.id);
    console.log('   - Created:', order.created_at);
    console.log('   - Total:', order.total);
    console.log('   - Tax:', order.tax);
    console.log('   - Tip:', order.tip);
    console.log('   - Status:', order.status);
    console.log('   - Payment Status:', order.payment_status);
    console.log('   - User ID:', order.user_id);

    // Get order items
    const items = await sql`
      SELECT oi.*, mi.name as menu_item_name
      FROM order_items oi
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = 70
    `;

    console.log('🍕 Order Items:');
    items.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.menu_item_name || 'Unknown'} x${item.quantity} - $${item.price}`);
    });

    // Calculate points that should have been awarded
    const totalSpent = parseFloat(order.total || 0);
    const expectedPoints = Math.floor(totalSpent);
    console.log('🎁 Expected Points:', expectedPoints);

    // Check if points were awarded
    const pointsRecords = await sql`
      SELECT * FROM points_transactions WHERE order_id = 70
    `;

    console.log('📊 Points Transactions:');
    if (pointsRecords.length === 0) {
      console.log('   ❌ No points transactions found for order 70');
    } else {
      pointsRecords.forEach(record => {
        console.log(`   - Type: ${record.type}, Points: ${record.points}, Created: ${record.created_at}`);
      });
    }

    // Check user points balance if user exists
    if (order.user_id) {
      const userPoints = await sql`
        SELECT * FROM user_points WHERE user_id = ${order.user_id}
      `;

      if (userPoints.length > 0) {
        console.log('👤 User Points Balance:');
        const points = userPoints[0];
        console.log(`   - Current Points: ${points.points}`);
        console.log(`   - Total Earned: ${points.total_earned}`);
        console.log(`   - Last Earned: ${points.last_earned_at}`);
      } else {
        console.log('❌ No user points record found');
      }
    } else {
      console.log('👤 Guest order - no user points tracking');
    }

    // Deployment timing analysis
    console.log('\n⏰ Deployment Timing Analysis:');

    // Known deployment times from git log
    const deploymentTimes = [
      { commit: '05cc868', time: '2025-09-16 18:56:48 -0400', description: 'Fix order total and points calculation issues' },
      { commit: '0c9b1e9', time: '2025-09-16 09:07:16 -0400', description: 'Fix critical orders API response format' },
      { commit: '227c5c6', time: '2025-09-16 09:06:32 -0400', description: 'Fix order success page charAt() error' }
    ];

    const orderTime = new Date(order.created_at);
    console.log('📅 Order 70 placed at:', orderTime.toISOString());

    deploymentTimes.forEach(deploy => {
      const deployTime = new Date(deploy.time);
      const timeDiff = orderTime - deployTime;
      const minutesDiff = Math.round(timeDiff / (1000 * 60));

      console.log(`   ${deploy.commit}: ${deploy.time}`);
      console.log(`     -> ${minutesDiff > 0 ? `${minutesDiff} minutes AFTER` : `${Math.abs(minutesDiff)} minutes BEFORE`} order 70`);
      console.log(`     -> ${deploy.description}`);
    });

    // Check recent orders around the same time
    console.log('\n📋 Recent Orders Around Order 70:');
    const recentOrders = await sql`
      SELECT id, created_at, total, tax, tip, status, payment_status, user_id
      FROM orders
      WHERE id BETWEEN 65 AND 75
      ORDER BY id
    `;

    recentOrders.forEach(o => {
      const isOrder70 = o.id === 70;
      console.log(`   ${isOrder70 ? '>>> ' : '    '}Order ${o.id}: ${o.created_at} - Total: $${o.total}, Status: ${o.status}${isOrder70 ? ' <<<' : ''}`);
    });

  } catch (error) {
    console.error('❌ Error analyzing order 70:', error);
  } finally {
    await sql.end();
  }
}

analyzeOrder70().catch(console.error);