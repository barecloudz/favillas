#!/usr/bin/env node

/**
 * URGENT: Critical Order Investigation Script
 * Testing order success page loading and Google authentication issues
 */

const BASE_URL = 'https://pizzaspinrewards.netlify.app';

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  const prefix = {
    error: `${colors.red}❌ ERROR`,
    success: `${colors.green}✅ SUCCESS`,
    warning: `${colors.yellow}⚠️ WARNING`,
    info: `${colors.blue}ℹ️ INFO`,
    test: `${colors.cyan}🧪 TEST`,
    debug: `${colors.magenta}🔍 DEBUG`,
    critical: `${colors.red}${colors.bright}🚨 CRITICAL`
  };

  console.log(`${prefix[level]} [${timestamp}] ${message}${colors.reset}`);
}

// Create a mock JWT token structure
function createMockSupabaseJWT() {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const payload = {
    iss: 'https://supabase.io',
    sub: 'auth0|google-oauth2|123456789012345',
    email: 'testuser@gmail.com',
    email_verified: true,
    aud: 'pizzaspinrewards',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    role: 'authenticated'
  };

  // Simple base64 encoding (not cryptographically secure, just for testing)
  const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=/g, '');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=/g, '');
  const signature = 'mock_signature';

  return `${headerB64}.${payloadB64}.${signature}`;
}

// Test order success page endpoint with different scenarios
async function testOrderSuccessPage() {
  log('test', 'Testing Order Success Page Endpoint');

  const testCases = [
    {
      name: 'Order 70 - Unauthenticated',
      orderId: 70,
      headers: {}
    },
    {
      name: 'Order 70 - With Google Token',
      orderId: 70,
      headers: {
        'Authorization': `Bearer ${createMockSupabaseJWT()}`
      }
    },
    {
      name: 'Order 69 - Unauthenticated',
      orderId: 69,
      headers: {}
    },
    {
      name: 'Order 69 - With Google Token',
      orderId: 69,
      headers: {
        'Authorization': `Bearer ${createMockSupabaseJWT()}`
      }
    },
    {
      name: 'Recent Order - With Google Token',
      orderId: 'recent',
      headers: {
        'Authorization': `Bearer ${createMockSupabaseJWT()}`
      }
    }
  ];

  for (const testCase of testCases) {
    log('test', `Running: ${testCase.name}`);

    try {
      const url = testCase.orderId === 'recent'
        ? `${BASE_URL}/api/orders`
        : `${BASE_URL}/api/orders/${testCase.orderId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Origin': BASE_URL,
          ...testCase.headers
        }
      });

      const responseText = await response.text();

      log('info', `${testCase.name}: Status ${response.status}`);

      if (response.status === 401) {
        log('warning', `Authentication failed for ${testCase.name}`);
      } else if (response.status === 404) {
        log('warning', `Order not found for ${testCase.name}`);
      } else if (response.status === 200) {
        try {
          const data = JSON.parse(responseText);
          if (testCase.orderId === 'recent') {
            log('success', `${testCase.name}: Retrieved ${Array.isArray(data) ? data.length : 0} orders`);
            if (Array.isArray(data) && data.length === 0) {
              log('critical', 'ORDER HISTORY EMPTY - This is the reported issue!');
            }
          } else {
            log('success', `${testCase.name}: Order retrieved successfully`);
            log('debug', `Order details: ID=${data.id}, Total=${data.total}, Status=${data.status}`);
          }
        } catch (parseError) {
          log('error', `${testCase.name}: Failed to parse response - ${parseError.message}`);
        }
      } else if (response.status === 500) {
        log('critical', `${testCase.name}: Server error - ${responseText}`);
      } else {
        log('warning', `${testCase.name}: Unexpected status ${response.status} - ${responseText}`);
      }

    } catch (error) {
      log('error', `${testCase.name}: Network error - ${error.message}`);
    }
  }
}

// Test order creation to see if Google auth works for new orders
async function testOrderCreation() {
  log('test', 'Testing Order Creation with Google Authentication');

  const orderData = {
    total: "25.99",
    tax: "2.08",
    deliveryFee: "0",
    tip: "0",
    orderType: "pickup",
    paymentStatus: "completed",
    phone: "555-123-4567",
    fulfillmentTime: "asap",
    status: "pending",
    specialInstructions: "Test order for Google auth investigation",
    items: [
      {
        menuItemId: 1,
        quantity: 1,
        price: "25.99",
        options: {},
        specialInstructions: ""
      }
    ]
  };

  try {
    const response = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${createMockSupabaseJWT()}`,
        'Origin': BASE_URL
      },
      body: JSON.stringify(orderData)
    });

    const responseText = await response.text();

    log('info', `Order creation: Status ${response.status}`);

    if (response.status === 201) {
      try {
        const data = JSON.parse(responseText);
        log('success', `Order created successfully: ID=${data.id}`);

        // Now test accessing this newly created order
        await testSpecificOrder(data.id);

      } catch (parseError) {
        log('error', `Failed to parse order creation response: ${parseError.message}`);
      }
    } else {
      log('error', `Order creation failed: ${responseText}`);
    }

  } catch (error) {
    log('error', `Order creation network error: ${error.message}`);
  }
}

// Test a specific order ID with different auth scenarios
async function testSpecificOrder(orderId) {
  log('test', `Testing specific order ${orderId} with different auth scenarios`);

  const scenarios = [
    { name: 'No auth', headers: {} },
    { name: 'Google token', headers: { 'Authorization': `Bearer ${createMockSupabaseJWT()}` } },
    { name: 'Cookie auth', headers: { 'Cookie': `auth-token=${createMockSupabaseJWT()}` } }
  ];

  for (const scenario of scenarios) {
    try {
      const response = await fetch(`${BASE_URL}/api/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Origin': BASE_URL,
          ...scenario.headers
        }
      });

      const responseText = await response.text();
      log('info', `Order ${orderId} (${scenario.name}): Status ${response.status}`);

      if (response.status === 200) {
        try {
          const data = JSON.parse(responseText);
          log('success', `Order ${orderId} accessible with ${scenario.name}`);
          log('debug', `Order data: Total=${data.total}, Items=${data.items?.length || 0}`);
        } catch (parseError) {
          log('error', `Failed to parse order response: ${parseError.message}`);
        }
      } else if (response.status === 401) {
        log('warning', `Order ${orderId} - Authentication required (${scenario.name})`);
      } else if (response.status === 404) {
        log('critical', `Order ${orderId} - Not found with ${scenario.name} - CRITICAL ISSUE!`);
      } else {
        log('error', `Order ${orderId} (${scenario.name}): ${responseText}`);
      }

    } catch (error) {
      log('error', `Order ${orderId} (${scenario.name}) network error: ${error.message}`);
    }
  }
}

// Test authentication token validation
async function testAuthValidation() {
  log('test', 'Testing Authentication Token Validation');

  const tokens = [
    { name: 'Valid Supabase structure', token: createMockSupabaseJWT() },
    { name: 'Invalid token', token: 'invalid.token.here' },
    { name: 'Malformed token', token: 'malformed' },
    { name: 'Empty token', token: '' }
  ];

  for (const { name, token } of tokens) {
    try {
      const response = await fetch(`${BASE_URL}/api/orders`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Origin': BASE_URL
        }
      });

      const responseText = await response.text();
      log('info', `Auth test (${name}): Status ${response.status}`);

      if (response.status === 401) {
        log('info', `${name}: Correctly rejected`);
      } else if (response.status === 200) {
        log('warning', `${name}: Unexpectedly accepted`);
      } else {
        log('error', `${name}: Unexpected status ${response.status}`);
      }

    } catch (error) {
      log('error', `Auth test (${name}): ${error.message}`);
    }
  }
}

// Main investigation function
async function runUrgentInvestigation() {
  console.log(`${colors.bright}${colors.red}`);
  console.log('🚨 URGENT ORDER INVESTIGATION');
  console.log('============================');
  console.log('Testing critical issues with Google authentication and order success page');
  console.log(`${colors.reset}\n`);

  log('info', 'Starting comprehensive order investigation...');

  // Test 1: Order success page functionality
  await testOrderSuccessPage();

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 2: Authentication validation
  await testAuthValidation();

  console.log('\n' + '='.repeat(60) + '\n');

  // Test 3: Order creation (if applicable)
  await testOrderCreation();

  console.log('\n' + '='.repeat(60) + '\n');

  // Summary
  log('critical', 'INVESTIGATION COMPLETE');
  console.log(`${colors.bright}${colors.yellow}`);
  console.log('KEY FINDINGS TO LOOK FOR:');
  console.log('=========================');
  console.log('1. 401 errors on order access with Google tokens');
  console.log('2. Empty order history arrays (length = 0)');
  console.log('3. 404 errors for orders that should exist');
  console.log('4. Server errors (500) during order operations');
  console.log('5. Authentication token parsing failures');
  console.log('');
  console.log('IMMEDIATE FIXES NEEDED:');
  console.log('======================');
  console.log('1. Fix Supabase JWT token validation in authenticateToken()');
  console.log('2. Ensure user_id/supabase_user_id mapping works correctly');
  console.log('3. Check order queries include both ID types');
  console.log('4. Verify order creation associates with correct user');
  console.log(`${colors.reset}`);
}

// Export for use as module if needed
if (import.meta.url === `file://${process.argv[1]}`) {
  runUrgentInvestigation().catch(error => {
    log('error', `Investigation failed: ${error.message}`);
    process.exit(1);
  });
}

export { runUrgentInvestigation, testOrderSuccessPage, testOrderCreation, testAuthValidation };