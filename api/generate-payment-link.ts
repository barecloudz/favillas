import type { Handler } from '@netlify/functions';
import { db } from '../server/db';
import { orders } from '../shared/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

/**
 * Generate payment link for an order
 * POST /api/generate-payment-link
 *
 * Body: {
 *   orderId: number
 * }
 *
 * Returns: {
 *   paymentToken: string
 *   paymentUrl: string
 * }
 */
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

  try {
    const { orderId } = JSON.parse(event.body || '{}');

    if (!orderId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing orderId' })
      };
    }

    // Generate secure payment token (32 bytes = 64 hex characters)
    const paymentToken = crypto.randomBytes(32).toString('hex');

    // Calculate expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Update order with payment token
    await db
      .update(orders)
      .set({
        paymentToken,
        paymentTokenExpires: expiresAt
      })
      .where(eq(orders.id, orderId));

    const baseUrl = process.env.URL || 'https://preview--pizzaspin.netlify.app';
    const paymentUrl = `${baseUrl}/pay/${paymentToken}`;

    console.log(`✅ Generated payment link for order #${orderId}: ${paymentUrl}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        paymentToken,
        paymentUrl,
        expiresAt: expiresAt.toISOString()
      })
    };

  } catch (error: any) {
    console.error('❌ Error generating payment link:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate payment link',
        details: error.message
      })
    };
  }
};
