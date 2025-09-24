const https = require('https');

// Configuration
const BASE_URL = 'https://favillasnypizza.netlify.app';
const ORDER_START = 1;
const ORDER_END = 136;

// You'll need to get your auth token from the browser
// Go to your admin dashboard, open dev tools > Application > Cookies > find 'sb-access-token'
const AUTH_TOKEN = 'YOUR_AUTH_TOKEN_HERE'; // Replace this with your actual token

async function deleteOrders() {
  console.log(`🗑️ Starting deletion of orders ${ORDER_START}-${ORDER_END}...`);

  // Create array of order IDs to delete
  const orderIds = [];
  for (let i = ORDER_START; i <= ORDER_END; i++) {
    orderIds.push(i);
  }

  // Split into batches of 20 to avoid overwhelming the API
  const batchSize = 20;
  let totalDeleted = 0;

  for (let i = 0; i < orderIds.length; i += batchSize) {
    const batch = orderIds.slice(i, i + batchSize);
    console.log(`🔄 Deleting batch: orders ${batch[0]}-${batch[batch.length - 1]} (${batch.length} orders)`);

    try {
      const result = await makeRequest('/api/orders', 'DELETE', {
        orderIds: batch
      });

      console.log(`✅ Batch complete: ${result.deletedCount} orders deleted`);
      totalDeleted += result.deletedCount;

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`❌ Batch failed:`, error.message);
    }
  }

  console.log(`🎉 Deletion complete! Total orders deleted: ${totalDeleted}`);
}

function makeRequest(path, method, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: 'favillasnypizza.netlify.app',
      port: 443,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(result);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${result.error || responseData}`));
          }
        } catch (e) {
          reject(new Error(`Invalid response: ${responseData}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// Run the deletion
if (AUTH_TOKEN === 'YOUR_AUTH_TOKEN_HERE') {
  console.log('❌ Please update the AUTH_TOKEN in the script first!');
  console.log('1. Go to your admin dashboard');
  console.log('2. Open Developer Tools > Application > Cookies');
  console.log('3. Find "sb-access-token" and copy its value');
  console.log('4. Replace AUTH_TOKEN in this script');
} else {
  deleteOrders().catch(console.error);
}