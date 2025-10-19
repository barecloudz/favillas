import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function runMigration() {
  try {
    console.log('Adding image_url column to categories table...');

    await sql`
      ALTER TABLE categories
      ADD COLUMN IF NOT EXISTS image_url TEXT
    `;

    console.log('✓ Migration successful: image_url column added to categories table');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
