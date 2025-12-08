import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, isAdmin } from './_shared/auth';

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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Authenticate - admin only
    const authPayload = await authenticateToken(event);
    if (!authPayload) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authentication required' })
      };
    }

    if (!isAdmin(authPayload)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Admin access required' })
      };
    }

    const sql = getDB();

    // GET - Fetch all rewards (including advent-only)
    if (event.httpMethod === 'GET') {
      const rewards = await sql`
        SELECT * FROM rewards
        ORDER BY created_at DESC
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(rewards)
      };
    }

    // POST - Create new reward
    if (event.httpMethod === 'POST') {
      const {
        name,
        description,
        pointsRequired,
        voucher_code,
        image_url,
        rewardType,
        discount,
        discountType,
        maxDiscountAmount,
        freeItem,
        freeItemMenuId,
        freeItemCategory,
        freeItemAllFromCategory,
        minOrderAmount,
        expiresAt,
        is_advent_only,
        is_active,
        bonusPoints
      } = JSON.parse(event.body || '{}');

      if (!name) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Name is required' })
        };
      }

      const result = await sql`
        INSERT INTO rewards (
          name,
          description,
          points_required,
          voucher_code,
          image_url,
          reward_type,
          discount,
          discount_type,
          max_discount_amount,
          free_item,
          free_item_menu_id,
          free_item_category,
          free_item_all_from_category,
          min_order_amount,
          expires_at,
          is_advent_only,
          is_active,
          bonus_points,
          created_at
        )
        VALUES (
          ${name},
          ${description || null},
          ${pointsRequired ? parseInt(pointsRequired) : 0},
          ${voucher_code || null},
          ${image_url || null},
          ${rewardType || 'discount'},
          ${discount ? parseFloat(discount) : null},
          ${discountType || 'percentage'},
          ${maxDiscountAmount ? parseFloat(maxDiscountAmount) : null},
          ${freeItem || null},
          ${freeItemMenuId ? parseInt(freeItemMenuId) : null},
          ${freeItemCategory || null},
          ${freeItemAllFromCategory || false},
          ${minOrderAmount ? parseFloat(minOrderAmount) : null},
          ${expiresAt || null},
          ${is_advent_only || false},
          ${is_active !== false},
          ${bonusPoints ? parseInt(bonusPoints) : null},
          NOW()
        )
        RETURNING *
      `;

      console.log('✅ Admin created reward:', result[0].name, 'Type:', result[0].reward_type, 'Bonus Points:', result[0].bonus_points);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(result[0])
      };
    }

    // PUT - Update reward
    if (event.httpMethod === 'PUT') {
      const pathParts = event.path.split('/');
      const rewardId = pathParts[pathParts.length - 1];

      if (!rewardId || isNaN(parseInt(rewardId))) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid reward ID' })
        };
      }

      const body = JSON.parse(event.body || '{}');

      // Get existing reward
      const [existing] = await sql`
        SELECT * FROM rewards WHERE id = ${parseInt(rewardId)}
      `;

      if (!existing) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Reward not found' })
        };
      }

      // Merge with existing values
      const updatedReward = {
        name: body.name !== undefined ? body.name : existing.name,
        description: body.description !== undefined ? body.description : existing.description,
        points_required: body.pointsRequired !== undefined ? parseInt(body.pointsRequired) : existing.points_required,
        voucher_code: body.voucher_code !== undefined ? body.voucher_code : existing.voucher_code,
        image_url: body.image_url !== undefined ? body.image_url : existing.image_url,
        reward_type: body.rewardType !== undefined ? body.rewardType : existing.reward_type,
        discount: body.discount !== undefined ? (body.discount ? parseFloat(body.discount) : null) : existing.discount,
        discount_type: body.discountType !== undefined ? body.discountType : existing.discount_type,
        max_discount_amount: body.maxDiscountAmount !== undefined ? (body.maxDiscountAmount ? parseFloat(body.maxDiscountAmount) : null) : existing.max_discount_amount,
        free_item: body.freeItem !== undefined ? body.freeItem : existing.free_item,
        free_item_menu_id: body.freeItemMenuId !== undefined ? (body.freeItemMenuId ? parseInt(body.freeItemMenuId) : null) : existing.free_item_menu_id,
        free_item_category: body.freeItemCategory !== undefined ? body.freeItemCategory : existing.free_item_category,
        free_item_all_from_category: body.freeItemAllFromCategory !== undefined ? body.freeItemAllFromCategory : existing.free_item_all_from_category,
        min_order_amount: body.minOrderAmount !== undefined ? (body.minOrderAmount ? parseFloat(body.minOrderAmount) : null) : existing.min_order_amount,
        expires_at: body.expiresAt !== undefined ? body.expiresAt : existing.expires_at,
        is_advent_only: body.is_advent_only !== undefined ? body.is_advent_only : existing.is_advent_only,
        is_active: body.is_active !== undefined ? body.is_active : existing.is_active,
        bonus_points: body.bonusPoints !== undefined ? (body.bonusPoints ? parseInt(body.bonusPoints) : null) : existing.bonus_points,
      };

      const result = await sql`
        UPDATE rewards
        SET
          name = ${updatedReward.name},
          description = ${updatedReward.description},
          points_required = ${updatedReward.points_required},
          voucher_code = ${updatedReward.voucher_code},
          image_url = ${updatedReward.image_url},
          reward_type = ${updatedReward.reward_type},
          discount = ${updatedReward.discount},
          discount_type = ${updatedReward.discount_type},
          max_discount_amount = ${updatedReward.max_discount_amount},
          free_item = ${updatedReward.free_item},
          free_item_menu_id = ${updatedReward.free_item_menu_id},
          free_item_category = ${updatedReward.free_item_category},
          free_item_all_from_category = ${updatedReward.free_item_all_from_category},
          min_order_amount = ${updatedReward.min_order_amount},
          expires_at = ${updatedReward.expires_at},
          is_advent_only = ${updatedReward.is_advent_only},
          is_active = ${updatedReward.is_active},
          bonus_points = ${updatedReward.bonus_points},
          updated_at = NOW()
        WHERE id = ${parseInt(rewardId)}
        RETURNING *
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result[0])
      };
    }

    // DELETE - Remove reward
    if (event.httpMethod === 'DELETE') {
      const pathParts = event.path.split('/');
      const rewardId = pathParts[pathParts.length - 1];

      if (!rewardId || isNaN(parseInt(rewardId))) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid reward ID' })
        };
      }

      const result = await sql`
        DELETE FROM rewards
        WHERE id = ${parseInt(rewardId)}
        RETURNING *
      `;

      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Reward not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Reward deleted successfully' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error: any) {
    console.error('❌ Admin rewards error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
