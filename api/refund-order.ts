import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import Stripe from 'stripe';
import { authenticateToken, isStaff } from './_shared/auth';

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
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
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

  // CRITICAL: Require staff authentication
  const authPayload = await authenticateToken(event);
  if (!authPayload || !isStaff(authPayload)) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized - staff access required' })
    };
  }

  try {
    const { orderId, paymentIntentId, amount, reason, refundType } = JSON.parse(event.body || '{}');

    // CRITICAL VALIDATION #1: Verify all required fields
    if (!orderId || !paymentIntentId || !amount || !reason) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Missing required fields',
          required: ['orderId', 'paymentIntentId', 'amount', 'reason']
        })
      };
    }

    const sql = getDB();

    // CRITICAL VALIDATION #2: Fetch order from database with ALL details
    const orders = await sql`
      SELECT
        id,
        payment_intent_id,
        payment_status,
        total,
        customer_name,
        phone,
        status
      FROM orders
      WHERE id = ${orderId}
    `;

    if (orders.length === 0) {
      console.error(`❌ REFUND REJECTED: Order ${orderId} not found`);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Order not found' })
      };
    }

    const order = orders[0];

    // CRITICAL VALIDATION #3: Verify payment intent matches
    if (order.payment_intent_id !== paymentIntentId) {
      console.error(`❌ REFUND REJECTED: Payment intent mismatch!`);
      console.error(`Expected: ${order.payment_intent_id}, Received: ${paymentIntentId}`);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Payment intent ID does not match order. This refund has been blocked for security.',
          orderPaymentIntent: order.payment_intent_id
        })
      };
    }

    // CRITICAL VALIDATION #4: Cannot refund test orders
    if (order.payment_status === 'test_order_admin_bypass') {
      console.error(`❌ REFUND REJECTED: Cannot refund test order ${orderId}`);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Cannot refund test orders' })
      };
    }

    // CRITICAL VALIDATION #5: Verify refund amount doesn't exceed order total
    const refundAmount = parseFloat(amount);
    const orderTotal = parseFloat(order.total);

    if (isNaN(refundAmount) || refundAmount <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid refund amount' })
      };
    }

    if (refundAmount > orderTotal) {
      console.error(`❌ REFUND REJECTED: Amount $${refundAmount} exceeds order total $${orderTotal}`);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Refund amount cannot exceed order total',
          orderTotal: orderTotal,
          requestedAmount: refundAmount
        })
      };
    }

    const staffEmail = authPayload.email || authPayload.username || 'unknown';

    console.log(`💳 Processing ${refundType} refund for order ${orderId}`);
    console.log(`   Payment Intent: ${paymentIntentId}`);
    console.log(`   Amount: $${refundAmount} of $${orderTotal}`);
    console.log(`   Customer: ${order.customer_name}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Staff: ${staffEmail}`);

    // CRITICAL: Process refund through Stripe
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: Math.round(refundAmount * 100), // Convert to cents
      reason: 'requested_by_customer',
      metadata: {
        order_id: orderId.toString(),
        refund_reason: reason,
        refund_type: refundType,
        processed_by: staffEmail,
        customer_name: order.customer_name || 'Unknown',
        original_total: orderTotal.toString()
      }
    });

    console.log(`✅ Stripe refund successful: ${refund.id}`);

    // Update order in database
    await sql`
      UPDATE orders
      SET
        payment_status = ${refundType === 'full' ? 'refunded' : 'partially_refunded'},
        updated_at = NOW()
      WHERE id = ${orderId}
    `;

    // Log refund in database for audit trail
    await sql`
      INSERT INTO order_refunds (
        order_id,
        refund_id,
        amount,
        reason,
        refund_type,
        processed_by,
        created_at
      ) VALUES (
        ${orderId},
        ${refund.id},
        ${refundAmount},
        ${reason},
        ${refundType},
        ${staffEmail},
        NOW()
      )
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully refunded $${refundAmount.toFixed(2)}`,
        refundId: refund.id,
        orderId: orderId,
        amount: refundAmount
      })
    };

  } catch (error: any) {
    console.error('❌ Refund processing error:', error);

    // Check if it's a Stripe error
    if (error.type === 'StripeCardError' || error.type === 'StripeInvalidRequestError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Stripe refund failed',
          details: error.message
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process refund',
        details: error.message
      })
    };
  }
};
