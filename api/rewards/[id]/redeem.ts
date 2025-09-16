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

function authenticateToken(event: any): { userId: number; username: string; role: string } | null {
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
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    return {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role || 'customer'
    };
  } catch (error) {
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

      // Get user's current points
      const userPoints = await sql`
        SELECT
          COALESCE(SUM(CASE WHEN transaction_type = 'earned' THEN points_earned ELSE 0 END), 0) -
          COALESCE(SUM(CASE WHEN transaction_type = 'redeemed' THEN points_redeemed ELSE 0 END), 0) as current_points
        FROM user_points
        WHERE user_id = ${authPayload.userId}
      `;

      const currentPoints = userPoints[0]?.current_points || 0;

      if (currentPoints < rewardData.points_required) {
        throw new Error(`Insufficient points. You need ${rewardData.points_required} points but have ${currentPoints}`);
      }

      // Create redemption record
      const redemption = await sql`
        INSERT INTO reward_redemptions (user_id, reward_id, points_spent, redeemed_at, expires_at)
        VALUES (
          ${authPayload.userId},
          ${rewardId},
          ${rewardData.points_required},
          NOW(),
          ${rewardData.expires_at || null}
        )
        RETURNING *
      `;

      // Record points transaction
      await sql`
        INSERT INTO user_points (user_id, points_redeemed, transaction_type, reference_id, description)
        VALUES (
          ${authPayload.userId},
          ${rewardData.points_required},
          'redeemed',
          ${rewardId},
          'Redeemed reward: ' || ${rewardData.name}
        )
      `;

      // Update reward usage count
      await sql`
        UPDATE rewards
        SET times_used = times_used + 1, updated_at = NOW()
        WHERE id = ${rewardId}
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          redemption: redemption[0],
          reward: rewardData,
          message: `Successfully redeemed ${rewardData.name}!`
        })
      };
    });

  } catch (error: any) {
    console.error('Reward redemption error:', error);
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        message: error.message || 'Failed to redeem reward',
        error: error.message
      })
    };
  }
};