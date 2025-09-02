import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const baseUrl = 'http://localhost:3000';

// Test authentication endpoints
async function testAuth() {
  console.log('\n=== Testing Authentication Endpoints ===');
  
  try {
    // Test registration
    console.log('Testing registration...');
    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpass123',
        firstName: 'Test',
        lastName: 'User'
      })
    });
    
    if (registerResponse.ok) {
      const registerData = await registerResponse.json();
      console.log('✓ Registration successful');
      
      // Test login
      console.log('Testing login...');
      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: 'testuser',
          password: 'testpass123'
        })
      });
      
      if (loginResponse.ok) {
        const loginData = await loginResponse.json();
        console.log('✓ Login successful');
        
        const token = loginData.token;
        
        // Test user endpoint
        console.log('Testing user endpoint...');
        const userResponse = await fetch(`${baseUrl}/api/auth/user`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (userResponse.ok) {
          console.log('✓ User endpoint working');
        } else {
          console.log('✗ User endpoint failed:', await userResponse.text());
        }
        
        return token;
      } else {
        console.log('✗ Login failed:', await loginResponse.text());
      }
    } else {
      console.log('✗ Registration failed:', await registerResponse.text());
    }
  } catch (error) {
    console.log('✗ Auth test error:', error.message);
  }
  
  return null;
}

// Test menu endpoints
async function testMenu(token) {
  console.log('\n=== Testing Menu Endpoints ===');
  
  try {
    // Test getting menu
    console.log('Testing get menu...');
    const menuResponse = await fetch(`${baseUrl}/api/menu`);
    
    if (menuResponse.ok) {
      const menuData = await menuResponse.json();
      console.log(`✓ Menu endpoint working - found ${menuData.length} items`);
      
      // Test individual menu item if available
      if (menuData.length > 0) {
        const firstItem = menuData[0];
        const itemResponse = await fetch(`${baseUrl}/api/menu/${firstItem.id}`);
        
        if (itemResponse.ok) {
          console.log('✓ Individual menu item endpoint working');
        } else {
          console.log('✗ Individual menu item failed:', await itemResponse.text());
        }
      }
    } else {
      console.log('✗ Menu endpoint failed:', await menuResponse.text());
    }
  } catch (error) {
    console.log('✗ Menu test error:', error.message);
  }
}

// Test orders endpoints
async function testOrders(token) {
  console.log('\n=== Testing Orders Endpoints ===');
  
  if (!token) {
    console.log('✗ No token available for orders test');
    return;
  }
  
  try {
    // Test getting orders
    console.log('Testing get orders...');
    const ordersResponse = await fetch(`${baseUrl}/api/orders`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (ordersResponse.ok) {
      const ordersData = await ordersResponse.json();
      console.log(`✓ Orders endpoint working - found ${ordersData.length} orders`);
    } else {
      console.log('✗ Orders endpoint failed:', await ordersResponse.text());
    }
  } catch (error) {
    console.log('✗ Orders test error:', error.message);
  }
}

// Test users endpoints
async function testUsers(token) {
  console.log('\n=== Testing Users Endpoints ===');
  
  if (!token) {
    console.log('✗ No token available for users test');
    return;
  }
  
  try {
    // Test getting users (should fail for non-admin)
    console.log('Testing get users...');
    const usersResponse = await fetch(`${baseUrl}/api/users`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (usersResponse.status === 403) {
      console.log('✓ Users endpoint properly secured (403 Forbidden)');
    } else if (usersResponse.ok) {
      console.log('✓ Users endpoint working (admin access)');
    } else {
      console.log('✗ Users endpoint failed:', await usersResponse.text());
    }
  } catch (error) {
    console.log('✗ Users test error:', error.message);
  }
}

// Main test function
async function runTests() {
  console.log('Starting API endpoint tests...');
  
  const token = await testAuth();
  await testMenu(token);
  await testOrders(token);
  await testUsers(token);
  
  console.log('\n=== Test Summary ===');
  console.log('Tests completed. Check output above for results.');
}

runTests();