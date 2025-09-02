#!/usr/bin/env node

/**
 * Comprehensive Backend Testing Suite for Pizza Spin Rewards
 * Tests all critical backend functionality without relying on mocked data
 */

import dotenv from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import https from 'https';
import http from 'http';
import net from 'net';
import { createRequire } from 'module';

// Configure dotenv
dotenv.config();

// Create require function for packages that need it
const require = createRequire(import.meta.url);

// Test Results Storage
const testResults = {
  database: { passed: 0, failed: 0, tests: [] },
  connectivity: { passed: 0, failed: 0, tests: [] },
  environment: { passed: 0, failed: 0, tests: [] },
  security: { passed: 0, failed: 0, tests: [] }
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

// Database connectivity test
async function testDatabaseConnectivity() {
  console.log('\n🔍 Testing Database Connectivity...');
  
  // Test environment variables
  if (!process.env.DATABASE_URL) {
    logTest('environment', 'DATABASE_URL Environment Variable', 'FAIL', 'DATABASE_URL not found');
    return false;
  }
  logTest('environment', 'DATABASE_URL Environment Variable', 'PASS', 'Variable exists');
  
  try {
    // Create database connection
    const sql = postgres(process.env.DATABASE_URL, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
      types: {
        bigint: postgres.BigInt,
      },
    });
    
    const db = drizzle(sql);
    
    // Test basic query
    const result = await db.execute('SELECT 1 as test_value, NOW() as current_time');
    logTest('database', 'Basic Query Execution', 'PASS', `Query returned ${result.length} rows`);
    
    // Test table existence (users table)
    try {
      const userCheck = await db.execute('SELECT COUNT(*) as count FROM users LIMIT 1');
      logTest('database', 'Users Table Access', 'PASS', `Users table accessible`);
    } catch (error) {
      logTest('database', 'Users Table Access', 'FAIL', error.message);
    }
    
    // Test connection pool
    await sql.end();
    logTest('database', 'Connection Pool Management', 'PASS', 'Connection closed successfully');
    
    return true;
    
  } catch (error) {
    logTest('database', 'Database Connection', 'FAIL', error.message);
    return false;
  }
}

// Test environment configuration
async function testEnvironmentConfiguration() {
  console.log('\n🔧 Testing Environment Configuration...');
  
  const requiredEnvVars = [
    'DATABASE_URL',
    'SESSION_SECRET',
    'STRIPE_SECRET_KEY',
    'VITE_STRIPE_PUBLIC_KEY'
  ];
  
  const optionalEnvVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'SHIPDAY_API_KEY',
    'PRINTER_IP'
  ];
  
  // Test required environment variables
  requiredEnvVars.forEach(varName => {
    if (process.env[varName]) {
      logTest('environment', `Required ${varName}`, 'PASS', 'Variable exists and has value');
    } else {
      logTest('environment', `Required ${varName}`, 'FAIL', 'Missing required environment variable');
    }
  });
  
  // Test optional environment variables (log as info)
  optionalEnvVars.forEach(varName => {
    if (process.env[varName] && process.env[varName] !== 'your_' + varName.toLowerCase() + '_here') {
      logTest('environment', `Optional ${varName}`, 'PASS', 'Variable configured');
    } else {
      console.log(`ℹ️  [INFO] Optional ${varName} - Not configured (may limit functionality)`);
    }
  });
  
  // Test NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv && ['development', 'production', 'test'].includes(nodeEnv)) {
    logTest('environment', 'NODE_ENV Configuration', 'PASS', `Set to ${nodeEnv}`);
  } else {
    logTest('environment', 'NODE_ENV Configuration', 'FAIL', `Invalid or missing NODE_ENV: ${nodeEnv}`);
  }
}

// Test external service connectivity
async function testExternalServices() {
  console.log('\n🌐 Testing External Service Connectivity...');
  
  // Test Stripe API connectivity
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      // Test with a simple API call
      const account = await stripe.accounts.retrieve();
      logTest('connectivity', 'Stripe API Connection', 'PASS', `Connected to Stripe account`);
    } catch (error) {
      logTest('connectivity', 'Stripe API Connection', 'FAIL', error.message);
    }
  }
  
  // Test database connection (Supabase)
  try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    const hostname = dbUrl.hostname;
    const port = dbUrl.port || 5432;
    
    // Test TCP connection to database host
    const socket = new net.Socket();
    
    const connectionTest = new Promise((resolve, reject) => {
      socket.setTimeout(5000);
      socket.on('connect', () => {
        socket.end();
        resolve(true);
      });
      socket.on('error', reject);
      socket.on('timeout', () => reject(new Error('Connection timeout')));
      socket.connect(port, hostname);
    });
    
    await connectionTest;
    logTest('connectivity', 'Database Host Connectivity', 'PASS', `${hostname}:${port} reachable`);
    
  } catch (error) {
    logTest('connectivity', 'Database Host Connectivity', 'FAIL', error.message);
  }
}

// Test security configuration
async function testSecurityConfiguration() {
  console.log('\n🔐 Testing Security Configuration...');
  
  // Test session secret strength
  const sessionSecret = process.env.SESSION_SECRET;
  if (sessionSecret) {
    if (sessionSecret.length >= 32) {
      logTest('security', 'Session Secret Strength', 'PASS', `${sessionSecret.length} characters`);
    } else {
      logTest('security', 'Session Secret Strength', 'FAIL', `Too short: ${sessionSecret.length} characters (minimum 32 recommended)`);
    }
  }
  
  // Test for default/weak secrets
  const defaultSecrets = ['secret', 'password', 'admin', 'test'];
  if (sessionSecret && !defaultSecrets.includes(sessionSecret.toLowerCase())) {
    logTest('security', 'Session Secret Uniqueness', 'PASS', 'Not using default values');
  } else {
    logTest('security', 'Session Secret Uniqueness', 'FAIL', 'Using weak or default secret');
  }
  
  // Test Stripe key format
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (stripeSecret) {
    if (stripeSecret.startsWith('sk_test_') || stripeSecret.startsWith('sk_live_')) {
      const keyType = stripeSecret.startsWith('sk_test_') ? 'test' : 'live';
      logTest('security', 'Stripe Key Format', 'PASS', `Valid ${keyType} key format`);
    } else {
      logTest('security', 'Stripe Key Format', 'FAIL', 'Invalid Stripe key format');
    }
  }
}

// Generate comprehensive report
function generateReport() {
  console.log('\n📊 COMPREHENSIVE TEST REPORT');
  console.log('=' .repeat(50));
  
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  
  Object.keys(testResults).forEach(category => {
    const { passed, failed, tests } = testResults[category];
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
  console.log(`🎯 Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
  
  const isProductionReady = totalFailed === 0;
  console.log(`\n🚀 Production Ready: ${isProductionReady ? 'YES' : 'NO'}`);
  
  if (!isProductionReady) {
    console.log('\n⚠️  ISSUES TO ADDRESS BEFORE PRODUCTION:');
    Object.keys(testResults).forEach(category => {
      testResults[category].tests
        .filter(t => t.status === 'FAIL')
        .forEach(test => {
          console.log(`   ${category.toUpperCase()}: ${test.test} - ${test.details}`);
        });
    });
  }
  
  return { totalTests, totalPassed, totalFailed, isProductionReady };
}

// Main test execution
async function runComprehensiveTests() {
  console.log('🚀 Starting Comprehensive Backend Testing Suite');
  console.log('Pizza Spin Rewards - Backend System Validation');
  console.log('=' .repeat(50));
  
  try {
    await testEnvironmentConfiguration();
    await testDatabaseConnectivity();
    await testExternalServices();
    await testSecurityConfiguration();
    
    const summary = generateReport();
    
    console.log(`\nTest execution completed at ${new Date().toISOString()}`);
    
    // Exit with appropriate code
    process.exit(summary.isProductionReady ? 0 : 1);
    
  } catch (error) {
    console.error('\n💥 CRITICAL ERROR during testing:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the tests
if (import.meta.main) {
  runComprehensiveTests();
}

export {
  runComprehensiveTests,
  testDatabaseConnectivity,
  testEnvironmentConfiguration,
  testExternalServices,
  testSecurityConfiguration
};