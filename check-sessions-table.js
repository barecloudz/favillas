/**
 * Check the sessions table status
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

async function checkSessionsTable() {
  console.log('Checking sessions table...');
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    return false;
  }
  
  try {
    const sql = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
    });
    
    // Check all tables that start with 'session'
    console.log('Checking for session-related tables...');
    const sessionTables = await sql`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%session%'
      ORDER BY table_name, ordinal_position
    `;
    
    if (sessionTables.length > 0) {
      console.log('Session-related tables and columns:');
      let currentTable = '';
      for (const row of sessionTables) {
        if (row.table_name !== currentTable) {
          currentTable = row.table_name;
          console.log(`\n${row.table_name}:`);
        }
        console.log(`  - ${row.column_name} (${row.data_type})`);
      }
    } else {
      console.log('❌ No session-related tables found');
    }
    
    // Try to query the sessions table that the error mentioned
    console.log('\nTesting sessions table query...');
    try {
      const testQuery = await sql`SELECT 1 FROM sessions LIMIT 1`;
      console.log('✓ sessions table is queryable');
    } catch (error) {
      console.log(`❌ sessions table query failed: ${error.message}`);
    }
    
    // Try the session table (singular)
    console.log('\nTesting session table query...');
    try {
      const testQuery = await sql`SELECT 1 FROM session LIMIT 1`;
      console.log('✓ session table is queryable');
    } catch (error) {
      console.log(`❌ session table query failed: ${error.message}`);
    }
    
    await sql.end();
    console.log('\nSessions table check completed');
    return true;
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    return false;
  }
}

checkSessionsTable()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Check failed:', error);
    process.exit(1);
  });