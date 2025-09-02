import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';

// Import schema
import { 
  users, 
  categories, 
  menuItems, 
  restaurantSettings,
  employeeSchedules
} from './shared/schema.ts';

// Use Vercel environment variable for production testing
const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres.tamsxlebouauwiivoyxa:bqUGb3sFkMaFSrXJ@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

async function testProductionDatabase() {
  console.log('🔍 Testing Production Database Connection and Operations...\n');
  
  let sql;
  let db;
  
  try {
    // Create connection with production-optimized settings
    sql = postgres(DATABASE_URL, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
    });
    
    db = drizzle(sql, { 
      schema: { 
        users, 
        categories, 
        menuItems, 
        restaurantSettings,
        employeeSchedules
      } 
    });
    
    console.log('✅ Database connection established');
    
    // Test 1: Check if tables exist by querying them
    console.log('\n📋 Testing table accessibility...');
    
    try {
      const userCount = await db.select({ count: sql`count(*)::int` }).from(users);
      console.log(`✅ Users table accessible - ${userCount[0]?.count || 0} users found`);
    } catch (err) {
      console.log('❌ Users table issue:', err.message);
    }
    
    try {
      const categoriesCount = await db.select({ count: sql`count(*)::int` }).from(categories);
      console.log(`✅ Categories table accessible - ${categoriesCount[0]?.count || 0} categories found`);
    } catch (err) {
      console.log('❌ Categories table issue:', err.message);
    }
    
    try {
      const menuItemsCount = await db.select({ count: sql`count(*)::int` }).from(menuItems);
      console.log(`✅ Menu items table accessible - ${menuItemsCount[0]?.count || 0} menu items found`);
    } catch (err) {
      console.log('❌ Menu items table issue:', err.message);
    }
    
    try {
      const settingsCount = await db.select({ count: sql`count(*)::int` }).from(restaurantSettings);
      console.log(`✅ Restaurant settings table accessible - ${settingsCount[0]?.count || 0} settings found`);
    } catch (err) {
      console.log('❌ Restaurant settings table issue:', err.message);
    }
    
    try {
      const schedulesCount = await db.select({ count: sql`count(*)::int` }).from(employeeSchedules);
      console.log(`✅ Employee schedules table accessible - ${schedulesCount[0]?.count || 0} schedules found`);
    } catch (err) {
      console.log('❌ Employee schedules table issue:', err.message);
    }
    
    // Test 2: Test basic CRUD operations
    console.log('\n🔧 Testing CRUD operations...');
    
    // Test user creation (simulate the registration issue)
    try {
      const testUser = {
        username: 'test_production_user_' + Date.now(),
        email: 'test_' + Date.now() + '@example.com',
        password: 'test_password_hash',
        firstName: 'Test',
        lastName: 'User',
        role: 'customer',
        isActive: true,
        marketingOptIn: true,
      };
      
      const [newUser] = await db.insert(users).values(testUser).returning();
      console.log('✅ User creation test passed - User ID:', newUser.id);
      
      // Verify user was actually created
      const [verifyUser] = await db.select().from(users).where(eq(users.id, newUser.id));
      if (verifyUser) {
        console.log('✅ User verification test passed - User found in database');
        
        // Clean up test user
        await db.delete(users).where(eq(users.id, newUser.id));
        console.log('✅ Test user cleanup completed');
      } else {
        console.log('❌ User verification test failed - User not found after creation');
      }
      
    } catch (err) {
      console.log('❌ User CRUD test failed:', err.message);
    }
    
    // Test category creation
    try {
      const testCategory = {
        name: 'Test Category ' + Date.now(),
        order: 999,
        isActive: true,
      };
      
      const [newCategory] = await db.insert(categories).values(testCategory).returning();
      console.log('✅ Category creation test passed - Category ID:', newCategory.id);
      
      // Clean up test category
      await db.delete(categories).where(eq(categories.id, newCategory.id));
      console.log('✅ Test category cleanup completed');
      
    } catch (err) {
      console.log('❌ Category CRUD test failed:', err.message);
    }
    
    // Test restaurant settings
    try {
      const [existingSettings] = await db.select().from(restaurantSettings).limit(1);
      
      if (!existingSettings) {
        // Create default settings if none exist
        const defaultSettings = {
          restaurantName: "Favilla's NY Pizza",
          address: "123 Main Street, New York, NY 10001",
          phone: "(555) 123-4567",
          email: "info@favillas.com",
          website: "https://favillas.com",
          currency: "USD",
          timezone: "America/New_York",
          deliveryFee: "3.99",
          minimumOrder: "15.00",
        };
        
        const [newSettings] = await db.insert(restaurantSettings).values(defaultSettings).returning();
        console.log('✅ Restaurant settings created - Settings ID:', newSettings.id);
      } else {
        console.log('✅ Restaurant settings exist - Settings ID:', existingSettings.id);
      }
      
    } catch (err) {
      console.log('❌ Restaurant settings test failed:', err.message);
    }
    
    // Test 3: Verify data integrity
    console.log('\n🔍 Verifying data integrity...');
    
    try {
      // Check for any users that might have been created but not showing in admin
      const allUsers = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt
      }).from(users);
      
      console.log(`📊 Total users in database: ${allUsers.length}`);
      console.log('📊 User breakdown by role:');
      
      const roleBreakdown = allUsers.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});
      
      Object.entries(roleBreakdown).forEach(([role, count]) => {
        console.log(`   - ${role}: ${count}`);
      });
      
      // Show recent users
      const recentUsers = allUsers
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      
      if (recentUsers.length > 0) {
        console.log('\n📅 Most recent users:');
        recentUsers.forEach(user => {
          console.log(`   - ${user.username} (${user.email}) - ${user.role} - ${user.createdAt}`);
        });
      }
      
    } catch (err) {
      console.log('❌ Data integrity check failed:', err.message);
    }
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
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

// Run the test
console.log('🚀 Starting Production Database Test...\n');
testProductionDatabase()
  .then(() => {
    console.log('\n✅ Production Database Test Complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Production Database Test Failed:', error);
    process.exit(1);
  });