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

    // Create a PaymentIntent with the order amount and currency
    // IMPORTANT: Stripe metadata has a 500 character limit - only store essential info
    const metadata: Record<string, string> = {};

    if (orderId) {
      metadata.orderId = orderId.toString();
    }

    if (orderData) {
      // Only store essential fields to stay under 500 character limit
      metadata.userId = (orderData.userId || "guest").toString().substring(0, 50);
      metadata.orderType = (orderData.orderType || "pickup").substring(0, 20);
      metadata.total = (orderData.total || "0").toString().substring(0, 10);
      metadata.phone = (orderData.phone || "").substring(0, 20);
      metadata.itemCount = (orderData.items?.length || 0).toString();

      console.log('🔍 Payment Intent: Processing orderData with limited metadata');
      console.log('📊 Metadata size check:', JSON.stringify(metadata).length, 'characters');
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: "usd",
      metadata: metadata
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