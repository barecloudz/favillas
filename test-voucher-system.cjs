#!/usr/bin/env node

/**
 * Test the voucher redemption system specifically
 */

const https = require('https');

const NETLIFY_URL = 'https://favillasnypizza.netlify.app';

const voucherEndpoints = [
  {
    path: '/.netlify/functions/redeem-no-auth',
    name: 'No-Auth Voucher Redemption',
    method: 'POST',
    testData: { rewardId: 'test-reward-id' }
  },
  {
    path: '/.netlify/functions/debug-vouchers',
    name: 'Debug Vouchers',
    method: 'GET'
  },
  {
    path: '/.netlify/functions/user-active-vouchers',
    name: 'User Active Vouchers',
    method: 'GET'
  },
  {
    path: '/.netlify/functions/rewards',
    name: 'Rewards List',
    method: 'GET'
  },
];

function testEndpoint(url, method = 'GET', data = null) {
  return new Promise((resolve) => {
    const options = {
      method,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const request = https.request(url, options, (response) => {
      const { statusCode, headers } = response;
      let responseData = '';

      response.on('data', chunk => {
        responseData += chunk;
      });

      response.on('end', () => {
        resolve({
          success: true,
          statusCode,
          contentType: headers['content-type'],
          bodyLength: responseData.length,
          body: responseData.length < 500 ? responseData : responseData.substring(0, 500) + '...'
        });
      });
    });

    request.on('error', (error) => {
      resolve({
        success: false,
        error: error.message
      });
    });

    request.on('timeout', () => {
      request.destroy();
      resolve({
        success: false,
        error: 'Request timeout'
      });
    });

    if (method === 'POST' && data) {
      request.write(JSON.stringify(data));
    } else if (method === 'POST') {
      request.write(JSON.stringify({}));
    }

    request.end();
  });
}

async function runVoucherTests() {
  console.log('🎫 Testing voucher redemption system...\n');

  for (const endpoint of voucherEndpoints) {
    const url = `${NETLIFY_URL}${endpoint.path}`;
    console.log(`Testing ${endpoint.name}: ${url}`);

    const result = await testEndpoint(url, endpoint.method, endpoint.testData);

    if (result.success) {
      console.log(`✅ Status: ${result.statusCode}`);
      console.log(`📄 Content-Type: ${result.contentType}`);

      if (result.statusCode === 200) {
        console.log('✅ Endpoint is working!');
        console.log(`Response: ${result.body}`);
      } else if (result.statusCode === 400) {
        console.log('⚠️  Bad request - endpoint working but needs valid data');
        console.log(`Response: ${result.body}`);
      } else if (result.statusCode === 401) {
        console.log('⚠️  Unauthorized - endpoint working but needs authentication');
        console.log(`Response: ${result.body}`);
      } else if (result.statusCode === 405) {
        console.log('⚠️  Method not allowed');
      } else {
        console.log(`⚠️  Status: ${result.statusCode}`);
        console.log(`Response: ${result.body}`);
      }
    } else {
      console.log(`❌ Error: ${result.error}`);
    }

    console.log(''); // Empty line for readability
  }

  console.log('🏁 Voucher system test completed');
}

runVoucherTests().catch(console.error);