#!/usr/bin/env node

/**
 * Test a very basic function to see if any functions are working
 */

const https = require('https');

const SITE_URL = 'https://favillaspizzeria.com';

// Test the most basic endpoints
const endpoints = [
  { path: '/.netlify/functions/test', name: 'Basic Test Function' },
  { path: '/.netlify/functions/db-test', name: 'DB Test Function' },
  { path: '/.netlify/functions/index', name: 'Index Function' },
  { path: '/api/test', name: 'Test API via redirect' },
];

function testEndpoint(url, method = 'GET') {
  return new Promise((resolve) => {
    const options = {
      method,
      timeout: 15000,
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
          body: data.length < 200 ? data : data.substring(0, 200) + '...'
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
  console.log('🔍 Testing basic functions to verify deployment...\n');

  for (const endpoint of endpoints) {
    const url = `${SITE_URL}${endpoint.path}`;
    console.log(`Testing ${endpoint.name}: ${url}`);

    const result = await testEndpoint(url);

    if (result.success) {
      console.log(`✅ Status: ${result.statusCode}`);
      console.log(`📄 Content-Type: ${result.contentType}`);

      if (result.statusCode === 200) {
        console.log('✅ Function is working!');
        console.log(`Response: ${result.body}`);
      } else if (result.statusCode === 405) {
        console.log('⚠️  Method not allowed - function exists but needs different method');
      } else if (result.statusCode === 404) {
        console.log('❌ Function not found');
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

  console.log('🏁 Basic function test completed');
}

runTests().catch(console.error);