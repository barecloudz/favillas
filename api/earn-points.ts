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

// Robust points earning function with atomic operations and backup mechanisms
async function earnPointsRobust(
  sql: any, 
  userId: number, 
  points: number, 
  orderId?: number, 
  description?: string, 
  orderAmount?: number
): Promise<{ success: boolean; transactionId?: number; currentPoints: number; error?: string }> {
  try {
    // Use a transaction to ensure atomicity and data integrity
    const result = await sql.begin(async (sql: any) => {
      // Step 1: Ensure user exists in user_points table
      let userPointsRecord = await sql`
        SELECT id, points, total_earned, total_redeemed, updated_at
        FROM user_points 
        WHERE user_id = ${userId}
      `;

      if (userPointsRecord.length === 0) {
        // Create initial user_points record
        await sql`
          INSERT INTO user_points (user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
          VALUES (${userId}, 0, 0, 0, NOW(), NOW(), NOW())
        `;
        userPointsRecord = [{
          id: null,
          points: 0,
          total_earned: 0,
          total_redeemed: 0,
          updated_at: new Date()
        }];
      }

      const currentRecord = userPointsRecord[0];
      const newTotalEarned = currentRecord.total_earned + points;
      const newCurrentPoints = newTotalEarned - currentRecord.total_redeemed;

      // Step 2: Update user_points table atomically
      const updatedUserPoints = await sql`
        UPDATE user_points 
        SET 
          points = ${newCurrentPoints},
          total_earned = ${newTotalEarned},
          last_earned_at = NOW(),
          updated_at = NOW()
        WHERE user_id = ${userId}
        RETURNING id, points, total_earned, total_redeemed, updated_at
      `;

      // Step 3: Record transaction in points_transactions table (audit trail)
      const transactionRecord = await sql`
        INSERT INTO points_transactions (
          user_id,
          order_id,
          type,
          points,
          description,
          order_amount,
          created_at
        )
        VALUES (
          ${userId},
          ${orderId || null},
          'earned',
          ${points},
          ${description || `Earned ${points} points`},
          ${orderAmount || null},
          NOW()
        )
        RETURNING id, created_at
      `;

      // Step 4: Also update the legacy rewards column in users table for backward compatibility
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
    console.error('❌ Points earning failed:', error);
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
      console.log('🔍 Supabase token payload:', payload);
      
      if (payload.iss && payload.iss.includes('supabase')) {
        const supabaseUserId = payload.sub;
        console.log('✅ Supabase user ID:', supabaseUserId);
        
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
    const { points, orderId, description, orderAmount } = body;

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

    console.log('💰 Earning points for user:', authPayload.userId, 'Points:', points, 'Order:', orderId);

    // Ensure user exists first
    const userExists = await sql`
      SELECT id FROM users WHERE id = ${authPayload.userId}
    `;
    
    if (userExists.length === 0) {
      console.log('👤 Creating user for points earning');
      await sql`
        INSERT INTO users (id, username, email, first_name, last_name, password, role, is_admin, is_active, marketing_opt_in, created_at, updated_at)
        VALUES (${authPayload.userId}, ${authPayload.username}, ${authPayload.username}, 'User', 'Name', '', 'customer', false, true, false, NOW(), NOW())
      `;
    }

    // Use robust points earning function
    const result = await earnPointsRobust(
      sql, 
      authPayload.userId, 
      points, 
      orderId, 
      description, 
      orderAmount
    );

    if (!result.success) {
      console.error('❌ Points earning failed:', result.error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          message: 'Failed to earn points',
          error: result.error || 'Unknown error'
        })
      };
    }

    console.log('✅ Points earned successfully:', {
      transactionId: result.transactionId,
      pointsEarned: points,
      currentPoints: result.currentPoints
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        pointsEarned: points,
        currentPoints: result.currentPoints,
        transactionId: result.transactionId,
        message: `Successfully earned ${points} points! Your new total is ${result.currentPoints} points.`
      })
    };

  } catch (error) {
    console.error('❌ Earn Points API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Failed to earn points',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
