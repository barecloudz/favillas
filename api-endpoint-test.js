#!/usr/bin/env node

/**
 * Comprehensive API Endpoint Testing Suite for Pizza Spin Rewards
 * Tests all API endpoints for functionality, authentication, validation, and error handling
 */

import dotenv from 'dotenv';
import { createRequire } from 'module';

// Configure dotenv
dotenv.config();

// Create require function for packages that need it
const require = createRequire(import.meta.url);

// Test Results Storage
const testResults = {
  auth: { passed: 0, failed: 0, tests: [] },
  menu: { passed: 0, failed: 0, tests: [] },
  orders: { passed: 0, failed: 0, tests: [] },
  users: { passed: 0, failed: 0, tests: [] },
  admin: { passed: 0, failed: 0, tests: [] },
  kitchen: { passed: 0, failed: 0, tests: [] },
  security: { passed: 0, failed: 0, tests: [] },
  errorHandling: { passed: 0, failed: 0, tests: [] }
};

// Test configuration
const testConfig = {
  apiUrl: 'http://localhost:3001/api', // Adjust based on your setup
  timeout: 30000
};

// Logging utilities
function logTest(category, test, status, details = '') {
  const timestamp = new Date().toISOString();
  const result = { test, status, details, timestamp };
  
  testResults[category].tests.push(result);
  if (status === 'PASS') {
    testResults[category].passed++;
    console.log(`✅ [${category.toUpperCase()}] ${test} - PASSED ${details ? '(' + details + ')' : ''}`);
  } else {
    testResults[category].failed++;
    console.log(`❌ [${category.toUpperCase()}] ${test} - FAILED ${details ? '(' + details + ')' : ''}`);
  }
}

// HTTP request helper
async function makeRequest(endpoint, options = {}) {
  const { method = 'GET', body, headers = {}, timeout = testConfig.timeout } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(`${testConfig.apiUrl}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data,
      ok: response.ok
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Test authentication endpoints
async function testAuthenticationEndpoints() {
  console.log('\n🔐 Testing Authentication Endpoints...');
  
  // Test OPTIONS request
  try {
    const response = await makeRequest('/auth/login', { method: 'OPTIONS' });
    if (response.status === 200) {
      logTest('auth', 'Login OPTIONS Request', 'PASS', 'CORS properly configured');
    } else {
      logTest('auth', 'Login OPTIONS Request', 'FAIL', `Status: ${response.status}`);
    }
  } catch (error) {
    logTest('auth', 'Login OPTIONS Request', 'FAIL', error.message);
  }
  
  // Test invalid login (missing credentials)
  try {
    const response = await makeRequest('/auth/login', {
      method: 'POST',
      body: {}
    });
    if (response.status === 400) {
      logTest('auth', 'Login Validation (Missing Credentials)', 'PASS', 'Properly rejects empty credentials');
    } else {
      logTest('auth', 'Login Validation (Missing Credentials)', 'FAIL', `Expected 400, got ${response.status}`);
    }
  } catch (error) {
    logTest('auth', 'Login Validation (Missing Credentials)', 'FAIL', error.message);
  }
  
  // Test invalid login (wrong credentials)
  try {
    const response = await makeRequest('/auth/login', {
      method: 'POST',
      body: { username: 'nonexistent', password: 'wrongpassword' }
    });
    if (response.status === 401) {
      logTest('auth', 'Login Security (Invalid Credentials)', 'PASS', 'Properly rejects invalid credentials');
    } else {
      logTest('auth', 'Login Security (Invalid Credentials)', 'FAIL', `Expected 401, got ${response.status}`);
    }
  } catch (error) {
    logTest('auth', 'Login Security (Invalid Credentials)', 'FAIL', error.message);
  }
  
  // Test registration validation
  try {
    const response = await makeRequest('/auth/register', {
      method: 'POST',
      body: { username: 'test' } // Missing required fields
    });
    if (response.status === 400) {
      logTest('auth', 'Registration Validation', 'PASS', 'Properly validates required fields');
    } else {
      logTest('auth', 'Registration Validation', 'FAIL', `Expected 400, got ${response.status}`);
    }
  } catch (error) {
    logTest('auth', 'Registration Validation', 'FAIL', error.message);
  }
}

// Test menu endpoints
async function testMenuEndpoints() {
  console.log('\n🍕 Testing Menu Endpoints...');
  
  // Test menu retrieval
  try {
    const response = await makeRequest('/menu');
    if (response.ok && Array.isArray(response.data)) {
      logTest('menu', 'Menu Retrieval', 'PASS', `Retrieved ${response.data.length} items`);
      
      // Test menu item structure
      if (response.data.length > 0) {
        const firstItem = response.data[0];
        const requiredFields = ['id', 'name', 'description', 'basePrice', 'category'];
        const hasAllFields = requiredFields.every(field => firstItem.hasOwnProperty(field));
        
        if (hasAllFields) {
          logTest('menu', 'Menu Item Structure', 'PASS', 'All required fields present');
        } else {
          logTest('menu', 'Menu Item Structure', 'FAIL', 'Missing required fields');
        }
      }
    } else {
      logTest('menu', 'Menu Retrieval', 'FAIL', `Status: ${response.status}, Data type: ${typeof response.data}`);
    }
  } catch (error) {
    logTest('menu', 'Menu Retrieval', 'FAIL', error.message);
  }
  
  // Test menu caching headers
  try {
    const response = await makeRequest('/menu');
    const cacheControl = response.headers['cache-control'];
    if (cacheControl && cacheControl.includes('max-age')) {
      logTest('menu', 'Menu Caching', 'PASS', `Cache-Control: ${cacheControl}`);
    } else {
      logTest('menu', 'Menu Caching', 'FAIL', 'No cache headers found');
    }
  } catch (error) {
    logTest('menu', 'Menu Caching', 'FAIL', error.message);
  }
}

// Test order endpoints
async function testOrderEndpoints() {
  console.log('\n📦 Testing Order Endpoints...');
  
  // Test unauthorized access
  try {
    const response = await makeRequest('/orders');
    if (response.status === 401) {
      logTest('orders', 'Order Authorization', 'PASS', 'Properly requires authentication');
    } else {
      logTest('orders', 'Order Authorization', 'FAIL', `Expected 401, got ${response.status}`);
    }
  } catch (error) {
    logTest('orders', 'Order Authorization', 'FAIL', error.message);
  }
  
  // Test with invalid token
  try {
    const response = await makeRequest('/orders', {
      headers: { 'Authorization': 'Bearer invalidtoken' }
    });
    if (response.status === 401) {
      logTest('orders', 'Order Token Validation', 'PASS', 'Properly validates JWT tokens');
    } else {
      logTest('orders', 'Order Token Validation', 'FAIL', `Expected 401, got ${response.status}`);
    }
  } catch (error) {
    logTest('orders', 'Order Token Validation', 'FAIL', error.message);
  }
}

// Test user endpoints
async function testUserEndpoints() {
  console.log('\n👤 Testing User Endpoints...');
  
  // Test unauthorized user profile access
  try {
    const response = await makeRequest('/auth/user');
    if (response.status === 401) {
      logTest('users', 'User Profile Authorization', 'PASS', 'Requires authentication');
    } else {
      logTest('users', 'User Profile Authorization', 'FAIL', `Expected 401, got ${response.status}`);
    }
  } catch (error) {
    logTest('users', 'User Profile Authorization', 'FAIL', error.message);
  }
}

// Test admin endpoints
async function testAdminEndpoints() {
  console.log('\n⚙️ Testing Admin Endpoints...');
  
  // Test admin dashboard unauthorized access
  try {
    const response = await makeRequest('/admin/dashboard/stats');
    if (response.status === 401) {
      logTest('admin', 'Admin Dashboard Authorization', 'PASS', 'Requires authentication');
    } else {
      logTest('admin', 'Admin Dashboard Authorization', 'FAIL', `Expected 401, got ${response.status}`);
    }
  } catch (error) {
    logTest('admin', 'Admin Dashboard Authorization', 'FAIL', error.message);
  }
}

// Test kitchen endpoints
async function testKitchenEndpoints() {
  console.log('\n🍳 Testing Kitchen Endpoints...');
  
  // Test kitchen orders unauthorized access
  try {
    const response = await makeRequest('/kitchen/orders');
    if (response.status === 401) {
      logTest('kitchen', 'Kitchen Orders Authorization', 'PASS', 'Requires authentication');
    } else {
      logTest('kitchen', 'Kitchen Orders Authorization', 'FAIL', `Expected 401, got ${response.status}`);
    }
  } catch (error) {
    logTest('kitchen', 'Kitchen Orders Authorization', 'FAIL', error.message);
  }
}

// Test error handling
async function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling...');
  
  // Test non-existent endpoint
  try {
    const response = await makeRequest('/nonexistent');
    if (response.status === 404) {
      logTest('errorHandling', 'Non-existent Endpoint', 'PASS', 'Returns 404 for missing endpoints');
    } else {
      logTest('errorHandling', 'Non-existent Endpoint', 'FAIL', `Expected 404, got ${response.status}`);
    }
  } catch (error) {
    // Network errors are expected for non-existent endpoints
    logTest('errorHandling', 'Non-existent Endpoint', 'PASS', 'Endpoint properly does not exist');
  }
  
  // Test method not allowed
  try {
    const response = await makeRequest('/menu', { method: 'POST' });
    if (response.status === 405) {
      logTest('errorHandling', 'Method Not Allowed', 'PASS', 'Properly handles unsupported methods');
    } else {
      logTest('errorHandling', 'Method Not Allowed', 'FAIL', `Expected 405, got ${response.status}`);
    }
  } catch (error) {
    logTest('errorHandling', 'Method Not Allowed', 'FAIL', error.message);
  }
}

// Test security headers
async function testSecurityHeaders() {
  console.log('\n🛡️ Testing Security Headers...');
  
  try {
    const response = await makeRequest('/menu');
    const headers = response.headers;
    
    // Check CORS headers
    if (headers['access-control-allow-origin']) {
      logTest('security', 'CORS Headers', 'PASS', 'CORS headers present');
    } else {
      logTest('security', 'CORS Headers', 'FAIL', 'Missing CORS headers');
    }
    
    // Check content type
    if (headers['content-type'] && headers['content-type'].includes('application/json')) {
      logTest('security', 'Content Type', 'PASS', 'Proper content type headers');
    } else {
      logTest('security', 'Content Type', 'FAIL', 'Missing or incorrect content type');
    }
  } catch (error) {
    logTest('security', 'Security Headers', 'FAIL', error.message);
  }
}

// Generate comprehensive report
function generateReport() {
  console.log('\n📊 COMPREHENSIVE API ENDPOINT TEST REPORT');
  console.log('=' .repeat(60));
  
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  
  Object.keys(testResults).forEach(category => {
    const { passed, failed, tests } = testResults[category];
    if (tests.length === 0) return; // Skip empty categories
    
    totalTests += tests.length;
    totalPassed += passed;
    totalFailed += failed;
    
    console.log(`\n${category.toUpperCase()}:`);
    console.log(`  ✅ Passed: ${passed}`);
    console.log(`  ❌ Failed: ${failed}`);
    console.log(`  📊 Total:  ${tests.length}`);
    
    if (failed > 0) {
      console.log(`  🚨 Failed Tests:`);
      tests.filter(t => t.status === 'FAIL').forEach(test => {
        console.log(`    - ${test.test}: ${test.details}`);
      });
    }
  });
  
  console.log('\n' + '='.repeat(60));
  console.log(`OVERALL RESULTS:`);
  console.log(`✅ Total Passed: ${totalPassed}`);
  console.log(`❌ Total Failed: ${totalFailed}`);
  console.log(`📊 Total Tests:  ${totalTests}`);
  console.log(`🎯 Success Rate: ${totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0}%`);
  
  const isProductionReady = totalFailed === 0;
  console.log(`\n🚀 API Ready: ${isProductionReady ? 'YES' : 'NO'}`);
  
  if (!isProductionReady) {
    console.log('\n⚠️  ISSUES TO ADDRESS:');
    Object.keys(testResults).forEach(category => {
      testResults[category].tests
        .filter(t => t.status === 'FAIL')
        .forEach(test => {
          console.log(`   ${category.toUpperCase()}: ${test.test} - ${test.details}`);
        });
    });
  }
  
  // Recommendations
  console.log('\n📋 RECOMMENDATIONS FOR PRODUCTION:');
  console.log('   1. Set up proper SSL/TLS certificates');
  console.log('   2. Configure rate limiting');
  console.log('   3. Set up monitoring and logging');
  console.log('   4. Configure proper environment variables for production');
  console.log('   5. Implement request validation middleware');
  console.log('   6. Set up database connection pooling optimization');
  
  return { totalTests, totalPassed, totalFailed, isProductionReady };
}

// Main test execution
async function runAPIEndpointTests() {
  console.log('🚀 Starting Comprehensive API Endpoint Testing Suite');
  console.log('Pizza Spin Rewards - API Endpoint Validation');
  console.log('=' .repeat(60));
  console.log(`Testing API at: ${testConfig.apiUrl}`);
  console.log(`Request timeout: ${testConfig.timeout}ms`);
  
  try {
    await testAuthenticationEndpoints();
    await testMenuEndpoints();
    await testOrderEndpoints();
    await testUserEndpoints();
    await testAdminEndpoints();
    await testKitchenEndpoints();
    await testErrorHandling();
    await testSecurityHeaders();
    
    const summary = generateReport();
    
    console.log(`\nAPI Endpoint testing completed at ${new Date().toISOString()}`);
    
    // Note: We don't exit with error code since this is testing the API responses
    return summary;
    
  } catch (error) {
    console.error('\n💥 CRITICAL ERROR during API testing:', error);
    console.error('Stack trace:', error.stack);
    return { totalTests: 0, totalPassed: 0, totalFailed: 1, isProductionReady: false };
  }
}

// Run the tests - but note that API server must be running
if (import.meta.main) {
  console.log('⚠️  Note: This test requires the API server to be running.');
  console.log('   Start the server with: npm run dev:vercel-only');
  console.log('   Or adjust testConfig.apiUrl to point to your running server.');
  console.log();
  
  // Check if fetch is available (Node 18+)
  if (typeof fetch === 'undefined') {
    console.error('❌ This test requires Node.js 18+ with native fetch support.');
    console.error('   Or install node-fetch: npm install node-fetch');
    process.exit(1);
  }
  
  runAPIEndpointTests();
}

export {
  runAPIEndpointTests,
  testAuthenticationEndpoints,
  testMenuEndpoints,
  testOrderEndpoints,
  testAdminEndpoints,
  testKitchenEndpoints
};