import fetch from 'node-fetch';

async function testLogin() {
  try {
    console.log('Testing login endpoint...');
    
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const data = await response.text();
    console.log('Response:', data);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testLogin();