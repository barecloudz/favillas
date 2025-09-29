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
      console.log('Not a Supabase token, trying JWT verification:', supabaseError);
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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

  if (event.httpMethod !== 'GET') {
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

    console.log('🎁 Getting redemption history for user:', {
      userId: authPayload.userId,
      supabaseUserId: authPayload.supabaseUserId,
      isSupabase: authPayload.isSupabase
    });

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

    // Get user's redemption history from user_points_redemptions table
    let redemptions;

    if (hasUnifiedAccount && unifiedUserId) {
      // UNIFIED: Use user_id for redemption lookup (works for both legacy users and unified Supabase users)
      console.log('🔍 Using unified account lookup for redemptions with user_id:', unifiedUserId);
      redemptions = await sql`
        SELECT
          upr.*,
          r.name as reward_name,
          r.description as reward_description,
          r.points_required
        FROM user_points_redemptions upr
        LEFT JOIN rewards r ON upr.reward_id = r.id
        WHERE upr.user_id = ${unifiedUserId}
        ORDER BY upr.created_at DESC
      `;
    } else if (authPayload.isSupabase) {
      // Fallback: Supabase user without unified account
      console.log('🔍 Using Supabase-only lookup for redemptions');
      redemptions = await sql`
        SELECT
          upr.*,
          r.name as reward_name,
          r.description as reward_description,
          r.points_required
        FROM user_points_redemptions upr
        LEFT JOIN rewards r ON upr.reward_id = r.id
        WHERE upr.supabase_user_id = ${authPayload.supabaseUserId}
        ORDER BY upr.created_at DESC
      `;
    } else {
      // Legacy user - query using user_id
      console.log('🔍 Using legacy user lookup for redemptions');
      redemptions = await sql`
        SELECT
          upr.*,
          r.name as reward_name,
          r.description as reward_description,
          r.points_required
        FROM user_points_redemptions upr
        LEFT JOIN rewards r ON upr.reward_id = r.id
        WHERE upr.user_id = ${authPayload.userId}
        ORDER BY upr.created_at DESC
      `;
    }

    // Categorize redemptions
    const now = new Date();
    const categorizedRedemptions = {
      recent: [],
      active: [],
      used: [],
      expired: []
    };

    redemptions.forEach((redemption: any) => {
      const expiresAt = redemption.expires_at ? new Date(redemption.expires_at) : null;
      const createdAt = new Date(redemption.created_at);
      const isRecent = (now.getTime() - createdAt.getTime()) < (7 * 24 * 60 * 60 * 1000); // Within 7 days

      if (isRecent) {
        categorizedRedemptions.recent.push(redemption);
      }

      if (redemption.is_used) {
        categorizedRedemptions.used.push(redemption);
      } else if (expiresAt && expiresAt < now) {
        categorizedRedemptions.expired.push(redemption);
      } else {
        categorizedRedemptions.active.push(redemption);
      }
    });

    console.log(`✅ Found ${redemptions.length} redemptions for user ${authPayload.userId}`);
    console.log(`   Recent: ${categorizedRedemptions.recent.length}`);
    console.log(`   Active: ${categorizedRedemptions.active.length}`);
    console.log(`   Used: ${categorizedRedemptions.used.length}`);
    console.log(`   Expired: ${categorizedRedemptions.expired.length}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        redemptions: categorizedRedemptions,
        summary: {
          total: redemptions.length,
          recent: categorizedRedemptions.recent.length,
          active: categorizedRedemptions.active.length,
          used: categorizedRedemptions.used.length,
          expired: categorizedRedemptions.expired.length
        }
      })
    };

  } catch (error: any) {
    console.error('❌ User redemptions API error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};