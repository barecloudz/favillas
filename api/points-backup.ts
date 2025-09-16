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

// Comprehensive points backup system
async function createPointsBackup(
  sql: any, 
  userId?: number
): Promise<{ success: boolean; backupData?: any; error?: string }> {
  try {
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0',
      userId: userId || 'all',
      data: {
        users: [],
        userPoints: [],
        pointsTransactions: [],
        userPointsRedemptions: [],
        summary: {}
      }
    };

    if (userId) {
      // Backup specific user data
      const user = await sql`
        SELECT id, username, email, first_name, last_name, rewards, created_at, updated_at
        FROM users
        WHERE id = ${userId}
      `;

      const userPoints = await sql`
        SELECT *
        FROM user_points
        WHERE user_id = ${userId}
      `;

      const transactions = await sql`
        SELECT *
        FROM points_transactions
        WHERE user_id = ${userId}
        ORDER BY created_at ASC
      `;

      const redemptions = await sql`
        SELECT *
        FROM user_points_redemptions
        WHERE user_id = ${userId}
        ORDER BY created_at ASC
      `;

      backupData.data.users = user;
      backupData.data.userPoints = userPoints;
      backupData.data.pointsTransactions = transactions;
      backupData.data.userPointsRedemptions = redemptions;

      // Calculate summary
      const totalEarned = transactions.reduce((sum, t) => sum + (t.type === 'earned' ? t.points : 0), 0);
      const totalRedeemed = transactions.reduce((sum, t) => sum + (t.type === 'redeemed' ? t.points : 0), 0);
      
      backupData.data.summary = {
        totalEarned,
        totalRedeemed,
        currentPoints: totalEarned - totalRedeemed,
        totalTransactions: transactions.length,
        totalRedemptions: redemptions.length,
        firstTransaction: transactions[0]?.created_at || null,
        lastTransaction: transactions[transactions.length - 1]?.created_at || null
      };

    } else {
      // Backup all users data (admin only)
      const users = await sql`
        SELECT id, username, email, first_name, last_name, rewards, created_at, updated_at
        FROM users
        WHERE rewards > 0 OR id IN (SELECT DISTINCT user_id FROM user_points)
        ORDER BY id
      `;

      const userPoints = await sql`
        SELECT *
        FROM user_points
        ORDER BY user_id, created_at
      `;

      const transactions = await sql`
        SELECT *
        FROM points_transactions
        ORDER BY user_id, created_at
      `;

      const redemptions = await sql`
        SELECT *
        FROM user_points_redemptions
        ORDER BY user_id, created_at
      `;

      backupData.data.users = users;
      backupData.data.userPoints = userPoints;
      backupData.data.pointsTransactions = transactions;
      backupData.data.userPointsRedemptions = redemptions;

      // Calculate global summary
      const totalEarned = transactions.reduce((sum, t) => sum + (t.type === 'earned' ? t.points : 0), 0);
      const totalRedeemed = transactions.reduce((sum, t) => sum + (t.type === 'redeemed' ? t.points : 0), 0);
      
      backupData.data.summary = {
        totalUsers: users.length,
        totalEarned,
        totalRedeemed,
        currentPoints: totalEarned - totalRedeemed,
        totalTransactions: transactions.length,
        totalRedemptions: redemptions.length,
        firstTransaction: transactions[0]?.created_at || null,
        lastTransaction: transactions[transactions.length - 1]?.created_at || null
      };
    }

    return {
      success: true,
      backupData
    };

  } catch (error) {
    console.error('❌ Points backup failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function restorePointsFromBackup(
  sql: any, 
  backupData: any
): Promise<{ success: boolean; message: string; restoredData?: any; error?: string }> {
  try {
    const result = await sql.begin(async (sql: any) => {
      const restoredData = {
        usersRestored: 0,
        transactionsRestored: 0,
        redemptionsRestored: 0,
        errors: []
      };

      // Restore users data
      for (const user of backupData.data.users) {
        try {
          // Check if user exists
          const existingUser = await sql`
            SELECT id FROM users WHERE id = ${user.id}
          `;

          if (existingUser.length === 0) {
            await sql`
              INSERT INTO users (id, username, email, first_name, last_name, rewards, created_at, updated_at)
              VALUES (${user.id}, ${user.username}, ${user.email}, ${user.first_name}, ${user.last_name}, ${user.rewards}, ${user.created_at}, ${user.updated_at})
            `;
            restoredData.usersRestored++;
          }
        } catch (error) {
          restoredData.errors.push(`User ${user.id}: ${error}`);
        }
      }

      // Restore user_points data
      for (const userPoint of backupData.data.userPoints) {
        try {
          // Check if user_points record exists
          const existingUserPoints = await sql`
            SELECT id FROM user_points WHERE user_id = ${userPoint.user_id}
          `;

          if (existingUserPoints.length === 0) {
            await sql`
              INSERT INTO user_points (user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
              VALUES (${userPoint.user_id}, ${userPoint.points}, ${userPoint.total_earned}, ${userPoint.total_redeemed}, ${userPoint.last_earned_at}, ${userPoint.created_at}, ${userPoint.updated_at})
            `;
          }
        } catch (error) {
          restoredData.errors.push(`UserPoints ${userPoint.user_id}: ${error}`);
        }
      }

      // Restore transactions
      for (const transaction of backupData.data.pointsTransactions) {
        try {
          // Check if transaction exists
          const existingTransaction = await sql`
            SELECT id FROM points_transactions WHERE id = ${transaction.id}
          `;

          if (existingTransaction.length === 0) {
            await sql`
              INSERT INTO points_transactions (id, user_id, order_id, type, points, description, order_amount, created_at)
              VALUES (${transaction.id}, ${transaction.user_id}, ${transaction.order_id}, ${transaction.type}, ${transaction.points}, ${transaction.description}, ${transaction.order_amount}, ${transaction.created_at})
            `;
            restoredData.transactionsRestored++;
          }
        } catch (error) {
          restoredData.errors.push(`Transaction ${transaction.id}: ${error}`);
        }
      }

      // Restore redemptions
      for (const redemption of backupData.data.userPointsRedemptions) {
        try {
          // Check if redemption exists
          const existingRedemption = await sql`
            SELECT id FROM user_points_redemptions WHERE id = ${redemption.id}
          `;

          if (existingRedemption.length === 0) {
            await sql`
              INSERT INTO user_points_redemptions (id, user_id, points_reward_id, order_id, points_spent, is_used, used_at, expires_at, created_at)
              VALUES (${redemption.id}, ${redemption.user_id}, ${redemption.points_reward_id}, ${redemption.order_id}, ${redemption.points_spent}, ${redemption.is_used}, ${redemption.used_at}, ${redemption.expires_at}, ${redemption.created_at})
            `;
            restoredData.redemptionsRestored++;
          }
        } catch (error) {
          restoredData.errors.push(`Redemption ${redemption.id}: ${error}`);
        }
      }

      return restoredData;
    });

    return {
      success: true,
      message: `Backup restored successfully. Users: ${result.usersRestored}, Transactions: ${result.transactionsRestored}, Redemptions: ${result.redemptionsRestored}`,
      restoredData: result
    };

  } catch (error) {
    console.error('❌ Points restore failed:', error);
    return {
      success: false,
      message: 'Points restore failed',
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
    const { action, userId, backupData } = body;

    console.log('💾 Points backup operation:', {
      action,
      userId: userId || 'all',
      performedBy: authPayload.userId,
      isAdmin: authPayload.role === 'admin' || authPayload.role === 'super_admin'
    });

    let result;

    switch (action) {
      case 'create':
        // Only allow admin users to create backups
        if (authPayload.role !== 'admin' && authPayload.role !== 'super_admin') {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Admin access required for backup operations' })
          };
        }
        result = await createPointsBackup(sql, userId);
        break;
      
      case 'restore':
        // Only allow admin users to restore backups
        if (authPayload.role !== 'admin' && authPayload.role !== 'super_admin') {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Admin access required for restore operations' })
          };
        }
        
        if (!backupData) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Backup data is required for restore operation' })
          };
        }
        
        result = await restorePointsFromBackup(sql, backupData);
        break;
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid action. Supported actions: create, restore',
            received: action
          })
        };
    }

    if (!result.success) {
      console.error('❌ Backup operation failed:', result.error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          message: 'Backup operation failed',
          error: result.error || 'Unknown error'
        })
      };
    }

    console.log('✅ Backup operation completed:', {
      action,
      userId: userId || 'all',
      message: result.message
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        action,
        userId: userId || 'all',
        message: result.message,
        ...result
      })
    };

  } catch (error) {
    console.error('❌ Points Backup API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Failed to perform backup operation',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
