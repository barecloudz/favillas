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
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const sig = event.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('❌ STRIPE_WEBHOOK_SECRET environment variable is required');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Webhook secret not configured' })
      };
    }

    // Verify the webhook signature
    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(event.body || '', sig || '', webhookSecret);
    } catch (err: any) {
      console.error('❌ Stripe webhook signature verification failed:', err.message);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Webhook signature verification failed' })
      };
    }

    console.log('📡 Stripe webhook received:', stripeEvent.type);

    // Handle payment_intent.succeeded event
    if (stripeEvent.type === 'payment_intent.succeeded') {
      const paymentIntent = stripeEvent.data.object as Stripe.PaymentIntent;
      const orderId = paymentIntent.metadata.orderId;

      if (!orderId) {
        console.warn('⚠️ PaymentIntent succeeded but no orderId in metadata');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ received: true })
        };
      }

      console.log(`💳 Payment succeeded for order #${orderId}`);

      const sql = getDB();

      // Update order payment status
      const updatedOrders = await sql`
        UPDATE orders
        SET payment_status = 'completed', payment_intent_id = ${paymentIntent.id}
        WHERE id = ${parseInt(orderId)}
        RETURNING *
      `;

      if (updatedOrders.length === 0) {
        console.warn(`⚠️ Order ${orderId} not found for payment confirmation`);
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Order not found' })
        };
      }

      const order = updatedOrders[0];
      console.log(`✅ Order #${orderId} payment status updated to completed`);

      // Trigger ShipDay integration for delivery orders
      if (order.order_type === 'delivery' && order.address_data && process.env.SHIPDAY_API_KEY) {
        try {
          console.log('📦 Stripe Webhook: Triggering ShipDay integration after payment confirmation');

          let addressData;
          try {
            addressData = JSON.parse(order.address_data);
          } catch (parseError) {
            console.error('📦 Stripe Webhook: Failed to parse address_data:', parseError);
            addressData = null;
          }

          if (addressData) {
            // Get order items for ShipDay
            const orderItems = await sql`
              SELECT oi.*, mi.name as menu_item_name, mi.base_price as menu_item_price
              FROM order_items oi
              LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
              WHERE oi.order_id = ${order.id}
            `;

            // Get user info for contact details
            let userContactInfo = null;
            if (order.supabase_user_id) {
              const userQuery = await sql`SELECT * FROM users WHERE supabase_user_id = ${order.supabase_user_id}`;
              if (userQuery.length > 0) userContactInfo = userQuery[0];
            } else if (order.user_id) {
              const userQuery = await sql`SELECT * FROM users WHERE id = ${order.user_id}`;
              if (userQuery.length > 0) userContactInfo = userQuery[0];
            }

            const customerName = userContactInfo?.first_name && userContactInfo?.last_name
              ? `${userContactInfo.first_name} ${userContactInfo.last_name}`.trim()
              : (userContactInfo?.username || "Customer");

            const customerEmail = userContactInfo?.email || "";
            const customerPhone = order.phone || userContactInfo?.phone || "";

            // Create ShipDay order payload
            const shipdayPayload = {
              orderItems: orderItems.map(item => ({
                name: item.name || item.menu_item_name || "Menu Item",
                unitPrice: parseFloat(item.price || item.menu_item_price || "0"),
                quantity: parseInt(item.quantity || "1")
              })),
              pickup: {
                address: {
                  street: "123 Main St", // Update with actual restaurant address
                  city: "Asheville",
                  state: "NC",
                  zip: "28801",
                  country: "United States"
                },
                contactPerson: {
                  name: "Favillas NY Pizza",
                  phone: "5551234567" // Update with actual restaurant phone
                }
              },
              dropoff: {
                address: {
                  street: addressData.street || addressData.fullAddress,
                  city: addressData.city,
                  state: addressData.state,
                  zip: addressData.zipCode,
                  country: "United States"
                },
                contactPerson: {
                  name: customerName && customerName.trim() !== "" ? customerName.trim() : "Customer",
                  phone: customerPhone.replace(/[^\d]/g, ''),
                  ...(customerEmail && { email: customerEmail })
                }
              },
              orderNumber: `FAV-${order.id}`,
              totalOrderCost: parseFloat(order.total),
              paymentMethod: 'credit_card',
              // Required customer fields at root level
              customerName: customerName && customerName.trim() !== "" ? customerName.trim() : "Customer",
              customerPhoneNumber: customerPhone.replace(/[^\d]/g, ''),
              customerAddress: `${addressData.street || addressData.fullAddress}, ${addressData.city}, ${addressData.state} ${addressData.zipCode}`,
              ...(customerEmail && { customerEmail: customerEmail })
            };

            console.log('📦 Stripe Webhook: Sending ShipDay payload after payment confirmation');

            // Call ShipDay API
            const shipdayResponse = await fetch('https://api.shipday.com/orders', {
              method: 'POST',
              headers: {
                'Authorization': `Basic ${process.env.SHIPDAY_API_KEY}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(shipdayPayload)
            });

            const shipdayResult = await shipdayResponse.text();
            console.log(`📦 Stripe Webhook: ShipDay response status: ${shipdayResponse.status}`);
            console.log(`📦 Stripe Webhook: ShipDay response body: ${shipdayResult}`);

            if (shipdayResponse.ok) {
              const parsedResult = JSON.parse(shipdayResult);
              if (parsedResult.success) {
                console.log(`✅ Stripe Webhook: ShipDay order created successfully for order #${order.id}: ${parsedResult.orderId}`);

                // Update order with ShipDay info
                await sql`
                  UPDATE orders
                  SET shipday_order_id = ${parsedResult.orderId}, shipday_status = 'pending'
                  WHERE id = ${order.id}
                `;
              } else {
                console.error(`❌ Stripe Webhook: ShipDay order creation failed for order #${order.id}: ${parsedResult.response || 'Unknown error'}`);
              }
            } else {
              console.error(`❌ Stripe Webhook: ShipDay API error for order #${order.id}: ${shipdayResponse.status} - ${shipdayResult}`);
            }
          }
        } catch (shipdayError: any) {
          console.error(`❌ Stripe Webhook: ShipDay integration error for order #${order.id}:`, shipdayError.message);
          // Don't fail the webhook if ShipDay fails
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true })
    };

  } catch (error: any) {
    console.error('💥 Stripe webhook error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};