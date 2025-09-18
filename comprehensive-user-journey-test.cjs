#!/usr/bin/env node

const https = require('https');
const http = require('http');

const BASE_URL = 'https://pizzaspinrewards.netlify.app';

// Test configuration
const TEST_CONFIG = {
    timeout: 30000,
    retries: 3,
    verbose: true
};

// Test results storage
const testResults = {
    authentication: {},
    orders: {},
    points: {},
    rewards: {},
    vouchers: {},
    errors: [],
    summary: {}
};

// Utility functions
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const isHttps = url.startsWith('https://');
        const client = isHttps ? https : http;

        const requestOptions = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'PizzaSpinRewards-Test-Suite/1.0',
                ...options.headers
            },
            timeout: TEST_CONFIG.timeout,
            ...options.requestOptions
        };

        const req = client.request(url, requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const result = {
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data,
                        data: data ? JSON.parse(data) : null
                    };
                    resolve(result);
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: data,
                        data: null,
                        parseError: e.message
                    });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (options.body) {
            req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
        }

        req.end();
    });
}

function log(message, level = 'INFO') {
    if (TEST_CONFIG.verbose) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${level}] ${message}`);
    }
}

function logError(error, context = '') {
    const errorInfo = {
        timestamp: new Date().toISOString(),
        context,
        error: error.message || error,
        stack: error.stack
    };
    testResults.errors.push(errorInfo);
    log(`ERROR in ${context}: ${error.message || error}`, 'ERROR');
}

// Test functions
async function testDeploymentStatus() {
    log('Testing deployment status...');
    try {
        const response = await makeRequest(`${BASE_URL}/api/test`);

        testResults.deployment = {
            accessible: response.statusCode < 400,
            statusCode: response.statusCode,
            responseTime: Date.now(),
            testEndpoint: response.data
        };

        log(`Deployment test: ${response.statusCode}`);
        return response.statusCode < 400;
    } catch (error) {
        logError(error, 'Deployment Status');
        testResults.deployment = { accessible: false, error: error.message };
        return false;
    }
}

async function testAuthenticationDebug() {
    log('Testing authentication debug endpoint...');
    try {
        const response = await makeRequest(`${BASE_URL}/api/debug-auth`);

        testResults.authentication.debugEndpoint = {
            statusCode: response.statusCode,
            accessible: response.statusCode < 400,
            data: response.data
        };

        log(`Auth debug test: ${response.statusCode}`);
        if (response.data) {
            log(`Auth debug data: ${JSON.stringify(response.data, null, 2)}`);
        }

        return response.statusCode < 400;
    } catch (error) {
        logError(error, 'Authentication Debug');
        testResults.authentication.debugEndpoint = { accessible: false, error: error.message };
        return false;
    }
}

async function testUserProfile() {
    log('Testing user profile endpoint...');
    try {
        // Test without auth first to see error handling
        const noAuthResponse = await makeRequest(`${BASE_URL}/api/user/profile`);

        testResults.authentication.profileEndpoint = {
            noAuth: {
                statusCode: noAuthResponse.statusCode,
                data: noAuthResponse.data,
                hasProperErrorHandling: noAuthResponse.statusCode === 401 || noAuthResponse.statusCode === 403
            }
        };

        log(`User profile (no auth): ${noAuthResponse.statusCode}`);
        return true;
    } catch (error) {
        logError(error, 'User Profile Test');
        return false;
    }
}

async function testOrdersEndpoint() {
    log('Testing orders endpoint...');
    try {
        // Test GET orders
        const getResponse = await makeRequest(`${BASE_URL}/api/orders`);

        testResults.orders.getEndpoint = {
            statusCode: getResponse.statusCode,
            accessible: getResponse.statusCode < 500,
            data: getResponse.data,
            hasData: getResponse.data && Array.isArray(getResponse.data)
        };

        log(`Orders GET: ${getResponse.statusCode}`);

        // Test debug orders endpoint
        const debugResponse = await makeRequest(`${BASE_URL}/api/debug-orders`);

        testResults.orders.debugEndpoint = {
            statusCode: debugResponse.statusCode,
            accessible: debugResponse.statusCode < 500,
            data: debugResponse.data
        };

        log(`Orders debug: ${debugResponse.statusCode}`);

        return getResponse.statusCode < 500;
    } catch (error) {
        logError(error, 'Orders Endpoint Test');
        return false;
    }
}

async function testRewardsSystem() {
    log('Testing rewards system...');
    try {
        // Test rewards endpoint
        const rewardsResponse = await makeRequest(`${BASE_URL}/api/rewards`);

        testResults.rewards.endpoint = {
            statusCode: rewardsResponse.statusCode,
            accessible: rewardsResponse.statusCode < 500,
            data: rewardsResponse.data,
            hasRewards: rewardsResponse.data && Array.isArray(rewardsResponse.data) && rewardsResponse.data.length > 0
        };

        log(`Rewards endpoint: ${rewardsResponse.statusCode}`);

        // Test user rewards endpoint (without auth)
        const userRewardsResponse = await makeRequest(`${BASE_URL}/api/user/rewards`);

        testResults.rewards.userEndpoint = {
            statusCode: userRewardsResponse.statusCode,
            accessible: userRewardsResponse.statusCode < 500,
            hasAuthCheck: userRewardsResponse.statusCode === 401 || userRewardsResponse.statusCode === 403
        };

        log(`User rewards: ${userRewardsResponse.statusCode}`);

        return rewardsResponse.statusCode < 500;
    } catch (error) {
        logError(error, 'Rewards System Test');
        return false;
    }
}

async function testVoucherSystem() {
    log('Testing voucher system...');
    try {
        // Test user vouchers endpoint
        const vouchersResponse = await makeRequest(`${BASE_URL}/api/user/vouchers`);

        testResults.vouchers.userEndpoint = {
            statusCode: vouchersResponse.statusCode,
            accessible: vouchersResponse.statusCode < 500,
            hasAuthCheck: vouchersResponse.statusCode === 401 || vouchersResponse.statusCode === 403
        };

        log(`User vouchers: ${vouchersResponse.statusCode}`);

        // Test active vouchers endpoint
        const activeVouchersResponse = await makeRequest(`${BASE_URL}/api/user/active-vouchers`);

        testResults.vouchers.activeEndpoint = {
            statusCode: activeVouchersResponse.statusCode,
            accessible: activeVouchersResponse.statusCode < 500,
            hasAuthCheck: activeVouchersResponse.statusCode === 401 || activeVouchersResponse.statusCode === 403
        };

        log(`Active vouchers: ${activeVouchersResponse.statusCode}`);

        // Test voucher validation
        const validateResponse = await makeRequest(`${BASE_URL}/api/vouchers/validate`);

        testResults.vouchers.validateEndpoint = {
            statusCode: validateResponse.statusCode,
            accessible: validateResponse.statusCode < 500
        };

        log(`Voucher validation: ${validateResponse.statusCode}`);

        return true;
    } catch (error) {
        logError(error, 'Voucher System Test');
        return false;
    }
}

async function testPointsSystem() {
    log('Testing points system...');
    try {
        // Test earn points endpoint (should require auth)
        const earnResponse = await makeRequest(`${BASE_URL}/api/earn-points`, {
            method: 'POST',
            body: { orderId: 'test' }
        });

        testResults.points.earnEndpoint = {
            statusCode: earnResponse.statusCode,
            accessible: earnResponse.statusCode < 500,
            hasAuthCheck: earnResponse.statusCode === 401 || earnResponse.statusCode === 403
        };

        log(`Earn points: ${earnResponse.statusCode}`);

        // Test redeem points endpoint (should require auth)
        const redeemResponse = await makeRequest(`${BASE_URL}/api/redeem-points`, {
            method: 'POST',
            body: { rewardId: 1, points: 50 }
        });

        testResults.points.redeemEndpoint = {
            statusCode: redeemResponse.statusCode,
            accessible: redeemResponse.statusCode < 500,
            hasAuthCheck: redeemResponse.statusCode === 401 || redeemResponse.statusCode === 403
        };

        log(`Redeem points: ${redeemResponse.statusCode}`);

        return true;
    } catch (error) {
        logError(error, 'Points System Test');
        return false;
    }
}

async function testMenuSystem() {
    log('Testing menu system...');
    try {
        // Test menu endpoint
        const menuResponse = await makeRequest(`${BASE_URL}/api/menu`);

        testResults.menu = {
            statusCode: menuResponse.statusCode,
            accessible: menuResponse.statusCode < 500,
            data: menuResponse.data,
            hasItems: menuResponse.data && Array.isArray(menuResponse.data) && menuResponse.data.length > 0
        };

        log(`Menu endpoint: ${menuResponse.statusCode}`);

        // Test menu items endpoint
        const menuItemsResponse = await makeRequest(`${BASE_URL}/api/menu-items`);

        testResults.menuItems = {
            statusCode: menuItemsResponse.statusCode,
            accessible: menuItemsResponse.statusCode < 500,
            data: menuItemsResponse.data
        };

        log(`Menu items: ${menuItemsResponse.statusCode}`);

        return menuResponse.statusCode < 500;
    } catch (error) {
        logError(error, 'Menu System Test');
        return false;
    }
}

async function testErrorRecovery() {
    log('Testing error recovery mechanisms...');
    try {
        // Test invalid endpoints
        const invalidResponse = await makeRequest(`${BASE_URL}/api/nonexistent-endpoint`);

        testResults.errorHandling = {
            invalidEndpoint: {
                statusCode: invalidResponse.statusCode,
                handlesGracefully: invalidResponse.statusCode === 404
            }
        };

        log(`Invalid endpoint: ${invalidResponse.statusCode}`);

        // Test malformed requests
        const malformedResponse = await makeRequest(`${BASE_URL}/api/orders`, {
            method: 'POST',
            body: 'invalid-json'
        });

        testResults.errorHandling.malformedRequest = {
            statusCode: malformedResponse.statusCode,
            handlesGracefully: malformedResponse.statusCode >= 400 && malformedResponse.statusCode < 500
        };

        log(`Malformed request: ${malformedResponse.statusCode}`);

        return true;
    } catch (error) {
        logError(error, 'Error Recovery Test');
        return false;
    }
}

// Main test runner
async function runComprehensiveTests() {
    log('Starting comprehensive user journey tests...');
    log(`Base URL: ${BASE_URL}`);

    const startTime = Date.now();

    try {
        // Test 1: Deployment Status
        log('\n=== DEPLOYMENT STATUS TEST ===');
        await testDeploymentStatus();

        // Test 2: Authentication System
        log('\n=== AUTHENTICATION SYSTEM TEST ===');
        await testAuthenticationDebug();
        await testUserProfile();

        // Test 3: Orders System
        log('\n=== ORDERS SYSTEM TEST ===');
        await testOrdersEndpoint();

        // Test 4: Menu System
        log('\n=== MENU SYSTEM TEST ===');
        await testMenuSystem();

        // Test 5: Rewards System
        log('\n=== REWARDS SYSTEM TEST ===');
        await testRewardsSystem();

        // Test 6: Voucher System
        log('\n=== VOUCHER SYSTEM TEST ===');
        await testVoucherSystem();

        // Test 7: Points System
        log('\n=== POINTS SYSTEM TEST ===');
        await testPointsSystem();

        // Test 8: Error Recovery
        log('\n=== ERROR RECOVERY TEST ===');
        await testErrorRecovery();

    } catch (error) {
        logError(error, 'Main Test Runner');
    }

    // Calculate test summary
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    testResults.summary = {
        totalTime: `${totalTime}ms`,
        timestamp: new Date().toISOString(),
        totalErrors: testResults.errors.length,
        testedEndpoints: Object.keys(testResults).length - 2, // Exclude errors and summary
        overallHealth: testResults.errors.length === 0 ? 'HEALTHY' : 'NEEDS_ATTENTION'
    };

    // Generate report
    generateTestReport();
}

function generateTestReport() {
    log('\n' + '='.repeat(80));
    log('COMPREHENSIVE USER JOURNEY TEST REPORT');
    log('='.repeat(80));

    log(`\nTest Summary:`);
    log(`- Total time: ${testResults.summary.totalTime}`);
    log(`- Total errors: ${testResults.summary.totalErrors}`);
    log(`- Overall health: ${testResults.summary.overallHealth}`);

    log(`\nDeployment Status:`);
    if (testResults.deployment) {
        log(`- Accessible: ${testResults.deployment.accessible}`);
        log(`- Status code: ${testResults.deployment.statusCode}`);
    }

    log(`\nAuthentication System:`);
    if (testResults.authentication.debugEndpoint) {
        log(`- Debug endpoint: ${testResults.authentication.debugEndpoint.statusCode}`);
    }
    if (testResults.authentication.profileEndpoint) {
        log(`- Profile endpoint auth check: ${testResults.authentication.profileEndpoint.noAuth.hasProperErrorHandling}`);
    }

    log(`\nOrders System:`);
    if (testResults.orders.getEndpoint) {
        log(`- GET endpoint: ${testResults.orders.getEndpoint.statusCode}`);
        log(`- Has data structure: ${testResults.orders.getEndpoint.hasData}`);
    }
    if (testResults.orders.debugEndpoint) {
        log(`- Debug endpoint: ${testResults.orders.debugEndpoint.statusCode}`);
    }

    log(`\nRewards System:`);
    if (testResults.rewards.endpoint) {
        log(`- Rewards endpoint: ${testResults.rewards.endpoint.statusCode}`);
        log(`- Has rewards data: ${testResults.rewards.endpoint.hasRewards}`);
    }
    if (testResults.rewards.userEndpoint) {
        log(`- User rewards auth check: ${testResults.rewards.userEndpoint.hasAuthCheck}`);
    }

    log(`\nVoucher System:`);
    if (testResults.vouchers.userEndpoint) {
        log(`- User vouchers: ${testResults.vouchers.userEndpoint.statusCode}`);
        log(`- Auth check: ${testResults.vouchers.userEndpoint.hasAuthCheck}`);
    }
    if (testResults.vouchers.activeEndpoint) {
        log(`- Active vouchers: ${testResults.vouchers.activeEndpoint.statusCode}`);
    }
    if (testResults.vouchers.validateEndpoint) {
        log(`- Validation: ${testResults.vouchers.validateEndpoint.statusCode}`);
    }

    log(`\nPoints System:`);
    if (testResults.points.earnEndpoint) {
        log(`- Earn points: ${testResults.points.earnEndpoint.statusCode}`);
        log(`- Auth check: ${testResults.points.earnEndpoint.hasAuthCheck}`);
    }
    if (testResults.points.redeemEndpoint) {
        log(`- Redeem points: ${testResults.points.redeemEndpoint.statusCode}`);
        log(`- Auth check: ${testResults.points.redeemEndpoint.hasAuthCheck}`);
    }

    log(`\nMenu System:`);
    if (testResults.menu) {
        log(`- Menu endpoint: ${testResults.menu.statusCode}`);
        log(`- Has menu items: ${testResults.menu.hasItems}`);
    }
    if (testResults.menuItems) {
        log(`- Menu items: ${testResults.menuItems.statusCode}`);
    }

    log(`\nError Handling:`);
    if (testResults.errorHandling) {
        if (testResults.errorHandling.invalidEndpoint) {
            log(`- Invalid endpoint handling: ${testResults.errorHandling.invalidEndpoint.handlesGracefully ? 'GOOD' : 'NEEDS_FIX'} (${testResults.errorHandling.invalidEndpoint.statusCode})`);
        }
        if (testResults.errorHandling.malformedRequest) {
            log(`- Malformed request handling: ${testResults.errorHandling.malformedRequest.handlesGracefully ? 'GOOD' : 'NEEDS_FIX'} (${testResults.errorHandling.malformedRequest.statusCode})`);
        }
    }

    if (testResults.errors.length > 0) {
        log(`\nErrors encountered:`);
        testResults.errors.forEach((error, index) => {
            log(`${index + 1}. [${error.context}] ${error.error}`);
        });
    }

    log('\n' + '='.repeat(80));

    // Save results to file
    const fs = require('fs');
    const resultsFile = 'comprehensive-test-results.json';
    fs.writeFileSync(resultsFile, JSON.stringify(testResults, null, 2));
    log(`\nDetailed results saved to: ${resultsFile}`);
}

// Run the tests
if (require.main === module) {
    runComprehensiveTests().catch(error => {
        console.error('Failed to run tests:', error);
        process.exit(1);
    });
}

module.exports = { runComprehensiveTests, testResults };