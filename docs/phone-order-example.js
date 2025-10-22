/**
 * Test Script for Phone Agent Integration
 *
 * This script demonstrates how to create orders via the API
 * Run with: node docs/test-phone-order.js
 */

// CONFIGURATION - Update these values
const API_BASE_URL = 'http://localhost:5000'; // Change to your Netlify URL
// Example: 'https://your-site-name.netlify.app'

async function testGetMenu() {
  console.log('\n📋 Testing: Get Menu Items...');

  try {
    const response = await fetch(`${API_BASE_URL}/.netlify/functions/menu-items`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const menu = await response.json();
    console.log('✅ Success! Found', menu.length, 'menu items');
    console.log('Sample items:', menu.slice(0, 3).map(item => ({
      id: item.id,
      name: item.name,
      price: item.base_price
    })));

    return menu;
  } catch (error) {
    console.error('❌ Failed to get menu:', error.message);
    throw error;
  }
}

async function testCreatePickupOrder() {
  console.log('\n🍕 Testing: Create Pickup Order...');

  const order = {
    items: [
      {
        menuItemId: 1, // Traditional Pizza - adjust based on your menu
        quantity: 1,
        price: 16.99,
        options: [
          {
            groupName: "Traditional Pizza Size",
            itemName: "16\"",
            price: 16.99
          },
          {
            groupName: "16\" Toppings",
            itemName: "Pepperoni",
            price: 2.00
          }
        ],
        specialInstructions: "Extra crispy"
      }
    ],
    phone: "5551234567",
    customerName: "Phone Test Order",
    orderType: "pickup",
    fulfillmentTime: "asap",
    total: 18.99,
    tax: 0,
    deliveryFee: 0,
    tip: 0,
    paymentStatus: "pending",
    specialInstructions: "TEST ORDER - Phone Agent Integration"
  };

  try {
    const response = await fetch(`${API_BASE_URL}/.netlify/functions/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(order)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log('✅ Success! Order created with ID:', result.id);
    console.log('Order details:', {
      id: result.id,
      status: result.status,
      customer: result.customer_name,
      total: result.total,
      type: result.order_type
    });

    return result;
  } catch (error) {
    console.error('❌ Failed to create pickup order:', error.message);
    throw error;
  }
}

async function testCreateDeliveryOrder() {
  console.log('\n🚚 Testing: Create Delivery Order...');

  const order = {
    items: [
      {
        menuItemId: 1, // Adjust based on your menu
        quantity: 2,
        price: 16.99,
        options: [
          {
            groupName: "Traditional Pizza Size",
            itemName: "16\"",
            price: 16.99
          }
        ],
        specialInstructions: ""
      }
    ],
    phone: "5559876543",
    customerName: "Phone Test Delivery",
    orderType: "delivery",
    address: "123 Test St, Testville, TS 12345",
    addressData: {
      street: "123 Test St",
      city: "Testville",
      state: "TS",
      zipCode: "12345"
    },
    fulfillmentTime: "asap",
    total: 36.98,
    tax: 0,
    deliveryFee: 3.00,
    tip: 5.00,
    paymentStatus: "pending",
    specialInstructions: "TEST ORDER - Phone Agent Integration - Ring doorbell"
  };

  try {
    const response = await fetch(`${API_BASE_URL}/.netlify/functions/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(order)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP ${response.status}: ${JSON.stringify(errorData)}`);
    }

    const result = await response.json();
    console.log('✅ Success! Delivery order created with ID:', result.id);
    console.log('Order details:', {
      id: result.id,
      status: result.status,
      customer: result.customer_name,
      address: result.address,
      total: result.total
    });

    return result;
  } catch (error) {
    console.error('❌ Failed to create delivery order:', error.message);
    throw error;
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Phone Agent Integration Test Suite');
  console.log('API URL:', API_BASE_URL);
  console.log('=====================================');

  try {
    // Test 1: Get menu items
    await testGetMenu();

    // Test 2: Create pickup order
    await testCreatePickupOrder();

    // Test 3: Create delivery order
    await testCreateDeliveryOrder();

    console.log('\n✅ All tests passed!');
    console.log('\n📱 Check your Kitchen Display to see the test orders');

  } catch (error) {
    console.error('\n❌ Test suite failed');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}

export { testGetMenu, testCreatePickupOrder, testCreateDeliveryOrder };
