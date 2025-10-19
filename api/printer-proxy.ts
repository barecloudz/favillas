import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Request body required' })
      };
    }

    const { receiptData, orderId, receiptType, printerUrl } = JSON.parse(event.body);

    if (!receiptData || !printerUrl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'receiptData and printerUrl are required' })
      };
    }

    console.log(`🖨️ Proxying print request for order #${orderId} (${receiptType})`);
    console.log(`📡 Target: ${printerUrl}`);

    // Make HTTP request to local printer server
    // This works because Netlify functions can make HTTP requests
    const response = await fetch(printerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        receiptData,
        orderId,
        receiptType
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Printer server error: ${response.status} - ${errorText}`);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: 'Printer server error',
          details: errorText
        })
      };
    }

    const result = await response.json();
    console.log(`✅ Print successful for order #${orderId} (${receiptType})`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Printed ${receiptType} receipt for order #${orderId}`,
        result
      })
    };

  } catch (error: any) {
    console.error('❌ Printer proxy error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to proxy print request',
        message: error.message
      })
    };
  }
};
