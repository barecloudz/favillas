#!/usr/bin/env node

/**
 * Test functions that are confirmed to be deployed
 */

const https = require('https');

const SITE_URL = 'https://favillaspizzeria.com';

// Test the functions that Netlify CLI confirms are deployed
const endpoints = [
  { path: '/.netlify/functions/redeem-no-auth', name: 'Redeem No Auth (Direct)' },
  { path: '/.netlify/functions/debug-vouchers', name: 'Debug Vouchers (Direct)' },
  { path: '/.netlify/functions/user-active-vouchers', name: 'User Active Vouchers (Direct)' },
  { path: '/.netlify/functions/test-auth-simple', name: 'Test Auth Simple (Direct)' },
  { path: '/.netlify/functions/menu-items', name: 'Menu Items (Direct)' },
  { path: '/.netlify/functions/test', name: 'Test Function (Direct)' },
];

function testEndpoint(url, method = 'POST') {
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
          body: data.length < 300 ? data : data.substring(0, 300) + '...'
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

    // For POST requests, send empty JSON body
    if (method === 'POST') {
      request.write(JSON.stringify({}));
    }

    request.end();
  });
}

async function runTests() {
  console.log('🔍 Testing confirmed deployed functions...\n');

  for (const endpoint of endpoints) {
    const url = `${SITE_URL}${endpoint.path}`;
    console.log(`Testing ${endpoint.name}: ${url}`);

    // Test with POST first (most functions expect POST)
    let result = await testEndpoint(url, 'POST');

    if (result.success) {
      console.log(`✅ POST Status: ${result.statusCode}`);
      console.log(`📄 Content-Type: ${result.contentType}`);

      if (result.statusCode === 200) {
        console.log('✅ Function is working with POST!');
        console.log(`Response: ${result.body}`);
      } else if (result.statusCode === 405) {
        console.log('⚠️  POST method not allowed, trying GET...');

        // Try with GET
        result = await testEndpoint(url, 'GET');
        if (result.success) {
          console.log(`✅ GET Status: ${result.statusCode}`);
          if (result.statusCode === 200) {
            console.log('✅ Function is working with GET!');
            console.log(`Response: ${result.body}`);
          } else {
            console.log(`Response: ${result.body}`);
          }
        }
      } else if (result.statusCode === 404) {
        console.log('❌ Function not found - possible routing issue');
      } else if (result.statusCode >= 500) {
        console.log('❌ Server error in function');
        console.log(`Response: ${result.body}`);
      } else {
        console.log(`⚠️  Status: ${result.statusCode}`);
        console.log(`Response: ${result.body}`);
      }
    } else {
      console.log(`❌ Error: ${result.error}`);
    }

    console.log(''); // Empty line for readability
  }

  console.log('🏁 Confirmed functions test completed');
}

runTests().catch(console.error);