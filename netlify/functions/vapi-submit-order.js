/**
 * Netlify Function: Vapi Submit Order Webhook
 *
 * Path: /.netlify/functions/vapi-submit-order
 *
 * This function receives order data from Vapi and submits it to the Pizza Spin orders API
 */

const axios = require('axios');

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  console.log('📞 Received order from Vapi');

  try {
    // Parse the incoming request from Vapi
    const body = JSON.parse(event.body);
    const { message } = body;

    console.log('📨 Vapi message type:', message?.type);
    console.log('📦 Full request:', JSON.stringify(body, null, 2));

    // Extract the function call data
    // Vapi sends function arguments in message.toolCalls or message.functionCall
    const toolCall = message?.toolCalls?.[0] || message?.functionCall;

    if (!toolCall) {
      console.error('❌ No tool call found in request');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: 'No function call data found'
        })
      };
    }

    // Extract order details
    const orderData = toolCall.function?.arguments || toolCall.arguments || {};
    const {
      items,
      customer_name,
      phone,
      order_type,
      total,
      address,
      special_instructions
    } = orderData;

    console.log('📦 Order details:', {
      customer_name,
      phone,
      order_type,
      total,
      items: items?.length || 0
    });

    // Validate required fields
    if (!items || !customer_name || !phone || !order_type || total === undefined) {
      console.error('❌ Missing required fields');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: "I'm sorry, I'm missing some required information for the order. Could you please provide all the details again?"
        })
      };
    }

    // For delivery orders, require address
    if (order_type === 'delivery' && !address) {
      console.error('❌ Missing address for delivery order');
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: "I need a delivery address for your order. Could you please provide your full address including street, city, state, and zip code?"
        })
      };
    }

    // Parse address if it's a string (convert to addressData format)
    let addressData = null;
    if (order_type === 'delivery' && address) {
      const addressParts = address.split(',').map(s => s.trim());
      addressData = {
        street: addressParts[0] || '',
        city: addressParts[1] || '',
        state: addressParts[2] || '',
        zipCode: addressParts[3] || ''
      };
    }

    // Determine payment status based on order type
    // Pickup: unpaid (pay at store)
    // Delivery: pending_payment_link (requires payment link)
    const paymentStatus = order_type === 'pickup' ? 'unpaid' : 'pending_payment_link';

    // Format the order for Pizza Spin API
    // Pass items as-is - the backend will handle menu item name/ID resolution
    const orderPayload = {
      items: items,
      phone: phone.replace(/\D/g, ''), // Remove non-digits from phone number
      customerName: customer_name,
      orderType: order_type,
      fulfillmentTime: 'asap',
      total: parseFloat(total),
      tax: 0,
      deliveryFee: 0, // Backend will calculate based on distance
      tip: 0,
      paymentStatus: paymentStatus,
      orderSource: 'phone', // Mark as phone order
      specialInstructions: special_instructions || ''
    };

    // Add delivery-specific fields
    if (order_type === 'delivery') {
      orderPayload.address = address;
      orderPayload.addressData = addressData;
    }

    // Get the base URL for the orders API
    // In production, this will be your actual Netlify site URL
    const baseUrl = process.env.URL || 'https://preview--pizzaspin.netlify.app';
    const ordersApiUrl = `${baseUrl}/.netlify/functions/orders`;

    console.log('🚀 Submitting to orders API:', ordersApiUrl);
    console.log('📋 Payload:', JSON.stringify(orderPayload, null, 2));

    // Submit order in background without waiting for response
    // This ensures VAPI gets a fast response (< 5 seconds)
    axios.post(ordersApiUrl, orderPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    }).then(response => {
      console.log('✅ Order submitted successfully! Order ID:', response.data.id);
    }).catch(error => {
      console.error('❌ Error submitting order (background):', error.response?.data || error.message);
    });

    // Return immediate success response to VAPI
    // The "result" field will be spoken by the assistant to the customer
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result: `Great! Your order has been placed successfully. We'll have that ready for you soon. Thank you for choosing Favilla's Pizzeria!`
      })
    };

  } catch (error) {
    console.error('❌ Error submitting order:', error.response?.data || error.message);
    console.error('Stack trace:', error.stack);

    // Return error message to Vapi (assistant will speak this to customer)
    return {
      statusCode: 200, // Still return 200 so Vapi processes the response
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result: "I'm sorry, there was a problem placing your order. Please try calling back or placing your order online."
      })
    };
  }
};
