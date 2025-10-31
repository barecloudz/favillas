import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import Stripe from 'stripe';
import { authenticateToken, isStaff } from '../../../_shared/auth';

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

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-10-28.acacia',
});

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

  // Authenticate user
  const authPayload = await authenticateToken(event);

  if (!authPayload) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  // Check if user is staff/admin
  if (!isStaff(authPayload)) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Admin access required' })
    };
  }

  try {
    const sql = getDB();

    // Extract order ID from URL path: /api/admin/orders/[id]/refund
    const pathParts = event.path.split('/');
    const orderId = pathParts[pathParts.length - 2]; // Second to last part is the ID

    if (!orderId || isNaN(parseInt(orderId))) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid order ID' })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { amount, reason } = body;

    if (!amount || amount <= 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid refund amount' })
      };
    }

    // Get the order from database
    const orders = await sql`
      SELECT * FROM orders WHERE id = ${parseInt(orderId)}
    `;

    if (orders.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Order not found' })
      };
    }

    const order = orders[0];

    // Verify order has a payment intent
    if (!order.payment_intent_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Order has no payment to refund' })
      };
    }

    // Check if already refunded
    if (order.refund_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Order has already been refunded' })
      };
    }

    // Verify refund amount doesn't exceed order total
    const orderTotal = parseFloat(order.total);
    if (amount > orderTotal) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Refund amount ($${amount}) cannot exceed order total ($${orderTotal})`
        })
      };
    }

    console.log(`💰 Processing refund for Order #${orderId}:`, {
      paymentIntentId: order.payment_intent_id,
      amount: amount,
      reason: reason,
      orderTotal: orderTotal
    });

    // Process refund through Stripe
    const refund = await stripe.refunds.create({
      payment_intent: order.payment_intent_id,
      amount: Math.round(amount * 100), // Stripe expects amount in cents
      reason: reason || 'requested_by_customer',
      metadata: {
        order_id: orderId,
        refunded_by: authPayload.email || authPayload.username,
        refund_timestamp: new Date().toISOString()
      }
    });

    console.log(`✅ Stripe refund created:`, {
      refundId: refund.id,
      status: refund.status,
      amount: refund.amount / 100
    });

    // Update order in database
    const updatedOrders = await sql`
      UPDATE orders
      SET
        refund_id = ${refund.id},
        refund_amount = ${amount},
        refund_reason = ${reason || 'requested_by_customer'},
        refunded_at = NOW(),
        status = 'refunded'
      WHERE id = ${parseInt(orderId)}
      RETURNING *
    `;

    // If customer has points, deduct points for this order (if applicable)
    if (order.user_id || order.supabase_user_id) {
      try {
        // Get points earned from this order
        const pointsRecords = await sql`
          SELECT points_earned FROM points
          WHERE order_id = ${parseInt(orderId)}
          AND (
            ${order.user_id ? sql`user_id = ${order.user_id}` : sql`1=0`}
            OR
            ${order.supabase_user_id ? sql`supabase_user_id = ${order.supabase_user_id}` : sql`1=0`}
          )
        `;

        if (pointsRecords.length > 0) {
          const pointsToDeduct = pointsRecords[0].points_earned;

          // Create a negative points record to deduct points
          await sql`
            INSERT INTO points (
              ${order.user_id ? sql`user_id,` : sql``}
              ${order.supabase_user_id ? sql`supabase_user_id,` : sql``}
              order_id,
              points_earned,
              reason,
              created_at
            ) VALUES (
              ${order.user_id || null},
              ${order.supabase_user_id || null},
              ${parseInt(orderId)},
              ${-pointsToDeduct},
              'refund',
              NOW()
            )
          `;

          console.log(`📉 Deducted ${pointsToDeduct} points for refunded order #${orderId}`);
        }
      } catch (pointsError) {
        console.error('Failed to deduct points for refund:', pointsError);
        // Don't fail the refund if points deduction fails
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        refund: {
          id: refund.id,
          status: refund.status,
          amount: amount,
          currency: refund.currency,
          created: refund.created
        },
        order: updatedOrders[0]
      })
    };

  } catch (error: any) {
    console.error('❌ Refund processing error:', error);

    // Handle specific Stripe errors
    if (error.type === 'StripeCardError' || error.type === 'StripeInvalidRequestError') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: error.message,
          type: error.type
        })
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message || 'Internal server error',
        message: 'Failed to process refund'
      })
    };
  }
};
