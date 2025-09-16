import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
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

async function investigateOrderTotalIssue() {
  console.log('🔍 Direct Database Investigation: Order Total Issue');
  console.log('===================================================\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in environment variables');
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
    // Test 1: Check recent orders to see what totals are stored
    console.log('1. CHECKING RECENT ORDERS...');
    const recentOrders = await sql`
      SELECT id, total, tax, tip, delivery_fee, status, phone, created_at, payment_status
      FROM orders
      ORDER BY created_at DESC
      LIMIT 10
    `;

    console.log(`📊 Found ${recentOrders.length} recent orders:`);
    recentOrders.forEach((order, index) => {
      console.log(`   ${index + 1}. Order #${order.id}:`);
      console.log(`      - Total: ${order.total} (type: ${typeof order.total})`);
      console.log(`      - Tax: ${order.tax} (type: ${typeof order.tax})`);
      console.log(`      - Tip: ${order.tip} (type: ${typeof order.tip})`);
      console.log(`      - Delivery Fee: ${order.delivery_fee} (type: ${typeof order.delivery_fee})`);
      console.log(`      - Status: ${order.status}`);
      console.log(`      - Payment Status: ${order.payment_status}`);
      console.log(`      - Phone: ${order.phone}`);
      console.log(`      - Created: ${order.created_at}`);

      // Calculate what the real total should be
      const calculatedTotal = parseFloat(order.total || 0) + parseFloat(order.tax || 0) + parseFloat(order.delivery_fee || 0) + parseFloat(order.tip || 0);
      console.log(`      - Calculated Grand Total: $${calculatedTotal.toFixed(2)}`);
      console.log('');
    });

    // Test 2: Check points transactions for these orders
    console.log('\n2. CHECKING POINTS TRANSACTIONS...');
    const orderIds = recentOrders.map(o => o.id);

    if (orderIds.length > 0) {
      const pointsTransactions = await sql`
        SELECT order_id, points, order_amount, description, created_at
        FROM points_transactions
        WHERE order_id = ANY(${orderIds})
        ORDER BY created_at DESC
      `;

      console.log(`🎁 Found ${pointsTransactions.length} points transactions:`);
      pointsTransactions.forEach((pt, index) => {
        const relatedOrder = recentOrders.find(o => o.id === pt.order_id);
        console.log(`   ${index + 1}. Order #${pt.order_id}:`);
        console.log(`      - Points Awarded: ${pt.points}`);
        console.log(`      - Order Amount Used: ${pt.order_amount}`);
        console.log(`      - Actual Order Total: ${relatedOrder?.total}`);
        console.log(`      - Points Calculation: Math.floor(${pt.order_amount}) = ${Math.floor(parseFloat(pt.order_amount || 0))}`);
        console.log(`      - Expected Points: ${Math.floor(parseFloat(relatedOrder?.total || 0))}`);
        console.log(`      - Description: ${pt.description}`);
        console.log('');
      });
    }

    // Test 3: Check user_points table for recent activity
    console.log('\n3. CHECKING USER POINTS BALANCES...');
    const userPoints = await sql`
      SELECT user_id, points, total_earned, total_redeemed, last_earned_at
      FROM user_points
      WHERE last_earned_at > NOW() - INTERVAL '7 days'
      ORDER BY last_earned_at DESC
      LIMIT 5
    `;

    console.log(`👤 Found ${userPoints.length} users with recent point activity:`);
    userPoints.forEach((up, index) => {
      console.log(`   ${index + 1}. User #${up.user_id}:`);
      console.log(`      - Current Points: ${up.points}`);
      console.log(`      - Total Earned: ${up.total_earned}`);
      console.log(`      - Total Redeemed: ${up.total_redeemed}`);
      console.log(`      - Last Earned: ${up.last_earned_at}`);
      console.log('');
    });

    // Test 4: Simulate the order creation process
    console.log('\n4. SIMULATING ORDER CREATION PROCESS...');

    const testOrderTotal = "25.99";
    const testOrderTax = "2.34";
    const testOrderTip = "5.20";

    console.log('📝 Simulating order data from frontend:');
    console.log(`   - Total: "${testOrderTotal}" (string)`);
    console.log(`   - Tax: "${testOrderTax}" (string)`);
    console.log(`   - Tip: "${testOrderTip}" (string)`);

    // Simulate what happens in the API
    console.log('\n🔧 Processing in API:');
    console.log(`   - parseFloat(total): ${parseFloat(testOrderTotal)}`);
    console.log(`   - Math.floor(parseFloat(total)): ${Math.floor(parseFloat(testOrderTotal))}`);

    // Check database field types
    console.log('\n5. CHECKING DATABASE SCHEMA...');
    const schemaInfo = await sql`
      SELECT column_name, data_type, numeric_precision, numeric_scale
      FROM information_schema.columns
      WHERE table_name = 'orders'
      AND column_name IN ('total', 'tax', 'tip', 'delivery_fee')
      ORDER BY column_name
    `;

    console.log('📋 Database schema for orders table:');
    schemaInfo.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}(${col.numeric_precision},${col.numeric_scale})`);
    });

  } catch (error) {
    console.error('❌ Database investigation failed:', error);
  } finally {
    await sql.end();
  }

  console.log('\n🎯 INVESTIGATION COMPLETE');
  console.log('========================');
  console.log('Key things to check:');
  console.log('1. Are order totals being stored as expected?');
  console.log('2. Are points being calculated from the correct total value?');
  console.log('3. Is there a discrepancy between order total and points awarded?');
  console.log('4. Are the database field types correct for decimal values?');
}

// Run the investigation
investigateOrderTotalIssue().catch(console.error);