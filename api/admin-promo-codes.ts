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

  try {
    const sql = getDB();
    const method = event.httpMethod;

    // GET - Fetch all promo codes
    if (method === 'GET') {
      console.log('📋 Fetching all promo codes');

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
          end_date,
          created_at,
          updated_at
        FROM promo_codes
        ORDER BY created_at DESC
      `;

      // Transform to camelCase for frontend
      const transformedCodes = promoCodes.map(promo => ({
        id: promo.id,
        code: promo.code,
        name: promo.name,
        description: promo.description,
        discount: parseFloat(promo.discount),
        discountType: promo.discount_type,
        minOrderAmount: parseFloat(promo.min_order_amount),
        maxUses: promo.max_uses,
        currentUses: promo.current_uses,
        isActive: promo.is_active,
        startDate: promo.start_date,
        endDate: promo.end_date,
        createdAt: promo.created_at,
        updatedAt: promo.updated_at
      }));

      console.log(`✅ Fetched ${transformedCodes.length} promo codes`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(transformedCodes)
      };
    }

    // POST - Create new promo code
    if (method === 'POST') {
      const body = JSON.parse(event.body || '{}');
      console.log('➕ Creating new promo code:', body.code);

      // Validate required fields
      if (!body.code || !body.name || !body.discount || !body.discountType || !body.startDate || !body.endDate) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'Missing required fields',
            required: ['code', 'name', 'discount', 'discountType', 'startDate', 'endDate']
          })
        };
      }

      const newPromo = await sql`
        INSERT INTO promo_codes (
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
        ) VALUES (
          ${body.code.toUpperCase()},
          ${body.name},
          ${body.description || ''},
          ${body.discount},
          ${body.discountType},
          ${body.minOrderAmount || 0},
          ${body.maxUses || 0},
          0,
          ${body.isActive !== false},
          ${body.startDate},
          ${body.endDate}
        )
        RETURNING *
      `;

      console.log('✅ Promo code created:', newPromo[0].code);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          id: newPromo[0].id,
          code: newPromo[0].code,
          name: newPromo[0].name,
          description: newPromo[0].description,
          discount: parseFloat(newPromo[0].discount),
          discountType: newPromo[0].discount_type,
          minOrderAmount: parseFloat(newPromo[0].min_order_amount),
          maxUses: newPromo[0].max_uses,
          currentUses: newPromo[0].current_uses,
          isActive: newPromo[0].is_active,
          startDate: newPromo[0].start_date,
          endDate: newPromo[0].end_date,
          createdAt: newPromo[0].created_at,
          updatedAt: newPromo[0].updated_at
        })
      };
    }

    // PUT - Update existing promo code
    if (method === 'PUT') {
      const body = JSON.parse(event.body || '{}');
      const id = body.id;

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Promo code ID is required' })
        };
      }

      console.log('✏️ Updating promo code:', id);

      const updated = await sql`
        UPDATE promo_codes
        SET
          code = ${body.code?.toUpperCase() || sql`code`},
          name = ${body.name || sql`name`},
          description = ${body.description !== undefined ? body.description : sql`description`},
          discount = ${body.discount !== undefined ? body.discount : sql`discount`},
          discount_type = ${body.discountType || sql`discount_type`},
          min_order_amount = ${body.minOrderAmount !== undefined ? body.minOrderAmount : sql`min_order_amount`},
          max_uses = ${body.maxUses !== undefined ? body.maxUses : sql`max_uses`},
          is_active = ${body.isActive !== undefined ? body.isActive : sql`is_active`},
          start_date = ${body.startDate || sql`start_date`},
          end_date = ${body.endDate || sql`end_date`},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      if (updated.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Promo code not found' })
        };
      }

      console.log('✅ Promo code updated:', updated[0].code);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          id: updated[0].id,
          code: updated[0].code,
          name: updated[0].name,
          description: updated[0].description,
          discount: parseFloat(updated[0].discount),
          discountType: updated[0].discount_type,
          minOrderAmount: parseFloat(updated[0].min_order_amount),
          maxUses: updated[0].max_uses,
          currentUses: updated[0].current_uses,
          isActive: updated[0].is_active,
          startDate: updated[0].start_date,
          endDate: updated[0].end_date,
          createdAt: updated[0].created_at,
          updatedAt: updated[0].updated_at
        })
      };
    }

    // DELETE - Remove promo code
    if (method === 'DELETE') {
      const body = JSON.parse(event.body || '{}');
      const id = body.id;

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Promo code ID is required' })
        };
      }

      console.log('🗑️ Deleting promo code:', id);

      const deleted = await sql`
        DELETE FROM promo_codes
        WHERE id = ${id}
        RETURNING code
      `;

      if (deleted.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Promo code not found' })
        };
      }

      console.log('✅ Promo code deleted:', deleted[0].code);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, code: deleted[0].code })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('❌ Promo codes API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: 'Failed to manage promo codes',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
