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
      special_instructions,
      payment_preference
    } = orderData;

    console.log('📦 Order details:', {
      customer_name,
      phone,
      order_type,
      total,
      payment_preference,
      items: items?.length || 0
    });

    // Validate required fields
    if (!items || !customer_name || !phone || !order_type || total === undefined || !payment_preference) {
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

    // Determine payment status based on payment preference
    // payment_link: Order will be sent to kitchen AFTER payment
    // pay_at_store: Order goes to kitchen immediately as unpaid
    const paymentStatus = payment_preference === 'pay_at_store' ? 'unpaid' : 'pending_payment_link';

    // Should this order go to kitchen immediately?
    // YES: pay_at_store (pickup orders paid at store)
    // NO: payment_link (must pay first, then goes to kitchen)
    const sendToKitchen = payment_preference === 'pay_at_store';

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
    }).then(async response => {
      console.log('✅ Order submitted successfully! Order ID:', response.data.id);

      // For payment_link orders, send SMS with payment link
      if (paymentStatus === 'pending_payment_link') {
        try {
          // Generate payment token
          const tokenResponse = await axios.post(`${baseUrl}/api/generate-payment-link`, {
            orderId: response.data.id
          }, { timeout: 5000 });

          const { paymentToken } = tokenResponse.data;

          // Send SMS with payment link
          await axios.post(`${baseUrl}/api/sms/send-payment-link`, {
            phone: phone,
            orderId: response.data.id,
            paymentToken: paymentToken,
            customerName: customer_name,
            total: parseFloat(total)
          }, { timeout: 5000 });

          console.log('📱 Payment link SMS sent successfully');
        } catch (smsError) {
          console.error('❌ Failed to send payment link SMS:', smsError.message);
          // Don't fail the order if SMS fails - continue processing
        }
      }
    }).catch(error => {
      console.error('❌ Error submitting order (background):', error.response?.data || error.message);
    });

    // Customize response message based on payment preference
    let responseMessage;
    if (payment_preference === 'payment_link') {
      responseMessage = `Great! Your order has been placed. I'm texting you a secure payment link right now. Once you complete payment, we'll start preparing your order. Thank you for choosing Favilla's Pizzeria!`;
    } else {
      responseMessage = `Great! Your order is confirmed. You can pay when you pick up. We'll have it ready for you soon. Thank you for choosing Favilla's Pizzeria!`;
    }

    // Return immediate success response to VAPI
    // The "result" field will be spoken by the assistant to the customer
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result: responseMessage
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
