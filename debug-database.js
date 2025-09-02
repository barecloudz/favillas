import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const databaseUrl = "postgresql://postgres.tamsxlebouauwiivoyxa:bqUGb3sFkMaFSrXJ@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

const sql = postgres(databaseUrl, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

const db = drizzle(sql);

console.log('Testing database connection...');

try {
  // First check if users table exists and what columns it has
  const result = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'users' 
    ORDER BY ordinal_position;
  `;
  
  console.log('Users table schema:', result);
  
  // Check if there are any users
  const users = await sql`SELECT id, username, email, role FROM users LIMIT 5;`;
  console.log('Existing users:', users);
  
  // Check constraints on users table
  const constraints = await sql`
    SELECT constraint_name, constraint_type 
    FROM information_schema.table_constraints 
    WHERE table_name = 'users';
  `;
  console.log('Table constraints:', constraints);
  
} catch (error) {
  console.error('Database error:', error.message);
  console.error('Full error:', error);
} finally {
  await sql.end();
  process.exit(0);
}