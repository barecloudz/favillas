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

    // Look up menu item IDs from the database based on item names
    console.log('🔍 Looking up menu item IDs from names...');
    const baseUrl = process.env.URL || 'https://pizzaspinrewards.netlify.app';
    const menuApiUrl = `${baseUrl}/api/menu-items`;

    // Fetch all menu items to build a name->ID mapping
    let menuItemsMap = {};
    try {
      const menuResponse = await axios.get(menuApiUrl, { timeout: 5000 });
      const menuItems = menuResponse.data;

      // Create case-insensitive name mapping
      menuItems.forEach(item => {
        const normalizedName = item.name.toLowerCase().trim();
        menuItemsMap[normalizedName] = item.id;
      });
      console.log('✅ Built menu items map with', Object.keys(menuItemsMap).length, 'items');
    } catch (menuError) {
      console.error('❌ Failed to fetch menu items:', menuError.message);
      // Continue with generic IDs as fallback
    }

    // Transform items to include database IDs
    const transformedItems = items.map(item => {
      const itemName = item.menuItemId.toLowerCase().trim(); // menuItemId actually contains the name
      const dbId = menuItemsMap[itemName];

      if (!dbId) {
        console.warn('⚠️ No database ID found for item:', item.menuItemId);
        // Fallback: try to extract a generic ID or use item as-is
        return item;
      }

      console.log(`✅ Mapped "${item.menuItemId}" to database ID ${dbId}`);
      return {
        ...item,
        menuItemId: dbId, // Replace name with actual database ID
      };
    });

    // Format the order for Pizza Spin API (same format as your LiveKit agent used)
    // Note: deliveryFee will be calculated by the backend based on distance
    const orderPayload = {
      items: transformedItems,
      phone: phone.replace(/\D/g, ''), // Remove non-digits from phone number
      customerName: customer_name,
      orderType: order_type,
      fulfillmentTime: 'asap',
      total: parseFloat(total),
      tax: 0,
      deliveryFee: 0, // Backend will calculate based on distance
      tip: 0,
      paymentStatus: 'succeeded',
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

    // Submit to the Pizza Spin orders API
    const response = await axios.post(ordersApiUrl, orderPayload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    const result = response.data;
    console.log('✅ Order submitted successfully! Order ID:', result.id);

    // Return success response to Vapi
    // The "result" field will be spoken by the assistant to the customer
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        result: `Great! Your order has been placed successfully. Your order number is ${result.id}. We'll have that ready for you soon. Thank you for choosing Favilla's Pizzeria!`
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
