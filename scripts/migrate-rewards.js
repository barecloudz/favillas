const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

// Database connection
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
});

async function migrateRewards() {
  try {
    console.log('🔄 Starting rewards migration...');

    // Read the SQL migration file
    const migrationSQL = fs.readFileSync(path.join(__dirname, 'add-points-to-rewards.sql'), 'utf8');

    // Split by semicolons and execute each statement
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        console.log('📝 Executing:', statement.split('\n')[0].substring(0, 50) + '...');
        await sql.unsafe(statement.trim());
      }
    }

    // Verify the migration worked
    const rewards = await sql`SELECT * FROM rewards LIMIT 1`;
    console.log('✅ Sample reward after migration:', rewards[0]);

    console.log('🎉 Rewards migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run if called directly
if (require.main === module) {
  migrateRewards().catch(console.error);
}

module.exports = { migrateRewards };