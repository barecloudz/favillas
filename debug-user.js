import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config();

async function testSpecificUser() {
  try {
    const sql = postgres(process.env.DATABASE_URL, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
    });
    
    console.log('Testing specific user query...');
    const users = await sql`
      SELECT *
      FROM users 
      WHERE username = 'admin'
      LIMIT 1
    `;
    
    if (users.length > 0) {
      console.log('User found:');
      const user = users[0];
      Object.keys(user).forEach(key => {
        if (key !== 'password' && key !== 'encrypted_password') {
          console.log(`  ${key}:`, user[key]);
        }
      });
      console.log('Has password:', !!user.password);
      console.log('Has encrypted_password:', !!user.encrypted_password);
    } else {
      console.log('No user found');
    }
    
    await sql.end();
    
  } catch (error) {
    console.error('Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

testSpecificUser();