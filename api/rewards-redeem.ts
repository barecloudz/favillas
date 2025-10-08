import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';
import { authenticateToken as authenticateTokenFromUtils } from './utils/auth';

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
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  // Use shared authentication utils for consistent user identification
  const authResult = await authenticateTokenFromUtils(
    event.headers.authorization || event.headers.Authorization,
    event.headers.cookie || event.headers.Cookie
  );

  if (!authResult.success) {
    console.log('❌ Rewards Redeem API: Authentication failed:', authResult.error);
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  // Create consistent authPayload similar to orders API
  const authPayload = {
    userId: authResult.user.legacyUserId, // Always use legacy ID if available
    supabaseUserId: authResult.user.id, // Always store Supabase UUID
    username: authResult.user.email || authResult.user.username || 'user',
    role: authResult.user.role || 'customer',
    isSupabase: !authResult.user.legacyUserId, // If no legacy user found, treat as Supabase-only
    hasLegacyUser: !!authResult.user.legacyUserId, // Track if we found legacy user
  };

  console.log('🔍 Rewards Redeem API: Created authPayload:', JSON.stringify(authPayload, null, 2));

  try {
    const sql = getDB();

    // Extract reward ID from URL path
    const pathParts = event.path.split('/');
    const rewardId = parseInt(pathParts[pathParts.length - 2]); // /api/rewards/[id]/redeem

    if (!rewardId || isNaN(rewardId)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Invalid reward ID' })
      };
    }

    // Start atomic transaction with optimistic locking for race condition prevention
    const result = await sql.begin(async (sql: any) => {
      console.log('🔒 Starting atomic transaction with optimistic locking for reward redemption');

      // Get the reward details with FOR UPDATE lock to prevent concurrent modifications
      const reward = await sql`
        SELECT * FROM rewards
        WHERE id = ${rewardId} AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
        FOR UPDATE
      `;

      if (reward.length === 0) {
        throw new Error('Reward not found or expired');
      }

      const rewardData = reward[0];

      // UNIFIED: Check if user has unified account first, regardless of auth type
      let hasUnifiedAccount = false;
      let unifiedUserId = null;

      if (authPayload.userId) {
        // Direct user ID from legacy token
        hasUnifiedAccount = true;
        unifiedUserId = authPayload.userId;
      } else if (authPayload.isSupabase && authPayload.supabaseUserId) {
        // Check if this Supabase user has a corresponding database user_id
        const dbUser = await sql`
          SELECT id FROM users WHERE supabase_user_id = ${authPayload.supabaseUserId}
        `;
        if (dbUser.length > 0) {
          hasUnifiedAccount = true;
          unifiedUserId = dbUser[0].id;
          console.log('✅ Found unified account for Supabase user:', unifiedUserId);
        }
      }

      // Get user's current points with row-level locking to prevent race conditions
      let currentPoints = 0;
      let userPointsRecord;

      if (hasUnifiedAccount && unifiedUserId) {
        // UNIFIED: Use user_id for points lookup (works for both legacy users and unified Supabase users)
        console.log('🔍 Using unified account lookup with user_id:', unifiedUserId);
        const userPointsResult = await sql`
          SELECT id, points, total_redeemed, updated_at FROM user_points
          WHERE user_id = ${unifiedUserId}
          FOR UPDATE
        `;
        userPointsRecord = userPointsResult[0];
        currentPoints = userPointsRecord?.points || 0;
        console.log('🎁 Unified user current points (locked):', currentPoints);
      } else if (authPayload.isSupabase) {
        // Fallback: Supabase user without unified account - query using supabase_user_id
        console.log('🔍 Using Supabase-only lookup');
        const userPointsResult = await sql`
          SELECT id, points, total_redeemed, updated_at FROM user_points
          WHERE supabase_user_id = ${authPayload.supabaseUserId}
          FOR UPDATE
        `;
        userPointsRecord = userPointsResult[0];
        currentPoints = userPointsRecord?.points || 0;
        console.log('🎁 Supabase user current points (locked):', currentPoints);
      } else {
        // Legacy user - query using user_id with FOR UPDATE lock
        console.log('🔍 Using legacy user lookup');
        const userPointsResult = await sql`
          SELECT id, points, total_redeemed, updated_at FROM user_points
          WHERE user_id = ${authPayload.userId}
          FOR UPDATE
        `;
        userPointsRecord = userPointsResult[0];
        currentPoints = userPointsRecord?.points || 0;
        console.log('🎁 Legacy user current points (locked):', currentPoints);
      }

      if (!userPointsRecord) {
        throw new Error('User points record not found');
      }

      console.log('🔍 User auth info:', {
        isSupabase: authPayload.isSupabase,
        userId: authPayload.userId,
        supabaseUserId: authPayload.supabaseUserId,
        currentPoints,
        recordId: userPointsRecord.id
      });

      if (currentPoints < rewardData.points_required) {
        throw new Error(`Insufficient points. You need ${rewardData.points_required} points but have ${currentPoints}`);
      }

      // Check for duplicate redemption attempts using optimistic concurrency
      let existingRedemption;
      if (hasUnifiedAccount && unifiedUserId) {
        // UNIFIED: Check using user_id (works for both legacy users and unified Supabase users)
        existingRedemption = await sql`
          SELECT id FROM user_points_redemptions
          WHERE user_id = ${unifiedUserId}
          AND reward_id = ${rewardId}
          AND is_used = false
          AND created_at > NOW() - INTERVAL '1 minute'
        `;
      } else if (authPayload.isSupabase) {
        // Fallback: Supabase user without unified account
        existingRedemption = await sql`
          SELECT id FROM user_points_redemptions
          WHERE supabase_user_id = ${authPayload.supabaseUserId}
          AND reward_id = ${rewardId}
          AND is_used = false
          AND created_at > NOW() - INTERVAL '1 minute'
        `;
      } else {
        // Legacy user
        existingRedemption = await sql`
          SELECT id FROM user_points_redemptions
          WHERE user_id = ${authPayload.userId}
          AND reward_id = ${rewardId}
          AND is_used = false
          AND created_at > NOW() - INTERVAL '1 minute'
        `;
      }

      if (existingRedemption.length > 0) {
        throw new Error('Duplicate redemption attempt detected. Please wait before trying again.');
      }

      // Create redemption record - handle both authentication types
      let redemption;

      if (hasUnifiedAccount && unifiedUserId) {
        // UNIFIED: Use user_id for redemption record (works for both legacy users and unified Supabase users)
        redemption = await sql`
          INSERT INTO user_points_redemptions (user_id, reward_id, points_spent, is_used, used_at, expires_at, created_at)
          VALUES (
            ${unifiedUserId},
            ${rewardId},
            ${rewardData.points_required},
            false,
            NULL,
            ${rewardData.expires_at || null},
            NOW()
          )
          RETURNING *
        `;
        console.log('✅ Created unified user redemption record');
      } else if (authPayload.isSupabase) {
        // Fallback: Supabase user without unified account
        redemption = await sql`
          INSERT INTO user_points_redemptions (supabase_user_id, reward_id, points_spent, is_used, used_at, expires_at, created_at)
          VALUES (
            ${authPayload.supabaseUserId},
            ${rewardId},
            ${rewardData.points_required},
            false,
            NULL,
            ${rewardData.expires_at || null},
            NOW()
          )
          RETURNING *
        `;
        console.log('✅ Created Supabase user redemption record');
      } else {
        // Legacy user redemption
        redemption = await sql`
          INSERT INTO user_points_redemptions (user_id, reward_id, points_spent, is_used, used_at, expires_at, created_at)
          VALUES (
            ${authPayload.userId},
            ${rewardId},
            ${rewardData.points_required},
            false,
            NULL,
            ${rewardData.expires_at || null},
            NOW()
          )
          RETURNING *
        `;
        console.log('✅ Created legacy user redemption record');
      }

      // Record points transaction and update user_points balance with optimistic concurrency control
      if (hasUnifiedAccount && unifiedUserId) {
        // UNIFIED: Use user_id for transaction (works for both legacy users and unified Supabase users)
        await sql`
          INSERT INTO points_transactions (user_id, type, points, description, created_at)
          VALUES (
            ${unifiedUserId},
            'redeemed',
            ${-rewardData.points_required},
            'Redeemed reward: ' || ${rewardData.name},
            NOW()
          )
        `;

        // Update user_points balance with safeguards against negative points
        const updateResult = await sql`
          UPDATE user_points
          SET
            points = GREATEST(points - ${rewardData.points_required}, 0),
            total_redeemed = total_redeemed + ${rewardData.points_required},
            updated_at = NOW()
          WHERE user_id = ${unifiedUserId}
          AND points >= ${rewardData.points_required}
          RETURNING points, total_redeemed
        `;

        if (updateResult.length === 0) {
          throw new Error('Insufficient points for this redemption.');
        }

        console.log('✅ Updated unified user points balance with optimistic locking:', updateResult[0]);
      } else if (authPayload.isSupabase) {
        // Fallback: Supabase user without unified account
        await sql`
          INSERT INTO points_transactions (supabase_user_id, type, points, description, created_at)
          VALUES (
            ${authPayload.supabaseUserId},
            'redeemed',
            ${-rewardData.points_required},
            'Redeemed reward: ' || ${rewardData.name},
            NOW()
          )
        `;

        // Update user_points balance with safeguards against negative points
        const updateResult = await sql`
          UPDATE user_points
          SET
            points = GREATEST(points - ${rewardData.points_required}, 0),
            total_redeemed = total_redeemed + ${rewardData.points_required},
            updated_at = NOW()
          WHERE supabase_user_id = ${authPayload.supabaseUserId}
          AND points >= ${rewardData.points_required}
          RETURNING points, total_redeemed
        `;

        if (updateResult.length === 0) {
          throw new Error('Insufficient points for this redemption.');
        }

        console.log('✅ Updated Supabase user points balance with optimistic locking:', updateResult[0]);
      } else {
        // Legacy user transaction
        await sql`
          INSERT INTO points_transactions (user_id, type, points, description, created_at)
          VALUES (
            ${authPayload.userId},
            'redeemed',
            ${-rewardData.points_required},
            'Redeemed reward: ' || ${rewardData.name},
            NOW()
          )
        `;

        // Update user_points balance with safeguards against negative points
        const updateResult = await sql`
          UPDATE user_points
          SET
            points = GREATEST(points - ${rewardData.points_required}, 0),
            total_redeemed = total_redeemed + ${rewardData.points_required},
            updated_at = NOW()
          WHERE user_id = ${authPayload.userId}
          AND points >= ${rewardData.points_required}
          RETURNING points, total_redeemed
        `;

        if (updateResult.length === 0) {
          throw new Error('Insufficient points for this redemption.');
        }

        console.log('✅ Updated legacy user points balance with optimistic locking:', updateResult[0]);
      }

      // Note: Reward usage tracking removed since times_used column doesn't exist
      // This functionality can be restored by adding times_used column to rewards table if needed

      console.log('✅ Reward redemption completed successfully');

      return { redemption: redemption[0], reward: rewardData };
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        redemption: result.redemption,
        reward: result.reward,
        message: `Successfully redeemed ${result.reward.name}!`,
        userType: authPayload.isSupabase ? 'google' : 'legacy',
        userId: authPayload.isSupabase ? authPayload.supabaseUserId : authPayload.userId
      })
    };

  } catch (error: any) {
    console.error('Reward redemption error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        success: false,
        message: error.message || 'Failed to redeem reward',
        error: error.message,
        userType: authPayload?.isSupabase ? 'google' : 'legacy',
        userId: authPayload?.isSupabase ? authPayload.supabaseUserId : authPayload?.userId
      })
    };
  }
};