import { Handler } from '@netlify/functions';
import postgres from 'postgres';

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
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  // Add caching headers for GET requests (reduced cache time for better admin UX)
  const headersWithCache = event.httpMethod === 'GET' ? {
    ...headers,
    // Cache rewards for 30 seconds with stale-while-revalidate for better admin update experience
    'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=15',
    'CDN-Cache-Control': 'max-age=60',
    'Surrogate-Control': 'max-age=120'
  } : headers;
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const sql = getDB();

    if (event.httpMethod === 'GET') {
      // Get rewards, excluding advent-only rewards from public view
      const rewards = await sql`
        SELECT * FROM rewards
        WHERE (is_advent_only IS NULL OR is_advent_only = false)
        ORDER BY created_at DESC
      `;

      console.log('Rewards API GET - found rewards:', rewards.length);

      return {
        statusCode: 200,
        headers: headersWithCache,
        body: JSON.stringify(rewards)
      };

    } else if (event.httpMethod === 'POST') {
      const { name, description, pointsRequired, rewardType, discount, discountType, maxDiscountAmount, freeItem, freeItemMenuId, freeItemCategory, freeItemAllFromCategory, minOrderAmount, expiresAt, bonusPoints } = JSON.parse(event.body || '{}');

      if (!name || !description) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            message: 'Name and description are required'
          })
        };
      }

      const result = await sql`
        INSERT INTO rewards (
          name, description, points_required, reward_type, discount, discount_type, max_discount_amount, free_item,
          free_item_menu_id, free_item_category, free_item_all_from_category,
          min_order_amount, expires_at, is_active, created_at, bonus_points
        )
        VALUES (
          ${name},
          ${description},
          ${pointsRequired ? parseInt(pointsRequired) : 100},
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
          true,
          NOW(),
          ${bonusPoints ? parseInt(bonusPoints) : null}
        )
        RETURNING *
      `;

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(result[0])
      };

    } else if (event.httpMethod === 'PUT') {
      // Extract ID from URL path
      const pathParts = event.path.split('/');
      const rewardId = pathParts[pathParts.length - 1];

      if (!rewardId || isNaN(parseInt(rewardId))) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid reward ID' })
        };
      }

      const { name, description, pointsRequired, rewardType, discount, discountType, maxDiscountAmount, freeItem, freeItemMenuId, freeItemCategory, freeItemAllFromCategory, minOrderAmount, expiresAt, bonusPoints } = JSON.parse(event.body || '{}');

      // First get the existing reward to preserve values
      const existing = await sql`
        SELECT * FROM rewards WHERE id = ${parseInt(rewardId)}
      `;

      if (existing.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Reward not found' })
        };
      }

      // Use existing values if new values are not provided
      const updatedName = name !== undefined ? name : existing[0].name;
      const updatedDescription = description !== undefined ? description : existing[0].description;
      const updatedPointsRequired = pointsRequired !== undefined ? parseInt(pointsRequired) : existing[0].points_required;
      const updatedRewardType = rewardType !== undefined ? rewardType : existing[0].reward_type;
      const updatedDiscount = discount !== undefined ? (discount ? parseFloat(discount) : null) : existing[0].discount;
      const updatedDiscountType = discountType !== undefined ? discountType : (existing[0].discount_type || 'percentage');
      const updatedMaxDiscountAmount = maxDiscountAmount !== undefined ? (maxDiscountAmount ? parseFloat(maxDiscountAmount) : null) : existing[0].max_discount_amount;
      const updatedFreeItem = freeItem !== undefined ? freeItem : existing[0].free_item;
      const updatedFreeItemMenuId = freeItemMenuId !== undefined ? (freeItemMenuId ? parseInt(freeItemMenuId) : null) : existing[0].free_item_menu_id;
      const updatedFreeItemCategory = freeItemCategory !== undefined ? freeItemCategory : existing[0].free_item_category;
      const updatedFreeItemAllFromCategory = freeItemAllFromCategory !== undefined ? freeItemAllFromCategory : existing[0].free_item_all_from_category;
      const updatedMinOrderAmount = minOrderAmount !== undefined ? (minOrderAmount ? parseFloat(minOrderAmount) : null) : existing[0].min_order_amount;
      const updatedExpiresAt = expiresAt !== undefined ? expiresAt : existing[0].expires_at;
      const updatedBonusPoints = bonusPoints !== undefined ? (bonusPoints ? parseInt(bonusPoints) : null) : existing[0].bonus_points;

      const result = await sql`
        UPDATE rewards
        SET name = ${updatedName},
            description = ${updatedDescription},
            points_required = ${updatedPointsRequired},
            reward_type = ${updatedRewardType},
            discount = ${updatedDiscount},
            discount_type = ${updatedDiscountType},
            max_discount_amount = ${updatedMaxDiscountAmount},
            free_item = ${updatedFreeItem},
            free_item_menu_id = ${updatedFreeItemMenuId},
            free_item_category = ${updatedFreeItemCategory},
            free_item_all_from_category = ${updatedFreeItemAllFromCategory},
            min_order_amount = ${updatedMinOrderAmount},
            expires_at = ${updatedExpiresAt},
            bonus_points = ${updatedBonusPoints},
            updated_at = NOW()
        WHERE id = ${parseInt(rewardId)}
        RETURNING *
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result[0])
      };

    } else if (event.httpMethod === 'DELETE') {
      // Extract ID from URL path
      const pathParts = event.path.split('/');
      const rewardId = pathParts[pathParts.length - 1];
      
      if (!rewardId || isNaN(parseInt(rewardId))) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Invalid reward ID' })
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
          body: JSON.stringify({ message: 'Reward not found' })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Reward deleted successfully' })
      };

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ message: 'Method not allowed' })
      };
    }

  } catch (error: any) {
    console.error('Rewards API error:', error);
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