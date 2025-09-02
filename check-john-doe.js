import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres.tamsxlebouauwiivoyxa:bqUGb3sFkMaFSrXJ@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

async function checkJohnDoe() {
  console.log('🔍 Checking for John Doe user in database...\n');
  
  let sql;
  
  try {
    sql = postgres(DATABASE_URL, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
    });
    
    console.log('✅ Database connection established');
    
    // Check for John Doe specifically
    const johnDoeUsers = await sql`
      SELECT id, username, email, first_name, last_name, role, created_at 
      FROM users 
      WHERE first_name ILIKE '%john%' OR last_name ILIKE '%doe%'
         OR username ILIKE '%john%' OR email ILIKE '%john%'
    `;
    
    if (johnDoeUsers.length > 0) {
      console.log('\n🚨 Found John Doe-related users:');
      johnDoeUsers.forEach(user => {
        console.log(`   - ID: ${user.id}, Username: ${user.username}, Name: ${user.first_name} ${user.last_name}, Email: ${user.email}, Role: ${user.role}`);
      });
    } else {
      console.log('\n✅ No John Doe users found in database');
    }
    
    // Show all users for reference
    console.log('\n📋 All users in database:');
    const allUsers = await sql`
      SELECT id, username, email, first_name, last_name, role, is_active, created_at 
      FROM users 
      ORDER BY created_at DESC
    `;
    
    allUsers.forEach(user => {
      console.log(`   - ID: ${user.id}, Username: ${user.username}, Name: ${user.first_name} ${user.last_name}, Email: ${user.email}, Role: ${user.role}, Active: ${user.is_active}`);
    });
    
    // Check for any sessions that might be causing auto-login
    console.log('\n🔑 Checking sessions table...');
    try {
      const sessions = await sql`
        SELECT sid, sess, expire FROM sessions 
        WHERE expire > NOW() 
        LIMIT 5
      `;
      
      if (sessions.length > 0) {
        console.log(`   Found ${sessions.length} active sessions:`);
        sessions.forEach((session, index) => {
          console.log(`   Session ${index + 1}: ${session.sid} (expires: ${session.expire})`);
          try {
            const sessData = JSON.parse(session.sess);
            if (sessData.user || sessData.userId) {
              console.log(`     - Contains user data: ${JSON.stringify(sessData.user || { userId: sessData.userId })}`);
            }
          } catch (e) {
            console.log(`     - Session data: ${session.sess.substring(0, 100)}...`);
          }
        });
      } else {
        console.log('   No active sessions found');
      }
    } catch (err) {
      console.log('   Sessions table not accessible or doesn\'t exist');
    }
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    console.error('Full error:', error);
  } finally {
    if (sql) {
      try {
        await sql.end();
        console.log('\n🔌 Database connection closed');
      } catch (err) {
        console.log('⚠️  Warning: Error closing database connection:', err.message);
      }
    }
  }
}

// Run the check
console.log('🚀 Starting John Doe Investigation...\n');
checkJohnDoe()
  .then(() => {
    console.log('\n✅ John Doe Investigation Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ John Doe Investigation Failed:', error);
    process.exit(1);
  });