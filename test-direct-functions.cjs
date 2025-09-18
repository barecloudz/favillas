#!/usr/bin/env node

const https = require('https');

const BASE_URL = 'https://pizzaspinrewards.netlify.app/.netlify/functions';

function makeRequest(url, method = 'GET', data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);

        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Direct-Function-Test/1.0',
                ...headers
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const result = {
                        status: res.statusCode,
                        headers: res.headers,
                        body: body ? JSON.parse(body) : null
                    };
                    resolve(result);
                } catch (e) {
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testDirectFunctions() {
    console.log('🧪 Testing Direct Netlify Functions');
    console.log('=' * 50);

    // Test 1: Direct orders function
    console.log('\n1. Testing /.netlify/functions/orders directly...');
    try {
        const result = await makeRequest(`${BASE_URL}/orders`);
        console.log('Status:', result.status);
        console.log('Response:', JSON.stringify(result.body, null, 2));
    } catch (error) {
        console.log('Error:', error.message);
    }

    // Test 2: Test with OPTIONS request
    console.log('\n2. Testing OPTIONS request...');
    try {
        const result = await makeRequest(`${BASE_URL}/orders`, 'OPTIONS');
        console.log('Status:', result.status);
        console.log('Headers:', result.headers);
    } catch (error) {
        console.log('Error:', error.message);
    }

    // Test 3: Create order directly
    console.log('\n3. Testing order creation directly...');
    const orderData = {
        total: "15.99",
        tax: "1.28",
        deliveryFee: "0",
        tip: "0",
        orderType: "pickup",
        paymentStatus: "completed",
        phone: "555-123-4567",
        fulfillmentTime: "asap",
        status: "pending",
        items: [
            {
                menuItemId: 1,
                quantity: 1,
                price: "15.99"
            }
        ]
    };

    try {
        const result = await makeRequest(`${BASE_URL}/orders`, 'POST', orderData);
        console.log('Status:', result.status);
        console.log('Response:', JSON.stringify(result.body, null, 2));

        if (result.status === 201 && result.body?.id) {
            console.log(`✅ Order created with ID: ${result.body.id}`);

            // Test getting this specific order
            console.log(`\n4. Testing specific order retrieval...`);
            try {
                const orderResult = await makeRequest(`${BASE_URL}/orders/${result.body.id}`);
                console.log('Status:', orderResult.status);
                console.log('Response:', JSON.stringify(orderResult.body, null, 2));
            } catch (error) {
                console.log('Error getting specific order:', error.message);
            }
        }
    } catch (error) {
        console.log('Error:', error.message);
    }

    // Test 4: Test debug endpoints
    console.log('\n5. Testing debug endpoints...');
    try {
        const result = await makeRequest(`${BASE_URL}/debug-orders`);
        console.log('Debug orders status:', result.status);
        if (result.status === 200) {
            console.log('Debug response type:', typeof result.body);
            console.log('Debug response keys:', result.body ? Object.keys(result.body) : 'none');
        }
    } catch (error) {
        console.log('Error:', error.message);
    }
}

testDirectFunctions().catch(console.error);