import postgres from 'postgres';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const sql = postgres(process.env.DATABASE_URL!);

  try {
    const migration = fs.readFileSync(join(__dirname, 'add_free_item_fields_to_rewards.sql'), 'utf8');
    await sql.unsafe(migration);
    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
