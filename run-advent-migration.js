import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
  });

  try {
    console.log('📂 Reading migration file...');
    const migrationPath = path.join(__dirname, 'migrations', 'create-advent-calendar.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Running advent calendar migration...');
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('📝 Advent calendar tables and animation setting created.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
