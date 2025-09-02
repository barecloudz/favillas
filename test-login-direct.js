import postgres from 'postgres';
import { scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

const databaseUrl = "postgresql://postgres.tamsxlebouauwiivoyxa:bqUGb3sFkMaFSrXJ@aws-0-us-east-1.pooler.supabase.com:6543/postgres";
const sql = postgres(databaseUrl, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  prepare: false,
});

async function comparePasswords(supplied, stored) {
  try {
    if (!stored) return false;
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) return false;
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = await scryptAsync(supplied, salt, 64);
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

async function testLogin(username, password) {
  console.log(`\n=== Testing login for: ${username} ===`);
  
  try {
    // Query the actual database structure
    const users = await sql`
      SELECT 
        COALESCE(id::integer, (id::text)::integer) as id,
        username,
        password,
        email,
        first_name,
        last_name,
        role,
        is_admin,
        rewards
      FROM users 
      WHERE username = ${username}
      LIMIT 1
    `;

    console.log(`Users found: ${users.length}`);
    
    if (users.length === 0) {
      console.log('❌ User not found');
      return false;
    }

    const user = users[0];
    console.log(`✅ User found: ${user.username}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Has password: ${!!user.password}`);

    if (!user.password) {
      console.log('❌ No password set for user');
      return false;
    }

    // Check password
    const isValidPassword = await comparePasswords(password, user.password);
    console.log(`Password valid: ${isValidPassword ? '✅' : '❌'}`);
    
    if (isValidPassword) {
      console.log('🎉 LOGIN SUCCESSFUL!');
      console.log(`   User ID: ${user.id}`);
      console.log(`   Name: ${user.first_name || 'Unknown'} ${user.last_name || 'User'}`);
      console.log(`   Admin: ${user.is_admin ? 'Yes' : 'No'}`);
      console.log(`   Rewards: ${user.rewards || 0} points`);
    }
    
    return isValidPassword;
    
  } catch (error) {
    console.error('❌ Login test failed:', error.message);
    return false;
  }
}

// Test known users
async function runTests() {
  console.log('🧪 Starting login functionality tests...\n');
  
  await testLogin('admin', 'admin123');
  await testLogin('customer', 'customer123'); 
  await testLogin('employee', 'employee123');
  await testLogin('admin', 'wrongpassword');
  await testLogin('nonexistent', 'anypassword');
  
  console.log('\n✅ All tests completed!');
  await sql.end();
  process.exit(0);
}

runTests();