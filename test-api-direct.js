/**
 * Test API endpoints directly without going through frontend
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3003';

async function testApiEndpoints() {
  console.log('Testing API endpoints directly...');
  
  // Test 1: Check if any endpoint responds
  console.log('\n1. Testing basic endpoint response...');
  try {
    const response = await fetch(`${BASE_URL}/api/user`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log(`Response body: "${text}"`);
    
    if (response.status === 401) {
      console.log('✓ Endpoint responding correctly (unauthorized as expected)');
    }
  } catch (error) {
    console.error('❌ Endpoint test failed:', error.message);
  }
  
  // Test 2: Test registration endpoint
  console.log('\n2. Testing registration endpoint...');
  const testUser = {
    username: `testuser_${Date.now()}`,
    email: `test${Date.now()}@test.com`,
    password: 'password123',
    firstName: 'Test',
    lastName: 'User'
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Origin': BASE_URL
      },
      body: JSON.stringify(testUser)
    });
    
    console.log(`Status: ${response.status}`);
    console.log(`Headers:`, Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log(`Response body: "${text}"`);
    
    if (response.ok) {
      console.log('✓ Registration endpoint working');
      try {
        const data = JSON.parse(text);
        console.log('✓ Response is valid JSON');
        if (data.user && data.token) {
          console.log('✓ Response contains user and token');
        }
      } catch (e) {
        console.log('❌ Response is not valid JSON');
      }
    } else {
      console.log('❌ Registration endpoint failed');
    }
  } catch (error) {
    console.error('❌ Registration test failed:', error.message);
  }
  
  // Test 3: Test available endpoints
  console.log('\n3. Testing various endpoints...');
  const endpoints = [
    { method: 'GET', path: '/api/user' },
    { method: 'POST', path: '/api/auth/login' },
    { method: 'POST', path: '/api/auth/logout' },
    { method: 'GET', path: '/api/users' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint.path}`, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log(`${endpoint.method} ${endpoint.path}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`${endpoint.method} ${endpoint.path}: ERROR - ${error.message}`);
    }
  }
  
  console.log('\nAPI endpoint testing complete.');
}

testApiEndpoints()
  .catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });