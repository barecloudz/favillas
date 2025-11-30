// Quick script to run the Pizza by the Slice migration
const postgres = require('postgres');
const { readFileSync } = require('fs');
const { join } = require('path');
require('dotenv').config();

async function runMigration() {
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
    console.log('🍕 Running Pizza by the Slice migration...');

    // Read the migration file
    const migrationSQL = readFileSync(
      join(__dirname, 'migrations', 'add_pizza_by_slice_category.sql'),
      'utf-8'
    );

    // Execute the migration
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('📊 Verifying results...');

    // Verify the category was created
    const categories = await sql`
      SELECT * FROM categories WHERE name = 'Pizza by the Slice'
    `;
    console.log(`✅ Category created: ${categories[0]?.name}`);

    // Verify the menu items were created
    const slices = await sql`
      SELECT * FROM menu_items WHERE category = 'Pizza by the Slice'
    `;
    console.log(`✅ Created ${slices.length} slice items:`);
    slices.forEach(slice => {
      console.log(`   - ${slice.name}: $${slice.base_price} (${slice.is_available ? 'Available' : 'Unavailable'})`);
    });

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
