import { Handler } from '@netlify/functions';
import postgres from 'postgres';

// Database connection - serverless optimized
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
  // CORS headers
  const origin = event.headers.origin || '*';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const sql = getDB();
    const body = JSON.parse(event.body || '{}');
    const { code } = body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid promo code',
          message: 'Promo code is required'
        })
      };
    }

    const promoCodeUpper = code.trim().toUpperCase();
    console.log('🎟️ Validating promo code:', promoCodeUpper);

    // Query the promo_codes table
    const promoCodes = await sql`
      SELECT
        id,
        code,
        name,
        description,
        discount,
        discount_type,
        min_order_amount,
        max_uses,
        current_uses,
        is_active,
        start_date,
        end_date
      FROM promo_codes
      WHERE UPPER(code) = ${promoCodeUpper}
        AND is_active = true
        AND start_date <= NOW()
        AND end_date >= NOW()
    `;

    if (promoCodes.length === 0) {
      console.log('❌ Promo code not found or invalid:', promoCodeUpper);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Invalid promo code',
          message: 'This promo code is not valid or has expired'
        })
      };
    }

    const promoCode = promoCodes[0];

    // Check if max uses exceeded
    if (promoCode.max_uses > 0 && promoCode.current_uses >= promoCode.max_uses) {
      console.log('❌ Promo code max uses exceeded:', promoCodeUpper);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Promo code expired',
          message: 'This promo code has reached its maximum number of uses'
        })
      };
    }

    console.log('✅ Valid promo code found:', {
      code: promoCode.code,
      discount: promoCode.discount,
      type: promoCode.discount_type,
      minOrder: promoCode.min_order_amount
    });

    // Return promo code details
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        id: promoCode.id,
        code: promoCode.code,
        name: promoCode.name,
        description: promoCode.description,
        discount: parseFloat(promoCode.discount),
        discountType: promoCode.discount_type, // Camel case for frontend
        minOrderAmount: parseFloat(promoCode.min_order_amount || 0), // Camel case for frontend
        valid: true
      })
    };

  } catch (error) {
    console.error('❌ Promo code validation API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to validate promo code',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
