/**
 * Run pending migrations on preview database
 * This script runs migrations 0014 and 0015 to add promo code columns
 */

import { Client } from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const client = new Client({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigrations() {
  try {
    await client.connect();
    console.log('✅ Connected to database');
    console.log('🔄 Running pending migrations...\n');

    // Migration 0014: Add promo code columns to orders
    console.log('📝 Running migration 0014: Add promo_code columns to orders...');
    const migration14Path = join(__dirname, '../migrations/0014_add_promo_code_to_orders.sql');
    const migration14SQL = readFileSync(migration14Path, 'utf-8');

    await client.query(migration14SQL);
    console.log('✅ Migration 0014 completed\n');

    // Migration 0015: Fix garlic knot slider prices
    console.log('📝 Running migration 0015: Fix garlic knot slider prices...');
    const migration15Path = join(__dirname, '../migrations/0015_fix_garlic_knot_slider_prices.sql');
    const migration15SQL = readFileSync(migration15Path, 'utf-8');

    // Extract just the UPDATE statement (skip comments and verification)
    const updateStatement = migration15SQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim())
      .join('\n')
      .split(';')[0];

    const result = await client.query(updateStatement);
    console.log(`✅ Migration 0015 completed (updated ${result.rowCount} items)\n`);

    // Verify the changes
    console.log('🔍 Verifying changes...');

    // Check if promo_code_id column exists
    const columnCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'orders'
        AND column_name IN ('promo_code_id', 'promo_code_discount')
    `);

    console.log('✅ Verified promo code columns:', columnCheck.rows.map(r => r.column_name));

    // Check garlic roll prices
    const priceCheck = await client.query(`
      SELECT cg.name as group_name, ci.name as choice_name, ci.price
      FROM choice_items ci
      JOIN choice_groups cg ON ci.choice_group_id = cg.id
      WHERE cg.name ILIKE '%garlic roll%'
      LIMIT 3
    `);

    console.log('✅ Sample garlic roll prices:', priceCheck.rows);

    console.log('\n✅ All migrations completed successfully!');
    console.log('📱 Your preview environment is now ready for phone agent testing');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
