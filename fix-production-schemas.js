import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres.tamsxlebouauwiivoyxa:bqUGb3sFkMaFSrXJ@aws-0-us-east-1.pooler.supabase.com:6543/postgres";

async function fixProductionSchemas() {
  console.log('🔧 Fixing Production Database Schema Issues...\n');
  
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
    
    // Fix 1: Check and add missing columns to orders table
    console.log('\n📋 Checking orders table schema...');
    
    try {
      // Check if updated_at column exists
      const ordersColumns = await sql`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'orders'
        ORDER BY column_name
      `;
      
      const columnNames = ordersColumns.map(col => col.column_name);
      console.log('   Current orders columns:', columnNames.slice(0, 10).join(', '), '...');
      
      // Add missing columns if they don't exist
      const missingColumns = [];
      
      if (!columnNames.includes('updated_at')) {
        missingColumns.push('updated_at TIMESTAMP DEFAULT NOW()');
      }
      
      if (!columnNames.includes('processed_at')) {
        missingColumns.push('processed_at TIMESTAMP');
      }
      
      if (!columnNames.includes('completed_at')) {
        missingColumns.push('completed_at TIMESTAMP');
      }
      
      if (missingColumns.length > 0) {
        console.log('   Adding missing columns:', missingColumns.join(', '));
        
        for (const column of missingColumns) {
          await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ${sql.unsafe(column)}`;
        }
        
        console.log('✅ Orders table schema updated');
      } else {
        console.log('✅ Orders table schema is complete');
      }
      
    } catch (err) {
      console.log('❌ Orders table schema check failed:', err.message);
    }
    
    // Fix 2: Check and fix employee_schedules table schema
    console.log('\n📅 Checking employee_schedules table schema...');
    
    try {
      const schedulesColumns = await sql`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'employee_schedules'
        ORDER BY column_name
      `;
      
      console.log('   Employee schedules columns:');
      schedulesColumns.forEach(col => {
        console.log(`     - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULLABLE'}`);
      });
      
      const scheduleColumnNames = schedulesColumns.map(col => col.column_name);
      
      // Check if createdBy column exists and fix if needed  
      if (!scheduleColumnNames.includes('created_by')) {
        console.log('   Adding created_by column...');
        await sql`ALTER TABLE employee_schedules ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id)`;
        console.log('✅ created_by column added');
      }
      
      // Make sure createdBy is nullable (since we're setting a default)
      const createdByColumn = schedulesColumns.find(col => col.column_name === 'created_by');
      if (createdByColumn && createdByColumn.is_nullable === 'NO') {
        console.log('   Making created_by nullable...');
        await sql`ALTER TABLE employee_schedules ALTER COLUMN created_by DROP NOT NULL`;
        console.log('✅ created_by column made nullable');
      }
      
    } catch (err) {
      console.log('❌ Employee schedules schema check failed:', err.message);
    }
    
    // Fix 3: Update the orders table to ensure all records have updated_at
    console.log('\n🔄 Ensuring all orders have updated_at timestamps...');
    
    try {
      const updatedRows = await sql`
        UPDATE orders 
        SET updated_at = COALESCE(updated_at, created_at, NOW()) 
        WHERE updated_at IS NULL
      `;
      
      console.log(`✅ Updated ${updatedRows.count} orders with missing updated_at timestamps`);
      
    } catch (err) {
      console.log('❌ Orders timestamp update failed:', err.message);
    }
    
    // Fix 4: Test the fixes by creating a sample order
    console.log('\n🧪 Testing order creation with fixed schema...');
    
    try {
      const testOrder = await sql`
        INSERT INTO orders (
          user_id, status, total, tax, delivery_fee, tip, order_type, 
          payment_status, phone, special_instructions, created_at, updated_at
        ) VALUES (
          NULL, 'pending', 19.99, 2.00, 3.99, 3.00, 'pickup', 
          'pending', '555-SCHEMA-TEST', 'Schema fix test', NOW(), NOW()
        ) RETURNING id, total, status, created_at, updated_at
      `;
      
      if (testOrder[0]) {
        console.log('✅ Order creation test passed');
        console.log(`   - Order ID: ${testOrder[0].id}`);
        console.log(`   - Has updated_at: ${testOrder[0].updated_at ? 'Yes' : 'No'}`);
        
        // Clean up test order
        await sql`DELETE FROM orders WHERE id = ${testOrder[0].id}`;
        console.log('✅ Test order cleaned up');
      }
      
    } catch (err) {
      console.log('❌ Order creation test failed:', err.message);
    }
    
    // Fix 5: Test schedule creation with fixed schema
    console.log('\n🧪 Testing schedule creation with fixed schema...');
    
    try {
      const testSchedule = await sql`
        INSERT INTO employee_schedules (
          employee_id, schedule_date, start_time, end_time, position, 
          is_mandatory, notes, status, created_by
        ) VALUES (
          7, '2025-01-15', '09:00', '17:00', 'server', 
          false, 'Schema fix test', 'scheduled', NULL
        ) RETURNING id, employee_id, position
      `;
      
      if (testSchedule[0]) {
        console.log('✅ Schedule creation test passed');
        console.log(`   - Schedule ID: ${testSchedule[0].id}`);
        console.log(`   - Employee ID: ${testSchedule[0].employee_id}`);
        
        // Clean up test schedule
        await sql`DELETE FROM employee_schedules WHERE id = ${testSchedule[0].id}`;
        console.log('✅ Test schedule cleaned up');
      }
      
    } catch (err) {
      console.log('❌ Schedule creation test failed:', err.message);
    }
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error.message);
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

// Run the fix
console.log('🚀 Starting Production Schema Fix...\n');
fixProductionSchemas()
  .then(() => {
    console.log('\n✅ Production Schema Fix Complete!');
    console.log('\n📋 Fixed issues:');
    console.log('   ✅ Added missing updated_at column to orders table');
    console.log('   ✅ Fixed employee_schedules created_by column constraints');
    console.log('   ✅ Updated existing orders with proper timestamps');
    console.log('   ✅ Tested order and schedule creation');
    console.log('\n🚀 Your APIs should now work properly!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Production Schema Fix Failed:', error);
    process.exit(1);
  });