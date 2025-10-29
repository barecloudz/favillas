import pg from 'pg';
const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
});

async function runMigration() {
  try {
    await client.connect();
    console.log('🔄 Running migration: Fix garlic knot slider prices...');

    // Update garlic roll choice prices to $0.00
    const updateSQL = `
      UPDATE choice_items
      SET price = 0.00
      WHERE choice_group_id IN (
        SELECT id FROM choice_groups
        WHERE name ILIKE '%garlic roll%'
      )
    `;

    console.log('📝 Executing SQL to set garlic roll choices to $0.00');
    const result = await client.query(updateSQL);

    console.log('✅ Migration completed successfully!');
    console.log(`📊 Updated ${result.rowCount} choice items`);

    // Verification query
    console.log('\n🔍 Verifying changes...');
    const verification = await client.query(`
      SELECT cg.name as group_name, ci.name as choice_name, ci.price
      FROM choice_items ci
      JOIN choice_groups cg ON ci.choice_group_id = cg.id
      WHERE cg.name ILIKE '%garlic roll%'
      ORDER BY cg.name, ci.name
    `);

    console.log('\n📋 Current garlic roll choices:');
    console.table(verification.rows);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
