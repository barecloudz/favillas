import postgres from 'postgres';
import fs from 'fs';

const sql = postgres(process.env.DATABASE_URL);

async function runMigration() {
  try {
    const migration = fs.readFileSync('migrations/add_half_and_half_to_categories.sql', 'utf8');
    await sql.unsafe(migration);
    console.log('✅ Migration completed: add_half_and_half_to_categories');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
