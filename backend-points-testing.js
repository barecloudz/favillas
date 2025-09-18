#!/usr/bin/env node

/**
 * Backend Points System Testing Script
 *
 * This script performs comprehensive testing of the points system to identify
 * why earned points aren't showing on the rewards page.
 */

import postgres from 'postgres';
import https from 'https';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE_URL = 'https://pizzaspinrewards.netlify.app';
let sql;

function initDB() {
  if (sql) return sql;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });

  return sql;
}

/**
 * Test 1: Database Schema Verification
 * Verify all points-related tables exist and have correct structure
 */
async function testDatabaseSchema() {
  console.log('\n🔍 TEST 1: DATABASE SCHEMA VERIFICATION');
  console.log('=' + '='.repeat(50));

  try {
    const sql = initDB();

    // Check if key tables exist
    const tables = await sql`
      SELECT table_name, column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name IN ('user_points', 'points_transactions', 'orders', 'users')
      ORDER BY table_name, ordinal_position
    `;

    const tableStructure = {};
    tables.forEach(row => {
      if (!tableStructure[row.table_name]) {
        tableStructure[row.table_name] = [];
      }
      tableStructure[row.table_name].push({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable
      });
    });

    console.log('📊 Table structures found:');
    Object.keys(tableStructure).forEach(tableName => {
      console.log(`\n   ${tableName.toUpperCase()} TABLE:`);
      tableStructure[tableName].forEach(col => {
        console.log(`     ${col.column} (${col.type}, ${col.nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
    });

    // Check if user_points table has supabase_user_id column
    const userPointsStructure = tableStructure.user_points || [];
    const hasSupabaseUserId = userPointsStructure.some(col => col.column === 'supabase_user_id');

    console.log('\n🔍 Critical schema check:');
    console.log(`   user_points table exists: ${!!tableStructure.user_points}`);
    console.log(`   user_points has supabase_user_id column: ${hasSupabaseUserId}`);
    console.log(`   points_transactions table exists: ${!!tableStructure.points_transactions}`);

    if (!hasSupabaseUserId) {
      console.log('⚠️  CRITICAL ISSUE: user_points table missing supabase_user_id column!');
      console.log('   This would prevent Supabase users from having their points tracked properly.');
    }

    return {
      success: true,
      hasSupabaseSupport: hasSupabaseUserId,
      tableStructure
    };

  } catch (error) {
    console.error('❌ Database schema check failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test 2: Check Recent Orders and Points
 * Look at recent orders to see if points are being awarded
 */
async function testRecentOrdersAndPoints() {
  console.log('\n🔍 TEST 2: RECENT ORDERS AND POINTS ANALYSIS');
  console.log('=' + '='.repeat(50));

  try {
    const sql = initDB();

    // Get recent orders (last 10)
    const recentOrders = await sql`
      SELECT id, user_id, supabase_user_id, total, tax, status, payment_status, created_at
      FROM orders
      WHERE status != 'cancelled'
      ORDER BY created_at DESC
      LIMIT 10
    `;

    console.log(`📋 Found ${recentOrders.length} recent orders:`);

    for (const order of recentOrders) {
      console.log(`\n   Order #${order.id}:`);
      console.log(`     User ID: ${order.user_id || 'null'}`);
      console.log(`     Supabase User ID: ${order.supabase_user_id || 'null'}`);
      console.log(`     Total: $${order.total}`);
      console.log(`     Status: ${order.status}`);
      console.log(`     Payment: ${order.payment_status}`);
      console.log(`     Created: ${order.created_at}`);

      // Check if there are points transactions for this order
      const pointsTransactions = await sql`
        SELECT * FROM points_transactions
        WHERE order_id = ${order.id}
      `;

      console.log(`     Points transactions: ${pointsTransactions.length}`);
      if (pointsTransactions.length > 0) {
        pointsTransactions.forEach((pt, index) => {
          console.log(`       Transaction ${index + 1}: ${pt.type} ${pt.points} points - ${pt.description}`);
        });
      } else {
        console.log(`     ⚠️ No points transactions found for order #${order.id}`);

        // If this is a paid order with user, it should have points
        if (order.payment_status === 'paid' && (order.user_id || order.supabase_user_id)) {
          console.log(`     🚨 ISSUE: Paid order with user but no points awarded!`);
        }
      }
    }

    return { success: true, recentOrders };

  } catch (error) {
    console.error('❌ Recent orders check failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test 3: User Points Data Integrity
 * Check user_points table for both legacy and Supabase users
 */
async function testUserPointsDataIntegrity() {
  console.log('\n🔍 TEST 3: USER POINTS DATA INTEGRITY');
  console.log('=' + '='.repeat(50));

  try {
    const sql = initDB();

    // Get all user points records
    const userPointsRecords = await sql`
      SELECT * FROM user_points ORDER BY updated_at DESC LIMIT 20
    `;

    console.log(`📊 Found ${userPointsRecords.length} user points records:`);

    let legacyUsers = 0;
    let supabaseUsers = 0;
    let issuesFound = [];

    for (const record of userPointsRecords) {
      const hasLegacyId = !!record.user_id;
      const hasSupabaseId = !!record.supabase_user_id;

      if (hasLegacyId) legacyUsers++;
      if (hasSupabaseId) supabaseUsers++;

      console.log(`\n   Record #${record.id}:`);
      console.log(`     User ID: ${record.user_id || 'null'}`);
      console.log(`     Supabase User ID: ${record.supabase_user_id || 'null'}`);
      console.log(`     Current Points: ${record.points}`);
      console.log(`     Total Earned: ${record.total_earned}`);
      console.log(`     Total Redeemed: ${record.total_redeemed}`);
      console.log(`     Last Earned: ${record.last_earned_at || 'never'}`);

      // Check for data integrity issues
      if (!hasLegacyId && !hasSupabaseId) {
        issuesFound.push(`Record #${record.id}: No user identifier (neither user_id nor supabase_user_id)`);
      }

      if (record.points < 0) {
        issuesFound.push(`Record #${record.id}: Negative points balance (${record.points})`);
      }

      if (record.total_earned < record.total_redeemed) {
        issuesFound.push(`Record #${record.id}: Total redeemed exceeds total earned`);
      }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Legacy users with points: ${legacyUsers}`);
    console.log(`   Supabase users with points: ${supabaseUsers}`);
    console.log(`   Data integrity issues: ${issuesFound.length}`);

    if (issuesFound.length > 0) {
      console.log('\n🚨 Data integrity issues found:');
      issuesFound.forEach(issue => console.log(`   - ${issue}`));
    }

    return {
      success: true,
      legacyUsers,
      supabaseUsers,
      issuesFound,
      userPointsRecords
    };

  } catch (error) {
    console.error('❌ User points data integrity check failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test 4: API Endpoint Testing
 * Test both orders and user-rewards APIs
 */
async function testAPIEndpoints() {
  console.log('\n🔍 TEST 4: API ENDPOINT TESTING');
  console.log('=' + '='.repeat(50));

  const results = { orders: null, userRewards: null };

  // Test Orders API
  try {
    console.log('🌐 Testing Orders API...');
    const ordersResult = await testApiEndpoint('/api/orders', 'GET');
    results.orders = ordersResult;
    console.log(`   Orders API Status: ${ordersResult.statusCode}`);
    if (ordersResult.statusCode === 401) {
      console.log('   ✅ Correctly requires authentication');
    } else {
      console.log(`   ⚠️ Unexpected status code: ${ordersResult.statusCode}`);
    }
  } catch (error) {
    console.log(`   ❌ Orders API test failed: ${error.message}`);
    results.orders = { error: error.message };
  }

  // Test User Rewards API
  try {
    console.log('\n🌐 Testing User Rewards API...');
    const rewardsResult = await testApiEndpoint('/api/user-rewards', 'GET');
    results.userRewards = rewardsResult;
    console.log(`   User Rewards API Status: ${rewardsResult.statusCode}`);
    if (rewardsResult.statusCode === 401) {
      console.log('   ✅ Correctly requires authentication');
    } else {
      console.log(`   ⚠️ Unexpected status code: ${rewardsResult.statusCode}`);
    }
  } catch (error) {
    console.log(`   ❌ User Rewards API test failed: ${error.message}`);
    results.userRewards = { error: error.message };
  }

  return results;
}

/**
 * Helper function to test API endpoints
 */
function testApiEndpoint(path, method) {
  return new Promise((resolve, reject) => {
    const url = `${BASE_URL}${path}`;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
          bodyLength: data.length
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.setTimeout(10000, () => {
      req.abort();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Test 5: Authentication Flow Analysis
 * Analyze how different user types are handled
 */
async function testAuthenticationFlow() {
  console.log('\n🔍 TEST 5: AUTHENTICATION FLOW ANALYSIS');
  console.log('=' + '='.repeat(50));

  try {
    const sql = initDB();

    // Check users with both legacy and Supabase IDs
    const usersAnalysis = await sql`
      SELECT
        COUNT(*) as total_users,
        COUNT(CASE WHEN supabase_user_id IS NOT NULL THEN 1 END) as supabase_users,
        COUNT(CASE WHEN supabase_user_id IS NULL THEN 1 END) as legacy_users
      FROM users
    `;

    console.log('👥 User base analysis:');
    const analysis = usersAnalysis[0];
    console.log(`   Total users: ${analysis.total_users}`);
    console.log(`   Supabase users: ${analysis.supabase_users}`);
    console.log(`   Legacy users: ${analysis.legacy_users}`);

    // Check for orphaned points records
    const orphanedPoints = await sql`
      SELECT up.*, u.username, u.email
      FROM user_points up
      LEFT JOIN users u ON (up.user_id = u.id OR up.supabase_user_id = u.supabase_user_id)
      WHERE u.id IS NULL
    `;

    console.log(`\n🔍 Orphaned points records: ${orphanedPoints.length}`);
    if (orphanedPoints.length > 0) {
      console.log('   ⚠️ Found points records without corresponding users:');
      orphanedPoints.forEach(record => {
        console.log(`     Points record #${record.id}: user_id=${record.user_id}, supabase_user_id=${record.supabase_user_id}`);
      });
    }

    return {
      success: true,
      usersAnalysis: analysis,
      orphanedPoints: orphanedPoints.length
    };

  } catch (error) {
    console.error('❌ Authentication flow analysis failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Main test runner
 */
async function runBackendPointsTest() {
  console.log('🔍 BACKEND POINTS SYSTEM COMPREHENSIVE TEST');
  console.log('=' + '='.repeat(60));
  console.log('Test started:', new Date().toISOString());
  console.log('Environment: Production database via Netlify');

  const testResults = {
    schema: null,
    recentOrders: null,
    userPoints: null,
    apiEndpoints: null,
    authentication: null,
    summary: {
      criticalIssues: [],
      warnings: [],
      recommendations: []
    }
  };

  try {
    // Test 1: Database Schema
    testResults.schema = await testDatabaseSchema();
    if (!testResults.schema.success) {
      testResults.summary.criticalIssues.push('Database schema verification failed');
    } else if (!testResults.schema.hasSupabaseSupport) {
      testResults.summary.criticalIssues.push('user_points table missing supabase_user_id column');
    }

    // Test 2: Recent Orders and Points
    testResults.recentOrders = await testRecentOrdersAndPoints();
    if (!testResults.recentOrders.success) {
      testResults.summary.criticalIssues.push('Recent orders analysis failed');
    }

    // Test 3: User Points Data Integrity
    testResults.userPoints = await testUserPointsDataIntegrity();
    if (!testResults.userPoints.success) {
      testResults.summary.criticalIssues.push('User points data integrity check failed');
    } else if (testResults.userPoints.issuesFound.length > 0) {
      testResults.summary.warnings.push(`${testResults.userPoints.issuesFound.length} data integrity issues found`);
    }

    // Test 4: API Endpoints
    testResults.apiEndpoints = await testAPIEndpoints();

    // Test 5: Authentication Flow
    testResults.authentication = await testAuthenticationFlow();
    if (!testResults.authentication.success) {
      testResults.summary.criticalIssues.push('Authentication flow analysis failed');
    } else if (testResults.authentication.orphanedPoints > 0) {
      testResults.summary.warnings.push(`${testResults.authentication.orphanedPoints} orphaned points records found`);
    }

    // Generate summary and recommendations
    generateSummaryAndRecommendations(testResults);

    console.log('\n✅ BACKEND POINTS SYSTEM TEST COMPLETED');
    console.log('📋 See summary below for issues and recommendations');

  } catch (error) {
    console.error('\n❌ BACKEND TEST FAILED');
    console.error('Error:', error);
    testResults.summary.criticalIssues.push(`Test execution failed: ${error.message}`);
  } finally {
    if (sql) {
      await sql.end();
    }
  }

  return testResults;
}

/**
 * Generate summary and recommendations based on test results
 */
function generateSummaryAndRecommendations(testResults) {
  console.log('\n📊 COMPREHENSIVE TEST SUMMARY');
  console.log('=' + '='.repeat(50));

  // Critical Issues
  if (testResults.summary.criticalIssues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES FOUND:');
    testResults.summary.criticalIssues.forEach((issue, index) => {
      console.log(`   ${index + 1}. ${issue}`);
    });
  }

  // Warnings
  if (testResults.summary.warnings.length > 0) {
    console.log('\n⚠️ WARNINGS:');
    testResults.summary.warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');

  if (!testResults.schema?.hasSupabaseSupport) {
    console.log('   1. URGENT: Add supabase_user_id column to user_points table');
    console.log('      ALTER TABLE user_points ADD COLUMN supabase_user_id TEXT;');
    console.log('      CREATE INDEX idx_user_points_supabase_user_id ON user_points(supabase_user_id);');
  }

  if (testResults.userPoints?.supabaseUsers === 0 && testResults.authentication?.usersAnalysis?.supabase_users > 0) {
    console.log('   2. URGENT: Supabase users exist but have no points records');
    console.log('      The user-rewards API needs to handle Supabase authentication properly');
  }

  console.log('   3. Verify that the orders API is correctly awarding points for both user types');
  console.log('   4. Ensure the user-rewards API queries both user_id and supabase_user_id appropriately');
  console.log('   5. Test the complete flow: order creation → points awarding → rewards page display');

  // Final Assessment
  const criticalCount = testResults.summary.criticalIssues.length;
  const warningCount = testResults.summary.warnings.length;

  console.log('\n🎯 FINAL ASSESSMENT:');
  if (criticalCount === 0 && warningCount === 0) {
    console.log('   ✅ Points system appears to be functioning correctly');
  } else if (criticalCount === 0) {
    console.log('   ⚠️ Points system has minor issues that should be addressed');
  } else {
    console.log('   🚨 Points system has critical issues that need immediate attention');
    console.log('   📋 Focus on critical issues first, then address warnings');
  }

  console.log(`\n📈 Issue Summary: ${criticalCount} critical, ${warningCount} warnings`);
}

// Run the test
runBackendPointsTest().catch(console.error);