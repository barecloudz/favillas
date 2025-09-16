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

// Comprehensive points audit function with recovery capabilities
async function getPointsAudit(
  sql: any, 
  userId: number, 
  limit: number = 100,
  includeRecoveryData: boolean = false
): Promise<{
  success: boolean;
  auditData?: any;
  error?: string;
}> {
  try {
    // Get comprehensive points summary
    const summary = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0) as total_points_earned,
        COALESCE(SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END), 0) as total_points_redeemed,
        COALESCE(SUM(CASE WHEN type = 'earned' THEN points ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN type = 'redeemed' THEN points ELSE 0 END), 0) as current_points,
        COUNT(*) as total_transactions,
        MIN(created_at) as first_transaction,
        MAX(created_at) as last_transaction
      FROM points_transactions
      WHERE user_id = ${userId}
    `;

    // Get detailed transaction history
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
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    // Get user_points table data for verification
    const userPointsRecord = await sql`
      SELECT
        id,
        points,
        total_earned,
        total_redeemed,
        last_earned_at,
        created_at,
        updated_at
      FROM user_points
      WHERE user_id = ${userId}
    `;

    // Get legacy rewards data for backup verification
    const legacyRewards = await sql`
      SELECT rewards, updated_at
      FROM users
      WHERE id = ${userId}
    `;

    const auditData = {
      summary: summary[0] || {
        total_points_earned: 0,
        total_points_redeemed: 0,
        current_points: 0,
        total_transactions: 0,
        first_transaction: null,
        last_transaction: null
      },
      transactions: transactions.map(t => ({
        id: t.id,
        orderId: t.order_id,
        type: t.type,
        points: t.points,
        description: t.description,
        orderAmount: t.order_amount,
        createdAt: t.created_at
      })),
      userPointsRecord: userPointsRecord[0] || null,
      legacyRewards: legacyRewards[0] || null,
      dataIntegrity: {
        transactionsMatchUserPoints: false,
        legacyRewardsMatch: false,
        discrepancies: []
      }
    };

    // Data integrity checks
    if (userPointsRecord.length > 0) {
      const userPoints = userPointsRecord[0];
      const calculatedPoints = auditData.summary.total_points_earned - auditData.summary.total_points_redeemed;
      
      auditData.dataIntegrity.transactionsMatchUserPoints = userPoints.points === calculatedPoints;
      
      if (!auditData.dataIntegrity.transactionsMatchUserPoints) {
        auditData.dataIntegrity.discrepancies.push({
          type: 'points_mismatch',
          message: `User points table shows ${userPoints.points} but transactions calculate to ${calculatedPoints}`,
          userPointsValue: userPoints.points,
          calculatedValue: calculatedPoints,
          difference: userPoints.points - calculatedPoints
        });
      }
    }

    if (legacyRewards.length > 0) {
      const legacy = legacyRewards[0];
      auditData.dataIntegrity.legacyRewardsMatch = legacy.rewards === auditData.summary.current_points;
      
      if (!auditData.dataIntegrity.legacyRewardsMatch) {
        auditData.dataIntegrity.discrepancies.push({
          type: 'legacy_rewards_mismatch',
          message: `Legacy rewards column shows ${legacy.rewards} but current points are ${auditData.summary.current_points}`,
          legacyValue: legacy.rewards,
          currentValue: auditData.summary.current_points,
          difference: legacy.rewards - auditData.summary.current_points
        });
      }
    }

    // Include recovery data if requested
    if (includeRecoveryData) {
      // Get all redemptions for recovery analysis
      const redemptions = await sql`
        SELECT
          id,
          points_reward_id,
          points_spent,
          is_used,
          used_at,
          expires_at,
          created_at
        FROM user_points_redemptions
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;

      auditData.recoveryData = {
        redemptions: redemptions.map(r => ({
          id: r.id,
          pointsRewardId: r.points_reward_id,
          pointsSpent: r.points_spent,
          isUsed: r.is_used,
          usedAt: r.used_at,
          expiresAt: r.expires_at,
          createdAt: r.created_at
        })),
        recoveryRecommendations: []
      };

      // Generate recovery recommendations
      if (auditData.dataIntegrity.discrepancies.length > 0) {
        auditData.recoveryData.recoveryRecommendations.push({
          type: 'data_sync',
          priority: 'high',
          message: 'Data discrepancies detected. Recommend running data synchronization.',
          action: 'sync_user_points'
        });
      }

      if (auditData.summary.total_transactions === 0 && auditData.summary.current_points > 0) {
        auditData.recoveryData.recoveryRecommendations.push({
          type: 'missing_transactions',
          priority: 'medium',
          message: 'Points exist but no transaction history found.',
          action: 'create_initial_transaction'
        });
      }
    }

    return {
      success: true,
      auditData
    };

  } catch (error) {
    console.error('❌ Points audit failed:', error);
    return {
      success: false,
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
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
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
    
    // Parse query parameters for GET requests
    const queryParams = event.queryStringParameters || {};
    const limit = parseInt(queryParams.limit || '100');
    const includeRecoveryData = queryParams.includeRecoveryData === 'true';
    
    // Parse body for POST requests (for admin operations)
    let body = {};
    if (event.httpMethod === 'POST') {
      body = JSON.parse(event.body || '{}');
    }
    
    console.log('📊 Getting comprehensive points audit for user:', authPayload.userId, {
      limit,
      includeRecoveryData,
      isAdmin: authPayload.role === 'admin' || authPayload.role === 'super_admin'
    });

    // Use comprehensive points audit function
    const result = await getPointsAudit(
      sql, 
      authPayload.userId, 
      limit,
      includeRecoveryData || authPayload.role === 'admin' || authPayload.role === 'super_admin'
    );

    if (!result.success) {
      console.error('❌ Points audit failed:', result.error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          message: 'Failed to get points audit',
          error: result.error || 'Unknown error'
        })
      };
    }

    console.log('✅ Points audit retrieved successfully:', {
      totalTransactions: result.auditData.summary.total_transactions,
      currentPoints: result.auditData.summary.current_points,
      hasDiscrepancies: result.auditData.dataIntegrity.discrepancies.length > 0,
      hasRecoveryData: !!result.auditData.recoveryData
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        ...result.auditData,
        generatedAt: new Date().toISOString(),
        userId: authPayload.userId
      })
    };

  } catch (error) {
    console.error('❌ Points Audit API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Failed to get points audit',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
