import { Handler } from '@netlify/functions';
import postgres from 'postgres';

/**
 * ADMIN ONLY - Clear all orders and reset sequence
 * This endpoint will delete all orders and reset the ID counter to 1
 */
export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-key',
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

  // SECURITY: Require admin key
  const adminKey = event.headers['x-admin-key'];
  const expectedKey = process.env.SETUP_SECRET_KEY || 'CHANGE_THIS_SECRET_KEY_12345';

  if (adminKey !== expectedKey) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Invalid admin key' })
    };
  }

  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'DATABASE_URL not configured' })
      };
    }

    const sql = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
    });

    // Get count before deletion
    const countResult = await sql`SELECT COUNT(*) as count FROM orders`;
    const orderCount = parseInt(countResult[0].count);

    // Delete points transactions first (foreign key constraint)
    await sql`DELETE FROM points_transactions`;
    console.log('✅ Deleted all points transactions');

    // Delete all order items (foreign key constraint)
    await sql`DELETE FROM order_items`;
    console.log('✅ Deleted all order items');

    // Delete all orders
    await sql`DELETE FROM orders`;
    console.log('✅ Deleted all orders');

    // Reset the sequence to start from 1
    await sql`ALTER SEQUENCE orders_id_seq RESTART WITH 1`;
    console.log('✅ Reset orders ID sequence to 1');

    await sql.end();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'All orders cleared and ID sequence reset',
        ordersDeleted: orderCount
      })
    };

  } catch (error) {
    console.error('Clear orders error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
