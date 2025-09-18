#!/usr/bin/env node

/**
 * Test script to verify deployment status after fixes
 * Tests critical endpoints to ensure the site is operational
 */

const https = require('https');

const SITE_URL = 'https://favillaspizzeria.com';

// Test endpoints
const endpoints = [
  { path: '/', name: 'Main Site' },
  { path: '/api/menu-items', name: 'Menu Items API' },
  { path: '/api/debug-auth', name: 'Auth Debug API' },
];

function testEndpoint(url) {
  return new Promise((resolve) => {
    const request = https.get(url, { timeout: 10000 }, (response) => {
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
          isHTML: headers['content-type']?.includes('text/html'),
          isJSON: headers['content-type']?.includes('application/json')
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
  });
}

async function runTests() {
  console.log('🔍 Testing deployment status after fixes...\n');

  for (const endpoint of endpoints) {
    const url = `${SITE_URL}${endpoint.path}`;
    console.log(`Testing ${endpoint.name}: ${url}`);

    const result = await testEndpoint(url);

    if (result.success) {
      console.log(`✅ Status: ${result.statusCode}`);
      console.log(`📄 Content-Type: ${result.contentType}`);
      console.log(`📊 Body Length: ${result.bodyLength} bytes`);

      if (endpoint.path === '/' && result.isHTML && result.bodyLength > 1000) {
        console.log('✅ Main site appears to be working (HTML content loaded)');
      } else if (endpoint.path.startsWith('/api/') && result.statusCode === 200) {
        console.log('✅ API endpoint is responding correctly');
      } else if (result.statusCode >= 400) {
        console.log(`⚠️  Warning: HTTP ${result.statusCode} response`);
      }
    } else {
      console.log(`❌ Error: ${result.error}`);
    }

    console.log(''); // Empty line for readability
  }

  console.log('🏁 Deployment test completed');
}

runTests().catch(console.error);