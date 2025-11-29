import type { Handler } from '@netlify/functions';
import { db } from '../server/db';
import { orders, orderItems, menuItems } from '../shared/schema';
import { eq, and, gt } from 'drizzle-orm';

/**
 * Get order details by payment token
 * GET /api/get-order-by-token?token=xxx
 *
 * Returns full order details if token is valid and not expired
 */
export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const token = event.queryStringParameters?.token;

    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing token parameter' })
      };
    }

    // Find order by payment token
    const orderResults = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.paymentToken, token),
          gt(orders.paymentTokenExpires, new Date()) // Token not expired
        )
      );

    if (orderResults.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Order not found or payment link expired',
          expired: true
        })
      };
    }

    const order = orderResults[0];

    // If already paid, return error
    if (order.paymentStatus === 'succeeded' || order.paymentStatus === 'paid') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'This order has already been paid',
          alreadyPaid: true
        })
      };
    }

    // Fetch order items with menu item details
    const items = await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        menuItemId: orderItems.menuItemId,
        quantity: orderItems.quantity,
        price: orderItems.price,
        options: orderItems.options,
        specialInstructions: orderItems.specialInstructions,
        menuItem: {
          id: menuItems.id,
          name: menuItems.name,
          description: menuItems.description,
          imageUrl: menuItems.imageUrl,
        }
      })
      .from(orderItems)
      .leftJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
      .where(eq(orderItems.orderId, order.id));

    // Return order with items
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        order: {
          ...order,
          items
        }
      })
    };

  } catch (error: any) {
    console.error('❌ Error fetching order by token:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch order',
        details: error.message
      })
    };
  }
};
