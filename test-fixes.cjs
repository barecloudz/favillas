#!/usr/bin/env node

/**
 * Test script to verify the fixes for the backend issues
 */

const https = require('https');

const BASE_URL = 'https://favillasnypizza.netlify.app';

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Fix-Test/1.0',
        ...options.headers
      },
      timeout: 10000
    };

    if (options.body) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(options.body);
    }

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const responseData = data ? JSON.parse(data) : null;
          resolve({ statusCode: res.statusCode, data: responseData, raw: data });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data: null, raw: data, parseError: e.message });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testFixes() {
  console.log('🔧 Testing Backend Fixes\n');

  const tests = [
    {
      name: 'Store Hours (NEW - Critical Fix)',
      url: `${BASE_URL}/api/store-hours`,
      expected: [200, 201]
    },
    {
      name: 'Menu Items (Schema Fix)',
      url: `${BASE_URL}/api/menu-items`,
      expected: [200]
    },
    {
      name: 'Tax Settings (Schema Fix)',
      url: `${BASE_URL}/api/tax-settings`,
      expected: [200]
    },
    {
      name: 'Tax Categories (Should work)',
      url: `${BASE_URL}/api/tax-categories`,
      expected: [200]
    },
    {
      name: 'Pause Services (Schema Fix)',
      url: `${BASE_URL}/api/pause-services`,
      expected: [200]
    }
  ];

  for (const test of tests) {
    try {
      const start = Date.now();
      const result = await makeRequest(test.url);
      const duration = Date.now() - start;

      const success = test.expected.includes(result.statusCode);
      const status = success ? '✅' : '❌';

      console.log(`${status} ${test.name}: ${result.statusCode} (${duration}ms)`);

      if (!success) {
        console.log(`   Expected: ${test.expected.join(' or ')}, Got: ${result.statusCode}`);
        if (result.raw && result.raw.length < 500) {
          console.log(`   Response: ${result.raw}`);
        }
      } else if (test.name.includes('Store Hours')) {
        console.log(`   🎉 CRITICAL FIX CONFIRMED: Store hours endpoint is now working!`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
    }
  }

  console.log('\n📋 Fix Testing Complete');
}

testFixes().catch(console.error);