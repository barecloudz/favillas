import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

async function testLogin() {
  try {
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('SESSION_SECRET exists:', !!process.env.SESSION_SECRET);
    
    const sql = postgres(process.env.DATABASE_URL, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
    });
    
    console.log('Testing database connection...');
    await sql`SELECT 1 as test`;
    console.log('Database connection successful');
    
    console.log('Testing users table structure...');
    const users = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;
    console.log('Users table columns:', users);
    
    console.log('Testing user query...');
    const testUsers = await sql`
      SELECT username, email, role 
      FROM users 
      LIMIT 3
    `;
    console.log('Sample users:', testUsers);
    
    await sql.end();
    console.log('Test completed successfully');
    
  } catch (error) {
    console.error('Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

testLogin();