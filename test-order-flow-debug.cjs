#!/usr/bin/env node

/**
 * Test order flow with user ID 13402295 to debug "order not found" issue
 */

const https = require('https');

const BASE_URL = 'https://pizzaspinrewards.netlify.app/.netlify/functions';

// Test with user 13402295 who had points restored
const testUserId = 13402295;
const testOrder = {
    items: [
        {
            menuItemId: 1,
            quantity: 1,
            price: "12.99",
            options: {},
            specialInstructions: ""
        }
    ],
    total: "15.00",
    tax: "1.07",
    deliveryFee: "0.00",
    tip: "1.94",
    orderType: "pickup",
    phone: "555-0123",
    fulfillmentTime: "asap",
    address: "",
    specialInstructions: "Test order for debugging",
    status: "pending",
    paymentStatus: "pending"
};

function makeRequest(url, method, data, token) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);

        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port || 443,
            path: urlObj.pathname + urlObj.search,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Order-Debug-Test/1.0'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

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

async function testOrderFlow() {
    console.log('🧪 Testing Order Flow with User ID 13402295');
    console.log('='*60);

    try {
        // 1. Test creating order as guest (no auth)
        console.log('\n1. Creating test order as guest...');
        const guestOrderResult = await makeRequest(
            `${BASE_URL}/orders`,
            'POST',
            { ...testOrder, userId: testUserId }
        );

        console.log('Status:', guestOrderResult.status);
        console.log('Response:', JSON.stringify(guestOrderResult.body, null, 2));

        if (guestOrderResult.status === 201 && guestOrderResult.body?.id) {
            const orderId = guestOrderResult.body.id;
            console.log(`\n✅ Order created successfully with ID: ${orderId}`);

            // 2. Test retrieving the order
            console.log('\n2. Testing order retrieval...');

            // Try getting all orders as guest (should fail)
            console.log('\n2a. Getting all orders as guest (should fail)...');
            const guestOrdersResult = await makeRequest(`${BASE_URL}/orders`, 'GET');
            console.log('Status:', guestOrdersResult.status);
            console.log('Response:', JSON.stringify(guestOrdersResult.body, null, 2));

            // 3. Check the database state of this order
            console.log(`\n3. Direct database check would be needed for order ${orderId}`);
            console.log('   Order should have user_id =', testUserId);
            console.log('   Order should have supabase_user_id = null (guest order)');

            // 4. Test getting specific order by ID (no auth - should fail)
            console.log(`\n4. Getting specific order ${orderId} without auth...`);
            const specificOrderResult = await makeRequest(`${BASE_URL}/orders/${orderId}`, 'GET');
            console.log('Status:', specificOrderResult.status);
            console.log('Response:', JSON.stringify(specificOrderResult.body, null, 2));

        } else {
            console.log('❌ Order creation failed');
            return;
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Additional test for Supabase user scenarios
async function testSupabaseUserScenario() {
    console.log('\n\n🧪 Testing Supabase User Scenario');
    console.log('='*60);

    // Simulate Supabase JWT token payload
    const mockSupabaseUserId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'; // Example UUID

    // Create a fake JWT token structure (just for testing the auth logic)
    // In reality, this would be a properly signed JWT from Supabase
    const fakePayload = {
        iss: 'https://example.supabase.co/auth/v1',
        sub: mockSupabaseUserId,
        email: 'test@example.com',
        aud: 'authenticated'
    };

    console.log('Simulated Supabase payload:', JSON.stringify(fakePayload, null, 2));
    console.log('\nNote: This test would need a real Supabase token to work fully');
    console.log('The key issue is that orders-status.ts doesn\'t support Supabase tokens');
}

// Run the tests
testOrderFlow().then(() => {
    testSupabaseUserScenario();
});