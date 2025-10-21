import { Handler } from '@netlify/functions';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    // Extract payment intent ID from path
    const pathParts = event.path.split('/');
    const paymentIntentId = pathParts[pathParts.length - 1];

    if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'Invalid payment intent ID'
        })
      };
    }

    console.log('📝 Fetching payment intent:', paymentIntentId);

    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ['payment_method']  // Expand payment method to get billing details
    });

    console.log('📝 Payment intent retrieved:', {
      id: paymentIntent.id,
      status: paymentIntent.status,
      billing_details: paymentIntent.charges?.data?.[0]?.billing_details,
      payment_method_billing: (paymentIntent.payment_method as any)?.billing_details
    });

    // Return relevant payment intent data
    // Include billing details from both the charge and payment method
    const billingDetails = paymentIntent.charges?.data?.[0]?.billing_details ||
                          (paymentIntent.payment_method as any)?.billing_details ||
                          {};

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        billing_details: billingDetails,
        payment_method: paymentIntent.payment_method
      })
    };
  } catch (error: any) {
    console.error('Payment intent retrieval error:', error);

    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          message: 'Payment intent not found',
          error: error.message
        })
      };
    }

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
