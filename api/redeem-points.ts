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

// Robust points redemption function with atomic operations and data integrity checks
async function redeemPointsRobust(
  sql: any, 
  userId: number, 
  points: number, 
  rewardId?: number, 
  description?: string
): Promise<{ success: boolean; transactionId?: number; currentPoints: number; error?: string }> {
  try {
    // Use a transaction to ensure atomicity and data integrity
    const result = await sql.begin(async (sql: any) => {
      // Step 1: Get current user points with row-level locking
      const userPointsRecord = await sql`
        SELECT id, points, total_earned, total_redeemed, updated_at
        FROM user_points 
        WHERE user_id = ${userId}
        FOR UPDATE
      `;

      if (userPointsRecord.length === 0) {
        throw new Error('User points record not found. Please earn some points first.');
      }

      const currentRecord = userPointsRecord[0];
      const currentPoints = currentRecord.points;

      // Step 2: Validate sufficient points
      if (currentPoints < points) {
        throw new Error(`Insufficient points. You have ${currentPoints} points but need ${points} points.`);
      }

      const newTotalRedeemed = currentRecord.total_redeemed + points;
      const newCurrentPoints = currentRecord.total_earned - newTotalRedeemed;

      // Step 3: Update user_points table atomically
      const updatedUserPoints = await sql`
        UPDATE user_points 
        SET 
          points = ${newCurrentPoints},
          total_redeemed = ${newTotalRedeemed},
          updated_at = NOW()
        WHERE user_id = ${userId}
        RETURNING id, points, total_earned, total_redeemed, updated_at
      `;

      // Step 4: Record transaction in points_transactions table (audit trail)
      const transactionRecord = await sql`
        INSERT INTO points_transactions (
          user_id,
          type,
          points,
          description,
          created_at
        )
        VALUES (
          ${userId},
          'redeemed',
          ${points},
          ${description || `Redeemed ${points} points`},
          NOW()
        )
        RETURNING id, created_at
      `;

      // Step 5: Record redemption in user_points_redemptions table if rewardId provided
      if (rewardId) {
        await sql`
          INSERT INTO user_points_redemptions (
            user_id,
            points_reward_id,
            points_spent,
            is_used,
            expires_at,
            created_at
          )
          VALUES (
            ${userId},
            ${rewardId},
            ${points},
            true,
            NOW() + INTERVAL '30 days',
            NOW()
          )
        `;
      }

      // Step 6: Also update the legacy rewards column in users table for backward compatibility
      await sql`
        UPDATE users 
        SET rewards = ${newCurrentPoints}, updated_at = NOW()
        WHERE id = ${userId}
      `;

      return {
        transactionId: transactionRecord[0].id,
        currentPoints: newCurrentPoints,
        updatedAt: updatedUserPoints[0].updated_at
      };
    });

    return {
      success: true,
      transactionId: result.transactionId,
      currentPoints: result.currentPoints
    };

  } catch (error) {
    console.error('❌ Points redemption failed:', error);
    return {
      success: false,
      currentPoints: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
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
    // First try to decode as Supabase JWT token
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      
      if (payload.iss && payload.iss.includes('supabase')) {
        const supabaseUserId = payload.sub;
        
        return {
          userId: parseInt(supabaseUserId.replace(/-/g, '').substring(0, 8), 16) || 1,
          username: payload.email || 'supabase_user',
          role: 'customer'
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
      username: decoded.username,
      role: decoded.role || 'customer'
    };
  } catch (error) {
    console.error('Token authentication failed:', error);
    return null;
  }
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  // Check authentication
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
    const body = JSON.parse(event.body || '{}');
    const { points, rewardId, description } = body;

    // Validate input
    if (!points || points <= 0 || !Number.isInteger(points)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Invalid points amount. Must be a positive integer.',
          received: points
        })
      };
    }

    if (points > 10000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Points amount too high. Maximum 10,000 points per transaction.',
          received: points
        })
      };
    }

    console.log('🎁 Redeeming points for user:', authPayload.userId, 'Points:', points, 'Reward:', rewardId);

    // Use robust points redemption function
    const result = await redeemPointsRobust(
      sql, 
      authPayload.userId, 
      points, 
      rewardId, 
      description
    );

    if (!result.success) {
      console.error('❌ Points redemption failed:', result.error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          message: 'Failed to redeem points',
          error: result.error || 'Unknown error'
        })
      };
    }

    console.log('✅ Points redeemed successfully:', {
      transactionId: result.transactionId,
      pointsRedeemed: points,
      currentPoints: result.currentPoints
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        pointsRedeemed: points,
        currentPoints: result.currentPoints,
        transactionId: result.transactionId,
        message: `Successfully redeemed ${points} points! Your new total is ${result.currentPoints} points.`
      })
    };

  } catch (error) {
    console.error('❌ Redeem Points API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Failed to redeem points',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
