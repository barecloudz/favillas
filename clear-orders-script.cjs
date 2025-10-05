const postgres = require('postgres');
require('dotenv/config');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL not configured');
  process.exit(1);
}

const sql = postgres(databaseUrl, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
  keep_alive: false,
});

(async () => {
  try {
    // Get count before deletion
    const countResult = await sql`SELECT COUNT(*) as count FROM orders`;
    const orderCount = parseInt(countResult[0].count);
    console.log(`📊 Found ${orderCount} orders to delete`);

    // Delete all order items first (foreign key constraint)
    await sql`DELETE FROM order_items`;
    console.log('✅ Deleted all order items');

    // Delete all orders
    await sql`DELETE FROM orders`;
    console.log('✅ Deleted all orders');

    // Reset the sequence to start from 1
    await sql`ALTER SEQUENCE orders_id_seq RESTART WITH 1`;
    console.log('✅ Reset orders ID sequence to 1');

    console.log(`\n🎉 Successfully cleared ${orderCount} orders and reset sequence!`);

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing orders:', error);
    await sql.end();
    process.exit(1);
  }
})();
