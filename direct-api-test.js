#!/usr/bin/env node

/**
 * Direct API Testing Suite - Tests API endpoints as functions
 * This bypasses HTTP and tests the underlying logic directly
 */

import dotenv from 'dotenv';
import { createRequire } from 'module';

// Configure dotenv
dotenv.config();

// Create require function for packages that need it
const require = createRequire(import.meta.url);

// Test Results Storage
const testResults = {
  menu: { passed: 0, failed: 0, tests: [] },
  auth: { passed: 0, failed: 0, tests: [] },
  orders: { passed: 0, failed: 0, tests: [] },
  validation: { passed: 0, failed: 0, tests: [] },
  database: { passed: 0, failed: 0, tests: [] }
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

// Mock Vercel Request/Response objects
function createMockRequest(method = 'GET', body = null, headers = {}) {
  return {
    method,
    body,
    headers: {
      'origin': 'http://localhost:3000',
      'content-type': 'application/json',
      ...headers
    },
    query: {}
  };
}

function createMockResponse() {
  const response = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
    end() { return this; }
  };
  return response;
}

// Test Menu API
async function testMenuAPI() {
  console.log('\n🍕 Testing Menu API Directly...');
  
  try {
    // Import the menu handler
    const { default: menuHandler } = await import('./api/menu.ts');
    
    const req = createMockRequest('GET');
    const res = createMockResponse();
    
    await menuHandler(req, res);
    
    if (res.statusCode === 200) {
      logTest('menu', 'Menu Handler Execution', 'PASS', `Status: ${res.statusCode}`);
      
      // Test response structure
      if (Array.isArray(res.body)) {
        logTest('menu', 'Menu Response Format', 'PASS', `Array with ${res.body.length} items`);
        
        // Test menu item structure
        if (res.body.length > 0) {
          const item = res.body[0];
          const requiredFields = ['id', 'name', 'description', 'basePrice', 'category'];
          const hasAllFields = requiredFields.every(field => item.hasOwnProperty(field));
          
          if (hasAllFields) {
            logTest('menu', 'Menu Item Structure', 'PASS', 'All required fields present');
          } else {
            const missingFields = requiredFields.filter(field => !item.hasOwnProperty(field));
            logTest('menu', 'Menu Item Structure', 'FAIL', `Missing fields: ${missingFields.join(', ')}`);
          }
        }
      } else {
        logTest('menu', 'Menu Response Format', 'FAIL', `Expected array, got ${typeof res.body}`);
      }
      
      // Test caching headers
      if (res.headers['cache-control']) {
        logTest('menu', 'Menu Caching Headers', 'PASS', `Cache-Control: ${res.headers['cache-control']}`);
      } else {
        logTest('menu', 'Menu Caching Headers', 'FAIL', 'Missing cache headers');
      }
      
    } else {
      logTest('menu', 'Menu Handler Execution', 'FAIL', `Status: ${res.statusCode}, Body: ${JSON.stringify(res.body)}`);
    }
    
    // Test invalid method
    const invalidReq = createMockRequest('DELETE');
    const invalidRes = createMockResponse();
    await menuHandler(invalidReq, invalidRes);
    
    if (invalidRes.statusCode === 405) {
      logTest('menu', 'Menu Invalid Method Handling', 'PASS', 'Properly rejects unsupported methods');
    } else {
      logTest('menu', 'Menu Invalid Method Handling', 'FAIL', `Expected 405, got ${invalidRes.statusCode}`);
    }
    
  } catch (error) {
    logTest('menu', 'Menu API Import/Execution', 'FAIL', error.message);
  }
}

// Test Authentication API
async function testAuthenticationAPI() {
  console.log('\n🔐 Testing Authentication API Directly...');
  
  try {
    // Test login handler
    const { default: loginHandler } = await import('./api/auth/login.ts');
    
    // Test missing credentials
    const invalidReq = createMockRequest('POST', {});
    const invalidRes = createMockResponse();
    
    await loginHandler(invalidReq, invalidRes);
    
    if (invalidRes.statusCode === 400) {
      logTest('auth', 'Login Validation (Missing Credentials)', 'PASS', 'Properly validates required fields');
    } else {
      logTest('auth', 'Login Validation (Missing Credentials)', 'FAIL', `Expected 400, got ${invalidRes.statusCode}`);
    }
    
    // Test invalid credentials
    const wrongCredsReq = createMockRequest('POST', { 
      username: 'nonexistent', 
      password: 'wrongpassword' 
    });
    const wrongCredsRes = createMockResponse();
    
    await loginHandler(wrongCredsReq, wrongCredsRes);
    
    if (wrongCredsRes.statusCode === 401) {
      logTest('auth', 'Login Invalid Credentials', 'PASS', 'Properly rejects invalid credentials');
    } else {
      logTest('auth', 'Login Invalid Credentials', 'FAIL', `Expected 401, got ${wrongCredsRes.statusCode}`);
    }
    
    // Test method validation
    const optionsReq = createMockRequest('OPTIONS');
    const optionsRes = createMockResponse();
    
    await loginHandler(optionsReq, optionsRes);
    
    if (optionsRes.statusCode === 200) {
      logTest('auth', 'Login OPTIONS Method', 'PASS', 'CORS preflight handled correctly');
    } else {
      logTest('auth', 'Login OPTIONS Method', 'FAIL', `Expected 200, got ${optionsRes.statusCode}`);
    }
    
  } catch (error) {
    logTest('auth', 'Authentication API Import/Execution', 'FAIL', error.message);
  }
  
  // Test registration handler
  try {
    const { default: registerHandler } = await import('./api/auth/register.ts');
    
    // Test missing fields
    const incompleteReq = createMockRequest('POST', { username: 'test' });
    const incompleteRes = createMockResponse();
    
    await registerHandler(incompleteReq, incompleteRes);
    
    if (incompleteRes.statusCode === 400) {
      logTest('auth', 'Registration Validation', 'PASS', 'Properly validates required registration fields');
    } else {
      logTest('auth', 'Registration Validation', 'FAIL', `Expected 400, got ${incompleteRes.statusCode}`);
    }
    
  } catch (error) {
    logTest('auth', 'Registration API Import/Execution', 'FAIL', error.message);
  }
}

// Test Order API
async function testOrderAPI() {
  console.log('\n📦 Testing Order API Directly...');
  
  try {
    const { default: orderHandler } = await import('./api/orders.ts');
    
    // Test unauthorized access
    const unauthorizedReq = createMockRequest('GET');
    const unauthorizedRes = createMockResponse();
    
    await orderHandler(unauthorizedReq, unauthorizedRes);
    
    if (unauthorizedRes.statusCode === 401) {
      logTest('orders', 'Order Authorization Required', 'PASS', 'Properly requires authentication');
    } else {
      logTest('orders', 'Order Authorization Required', 'FAIL', `Expected 401, got ${unauthorizedRes.statusCode}`);
    }
    
    // Test with invalid token
    const invalidTokenReq = createMockRequest('GET', null, {
      'authorization': 'Bearer invalidtoken123'
    });
    const invalidTokenRes = createMockResponse();
    
    await orderHandler(invalidTokenReq, invalidTokenRes);
    
    if (invalidTokenRes.statusCode === 401) {
      logTest('orders', 'Order Token Validation', 'PASS', 'Properly validates JWT tokens');
    } else {
      logTest('orders', 'Order Token Validation', 'FAIL', `Expected 401, got ${invalidTokenRes.statusCode}`);
    }
    
  } catch (error) {
    logTest('orders', 'Order API Import/Execution', 'FAIL', error.message);
  }
}

// Test Database Schema Validation
async function testDatabaseSchema() {
  console.log('\n🗄️ Testing Database Schema...');
  
  try {
    const schema = await import('./shared/schema.ts');
    
    // Test that all expected tables exist
    const expectedTables = [
      'users', 'menuItems', 'orders', 'orderItems', 'categories',
      'rewards', 'userRewards', 'promoCodes', 'loyaltyProgram'
    ];
    
    let foundTables = 0;
    expectedTables.forEach(tableName => {
      if (schema[tableName]) {
        foundTables++;
      }
    });
    
    if (foundTables === expectedTables.length) {
      logTest('database', 'Schema Table Definitions', 'PASS', `All ${expectedTables.length} expected tables defined`);
    } else {
      logTest('database', 'Schema Table Definitions', 'FAIL', `Found ${foundTables}/${expectedTables.length} expected tables`);
    }
    
    // Test that insert schemas exist
    const expectedInsertSchemas = [
      'insertUserSchema', 'insertMenuItemSchema', 'insertOrderSchema', 'insertOrderItemSchema'
    ];
    
    let foundSchemas = 0;
    expectedInsertSchemas.forEach(schemaName => {
      if (schema[schemaName]) {
        foundSchemas++;
      }
    });
    
    if (foundSchemas === expectedInsertSchemas.length) {
      logTest('database', 'Insert Schema Definitions', 'PASS', `All ${expectedInsertSchemas.length} insert schemas defined`);
    } else {
      logTest('database', 'Insert Schema Definitions', 'FAIL', `Found ${foundSchemas}/${expectedInsertSchemas.length} insert schemas`);
    }
    
    // Test type definitions
    const expectedTypes = ['User', 'MenuItem', 'Order', 'OrderItem'];
    let foundTypes = 0;
    
    // This is a simplified check - in a real scenario we'd use TypeScript compiler API
    const schemaContent = JSON.stringify(schema);
    expectedTypes.forEach(typeName => {
      if (schemaContent.includes(`export type ${typeName}`)) {
        foundTypes++;
      }
    });
    
    if (foundTypes >= expectedTypes.length - 1) { // Allow some flexibility
      logTest('database', 'Type Definitions Export', 'PASS', `Core types appear to be exported`);
    } else {
      logTest('database', 'Type Definitions Export', 'FAIL', `Missing type exports`);
    }
    
  } catch (error) {
    logTest('database', 'Database Schema Import', 'FAIL', error.message);
  }
}

// Test Validation Logic
async function testValidationLogic() {
  console.log('\n✅ Testing Validation Logic...');
  
  try {
    const schema = await import('./shared/schema.ts');
    
    // Test user schema validation
    if (schema.insertUserSchema) {
      try {
        // Test valid user data
        const validUser = {
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User'
        };
        
        const result = schema.insertUserSchema.safeParse(validUser);
        if (result.success) {
          logTest('validation', 'User Schema Valid Data', 'PASS', 'Valid user data accepted');
        } else {
          logTest('validation', 'User Schema Valid Data', 'FAIL', `Validation failed: ${result.error?.message}`);
        }
        
        // Test invalid user data
        const invalidUser = { username: 'test' }; // Missing required fields
        const invalidResult = schema.insertUserSchema.safeParse(invalidUser);
        
        if (!invalidResult.success) {
          logTest('validation', 'User Schema Invalid Data', 'PASS', 'Invalid user data properly rejected');
        } else {
          logTest('validation', 'User Schema Invalid Data', 'FAIL', 'Invalid user data was accepted');
        }
        
      } catch (error) {
        logTest('validation', 'User Schema Validation', 'FAIL', error.message);
      }
    } else {
      logTest('validation', 'User Schema Availability', 'FAIL', 'User schema not found');
    }
    
  } catch (error) {
    logTest('validation', 'Validation Logic Import', 'FAIL', error.message);
  }
}

// Generate comprehensive report
function generateReport() {
  console.log('\n📊 DIRECT API TEST REPORT');
  console.log('=' .repeat(50));
  
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  
  Object.keys(testResults).forEach(category => {
    const { passed, failed, tests } = testResults[category];
    if (tests.length === 0) return;
    
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
  
  console.log('\n' + '='.repeat(50));
  console.log(`OVERALL RESULTS:`);
  console.log(`✅ Total Passed: ${totalPassed}`);
  console.log(`❌ Total Failed: ${totalFailed}`);
  console.log(`📊 Total Tests:  ${totalTests}`);
  
  if (totalTests > 0) {
    console.log(`🎯 Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
  }
  
  const criticalFailures = testResults.auth.failed + testResults.database.failed;
  const isProductionReady = criticalFailures === 0 && totalFailed < 3;
  
  console.log(`\n🚀 Production Ready: ${isProductionReady ? 'YES' : 'NO'}`);
  
  if (!isProductionReady) {
    console.log('\n⚠️  CRITICAL ISSUES TO ADDRESS:');
    ['auth', 'database'].forEach(category => {
      testResults[category].tests
        .filter(t => t.status === 'FAIL')
        .forEach(test => {
          console.log(`   ${category.toUpperCase()}: ${test.test} - ${test.details}`);
        });
    });
  }
  
  console.log('\n🔧 API FUNCTIONALITY SUMMARY:');
  console.log(`   Menu API: ${testResults.menu.failed === 0 ? '✅ Working' : '❌ Issues detected'}`);
  console.log(`   Auth API: ${testResults.auth.failed === 0 ? '✅ Working' : '❌ Issues detected'}`);
  console.log(`   Orders API: ${testResults.orders.failed === 0 ? '✅ Working' : '❌ Issues detected'}`);
  console.log(`   Database Schema: ${testResults.database.failed === 0 ? '✅ Working' : '❌ Issues detected'}`);
  console.log(`   Validation Logic: ${testResults.validation.failed === 0 ? '✅ Working' : '❌ Issues detected'}`);
  
  return { totalTests, totalPassed, totalFailed, isProductionReady };
}

// Main test execution
async function runDirectAPITests() {
  console.log('🚀 Starting Direct API Testing Suite');
  console.log('Pizza Spin Rewards - Direct Function Testing');
  console.log('=' .repeat(50));
  
  try {
    await testDatabaseSchema();
    await testValidationLogic();
    await testMenuAPI();
    await testAuthenticationAPI();
    await testOrderAPI();
    
    const summary = generateReport();
    
    console.log(`\nDirect API testing completed at ${new Date().toISOString()}`);
    
    return summary;
    
  } catch (error) {
    console.error('\n💥 CRITICAL ERROR during direct API testing:', error);
    console.error('Stack trace:', error.stack);
    return { totalTests: 0, totalPassed: 0, totalFailed: 1, isProductionReady: false };
  }
}

// Run the tests
if (import.meta.main) {
  runDirectAPITests();
}

export { runDirectAPITests };