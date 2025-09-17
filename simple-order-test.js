#!/usr/bin/env node

const BASE_URL = 'https://pizzaspinrewards.netlify.app';

console.log('🧪 Testing Order Endpoints...');

// Test 1: Basic order endpoint access
async function testBasicAccess() {
  console.log('\n1. Testing basic order endpoint access...');

  try {
    const response = await fetch(`${BASE_URL}/api/orders`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`Status: ${response.status}`);
    const text = await response.text();
    console.log(`Response: ${text.substring(0, 200)}...`);

    if (response.status === 401) {
      console.log('✅ Expected: Endpoint requires authentication');
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Test 2: Test specific order
async function testSpecificOrder() {
  console.log('\n2. Testing specific order (Order 70)...');

  try {
    const response = await fetch(`${BASE_URL}/api/orders/70`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`Status: ${response.status}`);
    const text = await response.text();
    console.log(`Response: ${text.substring(0, 200)}...`);

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Test 3: Test with mock authentication
async function testWithAuth() {
  console.log('\n3. Testing with mock authentication...');

  // Simple mock JWT structure
  const mockToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL3N1cGFiYXNlLmlvIiwic3ViIjoiZ29vZ2xlLXVzZXItMTIzIiwiZW1haWwiOiJ0ZXN0QGdtYWlsLmNvbSIsImV4cCI6OTk5OTk5OTk5OSwidGVzdCI6dHJ1ZX0.test-signature";

  try {
    const response = await fetch(`${BASE_URL}/api/orders`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mockToken}`
      }
    });

    console.log(`Status: ${response.status}`);
    const text = await response.text();

    if (response.status === 200) {
      try {
        const data = JSON.parse(text);
        console.log(`📊 Orders returned: ${Array.isArray(data) ? data.length : 'Not an array'}`);
        if (Array.isArray(data) && data.length === 0) {
          console.log('🚨 CRITICAL: Empty order history - this is the reported issue!');
        }
      } catch (e) {
        console.log(`Response text: ${text.substring(0, 200)}...`);
      }
    } else {
      console.log(`Response: ${text.substring(0, 200)}...`);
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Test 4: Test order creation
async function testOrderCreation() {
  console.log('\n4. Testing order creation...');

  const orderData = {
    total: "15.99",
    tax: "1.28",
    deliveryFee: "0",
    tip: "0",
    orderType: "pickup",
    paymentStatus: "completed",
    phone: "555-123-4567",
    fulfillmentTime: "asap",
    status: "pending",
    items: [
      {
        menuItemId: 1,
        quantity: 1,
        price: "15.99"
      }
    ]
  };

  try {
    const response = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    console.log(`Status: ${response.status}`);
    const text = await response.text();

    if (response.status === 201) {
      const data = JSON.parse(text);
      console.log(`✅ Order created: ID ${data.id}`);
      return data.id;
    } else {
      console.log(`Response: ${text.substring(0, 200)}...`);
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  return null;
}

// Run all tests
async function runTests() {
  console.log('🚨 CRITICAL ORDER ENDPOINT TESTING');
  console.log('==================================');

  await testBasicAccess();
  await testSpecificOrder();
  await testWithAuth();

  const newOrderId = await testOrderCreation();

  if (newOrderId) {
    console.log(`\n5. Testing access to newly created order ${newOrderId}...`);
    try {
      const response = await fetch(`${BASE_URL}/api/orders/${newOrderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log(`New order access status: ${response.status}`);

      if (response.status === 401) {
        console.log('🚨 CRITICAL: Cannot access newly created order without auth!');
      }
    } catch (error) {
      console.log(`❌ Error accessing new order: ${error.message}`);
    }
  }

  console.log('\n🎯 TEST SUMMARY:');
  console.log('================');
  console.log('Key issues to look for:');
  console.log('- 401 errors preventing order access');
  console.log('- Empty order arrays from /api/orders');
  console.log('- Orders that can be created but not retrieved');
  console.log('- Authentication token validation failures');
}

runTests().catch(console.error);