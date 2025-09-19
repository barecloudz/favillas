import { Handler } from '@netlify/functions';
import postgres from 'postgres';

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
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const payload = JSON.parse(event.body || '{}');
    console.log('📡 ShipDay webhook received:', JSON.stringify(payload, null, 2));

    // Verify webhook token if provided
    const webhookToken = process.env.SHIPDAY_WEBHOOK_TOKEN;
    if (webhookToken && payload.token !== webhookToken) {
      console.error('❌ Invalid webhook token');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const { orderId, status, trackingUrl, estimatedDeliveryTime, driverLocation } = payload;

    if (!orderId) {
      console.error('❌ Missing orderId in webhook payload');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing orderId' })
      };
    }

    console.log(`📦 ShipDay webhook for order ${orderId}: ${status}`);

    // Update order in database
    const sql = getDB();

    // Extract order ID (remove FAV- prefix if present)
    const localOrderId = orderId.replace('FAV-', '');

    // Update order with ShipDay status
    const updateData: any = {
      shipday_status: status,
      updated_at: new Date()
    };

    if (trackingUrl) {
      updateData.tracking_url = trackingUrl;
    }

    if (estimatedDeliveryTime) {
      updateData.estimated_delivery_time = new Date(estimatedDeliveryTime);
    }

    if (driverLocation) {
      updateData.driver_location = driverLocation;
    }

    const result = await sql`
      UPDATE orders
      SET
        shipday_status = ${status},
        ${trackingUrl ? sql`tracking_url = ${trackingUrl},` : sql``}
        ${estimatedDeliveryTime ? sql`estimated_delivery_time = ${new Date(estimatedDeliveryTime)},` : sql``}
        ${driverLocation ? sql`driver_location = ${JSON.stringify(driverLocation)},` : sql``}
        updated_at = NOW()
      WHERE id = ${parseInt(localOrderId)}
      RETURNING id, shipday_status
    `;

    if (result.length === 0) {
      console.warn(`⚠️ Order ${localOrderId} not found for ShipDay update`);
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Order not found' })
      };
    }

    console.log(`✅ Order ${localOrderId} updated with ShipDay status: ${status}`);

    // Log important status changes
    if (status === 'delivered') {
      console.log(`🎉 Order ${localOrderId} has been delivered!`);
    } else if (status === 'out_for_delivery') {
      console.log(`🚚 Order ${localOrderId} is out for delivery`);
    } else if (status === 'picked_up') {
      console.log(`📦 Order ${localOrderId} has been picked up by driver`);
    } else if (status === 'cancelled') {
      console.log(`❌ Order ${localOrderId} delivery was cancelled`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Webhook processed successfully',
        orderId: localOrderId,
        status
      })
    };

  } catch (error: any) {
    console.error('💥 ShipDay webhook error:', error);
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