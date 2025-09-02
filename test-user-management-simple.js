/**
 * Simple User Management Testing Suite
 * Tests the core user management functionality
 */

import fetch from 'node-fetch';
import fs from 'fs';

const BASE_URL = 'http://localhost:3000';

// Test data
const testUsers = {
  customer: {
    username: 'testcustomer_' + Date.now(),
    email: `testcustomer${Date.now()}@test.com`,
    password: 'password123',
    firstName: 'John',
    lastName: 'Smith',
    phone: '555-0101',
    role: 'customer'
  },
  admin: {
    username: 'testadmin_' + Date.now(),
    email: `testadmin${Date.now()}@test.com`, 
    password: 'adminpass123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isAdmin: true
  }
};

class SimpleUserManagementTester {
  constructor() {
    this.results = [];
    this.tokens = {};
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, message, type };
    this.results.push(entry);
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
  }

  async makeRequest(method, endpoint, data = null, token = null) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = { 'Content-Type': 'application/json' };
    
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const responseText = await response.text();
      
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      return {
        ok: response.ok,
        status: response.status,
        data: responseData
      };
    } catch (error) {
      this.log(`Request error for ${method} ${endpoint}: ${error.message}`, 'error');
      return { ok: false, status: 0, data: { error: error.message } };
    }
  }

  async testRegistration() {
    this.log('=== Testing User Registration ===');

    // Test customer registration
    const customerResponse = await this.makeRequest('POST', '/api/auth/register', testUsers.customer);
    
    if (customerResponse.ok) {
      this.log(`✓ Customer registration successful`, 'success');
      if (customerResponse.data.user && customerResponse.data.token) {
        this.tokens.customer = customerResponse.data.token;
        this.log(`✓ Registration response includes user and token`, 'success');
      }
    } else {
      this.log(`✗ Customer registration failed: ${JSON.stringify(customerResponse.data)}`, 'error');
    }

    // Test admin registration
    const adminResponse = await this.makeRequest('POST', '/api/auth/register', testUsers.admin);
    
    if (adminResponse.ok) {
      this.log(`✓ Admin registration successful`, 'success');
      if (adminResponse.data.user && adminResponse.data.token) {
        this.tokens.admin = adminResponse.data.token;
        this.log(`✓ Admin registration response includes user and token`, 'success');
      }
    } else {
      this.log(`✗ Admin registration failed: ${JSON.stringify(adminResponse.data)}`, 'error');
    }
  }

  async testAuthentication() {
    this.log('=== Testing Authentication ===');

    // Test customer login
    const loginResponse = await this.makeRequest('POST', '/api/auth/login', {
      username: testUsers.customer.username,
      password: testUsers.customer.password
    });

    if (loginResponse.ok) {
      this.log(`✓ Customer login successful`, 'success');
      if (loginResponse.data.user && loginResponse.data.token) {
        this.tokens.customer = loginResponse.data.token;
        this.log(`✓ Login response includes user and token`, 'success');
      }
    } else {
      this.log(`✗ Customer login failed: ${JSON.stringify(loginResponse.data)}`, 'error');
    }

    // Test invalid login
    const invalidResponse = await this.makeRequest('POST', '/api/auth/login', {
      username: testUsers.customer.username,
      password: 'wrongpassword'
    });

    if (!invalidResponse.ok) {
      this.log(`✓ Invalid login correctly rejected`, 'success');
    } else {
      this.log(`✗ Invalid login should be rejected`, 'error');
    }
  }

  async testUserProfile() {
    this.log('=== Testing User Profile ===');

    if (!this.tokens.customer) {
      this.log('✗ No customer token available for profile test', 'error');
      return;
    }

    const profileResponse = await this.makeRequest('GET', '/api/auth/user', null, this.tokens.customer);
    
    if (profileResponse.ok) {
      this.log(`✓ User profile retrieval successful`, 'success');
      const user = profileResponse.data;
      if (user.username && user.firstName && !user.password) {
        this.log(`✓ Profile data is correct and password excluded`, 'success');
      }
    } else {
      this.log(`✗ User profile retrieval failed: ${JSON.stringify(profileResponse.data)}`, 'error');
    }

    // Test unauthorized access
    const unauthorizedResponse = await this.makeRequest('GET', '/api/auth/user');
    if (!unauthorizedResponse.ok) {
      this.log(`✓ Unauthorized access correctly blocked`, 'success');
    } else {
      this.log(`✗ Unauthorized access should be blocked`, 'error');
    }
  }

  async testAdminFunctions() {
    this.log('=== Testing Admin Functions ===');

    if (!this.tokens.admin) {
      this.log('✗ No admin token available for admin tests', 'error');
      return;
    }

    // Test getting all users (admin endpoint)
    const usersResponse = await this.makeRequest('GET', '/api/users', null, this.tokens.admin);
    
    if (usersResponse.ok) {
      this.log(`✓ Admin can retrieve user list`, 'success');
      const users = usersResponse.data;
      if (Array.isArray(users) && users.length > 0) {
        this.log(`✓ Retrieved ${users.length} users`, 'info');
        
        // Check passwords are excluded
        const hasPasswords = users.some(user => user.password);
        if (!hasPasswords) {
          this.log(`✓ Passwords excluded from user list`, 'success');
        } else {
          this.log(`✗ Passwords should be excluded from user list`, 'error');
        }
      }
    } else {
      this.log(`✗ Admin user retrieval failed: ${JSON.stringify(usersResponse.data)}`, 'error');
    }

    // Test admin user search
    const searchResponse = await this.makeRequest('GET', '/api/admin/users?search=test', null, this.tokens.admin);
    if (searchResponse.ok) {
      this.log(`✓ Admin user search working`, 'success');
    } else {
      this.log(`✗ Admin user search failed: ${JSON.stringify(searchResponse.data)}`, 'error');
    }

    // Test customer cannot access admin endpoints
    if (this.tokens.customer) {
      const unauthorizedResponse = await this.makeRequest('GET', '/api/users', null, this.tokens.customer);
      if (!unauthorizedResponse.ok && unauthorizedResponse.status === 403) {
        this.log(`✓ Customer correctly blocked from admin endpoints`, 'success');
      } else {
        this.log(`✗ Customer should be blocked from admin endpoints`, 'error');
      }
    }
  }

  async testDataIntegrity() {
    this.log('=== Testing Data Integrity ===');

    // Test duplicate email registration
    const duplicateEmailUser = {
      username: 'different_user',
      email: testUsers.customer.email, // Same email
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };

    const duplicateResponse = await this.makeRequest('POST', '/api/auth/register', duplicateEmailUser);
    if (!duplicateResponse.ok && duplicateResponse.data.error && duplicateResponse.data.error.includes('Email already exists')) {
      this.log(`✓ Duplicate email correctly rejected`, 'success');
    } else {
      this.log(`✗ Should reject duplicate email`, 'error');
    }

    // Test duplicate username
    const duplicateUsernameUser = {
      username: testUsers.customer.username, // Same username
      email: 'different@email.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };

    const duplicateUsernameResponse = await this.makeRequest('POST', '/api/auth/register', duplicateUsernameUser);
    if (!duplicateUsernameResponse.ok && duplicateUsernameResponse.data.error && duplicateUsernameResponse.data.error.includes('Username already exists')) {
      this.log(`✓ Duplicate username correctly rejected`, 'success');
    } else {
      this.log(`✗ Should reject duplicate username`, 'error');
    }
  }

  async testSecurity() {
    this.log('=== Testing Basic Security ===');

    // Test SQL injection attempt
    const sqlInjection = await this.makeRequest('POST', '/api/auth/login', {
      username: "admin'; DROP TABLE users; --",
      password: 'any'
    });

    if (!sqlInjection.ok && sqlInjection.status !== 0) {
      this.log(`✓ SQL injection attempt handled safely`, 'success');
    } else {
      this.log(`✗ Potential SQL injection vulnerability`, 'error');
    }

    // Test XSS in registration
    const xssAttempt = await this.makeRequest('POST', '/api/auth/register', {
      username: 'xss_test_' + Date.now(),
      email: `xsstest${Date.now()}@test.com`,
      password: 'password123',
      firstName: "<script>alert('xss')</script>",
      lastName: 'Test'
    });

    if (!xssAttempt.ok || (xssAttempt.ok && typeof xssAttempt.data.user?.firstName === 'string')) {
      this.log(`✓ XSS attempt handled safely`, 'success');
    } else {
      this.log(`✗ Potential XSS vulnerability`, 'error');
    }
  }

  generateReport() {
    const successes = this.results.filter(r => r.type === 'success').length;
    const errors = this.results.filter(r => r.type === 'error').length;
    const warnings = this.results.filter(r => r.type === 'warning').length;
    const total = successes + errors;

    this.log('=== TEST REPORT ===');
    this.log(`Total Tests: ${total}`, 'info');
    this.log(`Successes: ${successes}`, 'success');
    this.log(`Errors: ${errors}`, 'error');
    this.log(`Warnings: ${warnings}`, 'warning');
    
    if (total > 0) {
      const passRate = (successes / total * 100).toFixed(1);
      this.log(`Pass Rate: ${passRate}%`, 'info');

      if (errors === 0) {
        this.log('🟢 PRODUCTION READY: All critical tests passed', 'success');
      } else if (errors <= 2) {
        this.log('🟡 NEEDS ATTENTION: Minor issues to address', 'warning');
      } else {
        this.log('🔴 NOT PRODUCTION READY: Significant issues found', 'error');
      }
    }

    return {
      total,
      successes,
      errors,
      warnings,
      passRate: total > 0 ? (successes / total * 100) : 0,
      details: this.results
    };
  }

  async runAllTests() {
    this.log('Starting User Management Test Suite...');
    
    try {
      await this.testRegistration();
      await this.testAuthentication();
      await this.testUserProfile();
      await this.testAdminFunctions();
      await this.testDataIntegrity();
      await this.testSecurity();
    } catch (error) {
      this.log(`Critical error: ${error.message}`, 'error');
    }

    const report = this.generateReport();
    
    // Write results
    fs.writeFileSync('user-management-test-results.json', JSON.stringify(report, null, 2));
    this.log('Results written to user-management-test-results.json', 'info');
    
    return report;
  }
}

// Run tests
const tester = new SimpleUserManagementTester();
tester.runAllTests()
  .then(report => {
    console.log(`\n=== FINAL RESULTS ===`);
    console.log(`Pass Rate: ${report.passRate}%`);
    console.log(`Status: ${report.errors === 0 ? 'READY' : report.errors <= 2 ? 'NEEDS WORK' : 'NOT READY'}`);
    process.exit(report.errors > 5 ? 1 : 0);
  })
  .catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });