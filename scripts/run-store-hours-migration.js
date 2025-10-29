#!/usr/bin/env node

/**
 * Run store hours migration on production database
 * This script fixes the store_hours table to match the correct schema and hours
 */

const postgres = require('postgres');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Check for DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    console.error('Please set it to your production database connection string');
    process.exit(1);
  }

  console.log('🚀 Starting store hours migration...');
  console.log('📊 Database URL:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));

  const sql = postgres(process.env.DATABASE_URL, {
    max: 1,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '0016_fix_store_hours.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Running migration: 0016_fix_store_hours.sql');

    // Execute the migration
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration completed successfully!');

    // Verify the data
    console.log('\n📋 Verifying store hours...');
    const hours = await sql`SELECT day_of_week, day_name, open_time, close_time FROM store_hours ORDER BY day_of_week`;

    console.log('\nStore Hours:');
    hours.forEach(h => {
      console.log(`  ${h.day_name}: ${h.open_time} - ${h.close_time}`);
    });

    console.log('\n🎉 Store hours table is now set up correctly!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
