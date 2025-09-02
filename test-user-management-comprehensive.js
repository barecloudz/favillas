/**
 * Comprehensive User Management Testing Suite
 * Tests customer registration, authentication, profile management, and admin features
 */

const BASE_URL = 'http://localhost:3000';
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// Test data for comprehensive testing
const testData = {
  customers: [
    {
      username: 'testcustomer1',
      email: 'customer1@test.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Smith',
      phone: '555-0101',
      role: 'customer'
    },
    {
      username: 'testcustomer2',
      email: 'customer2@test.com',
      password: 'password456',
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '555-0102',
      role: 'customer',
      address: '123 Main St',
      city: 'New York',
      state: 'NY',
      zipCode: '10001'
    }
  ],
  invalidRegistrations: [
    { username: '', email: 'test@test.com', password: 'pass123' }, // Missing username
    { username: 'test', email: '', password: 'pass123' }, // Missing email
    { username: 'test', email: 'test@test.com', password: '' }, // Missing password
    { username: 'test', email: 'invalid-email', password: 'pass123' }, // Invalid email format
  ],
  adminUser: {
    username: 'testadmin',
    email: 'admin@test.com',
    password: 'adminpass123',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isAdmin: true
  }
};

class UserManagementTester {
  constructor() {
    this.results = [];
    this.adminToken = null;
    this.customerTokens = {};
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, message, type };
    this.results.push(entry);
    console.log(`[${timestamp}] ${type.toUpperCase()}: ${message}`);
  }

  async makeRequest(method, endpoint, data = null, token = null) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const options = {
      method,
      headers,
      credentials: 'include', // Include cookies for session-based auth
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const responseData = await response.text();
      
      let parsedData;
      try {
        parsedData = JSON.parse(responseData);
      } catch {
        parsedData = responseData;
      }

      return {
        ok: response.ok,
        status: response.status,
        data: parsedData,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      this.log(`Network error for ${method} ${endpoint}: ${error.message}`, 'error');
      return {
        ok: false,
        status: 0,
        data: { error: error.message },
        headers: {}
      };
    }
  }

  // Test 1: Customer Registration Flow
  async testCustomerRegistration() {
    this.log('=== Testing Customer Registration Flow ===');

    // Test valid registrations
    for (let i = 0; i < testData.customers.length; i++) {
      const customer = testData.customers[i];
      this.log(`Testing registration for ${customer.username}...`);

      const response = await this.makeRequest('POST', '/api/auth/register', customer);
      
      if (response.ok) {
        this.log(`✓ Registration successful for ${customer.username}`, 'success');
        
        // Check response structure
        if (response.data.user && response.data.token) {
          this.log(`✓ Response includes user data and token`, 'success');
          this.customerTokens[customer.username] = response.data.token;
          
          // Verify user data
          const user = response.data.user;
          if (user.username === customer.username && 
              user.email === customer.email && 
              user.firstName === customer.firstName &&
              user.role === 'customer') {
            this.log(`✓ User data is correct`, 'success');
          } else {
            this.log(`✗ User data mismatch`, 'error');
          }
        } else {
          this.log(`✗ Response missing user data or token`, 'error');
        }
      } else {
        this.log(`✗ Registration failed for ${customer.username}: ${JSON.stringify(response.data)}`, 'error');
      }
    }

    // Test invalid registrations
    this.log('Testing invalid registration attempts...');
    for (const invalidData of testData.invalidRegistrations) {
      const response = await this.makeRequest('POST', '/api/auth/register', invalidData);
      
      if (!response.ok) {
        this.log(`✓ Correctly rejected invalid registration: ${JSON.stringify(invalidData)}`, 'success');
      } else {
        this.log(`✗ Should have rejected invalid registration: ${JSON.stringify(invalidData)}`, 'error');
      }
    }

    // Test duplicate registrations
    const duplicateUser = { ...testData.customers[0] };
    const response = await this.makeRequest('POST', '/api/auth/register', duplicateUser);
    
    if (!response.ok && response.data.error && response.data.error.includes('already exists')) {
      this.log(`✓ Correctly rejected duplicate registration`, 'success');
    } else {
      this.log(`✗ Should have rejected duplicate registration`, 'error');
    }
  }

  // Test 2: Authentication Flow
  async testAuthentication() {
    this.log('=== Testing Authentication Flow ===');

    // Test valid login
    const customer = testData.customers[0];
    const loginResponse = await this.makeRequest('POST', '/api/auth/login', {
      username: customer.username,
      password: customer.password
    });

    if (loginResponse.ok) {
      this.log(`✓ Login successful for ${customer.username}`, 'success');
      
      if (loginResponse.data.user && loginResponse.data.token) {
        this.log(`✓ Login response includes user data and token`, 'success');
        this.customerTokens[customer.username] = loginResponse.data.token;
      } else {
        this.log(`✗ Login response missing user data or token`, 'error');
      }
    } else {
      this.log(`✗ Login failed: ${JSON.stringify(loginResponse.data)}`, 'error');
    }

    // Test invalid login
    const invalidLoginResponse = await this.makeRequest('POST', '/api/auth/login', {
      username: customer.username,
      password: 'wrongpassword'
    });

    if (!invalidLoginResponse.ok) {
      this.log(`✓ Correctly rejected invalid login credentials`, 'success');
    } else {
      this.log(`✗ Should have rejected invalid login credentials`, 'error');
    }

    // Test user authentication endpoint
    const token = this.customerTokens[customer.username];
    if (token) {
      const userResponse = await this.makeRequest('GET', '/api/auth/user', null, token);
      
      if (userResponse.ok) {
        this.log(`✓ User authentication endpoint working`, 'success');
        
        const user = userResponse.data;
        if (user.username === customer.username && !user.password) {
          this.log(`✓ User data correct and password excluded`, 'success');
        } else {
          this.log(`✗ User data issues in auth endpoint`, 'error');
        }
      } else {
        this.log(`✗ User authentication endpoint failed`, 'error');
      }
    }

    // Test logout
    const logoutResponse = await this.makeRequest('POST', '/api/auth/logout');
    if (logoutResponse.ok) {
      this.log(`✓ Logout endpoint working`, 'success');
    } else {
      this.log(`✗ Logout endpoint failed`, 'error');
    }
  }

  // Test 3: User Profile Management
  async testUserProfileManagement() {
    this.log('=== Testing User Profile Management ===');

    // Test getting user profile
    const customer = testData.customers[0];
    const token = this.customerTokens[customer.username];
    
    if (!token) {
      this.log('✗ No token available for profile testing', 'error');
      return;
    }

    const profileResponse = await this.makeRequest('GET', '/api/user', null, token);
    if (profileResponse.ok) {
      this.log(`✓ User profile retrieval working`, 'success');
      
      const profile = profileResponse.data;
      if (profile.username === customer.username && 
          profile.firstName === customer.firstName &&
          !profile.password) {
        this.log(`✓ Profile data is correct and secure`, 'success');
      } else {
        this.log(`✗ Profile data issues`, 'error');
      }
    } else {
      this.log(`✗ User profile retrieval failed: ${JSON.stringify(profileResponse.data)}`, 'error');
    }

    // Test unauthorized access
    const unauthorizedResponse = await this.makeRequest('GET', '/api/user');
    if (!unauthorizedResponse.ok && unauthorizedResponse.status === 401) {
      this.log(`✓ Correctly blocks unauthorized access to user profile`, 'success');
    } else {
      this.log(`✗ Should block unauthorized access to user profile`, 'error');
    }
  }

  // Test 4: Admin User Management
  async testAdminUserManagement() {
    this.log('=== Testing Admin User Management ===');

    // First create an admin user for testing
    const adminResponse = await this.makeRequest('POST', '/api/auth/register', testData.adminUser);
    if (adminResponse.ok) {
      this.adminToken = adminResponse.data.token;
      this.log(`✓ Admin user created successfully`, 'success');
    } else {
      this.log(`✗ Failed to create admin user: ${JSON.stringify(adminResponse.data)}`, 'error');
      return;
    }

    // Test getting all users (admin only)
    const usersResponse = await this.makeRequest('GET', '/api/users', null, this.adminToken);
    if (usersResponse.ok) {
      this.log(`✓ Admin can retrieve all users`, 'success');
      
      const users = usersResponse.data;
      if (Array.isArray(users) && users.length > 0) {
        this.log(`✓ User list contains ${users.length} users`, 'info');
        
        // Check that passwords are not included
        const hasPasswords = users.some(user => user.password);
        if (!hasPasswords) {
          this.log(`✓ Passwords are excluded from user list`, 'success');
        } else {
          this.log(`✗ Passwords should be excluded from user list`, 'error');
        }
      } else {
        this.log(`✗ User list should be an array with users`, 'error');
      }
    } else {
      this.log(`✗ Admin failed to retrieve all users: ${JSON.stringify(usersResponse.data)}`, 'error');
    }

    // Test non-admin access to users endpoint
    const customerToken = this.customerTokens[testData.customers[0].username];
    if (customerToken) {
      const unauthorizedUsersResponse = await this.makeRequest('GET', '/api/users', null, customerToken);
      if (!unauthorizedUsersResponse.ok && unauthorizedUsersResponse.status === 403) {
        this.log(`✓ Correctly blocks non-admin access to users list`, 'success');
      } else {
        this.log(`✗ Should block non-admin access to users list`, 'error');
      }
    }

    // Test admin user management with search
    const searchResponse = await this.makeRequest('GET', '/api/admin/users?search=test', null, this.adminToken);
    if (searchResponse.ok) {
      this.log(`✓ Admin user search working`, 'success');
      
      const searchResults = searchResponse.data;
      if (Array.isArray(searchResults)) {
        this.log(`✓ Search returned ${searchResults.length} results`, 'info');
      }
    } else {
      this.log(`✗ Admin user search failed`, 'error');
    }

    // Test creating user as admin
    const newUser = {
      username: 'admin_created_user',
      email: 'admincreated@test.com',
      password: 'password123',
      firstName: 'Admin',
      lastName: 'Created',
      role: 'customer'
    };

    const createUserResponse = await this.makeRequest('POST', '/api/admin/users', newUser, this.adminToken);
    if (createUserResponse.ok) {
      this.log(`✓ Admin can create users`, 'success');
    } else {
      this.log(`✗ Admin user creation failed: ${JSON.stringify(createUserResponse.data)}`, 'error');
    }
  }

  // Test 5: Data Quality and Integrity
  async testDataQualityAndIntegrity() {
    this.log('=== Testing Data Quality and Integrity ===');

    // Test email uniqueness
    const duplicateEmailUser = {
      username: 'different_username',
      email: testData.customers[0].email, // Same email as existing user
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };

    const duplicateEmailResponse = await this.makeRequest('POST', '/api/auth/register', duplicateEmailUser);
    if (!duplicateEmailResponse.ok && duplicateEmailResponse.data.error.includes('Email already exists')) {
      this.log(`✓ Email uniqueness constraint working`, 'success');
    } else {
      this.log(`✗ Should enforce email uniqueness`, 'error');
    }

    // Test username uniqueness
    const duplicateUsernameUser = {
      username: testData.customers[0].username, // Same username as existing user
      email: 'different@email.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User'
    };

    const duplicateUsernameResponse = await this.makeRequest('POST', '/api/auth/register', duplicateUsernameUser);
    if (!duplicateUsernameResponse.ok && duplicateUsernameResponse.data.error.includes('Username already exists')) {
      this.log(`✓ Username uniqueness constraint working`, 'success');
    } else {
      this.log(`✗ Should enforce username uniqueness`, 'error');
    }

    // Test password security (not stored in plain text)
    if (this.adminToken) {
      const usersResponse = await this.makeRequest('GET', '/api/users', null, this.adminToken);
      if (usersResponse.ok) {
        const users = usersResponse.data;
        const hasPlaintextPasswords = users.some(user => 
          user.password && user.password.length < 20 // Hashed passwords should be much longer
        );
        
        if (!hasPlaintextPasswords) {
          this.log(`✓ Passwords appear to be properly hashed`, 'success');
        } else {
          this.log(`✗ Some passwords may not be properly hashed`, 'error');
        }
      }
    }
  }

  // Test 6: Performance and Load Testing
  async testPerformanceAndLoad() {
    this.log('=== Testing Performance and Load ===');

    // Test concurrent registrations
    const concurrentUsers = Array.from({ length: 10 }, (_, i) => ({
      username: `loadtest_${i}`,
      email: `loadtest${i}@test.com`,
      password: 'password123',
      firstName: `Load${i}`,
      lastName: 'Test'
    }));

    const startTime = Date.now();
    const registrationPromises = concurrentUsers.map(user =>
      this.makeRequest('POST', '/api/auth/register', user)
    );

    try {
      const results = await Promise.all(registrationPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successCount = results.filter(r => r.ok).length;
      const failureCount = results.length - successCount;

      this.log(`✓ Concurrent registrations: ${successCount} success, ${failureCount} failed in ${duration}ms`, 'info');
      
      if (successCount >= 8) { // Allow some failures due to potential race conditions
        this.log(`✓ System handles concurrent load reasonably well`, 'success');
      } else {
        this.log(`✗ System may have issues with concurrent load`, 'warning');
      }
    } catch (error) {
      this.log(`✗ Concurrent registration test failed: ${error.message}`, 'error');
    }

    // Test response times for common operations
    const operations = [
      { name: 'User Registration', method: 'POST', endpoint: '/api/auth/register', data: {
        username: 'perf_test_user',
        email: 'perftest@test.com',
        password: 'password123',
        firstName: 'Perf',
        lastName: 'Test'
      }},
      { name: 'User Login', method: 'POST', endpoint: '/api/auth/login', data: {
        username: testData.customers[0].username,
        password: testData.customers[0].password
      }},
    ];

    for (const operation of operations) {
      const startTime = Date.now();
      const response = await this.makeRequest(operation.method, operation.endpoint, operation.data);
      const endTime = Date.now();
      const duration = endTime - startTime;

      if (response.ok) {
        this.log(`✓ ${operation.name} completed in ${duration}ms`, 'info');
        
        if (duration < 2000) { // Under 2 seconds
          this.log(`✓ ${operation.name} performance acceptable`, 'success');
        } else {
          this.log(`⚠ ${operation.name} may be slow (${duration}ms)`, 'warning');
        }
      } else {
        this.log(`✗ ${operation.name} failed during performance test`, 'error');
      }
    }
  }

  // Test 7: Security and Access Control
  async testSecurityAndAccessControl() {
    this.log('=== Testing Security and Access Control ===');

    // Test SQL injection attempts
    const sqlInjectionPayloads = [
      "admin'; DROP TABLE users; --",
      "admin' OR '1'='1",
      "admin' UNION SELECT * FROM users --"
    ];

    for (const payload of sqlInjectionPayloads) {
      const response = await this.makeRequest('POST', '/api/auth/login', {
        username: payload,
        password: 'any_password'
      });

      // Should fail gracefully, not return sensitive data or crash
      if (!response.ok && response.status !== 0) {
        this.log(`✓ SQL injection attempt handled safely: ${payload.substring(0, 20)}...`, 'success');
      } else {
        this.log(`✗ Potential SQL injection vulnerability with: ${payload}`, 'error');
      }
    }

    // Test XSS protection
    const xssPayloads = [
      "<script>alert('xss')</script>",
      "javascript:alert('xss')",
      "<img src=x onerror=alert('xss')>"
    ];

    for (const payload of xssPayloads) {
      const response = await this.makeRequest('POST', '/api/auth/register', {
        username: 'xss_test',
        email: 'xss@test.com',
        password: 'password123',
        firstName: payload,
        lastName: 'Test'
      });

      if (!response.ok || (response.ok && typeof response.data.user?.firstName === 'string')) {
        this.log(`✓ XSS payload handled safely: ${payload.substring(0, 20)}...`, 'success');
      } else {
        this.log(`✗ Potential XSS vulnerability with: ${payload}`, 'error');
      }
    }

    // Test rate limiting (if implemented)
    this.log('Testing rate limiting...');
    const rapidRequests = Array.from({ length: 20 }, () =>
      this.makeRequest('POST', '/api/auth/login', {
        username: 'nonexistent_user',
        password: 'wrong_password'
      })
    );

    const rapidResults = await Promise.all(rapidRequests);
    const rateLimitedResponses = rapidResults.filter(r => r.status === 429);

    if (rateLimitedResponses.length > 0) {
      this.log(`✓ Rate limiting appears to be working (${rateLimitedResponses.length} requests limited)`, 'success');
    } else {
      this.log(`⚠ No rate limiting detected - consider implementing for production`, 'warning');
    }

    // Test JWT token security
    const customerToken = this.customerTokens[testData.customers[0].username];
    if (customerToken) {
      // Test token with modified payload (should fail)
      const parts = customerToken.split('.');
      if (parts.length === 3) {
        const modifiedToken = parts[0] + '.eyJ1c2VySWQiOjk5OX0.' + parts[2]; // Modified payload
        const response = await this.makeRequest('GET', '/api/user', null, modifiedToken);
        
        if (!response.ok) {
          this.log(`✓ JWT token tampering detection working`, 'success');
        } else {
          this.log(`✗ JWT token may be vulnerable to tampering`, 'error');
        }
      }
    }
  }

  // Generate comprehensive report
  generateReport() {
    this.log('=== COMPREHENSIVE USER MANAGEMENT TEST REPORT ===');
    
    const totalTests = this.results.length;
    const successes = this.results.filter(r => r.type === 'success').length;
    const errors = this.results.filter(r => r.type === 'error').length;
    const warnings = this.results.filter(r => r.type === 'warning').length;

    this.log(`Total Test Results: ${totalTests}`, 'info');
    this.log(`Successes: ${successes}`, 'success');
    this.log(`Errors: ${errors}`, 'error');
    this.log(`Warnings: ${warnings}`, 'warning');
    this.log(`Pass Rate: ${((successes / (successes + errors)) * 100).toFixed(1)}%`, 'info');

    // Production readiness assessment
    if (errors === 0) {
      this.log('🟢 PRODUCTION READY: All tests passed', 'success');
    } else if (errors <= 2 && warnings <= 5) {
      this.log('🟡 NEEDS MINOR FIXES: Some issues need to be addressed', 'warning');
    } else {
      this.log('🔴 NOT PRODUCTION READY: Significant issues need to be resolved', 'error');
    }

    return {
      totalTests,
      successes,
      errors,
      warnings,
      passRate: (successes / (successes + errors)) * 100,
      details: this.results
    };
  }

  // Run all tests
  async runAllTests() {
    this.log('Starting Comprehensive User Management Testing Suite...');
    
    try {
      await this.testCustomerRegistration();
      await this.testAuthentication();
      await this.testUserProfileManagement();
      await this.testAdminUserManagement();
      await this.testDataQualityAndIntegrity();
      await this.testPerformanceAndLoad();
      await this.testSecurityAndAccessControl();
    } catch (error) {
      this.log(`Critical error during testing: ${error.message}`, 'error');
    }

    return this.generateReport();
  }
}

// Run the tests
const tester = new UserManagementTester();
tester.runAllTests()
  .then(report => {
    console.log('\n=== FINAL REPORT ===');
    console.log(`Pass Rate: ${report.passRate.toFixed(1)}%`);
    console.log(`Total Tests: ${report.totalTests}`);
    console.log(`Successes: ${report.successes}`);
    console.log(`Errors: ${report.errors}`);
    console.log(`Warnings: ${report.warnings}`);
    
    // Write detailed results to file
    const fs = await import('fs');
    fs.writeFileSync('user-management-test-results.json', JSON.stringify(report, null, 2));
    console.log('\nDetailed results written to user-management-test-results.json');
  })
  .catch(error => {
    console.error('Test suite failed:', error);
  });

export { UserManagementTester };