// Test the actual orders API endpoint
async function testOrdersAPI() {
  console.log('🌐 Testing Orders API Endpoint...\n');
  
  const API_BASE = 'https://favillas-qzb21bdda-cloud-dev.vercel.app';
  // const API_BASE = 'http://localhost:3000'; // For local testing
  
  // Test 1: Test guest order submission (POST /api/orders)
  console.log('🛒 Testing guest order submission...');
  
  const testOrder = {
    items: [
      {
        menuItemId: 1,
        quantity: 1,
        price: "16.49",
        options: { size: "medium", crust: "regular" },
        specialInstructions: "Test order item"
      }
    ],
    total: "24.47", // item + tax + delivery
    tax: "1.65",
    deliveryFee: "3.99",
    tip: "2.34",
    orderType: "delivery",
    paymentStatus: "pending",
    phone: "555-TEST-API",
    address: "123 Test API Street, Test City, NY 12345",
    specialInstructions: "API test order - please ignore",
    fulfillmentTime: "asap"
  };
  
  try {
    const response = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testOrder)
    });
    
    console.log(`   Response status: ${response.status}`);
    
    if (response.ok) {
      const orderData = await response.json();
      console.log('✅ Order submission successful!');
      console.log(`   - Order ID: ${orderData.id}`);
      console.log(`   - Order Total: $${orderData.total}`);
      console.log(`   - Items: ${orderData.items?.length || 0}`);
      
      // Test 2: Try to get the order (this will require auth)
      console.log('\n📋 Testing order retrieval (this may fail due to auth)...');
      
      try {
        const getResponse = await fetch(`${API_BASE}/api/orders/${orderData.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log(`   Get order status: ${getResponse.status}`);
        
        if (getResponse.status === 401) {
          console.log('ℹ️  Order retrieval requires authentication (expected for security)');
        } else if (getResponse.ok) {
          const retrievedOrder = await getResponse.json();
          console.log('✅ Order retrieved successfully');
          console.log(`   - Retrieved Order ID: ${retrievedOrder.id}`);
        }
        
      } catch (getError) {
        console.log('❌ Order retrieval failed:', getError.message);
      }
      
    } else {
      const errorData = await response.text();
      console.log('❌ Order submission failed');
      console.log(`   - Error: ${errorData}`);
    }
    
  } catch (error) {
    console.log('❌ API request failed:', error.message);
  }
  
  // Test 3: Test the schedules API that was showing 500 error
  console.log('\n📅 Testing schedules API (the one with 500 error)...');
  
  try {
    const schedulesResponse = await fetch(`${API_BASE}/api/admin/schedules`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log(`   Schedules GET status: ${schedulesResponse.status}`);
    
    if (schedulesResponse.ok) {
      const schedulesData = await schedulesResponse.json();
      console.log('✅ Schedules API working!');
      console.log(`   - Schedules found: ${schedulesData.length}`);
    } else {
      const errorText = await schedulesResponse.text();
      console.log('❌ Schedules API still failing');
      console.log(`   - Error: ${errorText}`);
    }
    
    // Test POST to schedules (this was the failing request)
    console.log('\n📝 Testing schedule creation...');
    
    const testSchedule = {
      employeeId: 7, // Employee user from our database check
      scheduleDate: "2025-01-15",
      startTime: "09:00",
      endTime: "17:00",
      position: "server",
      isMandatory: false,
      notes: "API test schedule",
      status: "scheduled"
    };
    
    const scheduleCreateResponse = await fetch(`${API_BASE}/api/admin/schedules`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testSchedule)
    });
    
    console.log(`   Schedule POST status: ${scheduleCreateResponse.status}`);
    
    if (scheduleCreateResponse.ok) {
      const createdSchedule = await scheduleCreateResponse.json();
      console.log('✅ Schedule creation successful!');
      console.log(`   - Schedule ID: ${createdSchedule.id}`);
    } else {
      const scheduleError = await scheduleCreateResponse.text();
      console.log('❌ Schedule creation failed');
      console.log(`   - Error: ${scheduleError}`);
    }
    
  } catch (scheduleError) {
    console.log('❌ Schedules API test failed:', scheduleError.message);
  }
}

// Run the tests
console.log('🚀 Starting API Endpoint Tests...\n');
testOrdersAPI()
  .then(() => {
    console.log('\n✅ API Endpoint Tests Complete!');
    console.log('\n📋 If issues persist, check:');
    console.log('   1. Vercel deployment logs');
    console.log('   2. Environment variables (DATABASE_URL, JWT_SECRET)');
    console.log('   3. Schema import paths in API files');
    console.log('   4. CORS configuration for your domain');
  })
  .catch((error) => {
    console.error('\n❌ API Endpoint Tests Failed:', error);
  });