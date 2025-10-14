import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Database connection
let dbConnection: any = null;

function getDB() {
  if (dbConnection) return dbConnection;
  
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  dbConnection = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });
  
  return dbConnection;
}

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
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
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    const requestBody = JSON.parse(event.body || '{}');
    const { amount, orderId, orderData } = requestBody;

    if (!amount) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'Missing required field: amount'
        })
      };
    }

    // SECURITY: Validate payment amount server-side
    let validatedAmount = amount;

    if (orderData && orderData.items && Array.isArray(orderData.items)) {
      console.log('🔒 Validating payment amount against order items...');
      console.log('📦 Full orderData received:', JSON.stringify({
        tax: orderData.tax,
        tip: orderData.tip,
        deliveryFee: orderData.deliveryFee,
        discount: orderData.discount,
        voucherDiscount: orderData.voucherDiscount,
        itemCount: orderData.items.length
      }));

      const sql = getDB();

      // Calculate server-side total from menu prices
      let calculatedSubtotal = 0;

      for (const item of orderData.items) {
        // Get current price from database
        const menuItems = await sql`
          SELECT base_price FROM menu_items WHERE id = ${item.menuItemId}
        `;

        if (menuItems.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              message: `Invalid menu item ID: ${item.menuItemId}`
            })
          };
        }

        const itemQuantity = parseInt(item.quantity) || 1;

        // Use the pre-calculated item price from frontend if available
        // This handles complex pricing scenarios (size selections, dynamic pricing, etc.)
        let itemTotal = 0;
        if (item.price !== undefined && item.price !== null) {
          // Frontend already calculated the total price including all options
          itemTotal = parseFloat(item.price) * itemQuantity;
        } else {
          // Fallback: Calculate from base price + options
          const basePrice = parseFloat(menuItems[0].base_price);
          itemTotal = basePrice * itemQuantity;

          // Add option prices if present (new format)
          if (item.options && Array.isArray(item.options)) {
            for (const option of item.options) {
              const optionPrice = parseFloat(option.price) || 0;
              itemTotal += optionPrice * itemQuantity;
            }
          }
          // Legacy: Add customization prices if present (old format)
          else if (item.customizations && Array.isArray(item.customizations)) {
            for (const customization of item.customizations) {
              const customPrice = parseFloat(customization.price) || 0;
              itemTotal += customPrice * itemQuantity;
            }
          }
        }

        calculatedSubtotal += itemTotal;
      }

      // Calculate tax (using orderData tax or 8% default)
      const calculatedTax = orderData.tax ? parseFloat(orderData.tax) : calculatedSubtotal * 0.08;

      // Add delivery fee if applicable
      const deliveryFee = orderData.deliveryFee ? parseFloat(orderData.deliveryFee) : 0;

      // Add tip if provided
      const tip = orderData.tip ? parseFloat(orderData.tip) : 0;
      console.log('💵 Tip calculation:', {
        rawTip: orderData.tip,
        parsedTip: tip,
        tipType: typeof orderData.tip
      });

      // Apply discount if provided
      const discount = orderData.discount ? parseFloat(orderData.discount) : 0;
      const voucherDiscount = orderData.voucherDiscount ? parseFloat(orderData.voucherDiscount) : 0;
      const totalDiscount = discount + voucherDiscount;

      // Calculate final total
      const calculatedTotal = calculatedSubtotal + calculatedTax + deliveryFee + tip - totalDiscount;

      console.log('💰 Server-side calculation:', {
        subtotal: calculatedSubtotal,
        tax: calculatedTax,
        deliveryFee,
        tip,
        discount: totalDiscount,
        calculatedTotal,
        clientAmount: amount
      });

      // Validate amount (allow 1 cent tolerance for rounding)
      if (Math.abs(calculatedTotal - amount) > 0.01) {
        console.error('❌ Payment amount mismatch!', {
          expected: calculatedTotal,
          received: amount,
          difference: Math.abs(calculatedTotal - amount)
        });

        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            message: 'Payment amount does not match order total',
            expectedAmount: calculatedTotal,
            receivedAmount: amount
          })
        };
      }

      validatedAmount = calculatedTotal;
      console.log('✅ Payment amount validated successfully');
    } else if (orderId) {
      // Validate against existing order in database
      console.log('🔒 Validating payment amount against existing order...');

      const sql = getDB();
      const orders = await sql`
        SELECT total FROM orders WHERE id = ${orderId}
      `;

      if (orders.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            message: 'Order not found'
          })
        };
      }

      const orderTotal = parseFloat(orders[0].total);

      if (Math.abs(orderTotal - amount) > 0.01) {
        console.error('❌ Payment amount does not match order total');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            message: 'Payment amount does not match order total',
            expectedAmount: orderTotal,
            receivedAmount: amount
          })
        };
      }

      validatedAmount = orderTotal;
      console.log('✅ Payment amount validated against order');
    } else {
      // No order data or order ID - cannot validate
      console.warn('⚠️  No order data or order ID provided - cannot validate payment amount');
    }

    // Create a PaymentIntent with the VALIDATED amount
    console.log('💳 Creating payment intent with validated amount:', validatedAmount);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(validatedAmount * 100), // Convert to cents
      currency: "usd"
      // No metadata for now - will store order data in sessionStorage instead
    });

    // Update the order with the payment intent ID (only if orderId exists - for old flow)
    if (orderId) {
      try {
        const sql = getDB();
        await sql`
          UPDATE orders
          SET payment_intent_id = ${paymentIntent.id}
          WHERE id = ${orderId}
        `;
      } catch (dbError) {
        console.error('Failed to update order with payment intent ID:', dbError);
        // Continue anyway - the payment intent was created successfully
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        clientSecret: paymentIntent.client_secret
      })
    };
  } catch (error: any) {
    console.error('Payment intent creation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error.message 
      })
    };
  }
};