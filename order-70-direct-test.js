import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = envContent.split('\n').reduce((acc, line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      acc[key.trim()] = value.trim();
    }
    return acc;
  }, {});
  Object.assign(process.env, envVars);
}

async function investigateOrder70() {
  console.log('🔍 ORDER 70 INVESTIGATION REPORT');
  console.log('================================');
  console.log('Report generated:', new Date().toISOString());
  console.log('');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment');
    return;
  }

  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });

  try {
    console.log('1. CHECKING ORDER 70 IN DATABASE');
    console.log('-'.repeat(40));

    // Get order 70 data
    const orders = await sql`SELECT * FROM orders WHERE id = 70`;

    if (orders.length === 0) {
      console.log('❌ Order 70 not found in database');
      return;
    }

    const order = orders[0];
    console.log('✅ Order 70 found:');
    console.log(`   ID: ${order.id}`);
    console.log(`   User ID: ${order.user_id}`);
    console.log(`   Total: "${order.total}" (type: ${typeof order.total})`);
    console.log(`   Tax: "${order.tax}" (type: ${typeof order.tax})`);
    console.log(`   Delivery Fee: "${order.delivery_fee}" (type: ${typeof order.delivery_fee})`);
    console.log(`   Tip: "${order.tip}" (type: ${typeof order.tip})`);
    console.log(`   Status: ${order.status}`);
    console.log(`   Payment Status: ${order.payment_status}`);
    console.log(`   Order Type: ${order.order_type}`);
    console.log(`   Phone: ${order.phone}`);
    console.log(`   Created At: ${order.created_at}`);

    if (order.address_data) {
      try {
        const addressData = JSON.parse(order.address_data);
        console.log('   Address Data:');
        console.log('     ', JSON.stringify(addressData, null, 6));
      } catch (e) {
        console.log(`   Address Data (raw): ${order.address_data}`);
      }
    } else {
      console.log('   Address Data: null');
    }

    console.log('');
    console.log('2. CHECKING ORDER ITEMS');
    console.log('-'.repeat(40));

    const items = await sql`
      SELECT oi.*, mi.name as menu_item_name, mi.base_price as menu_item_price
      FROM order_items oi
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = 70
    `;

    if (items.length === 0) {
      console.log('❌ No items found for order 70');
    } else {
      console.log(`✅ Found ${items.length} items:`);
      items.forEach((item, index) => {
        console.log(`   Item ${index + 1}:`);
        console.log(`     Menu Item ID: ${item.menu_item_id}`);
        console.log(`     Name: ${item.menu_item_name || 'Unknown'}`);
        console.log(`     Quantity: ${item.quantity}`);
        console.log(`     Price: "${item.price}" (type: ${typeof item.price})`);
        console.log(`     Options: ${item.options || 'none'}`);
      });
    }

    console.log('');
    console.log('3. CHECKING POINTS TRANSACTIONS');
    console.log('-'.repeat(40));

    if (order.user_id) {
      const pointsTransactions = await sql`
        SELECT * FROM points_transactions WHERE order_id = 70
      `;

      if (pointsTransactions.length === 0) {
        console.log('❌ No points transactions found for order 70');
      } else {
        console.log(`✅ Found ${pointsTransactions.length} points transactions:`);
        pointsTransactions.forEach((pt, index) => {
          console.log(`   Transaction ${index + 1}:`);
          console.log(`     Type: ${pt.type}`);
          console.log(`     Points: ${pt.points}`);
          console.log(`     Description: ${pt.description}`);
          console.log(`     Order Amount: "${pt.order_amount}" (type: ${typeof pt.order_amount})`);
          console.log(`     Created At: ${pt.created_at}`);
        });
      }

      console.log('');
      console.log('4. CHECKING USER POINTS');
      console.log('-'.repeat(40));

      const userPoints = await sql`
        SELECT * FROM user_points WHERE user_id = ${order.user_id}
      `;

      if (userPoints.length === 0) {
        console.log(`❌ No user_points record found for user ${order.user_id}`);
      } else {
        const up = userPoints[0];
        console.log(`✅ User points record for user ${order.user_id}:`);
        console.log(`   Current Points: ${up.points}`);
        console.log(`   Total Earned: ${up.total_earned}`);
        console.log(`   Total Redeemed: ${up.total_redeemed}`);
        console.log(`   Last Earned At: ${up.last_earned_at}`);
        console.log(`   Created At: ${up.created_at}`);
        console.log(`   Updated At: ${up.updated_at}`);
      }

      console.log('');
      console.log('5. CHECKING USER RECORD');
      console.log('-'.repeat(40));

      const users = await sql`
        SELECT id, username, email, rewards, created_at FROM users WHERE id = ${order.user_id}
      `;

      if (users.length === 0) {
        console.log(`❌ User ${order.user_id} not found in users table`);
      } else {
        const user = users[0];
        console.log(`✅ User record for ID ${order.user_id}:`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Legacy Rewards: ${user.rewards}`);
        console.log(`   Created At: ${user.created_at}`);
      }

    } else {
      console.log('⚠️ Order 70 has no user_id (guest order), skipping points checks');
    }

    console.log('');
    console.log('6. POINTS CALCULATION TEST');
    console.log('-'.repeat(40));

    const totalValue = parseFloat(order.total);
    const pointsCalculation = Math.floor(totalValue);
    console.log(`Total: "${order.total}" -> parseFloat() -> ${totalValue} -> Math.floor() -> ${pointsCalculation} points`);

    if (isNaN(totalValue)) {
      console.log('❌ Total value cannot be parsed as number!');
    } else if (totalValue === 0) {
      console.log('❌ Total value is 0 - this is likely the issue!');
    } else {
      console.log('✅ Points calculation would work correctly');
    }

    console.log('');
    console.log('7. SUMMARY & DIAGNOSIS');
    console.log('-'.repeat(40));

    if (order.total === '0' || order.total === 0 || parseFloat(order.total) === 0) {
      console.log('🚨 ISSUE IDENTIFIED: Order total is stored as 0');
      console.log('   This explains why:');
      console.log('   - Success page shows $0 total');
      console.log('   - User earns 0 points (Math.floor(0) = 0)');
      console.log('');
      console.log('🔍 LIKELY CAUSES:');
      console.log('   1. Order creation API is receiving total as 0');
      console.log('   2. Frontend is sending incorrect total value');
      console.log('   3. Data transformation error during order processing');
    } else {
      console.log('✅ Order total looks correct in database');
      console.log('   Issue might be in:');
      console.log('   - API response formatting');
      console.log('   - Frontend display logic');
      console.log('   - Points calculation implementation');
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  } finally {
    await sql.end();
  }
}

investigateOrder70().catch(console.error);