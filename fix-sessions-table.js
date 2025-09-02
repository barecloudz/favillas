/**
 * Fix the sessions table issue
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { config } from 'dotenv';

// Load environment variables
config();

async function fixSessionsTable() {
  console.log('Fixing sessions table...');
  
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
    
    // Check if sessions table exists
    console.log('Checking if sessions table exists...');
    const sessionTableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'sessions'
    `;
    
    if (sessionTableCheck.length > 0) {
      console.log('✓ Sessions table already exists');
    } else {
      console.log('❌ Sessions table does not exist, creating it...');
      
      // Create sessions table for express-session
      await sql`
        CREATE TABLE IF NOT EXISTS sessions (
          sid VARCHAR NOT NULL COLLATE "default",
          sess JSON NOT NULL,
          expire TIMESTAMP(6) NOT NULL
        )
        WITH (OIDS=FALSE)
      `;
      
      await sql`
        ALTER TABLE sessions 
        ADD CONSTRAINT session_pkey 
        PRIMARY KEY (sid) 
        NOT DEFERRABLE INITIALLY IMMEDIATE
      `;
      
      await sql`
        CREATE INDEX IF NOT EXISTS IDX_session_expire 
        ON sessions (expire)
      `;
      
      console.log('✓ Sessions table created successfully');
    }
    
    // Also check if the sessions table from schema exists (different from express-session)
    const sessionsTableCheck = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'session'
    `;
    
    if (sessionsTableCheck.length > 0) {
      console.log('✓ Session table (from schema) already exists');
    } else {
      console.log('Creating session table from schema...');
      await sql`
        CREATE TABLE IF NOT EXISTS session (
          sid TEXT PRIMARY KEY,
          sess JSONB NOT NULL,
          expire TIMESTAMP NOT NULL
        )
      `;
      console.log('✓ Session table created');
    }
    
    await sql.end();
    console.log('✓ Sessions table fix completed successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to fix sessions table:', error.message);
    console.error('Error details:', error);
    return false;
  }
}

fixSessionsTable()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fix failed:', error);
    process.exit(1);
  });