/**
 * Comprehensive Backend Testing Suite for Pizza Spin Rewards
 * Tests all critical endpoints and logs detailed results
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'https://favillaspizzeria.com';
const results = {
  successful: [],
  failed: [],
  warnings: []
};

// Helper to make HTTP requests
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data && method !== 'GET') {
      const body = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = lib.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: parsed
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data && method !== 'GET') {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// Log test result
function logResult(category, endpoint, method, status, success, message, details = {}) {
  const result = {
    category,
    endpoint,
    method,
    status,
    success,
    message,
    timestamp: new Date().toISOString(),
    ...details
  };

  if (success) {
    results.successful.push(result);
    console.log(`✅ [${category}] ${method} ${endpoint} - ${status} - ${message}`);
  } else {
    results.failed.push(result);
    console.log(`❌ [${category}] ${method} ${endpoint} - ${status} - ${message}`);
  }

  if (details.warning) {
    results.warnings.push(result);
    console.log(`⚠️  WARNING: ${details.warning}`);
  }
}

// Test runner
async function runTests() {
  console.log('\n🚀 Starting Comprehensive Backend Test Suite');
  console.log('='.repeat(60));
  console.log(`Testing: ${BASE_URL}\n`);

  // ============================================================
  // 1. HEALTH & INFRASTRUCTURE TESTS
  // ============================================================
  console.log('\n📋 1. HEALTH & INFRASTRUCTURE TESTS');
  console.log('-'.repeat(60));

  try {
    const health = await makeRequest('GET', '/api/health');
    logResult(
      'Health',
      '/api/health',
      'GET',
      health.status,
      health.status === 200,
      health.data.status === 'healthy' ? 'Service is healthy' : 'Service unhealthy',
      {
        databaseConfigured: health.data.databaseConfigured,
        environment: health.data.environment
      }
    );

    // Test database connectivity through health endpoint
    const dbTest = await makeRequest('GET', '/api/health?debug_login=true');
    logResult(
      'Database',
      '/api/health?debug_login=true',
      'GET',
      dbTest.status,
      dbTest.data.dbConnection === 'success',
      `Database connection: ${dbTest.data.dbConnection}`,
      { userFound: dbTest.data.userFound }
    );
  } catch (error) {
    logResult('Health', '/api/health', 'GET', 0, false, `Error: ${error.message}`);
  }

  // ============================================================
  // 2. MENU MANAGEMENT TESTS
  // ============================================================
  console.log('\n📋 2. MENU MANAGEMENT TESTS');
  console.log('-'.repeat(60));

  // Test menu items endpoint
  try {
    const menuItems = await makeRequest('GET', '/api/menu-items');
    logResult(
      'Menu',
      '/api/menu-items',
      'GET',
      menuItems.status,
      menuItems.status === 200,
      `Retrieved ${Array.isArray(menuItems.data) ? menuItems.data.length : 0} menu items`,
      {
        itemCount: Array.isArray(menuItems.data) ? menuItems.data.length : 0,
        hasCaching: menuItems.headers['cache-control']?.includes('max-age')
      }
    );
  } catch (error) {
    logResult('Menu', '/api/menu-items', 'GET', 0, false, `Error: ${error.message}`);
  }

  // Test categories endpoint
  try {
    const categories = await makeRequest('GET', '/api/categories');
    logResult(
      'Menu',
      '/api/categories',
      'GET',
      categories.status,
      categories.status === 200,
      `Retrieved ${Array.isArray(categories.data) ? categories.data.length : 0} categories`,
      {
        categoryCount: Array.isArray(categories.data) ? categories.data.length : 0,
        hasCaching: categories.headers['cache-control']?.includes('max-age')
      }
    );
  } catch (error) {
    logResult('Menu', '/api/categories', 'GET', 0, false, `Error: ${error.message}`);
  }

  // Test choice groups endpoint
  try {
    const choiceGroups = await makeRequest('GET', '/api/choice-groups');
    logResult(
      'Menu',
      '/api/choice-groups',
      'GET',
      choiceGroups.status,
      choiceGroups.status === 200 || choiceGroups.status === 401,
      choiceGroups.status === 401 ? 'Requires authentication (expected)' : `Retrieved choice groups`,
      { requiresAuth: choiceGroups.status === 401 }
    );
  } catch (error) {
    logResult('Menu', '/api/choice-groups', 'GET', 0, false, `Error: ${error.message}`);
  }

  // Test featured items endpoint
  try {
    const featured = await makeRequest('GET', '/api/featured');
    logResult(
      'Menu',
      '/api/featured',
      'GET',
      featured.status,
      featured.status === 200,
      `Featured items endpoint responded`,
      { status: featured.status }
    );
  } catch (error) {
    logResult('Menu', '/api/featured', 'GET', 0, false, `Error: ${error.message}`);
  }

  // ============================================================
  // 3. AUTHENTICATION TESTS
  // ============================================================
  console.log('\n📋 3. AUTHENTICATION TESTS');
  console.log('-'.repeat(60));

  // Test Google OAuth redirect
  try {
    const googleAuth = await makeRequest('GET', '/api/auth/google');
    logResult(
      'Auth',
      '/api/auth/google',
      'GET',
      googleAuth.status,
      googleAuth.status === 302 || googleAuth.status === 200,
      `Google OAuth endpoint responded`,
      {
        status: googleAuth.status,
        redirects: googleAuth.status === 302
      }
    );
  } catch (error) {
    logResult('Auth', '/api/auth/google', 'GET', 0, false, `Error: ${error.message}`);
  }

  // Test unauthenticated access to protected endpoint
  try {
    const userProfile = await makeRequest('GET', '/api/user/profile');
    logResult(
      'Auth',
      '/api/user/profile (no auth)',
      'GET',
      userProfile.status,
      userProfile.status === 401,
      userProfile.status === 401 ? 'Correctly rejects unauthenticated requests' : 'WARNING: Should require authentication',
      {
        warning: userProfile.status !== 401 ? 'Protected endpoint accessible without auth' : null
      }
    );
  } catch (error) {
    logResult('Auth', '/api/user/profile', 'GET', 0, false, `Error: ${error.message}`);
  }

  // Test admin login endpoint
  try {
    const adminLogin = await makeRequest('POST', '/api/admin-login', {
      username: 'test_invalid',
      password: 'invalid'
    });
    logResult(
      'Auth',
      '/api/admin-login (invalid creds)',
      'POST',
      adminLogin.status,
      adminLogin.status === 401,
      adminLogin.status === 401 ? 'Correctly rejects invalid credentials' : 'Unexpected response',
      { status: adminLogin.status }
    );
  } catch (error) {
    logResult('Auth', '/api/admin-login', 'POST', 0, false, `Error: ${error.message}`);
  }

  // ============================================================
  // 4. REWARDS SYSTEM TESTS
  // ============================================================
  console.log('\n📋 4. REWARDS SYSTEM TESTS');
  console.log('-'.repeat(60));

  // Test rewards endpoint
  try {
    const rewards = await makeRequest('GET', '/api/rewards');
    logResult(
      'Rewards',
      '/api/rewards',
      'GET',
      rewards.status,
      rewards.status === 200,
      `Retrieved ${Array.isArray(rewards.data) ? rewards.data.length : 0} rewards`,
      {
        rewardCount: Array.isArray(rewards.data) ? rewards.data.length : 0,
        hasCaching: rewards.headers['cache-control']?.includes('max-age')
      }
    );
  } catch (error) {
    logResult('Rewards', '/api/rewards', 'GET', 0, false, `Error: ${error.message}`);
  }

  // Test user rewards (requires auth)
  try {
    const userRewards = await makeRequest('GET', '/api/user/rewards');
    logResult(
      'Rewards',
      '/api/user/rewards (no auth)',
      'GET',
      userRewards.status,
      userRewards.status === 401,
      userRewards.status === 401 ? 'Correctly requires authentication' : 'WARNING: Should require auth',
      {
        warning: userRewards.status !== 401 ? 'Protected endpoint accessible without auth' : null
      }
    );
  } catch (error) {
    logResult('Rewards', '/api/user/rewards', 'GET', 0, false, `Error: ${error.message}`);
  }

  // ============================================================
  // 5. ORDER PROCESSING TESTS
  // ============================================================
  console.log('\n📋 5. ORDER PROCESSING TESTS');
  console.log('-'.repeat(60));

  // Test orders endpoint (no auth)
  try {
    const orders = await makeRequest('GET', '/api/orders');
    logResult(
      'Orders',
      '/api/orders (no auth)',
      'GET',
      orders.status,
      orders.status === 401,
      orders.status === 401 ? 'Correctly requires authentication' : 'WARNING: Should require auth',
      {
        warning: orders.status !== 401 ? 'Protected endpoint accessible without auth' : null
      }
    );
  } catch (error) {
    logResult('Orders', '/api/orders', 'GET', 0, false, `Error: ${error.message}`);
  }

  // Test kitchen orders endpoint (no auth)
  try {
    const kitchenOrders = await makeRequest('GET', '/api/kitchen/orders');
    logResult(
      'Orders',
      '/api/kitchen/orders (no auth)',
      'GET',
      kitchenOrders.status,
      kitchenOrders.status === 401,
      kitchenOrders.status === 401 ? 'Correctly requires authentication' : 'WARNING: Should require auth',
      {
        warning: kitchenOrders.status !== 401 ? 'Protected endpoint accessible without auth' : null
      }
    );
  } catch (error) {
    logResult('Orders', '/api/kitchen/orders', 'GET', 0, false, `Error: ${error.message}`);
  }

  // Test order creation without auth
  try {
    const createOrder = await makeRequest('POST', '/api/orders', {
      items: [],
      orderType: 'pickup'
    });
    logResult(
      'Orders',
      '/api/orders (POST no auth)',
      'POST',
      createOrder.status,
      createOrder.status === 401 || createOrder.status === 400,
      createOrder.status === 401 ? 'Correctly requires authentication' : `Response: ${createOrder.status}`,
      { status: createOrder.status }
    );
  } catch (error) {
    logResult('Orders', '/api/orders', 'POST', 0, false, `Error: ${error.message}`);
  }

  // ============================================================
  // 6. ADMIN ENDPOINTS TESTS
  // ============================================================
  console.log('\n📋 6. ADMIN ENDPOINTS TESTS');
  console.log('-'.repeat(60));

  // Test admin settings (no auth)
  try {
    const adminSettings = await makeRequest('GET', '/api/admin/system-settings');
    logResult(
      'Admin',
      '/api/admin/system-settings (no auth)',
      'GET',
      adminSettings.status,
      adminSettings.status === 401,
      adminSettings.status === 401 ? 'Correctly requires authentication' : 'WARNING: Admin endpoint accessible',
      {
        warning: adminSettings.status !== 401 ? 'SECURITY: Admin endpoint accessible without auth' : null
      }
    );
  } catch (error) {
    logResult('Admin', '/api/admin/system-settings', 'GET', 0, false, `Error: ${error.message}`);
  }

  // Test delivery zones (public)
  try {
    const deliveryZones = await makeRequest('GET', '/api/admin/delivery-zones');
    logResult(
      'Delivery',
      '/api/admin/delivery-zones',
      'GET',
      deliveryZones.status,
      deliveryZones.status === 200 || deliveryZones.status === 401,
      `Delivery zones endpoint: ${deliveryZones.status}`,
      { status: deliveryZones.status }
    );
  } catch (error) {
    logResult('Delivery', '/api/admin/delivery-zones', 'GET', 0, false, `Error: ${error.message}`);
  }

  // Test store hours
  try {
    const storeHours = await makeRequest('GET', '/api/store-hours');
    logResult(
      'Store',
      '/api/store-hours',
      'GET',
      storeHours.status,
      storeHours.status === 200,
      `Store hours endpoint: ${storeHours.status}`,
      { status: storeHours.status }
    );
  } catch (error) {
    logResult('Store', '/api/store-hours', 'GET', 0, false, `Error: ${error.message}`);
  }

  // Test tax settings
  try {
    const taxSettings = await makeRequest('GET', '/api/tax-settings');
    logResult(
      'Tax',
      '/api/tax-settings',
      'GET',
      taxSettings.status,
      taxSettings.status === 200,
      `Tax settings endpoint: ${taxSettings.status}`,
      { status: taxSettings.status }
    );
  } catch (error) {
    logResult('Tax', '/api/tax-settings', 'GET', 0, false, `Error: ${error.message}`);
  }

  // Test restaurant settings
  try {
    const restaurantSettings = await makeRequest('GET', '/api/restaurant-settings');
    logResult(
      'Restaurant',
      '/api/restaurant-settings',
      'GET',
      restaurantSettings.status,
      restaurantSettings.status === 200,
      `Restaurant settings endpoint: ${restaurantSettings.status}`,
      { status: restaurantSettings.status }
    );
  } catch (error) {
    logResult('Restaurant', '/api/restaurant-settings', 'GET', 0, false, `Error: ${error.message}`);
  }

  // ============================================================
  // 7. ERROR HANDLING TESTS
  // ============================================================
  console.log('\n📋 7. ERROR HANDLING TESTS');
  console.log('-'.repeat(60));

  // Test invalid endpoint
  try {
    const invalid = await makeRequest('GET', '/api/nonexistent-endpoint-test-12345');
    logResult(
      'Error',
      '/api/nonexistent-endpoint',
      'GET',
      invalid.status,
      invalid.status === 404,
      invalid.status === 404 ? 'Correctly returns 404 for invalid endpoints' : `Unexpected: ${invalid.status}`,
      { status: invalid.status }
    );
  } catch (error) {
    logResult('Error', '/api/nonexistent-endpoint', 'GET', 0, false, `Error: ${error.message}`);
  }

  // Test malformed JSON
  try {
    const malformed = await makeRequest('POST', '/api/orders', null, {
      'Content-Type': 'application/json'
    });
    logResult(
      'Error',
      '/api/orders (malformed)',
      'POST',
      malformed.status,
      malformed.status === 400 || malformed.status === 401,
      `Handles malformed requests: ${malformed.status}`,
      { status: malformed.status }
    );
  } catch (error) {
    logResult('Error', '/api/orders (malformed)', 'POST', 0, false, `Error: ${error.message}`);
  }

  // ============================================================
  // GENERATE REPORT
  // ============================================================
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));

  console.log(`\n✅ Successful Tests: ${results.successful.length}`);
  console.log(`❌ Failed Tests: ${results.failed.length}`);
  console.log(`⚠️  Warnings: ${results.warnings.length}`);

  if (results.failed.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    console.log('-'.repeat(60));
    results.failed.forEach(r => {
      console.log(`  - [${r.category}] ${r.method} ${r.endpoint}`);
      console.log(`    Status: ${r.status}, Message: ${r.message}`);
    });
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    console.log('-'.repeat(60));
    results.warnings.forEach(r => {
      console.log(`  - [${r.category}] ${r.method} ${r.endpoint}`);
      console.log(`    ${r.warning}`);
    });
  }

  // Category breakdown
  const categories = {};
  [...results.successful, ...results.failed].forEach(r => {
    if (!categories[r.category]) {
      categories[r.category] = { passed: 0, failed: 0 };
    }
    if (r.success) {
      categories[r.category].passed++;
    } else {
      categories[r.category].failed++;
    }
  });

  console.log('\n📈 RESULTS BY CATEGORY:');
  console.log('-'.repeat(60));
  Object.entries(categories).forEach(([cat, stats]) => {
    const total = stats.passed + stats.failed;
    const percentage = ((stats.passed / total) * 100).toFixed(1);
    console.log(`  ${cat}: ${stats.passed}/${total} passed (${percentage}%)`);
  });

  // Save detailed results to file
  const fs = require('fs');
  const reportPath = 'C:\\Users\\Blake\\OneDrive\\PizzaSpinRewards\\backend-test-results.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary: {
      total: results.successful.length + results.failed.length,
      successful: results.successful.length,
      failed: results.failed.length,
      warnings: results.warnings.length,
      categories
    },
    results: {
      successful: results.successful,
      failed: results.failed,
      warnings: results.warnings
    }
  }, null, 2));

  console.log(`\n💾 Detailed results saved to: ${reportPath}`);
  console.log('\n✨ Test suite completed!');
}

// Run tests
runTests().catch(console.error);
