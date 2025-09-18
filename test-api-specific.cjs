#!/usr/bin/env node

/**
 * Test specific API endpoints to verify functions deployment
 */

const https = require('https');

const SITE_URL = 'https://favillaspizzeria.com';

// Test endpoints specifically mentioned in netlify.toml
const endpoints = [
  { path: '/api/redeem-no-auth', name: 'No-Auth Redemption API' },
  { path: '/api/debug-vouchers', name: 'Debug Vouchers API' },
  { path: '/api/user/active-vouchers', name: 'Active Vouchers API' },
  { path: '/api/test-auth-simple', name: 'Simple Auth Test API' },
  { path: '/.netlify/functions/menu-items', name: 'Direct Function: Menu Items' },
  { path: '/.netlify/functions/redeem-no-auth', name: 'Direct Function: Redeem No Auth' },
];

function testEndpoint(url, method = 'GET') {
  return new Promise((resolve) => {
    const options = {
      method,
      timeout: 10000,
    };

    const request = https.request(url, options, (response) => {
      const { statusCode, headers } = response;
      let data = '';

      response.on('data', chunk => {
        data += chunk;
      });

      response.on('end', () => {
        resolve({
          success: true,
          statusCode,
          contentType: headers['content-type'],
          bodyLength: data.length,
          body: data.length < 500 ? data : data.substring(0, 500) + '...'
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

    request.end();
  });
}

async function runTests() {
  console.log('🔍 Testing specific API endpoints...\n');

  for (const endpoint of endpoints) {
    const url = `${SITE_URL}${endpoint.path}`;
    console.log(`Testing ${endpoint.name}: ${url}`);

    const result = await testEndpoint(url);

    if (result.success) {
      console.log(`✅ Status: ${result.statusCode}`);
      console.log(`📄 Content-Type: ${result.contentType}`);
      console.log(`📊 Body Length: ${result.bodyLength} bytes`);

      if (result.statusCode === 200) {
        console.log('✅ Endpoint is working correctly');
      } else if (result.statusCode === 405) {
        console.log('⚠️  Method not allowed - function exists but needs different method');
      } else if (result.statusCode === 404) {
        console.log('❌ Function not found - deployment issue');
      } else if (result.statusCode >= 500) {
        console.log('❌ Server error in function');
        console.log(`Response preview: ${result.body}`);
      } else {
        console.log(`⚠️  Unexpected status: ${result.statusCode}`);
        console.log(`Response preview: ${result.body}`);
      }
    } else {
      console.log(`❌ Error: ${result.error}`);
    }

    console.log(''); // Empty line for readability
  }

  console.log('🏁 API test completed');
}

runTests().catch(console.error);