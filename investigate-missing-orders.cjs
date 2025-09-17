#!/usr/bin/env node

/**
 * CRITICAL: Investigate Missing Orders
 * User went from 14 orders to 0 orders on the same Google account
 * This script will investigate data integrity issues
 */

const postgres = require('postgres');

// Database connection
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
  keep_alive: false,
});

const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  const prefix = {
    error: `${colors.red}❌ ERROR`,
    success: `${colors.green}✅ SUCCESS`,
    warning: `${colors.yellow}⚠️ WARNING`,
    info: `${colors.blue}ℹ️ INFO`,
    debug: `${colors.magenta}🔍 DEBUG`,
    critical: `${colors.red}${colors.bright}🚨 CRITICAL`
  };

  console.log(`${prefix[level]} [${timestamp}] ${message}${colors.reset}`);
}

async function investigateOrders() {
  log('critical', 'INVESTIGATING MISSING ORDERS DATA INTEGRITY ISSUE');
  console.log('='.repeat(70));

  try {
    // 1. Check total order count
    log('info', 'Checking total order count in database...');
    const totalOrders = await sql`SELECT COUNT(*) as count FROM orders`;
    log('info', `Total orders in database: ${totalOrders[0].count}`);

    // 2. Check orders by user ID type
    log('info', 'Analyzing orders by user type...');
    const ordersByType = await sql`
      SELECT
        CASE
          WHEN user_id IS NOT NULL AND supabase_user_id IS NULL THEN 'legacy_only'
          WHEN user_id IS NULL AND supabase_user_id IS NOT NULL THEN 'supabase_only'
          WHEN user_id IS NOT NULL AND supabase_user_id IS NOT NULL THEN 'both'
          ELSE 'neither'
        END as user_type,
        COUNT(*) as count
      FROM orders
      GROUP BY user_type
      ORDER BY count DESC
    `;

    console.log('\nOrders by user type:');
    ordersByType.forEach(row => {
      log('info', `${row.user_type}: ${row.count} orders`);
    });

    // 3. Check for recent orders (last 7 days)
    log('info', 'Checking recent orders...');
    const recentOrders = await sql`
      SELECT
        id,
        user_id,
        supabase_user_id,
        total,
        status,
        payment_status,
        created_at,
        phone
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 20
    `;

    log('info', `Recent orders (last 7 days): ${recentOrders.length}`);
    console.log('\nRecent order details:');
    recentOrders.forEach(order => {
      const userInfo = order.supabase_user_id ?
        `Supabase: ${order.supabase_user_id.substring(0, 8)}...` :
        `Legacy: ${order.user_id}`;
      log('debug', `Order ${order.id}: ${userInfo}, $${order.total}, ${order.status}, ${order.created_at.toISOString()}`);
    });

    // 4. Check for orders with the suspected Google user
    log('info', 'Searching for Google/Supabase user orders...');

    // Look for common Google user patterns
    const googleOrders = await sql`
      SELECT
        id,
        user_id,
        supabase_user_id,
        total,
        status,
        created_at,
        phone
      FROM orders
      WHERE supabase_user_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 20
    `;

    log('info', `Orders with Supabase user IDs: ${googleOrders.length}`);
    console.log('\nGoogle/Supabase orders:');
    googleOrders.forEach(order => {
      log('debug', `Order ${order.id}: ${order.supabase_user_id}, $${order.total}, ${order.created_at.toISOString()}`);
    });

    // 5. Check for duplicate user mappings
    log('info', 'Checking for user mapping issues...');
    const duplicateMappings = await sql`
      SELECT
        supabase_user_id,
        COUNT(*) as order_count,
        COUNT(DISTINCT user_id) as legacy_user_count
      FROM orders
      WHERE supabase_user_id IS NOT NULL
      GROUP BY supabase_user_id
      HAVING COUNT(*) > 1
      ORDER BY order_count DESC
    `;

    if (duplicateMappings.length > 0) {
      log('warning', 'Found potential user mapping issues:');
      duplicateMappings.forEach(mapping => {
        log('warning', `Supabase ID ${mapping.supabase_user_id}: ${mapping.order_count} orders, ${mapping.legacy_user_count} legacy users`);
      });
    } else {
      log('success', 'No duplicate user mappings found');
    }

    // 6. Check for orders without proper user association
    log('info', 'Checking for orphaned orders...');
    const orphanedOrders = await sql`
      SELECT
        id,
        total,
        status,
        created_at,
        phone
      FROM orders
      WHERE user_id IS NULL AND supabase_user_id IS NULL
    `;

    if (orphanedOrders.length > 0) {
      log('critical', `Found ${orphanedOrders.length} orphaned orders without user association!`);
      orphanedOrders.forEach(order => {
        log('error', `Orphaned Order ${order.id}: $${order.total}, ${order.created_at.toISOString()}, Phone: ${order.phone}`);
      });
    } else {
      log('success', 'No orphaned orders found');
    }

    // 7. Look for specific order IDs mentioned in the conversation
    log('info', 'Checking specific mentioned orders...');
    const specificOrders = [92, 93, 94, 97];

    for (const orderId of specificOrders) {
      const order = await sql`
        SELECT
          id,
          user_id,
          supabase_user_id,
          total,
          status,
          payment_status,
          created_at
        FROM orders
        WHERE id = ${orderId}
      `;

      if (order.length > 0) {
        const o = order[0];
        const userInfo = o.supabase_user_id ?
          `Supabase: ${o.supabase_user_id}` :
          `Legacy: ${o.user_id}`;
        log('success', `Order ${orderId} exists: ${userInfo}, $${o.total}, ${o.status}`);
      } else {
        log('error', `Order ${orderId} NOT FOUND in database!`);
      }
    }

  } catch (error) {
    log('error', `Database investigation failed: ${error.message}`);
    console.error(error);
  } finally {
    await sql.end();
  }
}

async function main() {
  await investigateOrders();

  console.log('\n' + '='.repeat(70));
  log('critical', 'INVESTIGATION SUMMARY');
  console.log('='.repeat(70));
  console.log(`${colors.yellow}POTENTIAL CAUSES OF MISSING ORDERS:${colors.reset}`);
  console.log('1. User ID mapping issue between Google auth and database');
  console.log('2. Orders associated with different user ID than expected');
  console.log('3. Database integrity issue or data corruption');
  console.log('4. Authentication token providing wrong user ID');
  console.log('5. Orders created without proper user association');
  console.log('');
  console.log(`${colors.yellow}NEXT STEPS:${colors.reset}`);
  console.log('1. Check authentication token parsing in orders API');
  console.log('2. Verify user ID consistency in order creation');
  console.log('3. Add user ID logging to order endpoints');
  console.log('4. Test order retrieval with known user tokens');
  console.log(`${colors.reset}`);
}

main().catch(error => {
  log('error', `Investigation failed: ${error.message}`);
  process.exit(1);
});