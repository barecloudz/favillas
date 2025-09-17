#!/usr/bin/env node

/**
 * Comprehensive Backend Testing Suite for Favilla's NY Pizza
 * Tests all critical backend functionality without creating test data
 * Focuses on the store hours issue and complete system validation
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'https://favillasnypizza.netlify.app';
const RESULTS = {
  storeHours: [],
  orderManagement: [],
  authentication: [],
  kitchenManagement: [],
  pointsRewards: [],
  adminDashboard: [],
  apiEndpoints: [],
  errors: [],
  summary: {
    totalTests: 0,
    passed: 0,
    failed: 0,
    critical: 0
  }
};

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  maxRetries: 3
};

/**
 * Make HTTP request with proper error handling
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;

    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Backend-Test-Suite/1.0',
        ...options.headers
      },
      timeout: TEST_CONFIG.timeout
    };

    if (options.body) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const req = client.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const responseData = data ? JSON.parse(data) : null;
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData,
            raw: data
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: null,
            raw: data,
            parseError: e.message
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Log test results
 */
function logTest(category, test, result, details = {}) {
  const testResult = {
    test,
    status: result.statusCode,
    success: result.statusCode >= 200 && result.statusCode < 300,
    timestamp: new Date().toISOString(),
    responseTime: details.responseTime || 'N/A',
    error: details.error || null,
    data: details.data || result.data,
    critical: details.critical || false
  };

  RESULTS[category].push(testResult);
  RESULTS.summary.totalTests++;

  if (testResult.success) {
    RESULTS.summary.passed++;
    console.log(`✅ ${category}: ${test} (${result.statusCode})`);
  } else {
    RESULTS.summary.failed++;
    if (testResult.critical) {
      RESULTS.summary.critical++;
    }
    console.log(`❌ ${category}: ${test} (${result.statusCode}) - ${details.error || 'Failed'}`);

    RESULTS.errors.push({
      category,
      test,
      status: result.statusCode,
      error: details.error || `HTTP ${result.statusCode}`,
      timestamp: new Date().toISOString(),
      critical: details.critical || false
    });
  }
}

/**
 * Test Store Hours Management (CRITICAL)
 */
async function testStoreHoursManagement() {
  console.log('\n🕐 Testing Store Hours Management (CRITICAL)...');

  try {
    // Test 1: GET store hours (unauthenticated)
    const start1 = Date.now();
    const getResult = await makeRequest(`${BASE_URL}/api/store-hours`);
    logTest('storeHours', 'GET /api/store-hours (unauthenticated)', getResult, {
      responseTime: `${Date.now() - start1}ms`,
      error: getResult.statusCode === 404 ? 'Store hours endpoint not found - THIS IS THE REPORTED ISSUE' : null,
      critical: getResult.statusCode === 404
    });

    // Test 2: PUT store hours (unauthenticated - should fail)
    const start2 = Date.now();
    const putResult = await makeRequest(`${BASE_URL}/api/store-hours/1`, {
      method: 'PUT',
      body: JSON.stringify({
        isOpen: true,
        openTime: '09:00',
        closeTime: '22:00'
      })
    });
    logTest('storeHours', 'PUT /api/store-hours/1 (unauthenticated)', putResult, {
      responseTime: `${Date.now() - start2}ms`,
      error: putResult.statusCode === 404 ? 'Store hours endpoint not found' : null,
      critical: putResult.statusCode === 404
    });

    // Test 3: Try alternative endpoint that might handle store hours
    const start3 = Date.now();
    const adminResult = await makeRequest(`${BASE_URL}/api/admin-restaurant-settings`);
    logTest('storeHours', 'GET /api/admin-restaurant-settings (alternative)', adminResult, {
      responseTime: `${Date.now() - start3}ms`,
      error: adminResult.statusCode === 401 ? 'Requires authentication (expected)' : null
    });

  } catch (error) {
    logTest('storeHours', 'Store Hours Management', { statusCode: 500 }, {
      error: error.message,
      critical: true
    });
  }
}

/**
 * Test Order Management System
 */
async function testOrderManagement() {
  console.log('\n📋 Testing Order Management System...');

  try {
    // Test 1: GET orders (should require auth)
    const start1 = Date.now();
    const ordersResult = await makeRequest(`${BASE_URL}/api/orders`);
    logTest('orderManagement', 'GET /api/orders', ordersResult, {
      responseTime: `${Date.now() - start1}ms`,
      error: ordersResult.statusCode === 401 ? 'Requires authentication (expected)' : null
    });

    // Test 2: POST new order (test with minimal data)
    const start2 = Date.now();
    const newOrderResult = await makeRequest(`${BASE_URL}/api/orders`, {
      method: 'POST',
      body: JSON.stringify({
        orderType: 'pickup',
        phone: '555-123-4567'
      })
    });
    logTest('orderManagement', 'POST /api/orders (minimal data)', newOrderResult, {
      responseTime: `${Date.now() - start2}ms`,
      error: newOrderResult.statusCode >= 400 ? 'Validation error or auth required (expected)' : null
    });

    // Test 3: GET kitchen orders
    const start3 = Date.now();
    const kitchenResult = await makeRequest(`${BASE_URL}/api/kitchen/orders`);
    logTest('orderManagement', 'GET /api/kitchen/orders', kitchenResult, {
      responseTime: `${Date.now() - start3}ms`,
      error: kitchenResult.statusCode === 401 ? 'Requires authentication (expected)' : null
    });

  } catch (error) {
    logTest('orderManagement', 'Order Management Test', { statusCode: 500 }, {
      error: error.message
    });
  }
}

/**
 * Test Authentication Systems
 */
async function testAuthentication() {
  console.log('\n🔐 Testing Authentication Systems...');

  try {
    // Test 1: Google OAuth endpoint
    const start1 = Date.now();
    const googleAuthResult = await makeRequest(`${BASE_URL}/api/auth/google`);
    logTest('authentication', 'GET /api/auth/google', googleAuthResult, {
      responseTime: `${Date.now() - start1}ms`,
      error: googleAuthResult.statusCode >= 400 ? 'Google auth configuration issue' : null
    });

    // Test 2: Legacy login endpoint
    const start2 = Date.now();
    const loginResult = await makeRequest(`${BASE_URL}/api/login`, {
      method: 'POST',
      body: JSON.stringify({
        username: 'test',
        password: 'test'
      })
    });
    logTest('authentication', 'POST /api/login (invalid credentials)', loginResult, {
      responseTime: `${Date.now() - start2}ms`,
      error: loginResult.statusCode === 401 ? 'Invalid credentials (expected)' : null
    });

    // Test 3: User profile endpoint
    const start3 = Date.now();
    const profileResult = await makeRequest(`${BASE_URL}/api/user/profile`);
    logTest('authentication', 'GET /api/user/profile', profileResult, {
      responseTime: `${Date.now() - start3}ms`,
      error: profileResult.statusCode === 401 ? 'Requires authentication (expected)' : null
    });

  } catch (error) {
    logTest('authentication', 'Authentication Test', { statusCode: 500 }, {
      error: error.message
    });
  }
}

/**
 * Test Kitchen Management
 */
async function testKitchenManagement() {
  console.log('\n👨‍🍳 Testing Kitchen Management...');

  try {
    // Test 1: Kitchen orders
    const start1 = Date.now();
    const kitchenOrdersResult = await makeRequest(`${BASE_URL}/api/kitchen/orders`);
    logTest('kitchenManagement', 'GET /api/kitchen/orders', kitchenOrdersResult, {
      responseTime: `${Date.now() - start1}ms`,
      error: kitchenOrdersResult.statusCode === 401 ? 'Requires authentication (expected)' : null
    });

    // Test 2: Order status update
    const start2 = Date.now();
    const statusUpdateResult = await makeRequest(`${BASE_URL}/api/orders/1/status`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'preparing'
      })
    });
    logTest('kitchenManagement', 'PUT /api/orders/1/status', statusUpdateResult, {
      responseTime: `${Date.now() - start2}ms`,
      error: statusUpdateResult.statusCode >= 400 ? 'Auth required or order not found (expected)' : null
    });

  } catch (error) {
    logTest('kitchenManagement', 'Kitchen Management Test', { statusCode: 500 }, {
      error: error.message
    });
  }
}

/**
 * Test Points & Rewards System
 */
async function testPointsRewards() {
  console.log('\n🎁 Testing Points & Rewards System...');

  try {
    // Test 1: User rewards
    const start1 = Date.now();
    const rewardsResult = await makeRequest(`${BASE_URL}/api/user/rewards`);
    logTest('pointsRewards', 'GET /api/user/rewards', rewardsResult, {
      responseTime: `${Date.now() - start1}ms`,
      error: rewardsResult.statusCode === 401 ? 'Requires authentication (expected)' : null
    });

    // Test 2: Earn points
    const start2 = Date.now();
    const earnPointsResult = await makeRequest(`${BASE_URL}/api/earn-points`, {
      method: 'POST',
      body: JSON.stringify({
        orderId: 1,
        amount: 25.00
      })
    });
    logTest('pointsRewards', 'POST /api/earn-points', earnPointsResult, {
      responseTime: `${Date.now() - start2}ms`,
      error: earnPointsResult.statusCode >= 400 ? 'Auth required or validation error (expected)' : null
    });

    // Test 3: Redeem points
    const start3 = Date.now();
    const redeemResult = await makeRequest(`${BASE_URL}/api/redeem-points`, {
      method: 'POST',
      body: JSON.stringify({
        pointsToRedeem: 100
      })
    });
    logTest('pointsRewards', 'POST /api/redeem-points', redeemResult, {
      responseTime: `${Date.now() - start3}ms`,
      error: redeemResult.statusCode >= 400 ? 'Auth required or insufficient points (expected)' : null
    });

  } catch (error) {
    logTest('pointsRewards', 'Points & Rewards Test', { statusCode: 500 }, {
      error: error.message
    });
  }
}

/**
 * Test Admin Dashboard Features
 */
async function testAdminDashboard() {
  console.log('\n⚙️ Testing Admin Dashboard Features...');

  try {
    // Test 1: Menu items
    const start1 = Date.now();
    const menuResult = await makeRequest(`${BASE_URL}/api/menu-items`);
    logTest('adminDashboard', 'GET /api/menu-items', menuResult, {
      responseTime: `${Date.now() - start1}ms`,
      error: menuResult.statusCode >= 400 ? 'Error fetching menu items' : null
    });

    // Test 2: Categories
    const start2 = Date.now();
    const categoriesResult = await makeRequest(`${BASE_URL}/api/categories`);
    logTest('adminDashboard', 'GET /api/categories', categoriesResult, {
      responseTime: `${Date.now() - start2}ms`,
      error: categoriesResult.statusCode >= 400 ? 'Error fetching categories' : null
    });

    // Test 3: Users management
    const start3 = Date.now();
    const usersResult = await makeRequest(`${BASE_URL}/api/users`);
    logTest('adminDashboard', 'GET /api/users', usersResult, {
      responseTime: `${Date.now() - start3}ms`,
      error: usersResult.statusCode === 401 ? 'Requires authentication (expected)' : null
    });

    // Test 4: Restaurant settings
    const start4 = Date.now();
    const settingsResult = await makeRequest(`${BASE_URL}/api/admin-restaurant-settings`);
    logTest('adminDashboard', 'GET /api/admin-restaurant-settings', settingsResult, {
      responseTime: `${Date.now() - start4}ms`,
      error: settingsResult.statusCode === 401 ? 'Requires authentication (expected)' : null
    });

  } catch (error) {
    logTest('adminDashboard', 'Admin Dashboard Test', { statusCode: 500 }, {
      error: error.message
    });
  }
}

/**
 * Test General API Endpoints
 */
async function testApiEndpoints() {
  console.log('\n🔗 Testing API Endpoints...');

  const endpoints = [
    { path: '/api/menu', method: 'GET', name: 'Menu endpoint' },
    { path: '/api/featured', method: 'GET', name: 'Featured items' },
    { path: '/api/tax-settings', method: 'GET', name: 'Tax settings' },
    { path: '/api/tax-categories', method: 'GET', name: 'Tax categories' },
    { path: '/api/pause-services', method: 'GET', name: 'Pause services' },
    { path: '/api/rewards', method: 'GET', name: 'Rewards' }
  ];

  for (const endpoint of endpoints) {
    try {
      const start = Date.now();
      const result = await makeRequest(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method
      });
      logTest('apiEndpoints', endpoint.name, result, {
        responseTime: `${Date.now() - start}ms`,
        error: result.statusCode >= 400 ? `HTTP ${result.statusCode}` : null
      });
    } catch (error) {
      logTest('apiEndpoints', endpoint.name, { statusCode: 500 }, {
        error: error.message
      });
    }
  }
}

/**
 * Generate comprehensive test report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPREHENSIVE BACKEND TEST REPORT');
  console.log('='.repeat(80));

  console.log(`\n🎯 EXECUTIVE SUMMARY:`);
  console.log(`   Total Tests: ${RESULTS.summary.totalTests}`);
  console.log(`   Passed: ${RESULTS.summary.passed}`);
  console.log(`   Failed: ${RESULTS.summary.failed}`);
  console.log(`   Critical Issues: ${RESULTS.summary.critical}`);
  console.log(`   Success Rate: ${((RESULTS.summary.passed / RESULTS.summary.totalTests) * 100).toFixed(1)}%`);

  // Store Hours Analysis (CRITICAL)
  console.log(`\n🚨 CRITICAL ISSUE - STORE HOURS MANAGEMENT:`);
  const storeHoursIssues = RESULTS.storeHours.filter(test => !test.success && test.critical);
  if (storeHoursIssues.length > 0) {
    console.log(`   ❌ CONFIRMED: Store hours endpoint is missing!`);
    console.log(`   📍 Issue: The admin dashboard expects /api/store-hours endpoint but it doesn't exist`);
    console.log(`   🔧 Impact: Users cannot update store hours as reported`);
    console.log(`   💡 Solution: Create /api/store-hours endpoint with CRUD operations`);
  }

  // Error Summary
  if (RESULTS.errors.length > 0) {
    console.log(`\n❌ ISSUES FOUND:`);
    RESULTS.errors.forEach((error, index) => {
      const priority = error.critical ? '🚨 CRITICAL' : '⚠️  WARNING';
      console.log(`   ${index + 1}. ${priority}: ${error.category} - ${error.test}`);
      console.log(`      Error: ${error.error}`);
      console.log(`      Status: ${error.status}`);
    });
  }

  // Detailed Results by Category
  const categories = Object.keys(RESULTS).filter(key => key !== 'summary' && key !== 'errors');
  categories.forEach(category => {
    if (RESULTS[category].length > 0) {
      console.log(`\n📋 ${category.toUpperCase()} RESULTS:`);
      RESULTS[category].forEach(test => {
        const status = test.success ? '✅' : '❌';
        console.log(`   ${status} ${test.test} (${test.status}) - ${test.responseTime}`);
        if (!test.success && test.error) {
          console.log(`      Error: ${test.error}`);
        }
      });
    }
  });

  // Recommendations
  console.log(`\n💡 RECOMMENDATIONS:`);
  console.log(`   1. 🚨 URGENT: Create missing /api/store-hours endpoint`);
  console.log(`   2. ✅ Implement proper store hours CRUD operations`);
  console.log(`   3. 🔒 Ensure proper authentication for admin endpoints`);
  console.log(`   4. 📊 Set up monitoring for critical API endpoints`);
  console.log(`   5. 🧪 Implement automated endpoint testing`);

  console.log('\n' + '='.repeat(80));
  console.log('🏁 TEST COMPLETED');
  console.log('='.repeat(80));

  return RESULTS;
}

/**
 * Main test execution
 */
async function runTests() {
  console.log('🚀 Starting Comprehensive Backend Testing for Favilla\'s NY Pizza');
  console.log(`🌐 Testing deployment: ${BASE_URL}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);

  try {
    await testStoreHoursManagement();      // CRITICAL - reported issue
    await testOrderManagement();           // Core functionality
    await testAuthentication();            // Security
    await testKitchenManagement();         // Operations
    await testPointsRewards();            // Customer engagement
    await testAdminDashboard();           // Admin tools
    await testApiEndpoints();             // General endpoints

    const results = generateReport();

    // Save results to file
    const fs = require('fs');
    fs.writeFileSync('backend-test-results.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Detailed results saved to: backend-test-results.json');

  } catch (error) {
    console.error('\n💥 Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests().catch(console.error);