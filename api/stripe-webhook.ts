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
      const orderDataString = paymentIntent.metadata.orderData;

      console.log(`💳 Payment succeeded for PaymentIntent: ${paymentIntent.id}`);
      console.log(`💳 Metadata - orderId: ${orderId}, has orderData: ${!!orderDataString}`);

      const sql = getDB();

      if (orderId) {
        // Old flow: Update existing order payment status
        console.log(`💳 Processing payment for existing order #${orderId}`);

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

      } else if (orderDataString) {
        // New flow: Create order from stored order data
        console.log(`💳 Creating new order from payment data`);

        try {
          const orderData = JSON.parse(orderDataString);
          console.log(`💳 Parsed order data:`, {
            hasItems: !!orderData.items,
            itemsCount: orderData.items?.length || 0,
            total: orderData.total,
            orderType: orderData.orderType
          });

          // Set payment status to completed/succeeded since payment just succeeded
          orderData.paymentStatus = 'succeeded';
          orderData.status = 'confirmed';

          // Create the order by calling the orders API internally
          const orderCreationResult = await fetch(`${process.env.SITE_URL || 'http://localhost:8888'}/api/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // No authorization header needed for order creation from webhook
            },
            body: JSON.stringify(orderData)
          });

          if (orderCreationResult.ok) {
            const createdOrder = await orderCreationResult.json();
            console.log(`✅ Order created successfully from payment data: Order #${createdOrder.id}`);

            // Update the order with the payment intent ID
            await sql`
              UPDATE orders
              SET payment_intent_id = ${paymentIntent.id}
              WHERE id = ${createdOrder.id}
            `;
            console.log(`✅ Order #${createdOrder.id} updated with payment intent ID`);

          } else {
            const errorText = await orderCreationResult.text();
            console.error(`❌ Failed to create order from payment data:`, orderCreationResult.status, errorText);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: 'Failed to create order from payment data' })
            };
          }

        } catch (orderDataError) {
          console.error(`❌ Error processing order data from payment:`, orderDataError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Failed to process order data from payment' })
          };
        }

      } else {
        console.warn('⚠️ PaymentIntent succeeded but no orderId or orderData in metadata');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ received: true })
        };
      }

      console.log(`✅ Payment processing completed successfully`);
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