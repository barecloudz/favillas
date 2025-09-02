/**
 * Test database connection directly
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

async function testDatabaseConnection() {
  console.log('Testing database connection...');
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    return false;
  }
  
  console.log('✓ DATABASE_URL found');
  
  try {
    const sql = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
    });
    
    const db = drizzle(sql);
    
    // Test basic query
    console.log('Testing basic query...');
    const result = await sql`SELECT 1 as test`;
    console.log('✓ Basic query successful:', result);
    
    // Test users table exists
    console.log('Testing users table...');
    const userTableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `;
    
    if (userTableCheck.length > 0) {
      console.log('✓ Users table exists');
      
      // Test user count
      const userCount = await sql`SELECT COUNT(*) as count FROM users`;
      console.log(`✓ User count: ${userCount[0].count}`);
    } else {
      console.log('❌ Users table does not exist');
    }
    
    // List all tables
    console.log('Available tables:');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    
    tables.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    await sql.end();
    console.log('✓ Database connection test successful');
    return true;
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('Error details:', error);
    return false;
  }
}

testDatabaseConnection()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
  });