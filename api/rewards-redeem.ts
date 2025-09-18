import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';

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

function authenticateToken(event: any): { userId: number | null; supabaseUserId: string | null; username: string; role: string; isSupabase: boolean } | null {
  const authHeader = event.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    const cookies = event.headers.cookie;
    if (cookies) {
      const authCookie = cookies.split(';').find((c: string) => c.trim().startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }
  }

  if (!token) return null;

  try {
    // First try to decode as Supabase JWT token
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      console.log('🔍 Supabase token payload:', payload);

      if (payload.iss && payload.iss.includes('supabase')) {
        // This is a Supabase token, extract user ID
        const supabaseUserId = payload.sub;
        console.log('✅ Supabase user ID:', supabaseUserId);

        // For Supabase users, return the UUID directly
        return {
          userId: null, // No integer user ID for Supabase users
          supabaseUserId: supabaseUserId,
          username: payload.email || 'supabase_user',
          role: 'customer',
          isSupabase: true
        };
      }
    } catch (supabaseError) {
      console.log('Not a Supabase token, trying JWT verification');
    }

    // Fallback to our JWT verification
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    return {
      userId: decoded.userId,
      supabaseUserId: null,
      username: decoded.username,
      role: decoded.role || 'customer',
      isSupabase: false
    };
  } catch (error) {
    console.error('Token authentication failed:', error);
    return null;
  }
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

  const authPayload = authenticateToken(event);
  if (!authPayload) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

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

    // Start transaction
    await sql.begin(async (sql: any) => {
      // Get the reward details
      const reward = await sql`
        SELECT * FROM rewards
        WHERE id = ${rewardId} AND is_active = true
        AND (expires_at IS NULL OR expires_at > NOW())
      `;

      if (reward.length === 0) {
        throw new Error('Reward not found or expired');
      }

      const rewardData = reward[0];

      // Check if reward has usage limits
      if (rewardData.max_uses && rewardData.times_used >= rewardData.max_uses) {
        throw new Error('Reward usage limit reached');
      }

      // Get user's current points - handle both authentication types
      let currentPoints = 0;

      if (authPayload.isSupabase) {
        // Supabase user - query using supabase_user_id
        const userPointsRecord = await sql`
          SELECT points FROM user_points WHERE supabase_user_id = ${authPayload.supabaseUserId}
        `;
        currentPoints = userPointsRecord[0]?.points || 0;
        console.log('🎁 Supabase user current points:', currentPoints);
      } else {
        // Legacy user - query using user_id
        const userPointsRecord = await sql`
          SELECT points FROM user_points WHERE user_id = ${authPayload.userId}
        `;
        currentPoints = userPointsRecord[0]?.points || 0;
        console.log('🎁 Legacy user current points:', currentPoints);
      }

      console.log('🔍 User auth info:', {
        isSupabase: authPayload.isSupabase,
        userId: authPayload.userId,
        supabaseUserId: authPayload.supabaseUserId,
        currentPoints
      });

      if (currentPoints < rewardData.points_required) {
        throw new Error(`Insufficient points. You need ${rewardData.points_required} points but have ${currentPoints}`);
      }

      // Create redemption record - handle both authentication types
      let redemption;

      if (authPayload.isSupabase) {
        // Supabase user redemption
        redemption = await sql`
          INSERT INTO user_points_redemptions (supabase_user_id, points_reward_id, points_spent, is_used, used_at, expires_at, created_at)
          VALUES (
            ${authPayload.supabaseUserId},
            ${rewardId},
            ${rewardData.points_required},
            true,
            NOW(),
            ${rewardData.expires_at || null},
            NOW()
          )
          RETURNING *
        `;
        console.log('✅ Created Supabase user redemption record');
      } else {
        // Legacy user redemption
        redemption = await sql`
          INSERT INTO user_points_redemptions (user_id, points_reward_id, points_spent, is_used, used_at, expires_at, created_at)
          VALUES (
            ${authPayload.userId},
            ${rewardId},
            ${rewardData.points_required},
            true,
            NOW(),
            ${rewardData.expires_at || null},
            NOW()
          )
          RETURNING *
        `;
        console.log('✅ Created legacy user redemption record');
      }

      // Record points transaction and update user_points balance
      if (authPayload.isSupabase) {
        // Supabase user transaction
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

        // Update user_points balance
        await sql`
          UPDATE user_points
          SET
            points = points - ${rewardData.points_required},
            total_redeemed = total_redeemed + ${rewardData.points_required},
            updated_at = NOW()
          WHERE supabase_user_id = ${authPayload.supabaseUserId}
        `;

        console.log('✅ Updated Supabase user points balance');
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

        // Update user_points balance
        await sql`
          UPDATE user_points
          SET
            points = points - ${rewardData.points_required},
            total_redeemed = total_redeemed + ${rewardData.points_required},
            updated_at = NOW()
          WHERE user_id = ${authPayload.userId}
        `;

        console.log('✅ Updated legacy user points balance');
      }

      // Update reward usage count
      await sql`
        UPDATE rewards
        SET times_used = times_used + 1, updated_at = NOW()
        WHERE id = ${rewardId}
      `;

      console.log('✅ Reward redemption completed successfully');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          redemption: redemption[0],
          reward: rewardData,
          message: `Successfully redeemed ${rewardData.name}!`,
          userType: authPayload.isSupabase ? 'google' : 'legacy',
          userId: authPayload.isSupabase ? authPayload.supabaseUserId : authPayload.userId
        })
      };
    });

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