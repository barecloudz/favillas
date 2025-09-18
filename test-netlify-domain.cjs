#!/usr/bin/env node

/**
 * Test using the direct netlify domain instead of custom domain
 */

const https = require('https');

// Use the direct netlify domain from netlify status
const NETLIFY_URL = 'https://favillasnypizza.netlify.app';

const endpoints = [
  { path: '/', name: 'Main Site (Netlify Domain)' },
  { path: '/.netlify/functions/test', name: 'Test Function (Netlify Domain)' },
  { path: '/.netlify/functions/redeem-no-auth', name: 'Redeem No Auth (Netlify Domain)' },
  { path: '/.netlify/functions/menu-items', name: 'Menu Items (Netlify Domain)' },
];

function testEndpoint(url, method = 'GET') {
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

    if (method === 'POST') {
      request.write(JSON.stringify({}));
    }

    request.end();
  });
}

async function runTests() {
  console.log('🔍 Testing direct Netlify domain...\n');

  for (const endpoint of endpoints) {
    const url = `${NETLIFY_URL}${endpoint.path}`;
    console.log(`Testing ${endpoint.name}: ${url}`);

    let result = await testEndpoint(url, 'GET');

    if (result.success) {
      console.log(`✅ GET Status: ${result.statusCode}`);
      console.log(`📄 Content-Type: ${result.contentType}`);

      if (result.statusCode === 200) {
        console.log('✅ Working on Netlify domain!');
        console.log(`Response: ${result.body}`);
      } else if (result.statusCode === 405) {
        console.log('⚠️  GET method not allowed, trying POST...');
        result = await testEndpoint(url, 'POST');
        if (result.success && result.statusCode === 200) {
          console.log('✅ Working with POST on Netlify domain!');
          console.log(`Response: ${result.body}`);
        } else {
          console.log(`POST Status: ${result.statusCode}, Response: ${result.body}`);
        }
      } else if (result.statusCode === 404) {
        console.log('❌ Still 404 on Netlify domain');
      } else {
        console.log(`⚠️  Status: ${result.statusCode}`);
        console.log(`Response: ${result.body}`);
      }
    } else {
      console.log(`❌ Error: ${result.error}`);
    }

    console.log(''); // Empty line for readability
  }

  console.log('🏁 Netlify domain test completed');
}

runTests().catch(console.error);