#!/usr/bin/env node

/**
 * Test script for the Rewards API endpoints
 * 
 * Usage: node test-rewards-api.js
 * 
 * Make sure your server is running and you have test data in the database
 */

const API_BASE = 'http://localhost:3000/api';

// Test JWT token (you'll need to get this from a login request)
let testToken = '';

async function makeRequest(endpoint, method = 'GET', body = null) {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (testToken) {
    headers.Authorization = `Bearer ${testToken}`;
  }
  
  const config = {
    method,
    headers,
  };
  
  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
  }
  
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, config);
    const data = await response.json();
    
    console.log(`${method} ${endpoint}`);
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));
    console.log('---');
    
    return { status: response.status, data };
  } catch (error) {
    console.error(`Error testing ${method} ${endpoint}:`, error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Testing Rewards API Endpoints');
  console.log('================================');
  
  // Note: You'll need to manually set a valid JWT token from a login request
  if (!testToken) {
    console.log('⚠️  No test token provided. Some endpoints will fail.');
    console.log('   Get a token by logging in first and update the testToken variable.');
    console.log('');
  }
  
  // Test 1: Customer Points Balance
  console.log('📊 Testing Customer Points Balance...');
  await makeRequest('/customer/points');
  
  // Test 2: Available Rewards
  console.log('🎁 Testing Available Rewards...');
  await makeRequest('/customer/rewards');
  
  // Test 3: Admin Points Management (requires admin token)
  console.log('👑 Testing Admin Points Management...');
  await makeRequest('/admin/points');
  
  // Test 4: Admin Rewards Management
  console.log('⚙️  Testing Admin Rewards Management...');
  await makeRequest('/admin/rewards');
  
  // Test 5: Loyalty Program Configuration
  console.log('💎 Testing Loyalty Program Configuration...');
  await makeRequest('/admin/loyalty-program');
  
  // Test 6: Create a test reward (admin only)
  console.log('➕ Testing Create Reward...');
  await makeRequest('/admin/rewards', 'POST', {
    name: 'Test Free Pizza',
    description: 'Get a free medium pizza',
    pointsRequired: 500,
    rewardType: 'free_item',
    rewardValue: '15.99',
    rewardDescription: 'Free medium pizza (any toppings)',
    isActive: true,
  });
  
  // Test 7: Points Redemption (requires customer with enough points)
  console.log('💰 Testing Points Redemption...');
  await makeRequest('/customer/redeem', 'POST', {
    rewardId: 1, // Assuming reward ID 1 exists
  });
  
  console.log('✅ Testing complete!');
  console.log('');
  console.log('📝 API Endpoints Summary:');
  console.log('- GET  /api/customer/points           - Get customer points balance and history');
  console.log('- GET  /api/customer/rewards          - Get available rewards');
  console.log('- POST /api/customer/redeem           - Redeem points for rewards');
  console.log('- GET  /api/admin/points              - Admin points management');
  console.log('- POST /api/admin/points              - Award/adjust customer points');
  console.log('- GET  /api/admin/rewards             - Manage rewards catalog');
  console.log('- POST /api/admin/rewards             - Create new reward');
  console.log('- GET  /api/admin/loyalty-program     - Loyalty program configuration');
  console.log('- POST /api/admin/loyalty-program     - Update loyalty program settings');
  console.log('');
  console.log('🎯 Integration Points:');
  console.log('- Order completion automatically awards points');
  console.log('- User registration awards signup bonus points');
  console.log('- All transactions are logged for auditing');
  console.log('- Thread-safe redemptions with database transactions');
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ with built-in fetch API');
  console.log('   Alternatively, install node-fetch: npm install node-fetch');
  process.exit(1);
}

runTests().catch(console.error);