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

// Points recovery and synchronization functions
async function syncUserPoints(
  sql: any, 
  userId: number
): Promise<{ success: boolean; message: string; changes?: any; error?: string }> {
  try {
    const result = await sql.begin(async (sql: any) => {
      // Get current transaction totals
      const transactionTotals = await sql`
        SELECT
          COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0) as total_earned,
          COALESCE(SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END), 0) as total_redeemed
        FROM points_transactions
        WHERE user_id = ${userId}
      `;

      const calculatedPoints = transactionTotals[0].total_earned - transactionTotals[0].total_redeemed;

      // Get current user_points record
      const userPointsRecord = await sql`
        SELECT id, points, total_earned, total_redeemed, updated_at
        FROM user_points
        WHERE user_id = ${userId}
      `;

      const changes = {
        before: userPointsRecord[0] || null,
        after: null,
        synchronized: false
      };

      if (userPointsRecord.length === 0) {
        // Create new user_points record
        await sql`
          INSERT INTO user_points (user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
          VALUES (${userId}, ${calculatedPoints}, ${transactionTotals[0].total_earned}, ${transactionTotals[0].total_redeemed}, NOW(), NOW(), NOW())
        `;
        changes.after = {
          points: calculatedPoints,
          total_earned: transactionTotals[0].total_earned,
          total_redeemed: transactionTotals[0].total_redeemed
        };
        changes.synchronized = true;
      } else {
        const currentRecord = userPointsRecord[0];
        
        // Check if synchronization is needed
        if (currentRecord.points !== calculatedPoints || 
            currentRecord.total_earned !== transactionTotals[0].total_earned ||
            currentRecord.total_redeemed !== transactionTotals[0].total_redeemed) {
          
          // Update user_points record
          await sql`
            UPDATE user_points
            SET 
              points = ${calculatedPoints},
              total_earned = ${transactionTotals[0].total_earned},
              total_redeemed = ${transactionTotals[0].total_redeemed},
              updated_at = NOW()
            WHERE user_id = ${userId}
          `;
          
          changes.after = {
            points: calculatedPoints,
            total_earned: transactionTotals[0].total_earned,
            total_redeemed: transactionTotals[0].total_redeemed
          };
          changes.synchronized = true;
        }
      }

      // Also sync legacy rewards column
      await sql`
        UPDATE users 
        SET rewards = ${calculatedPoints}, updated_at = NOW()
        WHERE id = ${userId}
      `;

      return {
        calculatedPoints,
        changes
      };
    });

    return {
      success: true,
      message: result.changes.synchronized ? 'Points synchronized successfully' : 'Points already synchronized',
      changes: result.changes
    };

  } catch (error) {
    console.error('❌ Points synchronization failed:', error);
    return {
      success: false,
      message: 'Points synchronization failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function recoverPointsFromTransactions(
  sql: any, 
  userId: number
): Promise<{ success: boolean; message: string; recoveredData?: any; error?: string }> {
  try {
    // Get all transactions for this user
    const transactions = await sql`
      SELECT
        id,
        order_id,
        type,
        points,
        description,
        order_amount,
        created_at
      FROM points_transactions
      WHERE user_id = ${userId}
      ORDER BY created_at ASC
    `;

    if (transactions.length === 0) {
      return {
        success: false,
        message: 'No transaction history found for recovery',
        error: 'No transactions to recover from'
      };
    }

    // Calculate points from transactions
    let totalEarned = 0;
    let totalRedeemed = 0;
    const transactionHistory = [];

    for (const transaction of transactions) {
      if (transaction.type === 'earned') {
        totalEarned += transaction.points;
      } else if (transaction.type === 'redeemed') {
        totalRedeemed += transaction.points;
      }
      
      transactionHistory.push({
        id: transaction.id,
        type: transaction.type,
        points: transaction.points,
        description: transaction.description,
        createdAt: transaction.created_at
      });
    }

    const calculatedPoints = totalEarned - totalRedeemed;

    // Update user_points table with recovered data
    await sql.begin(async (sql: any) => {
      // Ensure user_points record exists
      const userPointsExists = await sql`
        SELECT id FROM user_points WHERE user_id = ${userId}
      `;

      if (userPointsExists.length === 0) {
        await sql`
          INSERT INTO user_points (user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
          VALUES (${userId}, ${calculatedPoints}, ${totalEarned}, ${totalRedeemed}, NOW(), NOW(), NOW())
        `;
      } else {
        await sql`
          UPDATE user_points
          SET 
            points = ${calculatedPoints},
            total_earned = ${totalEarned},
            total_redeemed = ${totalRedeemed},
            updated_at = NOW()
          WHERE user_id = ${userId}
        `;
      }

      // Update legacy rewards column
      await sql`
        UPDATE users 
        SET rewards = ${calculatedPoints}, updated_at = NOW()
        WHERE id = ${userId}
      `;
    });

    return {
      success: true,
      message: `Successfully recovered points from ${transactions.length} transactions`,
      recoveredData: {
        totalTransactions: transactions.length,
        totalEarned,
        totalRedeemed,
        calculatedPoints,
        transactionHistory: transactionHistory.slice(0, 10) // First 10 transactions
      }
    };

  } catch (error) {
    console.error('❌ Points recovery failed:', error);
    return {
      success: false,
      message: 'Points recovery failed',
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

  // Only allow admin users to perform recovery operations
  if (authPayload.role !== 'admin' && authPayload.role !== 'super_admin') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Admin access required for recovery operations' })
    };
  }

  try {
    const sql = getDB();
    const body = JSON.parse(event.body || '{}');
    const { action, userId: targetUserId } = body;

    // Use targetUserId if provided (for admin operations), otherwise use authenticated user
    const userId = targetUserId || authPayload.userId;

    console.log('🔧 Points recovery operation:', {
      action,
      userId,
      performedBy: authPayload.userId,
      isAdmin: authPayload.role === 'admin' || authPayload.role === 'super_admin'
    });

    let result;

    switch (action) {
      case 'sync':
        result = await syncUserPoints(sql, userId);
        break;
      
      case 'recover':
        result = await recoverPointsFromTransactions(sql, userId);
        break;
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid action. Supported actions: sync, recover',
            received: action
          })
        };
    }

    if (!result.success) {
      console.error('❌ Recovery operation failed:', result.error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          message: 'Recovery operation failed',
          error: result.error || 'Unknown error'
        })
      };
    }

    console.log('✅ Recovery operation completed:', {
      action,
      userId,
      message: result.message
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        action,
        userId,
        message: result.message,
        ...result
      })
    };

  } catch (error) {
    console.error('❌ Points Recovery API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Failed to perform recovery operation',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
