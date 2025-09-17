#!/usr/bin/env node

import https from 'https';
import postgres from 'postgres';
import dotenv from 'dotenv';

dotenv.config();

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

const log = {
  error: (msg) => console.log(`${colors.red}❌ ERROR: ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ SUCCESS: ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️ WARNING: ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️ INFO: ${msg}${colors.reset}`),
  test: (msg) => console.log(`${colors.cyan}🧪 TEST: ${msg}${colors.reset}`),
  debug: (msg) => console.log(`${colors.magenta}🔍 DEBUG: ${msg}${colors.reset}`)
};

// Configuration
const API_BASE_URL = 'https://pizzaspinrewards.netlify.app';
const LOCAL_API_BASE_URL = 'http://localhost:8888';

class CriticalOrderInvestigation {
  constructor() {
    this.testResults = {
      orderSuccessPageTests: [],
      orderHistoryTests: [],
      authenticationTests: [],
      databaseIntegrityTests: [],
      criticalIssues: []
    };

    // Sample Google OAuth token payload for testing
    this.sampleGoogleTokenPayload = {
      iss: 'https://supabase.io',
      sub: 'auth0|google-oauth2|123456789',
      email: 'testuser@gmail.com',
      email_verified: true,
      aud: 'pizzaspinrewards',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000)
    };
  }

  async makeAPIRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PizzaSpinRewards-Test/1.0',
          ...options.headers
        }
      };

      const req = https.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = data ? JSON.parse(data) : null;
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: jsonData,
              rawData: data
            });
          } catch (parseError) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: null,
              rawData: data,
              parseError: parseError.message
            });
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  async connectToDatabase() {
    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL not found in environment');
      }

      this.sql = postgres(databaseUrl, {
        max: 5,
        idle_timeout: 20,
        connect_timeout: 10
      });

      // Test connection
      await this.sql`SELECT 1 as test`;
      log.success('Database connection established');
      return true;
    } catch (error) {
      log.error(`Database connection failed: ${error.message}`);
      return false;
    }
  }

  generateTestToken(payload = null) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const tokenPayload = payload || this.sampleGoogleTokenPayload;

    // Simple JWT simulation (not cryptographically secure, just for testing)
    const headerB64 = Buffer.from(JSON.stringify(header)).toString('base64url');
    const payloadB64 = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
    const signature = 'test-signature';

    return `${headerB64}.${payloadB64}.${signature}`;
  }

  async testOrderSuccessPageEndpoint() {
    log.test('Testing Order Success Page Endpoint (/api/orders/{id})');

    try {
      // First, find a recent order ID from the database
      if (!this.sql) {
        await this.connectToDatabase();
      }

      const recentOrders = await this.sql`
        SELECT id, user_id, supabase_user_id, status, total, created_at
        FROM orders
        ORDER BY created_at DESC
        LIMIT 10
      `;

      if (recentOrders.length === 0) {
        log.warning('No orders found in database');
        return;
      }

      log.info(`Found ${recentOrders.length} recent orders`);

      for (const order of recentOrders.slice(0, 3)) {
        log.debug(`Testing order ${order.id} (user_id: ${order.user_id}, supabase_user_id: ${order.supabase_user_id})`);

        // Test 1: Unauthenticated request (should fail)
        const unauthResponse = await this.makeAPIRequest(`/api/orders/${order.id}`);

        this.testResults.orderSuccessPageTests.push({
          test: `Order ${order.id} - Unauthenticated`,
          statusCode: unauthResponse.statusCode,
          expected: 401,
          passed: unauthResponse.statusCode === 401,
          response: unauthResponse.data
        });

        // Test 2: With Google token (simulated)
        const googleToken = this.generateTestToken({
          iss: 'https://supabase.io',
          sub: order.supabase_user_id || 'test-google-user-id',
          email: 'testuser@gmail.com'
        });

        const authResponse = await this.makeAPIRequest(`/api/orders/${order.id}`, {
          headers: {
            'Authorization': `Bearer ${googleToken}`
          }
        });

        this.testResults.orderSuccessPageTests.push({
          test: `Order ${order.id} - With Google Token`,
          statusCode: authResponse.statusCode,
          expected: [200, 404, 401], // Could be any of these
          passed: [200, 404, 401].includes(authResponse.statusCode),
          response: authResponse.data,
          orderId: order.id,
          hasSupabaseUserId: !!order.supabase_user_id
        });

        if (authResponse.statusCode === 401) {
          this.testResults.criticalIssues.push({
            issue: 'Order Success Page - Authentication Failed',
            orderId: order.id,
            description: 'Google authenticated users cannot access their order details',
            statusCode: authResponse.statusCode,
            response: authResponse.data
          });
        }

        if (authResponse.statusCode === 404 && order.supabase_user_id) {
          this.testResults.criticalIssues.push({
            issue: 'Order Success Page - Order Not Found for Google User',
            orderId: order.id,
            description: 'Order exists but not accessible to Google user - potential user ID mapping issue',
            statusCode: authResponse.statusCode,
            supabaseUserId: order.supabase_user_id
          });
        }
      }

    } catch (error) {
      log.error(`Order success page test failed: ${error.message}`);
      this.testResults.criticalIssues.push({
        issue: 'Order Success Page Test Failed',
        error: error.message
      });
    }
  }

  async testOrderHistoryEndpoint() {
    log.test('Testing Order History Endpoint (/api/orders)');

    try {
      // Test 1: Unauthenticated request
      const unauthResponse = await this.makeAPIRequest('/api/orders');

      this.testResults.orderHistoryTests.push({
        test: 'Order History - Unauthenticated',
        statusCode: unauthResponse.statusCode,
        expected: 401,
        passed: unauthResponse.statusCode === 401,
        response: unauthResponse.data
      });

      // Test 2: With Google token
      const googleToken = this.generateTestToken();
      const authResponse = await this.makeAPIRequest('/api/orders', {
        headers: {
          'Authorization': `Bearer ${googleToken}`
        }
      });

      this.testResults.orderHistoryTests.push({
        test: 'Order History - With Google Token',
        statusCode: authResponse.statusCode,
        expected: 200,
        passed: authResponse.statusCode === 200,
        response: authResponse.data,
        ordersReturned: Array.isArray(authResponse.data) ? authResponse.data.length : 0
      });

      if (authResponse.statusCode === 401) {
        this.testResults.criticalIssues.push({
          issue: 'Order History - Authentication Failed',
          description: 'Google authenticated users cannot access their order history',
          statusCode: authResponse.statusCode,
          response: authResponse.data
        });
      }

      if (authResponse.statusCode === 200 && Array.isArray(authResponse.data) && authResponse.data.length === 0) {
        this.testResults.criticalIssues.push({
          issue: 'Order History - Empty Results',
          description: 'Order history returns empty array - potential user ID mapping issue',
          statusCode: authResponse.statusCode
        });
      }

    } catch (error) {
      log.error(`Order history test failed: ${error.message}`);
      this.testResults.criticalIssues.push({
        issue: 'Order History Test Failed',
        error: error.message
      });
    }
  }

  async testDatabaseIntegrity() {
    log.test('Testing Database Integrity for Order/User Mapping');

    try {
      if (!this.sql) {
        await this.connectToDatabase();
      }

      // Check for orders with Google authentication
      const googleOrders = await this.sql`
        SELECT
          o.id,
          o.user_id,
          o.supabase_user_id,
          o.status,
          o.total,
          o.created_at,
          u.username,
          u.email,
          u.supabase_user_id as user_table_supabase_id
        FROM orders o
        LEFT JOIN users u ON (o.user_id = u.id OR o.supabase_user_id = u.supabase_user_id)
        WHERE o.supabase_user_id IS NOT NULL
        ORDER BY o.created_at DESC
        LIMIT 10
      `;

      log.info(`Found ${googleOrders.length} orders with Supabase user IDs`);

      for (const order of googleOrders) {
        const hasMatchingUser = !!order.username;

        this.testResults.databaseIntegrityTests.push({
          test: `Order ${order.id} - User Mapping`,
          orderId: order.id,
          supabaseUserId: order.supabase_user_id,
          userId: order.user_id,
          hasMatchingUser,
          userEmail: order.email,
          passed: hasMatchingUser
        });

        if (!hasMatchingUser) {
          this.testResults.criticalIssues.push({
            issue: 'Database Integrity - Orphaned Order',
            orderId: order.id,
            description: 'Order has Supabase user ID but no matching user record',
            supabaseUserId: order.supabase_user_id,
            userId: order.user_id
          });
        }
      }

      // Check for users with missing order associations
      const usersWithSupabaseId = await this.sql`
        SELECT
          u.id,
          u.username,
          u.email,
          u.supabase_user_id,
          COUNT(o.id) as order_count
        FROM users u
        LEFT JOIN orders o ON (u.id = o.user_id OR u.supabase_user_id = o.supabase_user_id)
        WHERE u.supabase_user_id IS NOT NULL
        GROUP BY u.id, u.username, u.email, u.supabase_user_id
        ORDER BY u.created_at DESC
        LIMIT 10
      `;

      log.info(`Found ${usersWithSupabaseId.length} users with Supabase IDs`);

      for (const user of usersWithSupabaseId) {
        this.testResults.databaseIntegrityTests.push({
          test: `User ${user.id} - Order Association`,
          userId: user.id,
          supabaseUserId: user.supabase_user_id,
          email: user.email,
          orderCount: parseInt(user.order_count),
          passed: true // This is informational
        });
      }

    } catch (error) {
      log.error(`Database integrity test failed: ${error.message}`);
      this.testResults.criticalIssues.push({
        issue: 'Database Integrity Test Failed',
        error: error.message
      });
    }
  }

  async testSpecificOrderIssue() {
    log.test('Testing Specific Order Issue (Order 70 or Recent Problem Orders)');

    try {
      if (!this.sql) {
        await this.connectToDatabase();
      }

      // Look for order 70 specifically
      const order70 = await this.sql`
        SELECT * FROM orders WHERE id = 70
      `;

      if (order70.length > 0) {
        const order = order70[0];
        log.info(`Found Order 70: user_id=${order.user_id}, supabase_user_id=${order.supabase_user_id}, status=${order.status}`);

        // Test accessing this specific order
        const testToken = this.generateTestToken({
          iss: 'https://supabase.io',
          sub: order.supabase_user_id || 'test-user-id',
          email: 'testuser@gmail.com'
        });

        const orderResponse = await this.makeAPIRequest(`/api/orders/70`, {
          headers: {
            'Authorization': `Bearer ${testToken}`
          }
        });

        this.testResults.criticalIssues.push({
          issue: 'Order 70 Specific Test',
          orderId: 70,
          statusCode: orderResponse.statusCode,
          description: 'Direct test of the problematic order',
          response: orderResponse.data,
          orderData: order
        });
      } else {
        log.warning('Order 70 not found in database');
      }

      // Look for recent orders that might be problematic
      const recentProblematicOrders = await this.sql`
        SELECT
          o.id,
          o.user_id,
          o.supabase_user_id,
          o.status,
          o.created_at,
          COUNT(oi.id) as item_count
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE o.created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY o.id, o.user_id, o.supabase_user_id, o.status, o.created_at
        ORDER BY o.created_at DESC
      `;

      log.info(`Found ${recentProblematicOrders.length} recent orders`);

      for (const order of recentProblematicOrders) {
        if (order.item_count === 0) {
          this.testResults.criticalIssues.push({
            issue: 'Order with No Items',
            orderId: order.id,
            description: 'Order exists but has no order items',
            createdAt: order.created_at
          });
        }
      }

    } catch (error) {
      log.error(`Specific order issue test failed: ${error.message}`);
    }
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🚨 CRITICAL ORDER INVESTIGATION REPORT');
    console.log('='.repeat(80));

    // Critical Issues Summary
    console.log(`\n${colors.bright}CRITICAL ISSUES FOUND: ${this.testResults.criticalIssues.length}${colors.reset}`);
    if (this.testResults.criticalIssues.length > 0) {
      this.testResults.criticalIssues.forEach((issue, index) => {
        console.log(`\n${colors.red}${index + 1}. ${issue.issue}${colors.reset}`);
        console.log(`   Description: ${issue.description || 'No description'}`);
        if (issue.orderId) console.log(`   Order ID: ${issue.orderId}`);
        if (issue.statusCode) console.log(`   Status Code: ${issue.statusCode}`);
        if (issue.error) console.log(`   Error: ${issue.error}`);
      });
    } else {
      log.success('No critical issues detected');
    }

    // Order Success Page Tests
    console.log(`\n${colors.bright}ORDER SUCCESS PAGE TESTS:${colors.reset}`);
    this.testResults.orderSuccessPageTests.forEach(test => {
      const status = test.passed ? colors.green + '✅' : colors.red + '❌';
      console.log(`${status} ${test.test}: ${test.statusCode} (expected: ${test.expected})${colors.reset}`);
    });

    // Order History Tests
    console.log(`\n${colors.bright}ORDER HISTORY TESTS:${colors.reset}`);
    this.testResults.orderHistoryTests.forEach(test => {
      const status = test.passed ? colors.green + '✅' : colors.red + '❌';
      console.log(`${status} ${test.test}: ${test.statusCode} (orders: ${test.ordersReturned || 0})${colors.reset}`);
    });

    // Database Integrity Tests
    console.log(`\n${colors.bright}DATABASE INTEGRITY TESTS:${colors.reset}`);
    this.testResults.databaseIntegrityTests.forEach(test => {
      const status = test.passed ? colors.green + '✅' : colors.red + '❌';
      console.log(`${status} ${test.test}: User mapping ${test.hasMatchingUser ? 'found' : 'missing'}${colors.reset}`);
    });

    // Immediate Action Items
    console.log(`\n${colors.bright}IMMEDIATE ACTION ITEMS:${colors.reset}`);

    const authIssues = this.testResults.criticalIssues.filter(i => i.issue.includes('Authentication'));
    const mappingIssues = this.testResults.criticalIssues.filter(i => i.issue.includes('mapping') || i.issue.includes('Orphaned'));
    const notFoundIssues = this.testResults.criticalIssues.filter(i => i.issue.includes('Not Found'));

    if (authIssues.length > 0) {
      console.log(`${colors.red}1. FIX AUTHENTICATION: ${authIssues.length} auth failures detected${colors.reset}`);
      console.log('   - Check Supabase JWT token validation logic');
      console.log('   - Verify token decoding in authenticateToken function');
    }

    if (mappingIssues.length > 0) {
      console.log(`${colors.red}2. FIX USER MAPPING: ${mappingIssues.length} mapping issues detected${colors.reset}`);
      console.log('   - Check user_id vs supabase_user_id consistency');
      console.log('   - Verify order queries include both ID types');
    }

    if (notFoundIssues.length > 0) {
      console.log(`${colors.red}3. FIX ORDER RETRIEVAL: ${notFoundIssues.length} orders not accessible${colors.reset}`);
      console.log('   - Check order query logic for Google users');
      console.log('   - Verify order ownership validation');
    }

    console.log('\n' + '='.repeat(80));
  }

  async run() {
    log.info('Starting Critical Order Investigation...');

    // Connect to database first
    const dbConnected = await this.connectToDatabase();
    if (!dbConnected) {
      log.error('Cannot proceed without database connection');
      return;
    }

    // Run all tests
    await this.testOrderSuccessPageEndpoint();
    await this.testOrderHistoryEndpoint();
    await this.testDatabaseIntegrity();
    await this.testSpecificOrderIssue();

    // Generate comprehensive report
    this.generateReport();

    // Close database connection
    if (this.sql) {
      await this.sql.end();
    }
  }
}

// Run the investigation
const investigation = new CriticalOrderInvestigation();
investigation.run().catch(error => {
  console.error('Investigation failed:', error);
  process.exit(1);
});