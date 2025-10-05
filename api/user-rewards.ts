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
  // Check for JWT token in Authorization header first
  const authHeader = event.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // If no Authorization header, check for auth-token cookie
  if (!token) {
    const cookies = event.headers.cookie;
    if (cookies) {
      const authCookie = cookies.split(';').find((c: string) => c.trim().startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }
  }

  if (!token) {
    return null;
  }

  try {
    // First try to decode as Supabase JWT token
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      console.log('🔍 Supabase token payload:', payload);

      if (payload.iss && payload.iss.includes('supabase')) {
        // This is a Supabase token, extract user ID
        const supabaseUserId = payload.sub;
        console.log('✅ Supabase user ID from token:', supabaseUserId);
        console.log('📧 Email from token:', payload.email);

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
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
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

    console.log('🔍 Getting rewards for user:', authPayload.isSupabase ? authPayload.supabaseUserId : authPayload.userId);

    let rewardsData;

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

    if (hasUnifiedAccount) {
      // Handle unified user account (preferred system)
      console.log('🔑 Processing unified user rewards:', unifiedUserId);

      // Get user's current points - check BOTH user_id AND supabase_user_id
      console.log('🔍 Querying user_points for userId:', unifiedUserId);
      console.log('🔍 Also checking for supabase_user_id:', authPayload.supabaseUserId);

      // Try both columns since points might be under either ID
      const userPointsRecord = await sql`
        SELECT
          points,
          total_earned,
          total_redeemed,
          last_earned_at,
          updated_at
        FROM user_points
        WHERE user_id = ${unifiedUserId} OR supabase_user_id = ${authPayload.supabaseUserId || null}
      `;
      console.log('🔍 User points query result:', userPointsRecord.length, 'records found');

      if (userPointsRecord.length > 0) {
        console.log('📊 Aggregated points data:', userPointsRecord[0]);
      }

      if (userPointsRecord.length === 0) {
        console.log('📋 No user_points record found for unified user, creating one');

        // Create user_points record for unified user
        await sql`
          INSERT INTO user_points (user_id, points, total_earned, total_redeemed, created_at, updated_at)
          VALUES (${unifiedUserId}, 0, 0, 0, NOW(), NOW())
          ON CONFLICT (user_id) DO NOTHING
        `;

        // Create initial transaction
        await sql`
          INSERT INTO points_transactions (user_id, type, points, description, created_at)
          VALUES (${unifiedUserId}, 'signup', 0, 'Unified user account points initialized', NOW())
        `;

        console.log('✅ Initialized unified user points');

        rewardsData = {
          points: 0,
          total_earned: 0,
          total_redeemed: 0,
          last_earned_at: null,
          updated_at: null
        };
      } else {
        rewardsData = userPointsRecord[0];
        console.log('✅ Retrieved unified user rewards data:', rewardsData);
      }

    } else if (authPayload.isSupabase) {
      // Handle legacy Supabase-only users (fallback)
      console.log('🔑 Processing legacy Supabase user rewards:', authPayload.supabaseUserId);

      // Get user's current points using supabase_user_id
      const userPointsRecord = await sql`
        SELECT
          points,
          total_earned,
          total_redeemed,
          last_earned_at,
          updated_at
        FROM user_points
        WHERE supabase_user_id = ${authPayload.supabaseUserId}
      `;

      if (userPointsRecord.length === 0) {
        console.log('📋 No user_points record found for Supabase user, creating one');

        // Create user_points record for Supabase user
        await sql`
          INSERT INTO user_points (supabase_user_id, points, total_earned, total_redeemed, created_at, updated_at)
          VALUES (${authPayload.supabaseUserId}, 0, 0, 0, NOW(), NOW())
          ON CONFLICT (supabase_user_id) DO NOTHING
        `;

        // Create initial transaction
        await sql`
          INSERT INTO points_transactions (supabase_user_id, type, points, description, created_at)
          VALUES (${authPayload.supabaseUserId}, 'signup', 0, 'Supabase user account points initialized', NOW())
        `;

        console.log('✅ Initialized Supabase user points');

        rewardsData = {
          points: 0,
          total_earned: 0,
          total_redeemed: 0,
          last_earned_at: null,
          updated_at: null
        };
      } else {
        rewardsData = userPointsRecord[0];
        console.log('✅ Retrieved Supabase user rewards data:', rewardsData);
      }

    } else {
      // Handle legacy user (traditional authentication)
      console.log('🔑 Processing legacy user rewards:', authPayload.userId);

      // First, ensure the user exists in the users table
      const userExists = await sql`
        SELECT id FROM users WHERE id = ${authPayload.userId}
      `;

      if (userExists.length === 0) {
        console.log('👤 Legacy user not found, creating new user');

        // Create a new user for this legacy user
        await sql`
          INSERT INTO users (
            id, username, email, first_name, last_name, password, role,
            is_admin, is_active, marketing_opt_in, rewards, created_at, updated_at
          ) VALUES (
            ${authPayload.userId}, ${authPayload.username}, ${authPayload.username},
            'User', 'Name', 'AUTH_USER', 'customer', false, true, false, 0, NOW(), NOW()
          )
          ON CONFLICT (id) DO NOTHING
        `;
        console.log('✅ Created new legacy user');

        // Initialize user_points record
        await sql`
          INSERT INTO user_points (user_id, points, total_earned, total_redeemed, created_at, updated_at)
          VALUES (${authPayload.userId}, 0, 0, 0, NOW(), NOW())
          ON CONFLICT (user_id) DO NOTHING
        `;

        // Create initial transaction
        await sql`
          INSERT INTO points_transactions (user_id, type, points, description, created_at)
          VALUES (${authPayload.userId}, 'signup', 0, 'Legacy user account created with 0 points', NOW())
        `;

        console.log('✅ Initialized legacy user points');
      }

      // Get user's current points using user_id
      const userPointsRecord = await sql`
        SELECT
          points,
          total_earned,
          total_redeemed,
          last_earned_at,
          updated_at
        FROM user_points
        WHERE user_id = ${authPayload.userId}
      `;

      // If no user_points record exists, create one
      if (userPointsRecord.length === 0) {
        console.log('📋 No user_points record found for legacy user, creating one');

        await sql`
          INSERT INTO user_points (user_id, points, total_earned, total_redeemed, created_at, updated_at)
          VALUES (${authPayload.userId}, 0, 0, 0, NOW(), NOW())
          ON CONFLICT (user_id) DO NOTHING
        `;

        // Also create initial transaction
        await sql`
          INSERT INTO points_transactions (user_id, type, points, description, created_at)
          VALUES (${authPayload.userId}, 'signup', 0, 'Legacy user account created with 0 points', NOW())
        `;

        rewardsData = {
          points: 0,
          total_earned: 0,
          total_redeemed: 0,
          last_earned_at: null,
          updated_at: null
        };
      } else {
        rewardsData = userPointsRecord[0];
        console.log('✅ Retrieved legacy user rewards data:', rewardsData);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        points: rewardsData.points || 0,
        totalPointsEarned: rewardsData.total_earned || 0,
        totalPointsRedeemed: rewardsData.total_redeemed || 0,
        lastEarnedAt: rewardsData.last_earned_at,
        userType: authPayload.isSupabase ? 'google' : 'legacy',
        userId: hasUnifiedAccount ? unifiedUserId : (authPayload.isSupabase ? authPayload.supabaseUserId : authPayload.userId)
      })
    };

  } catch (error) {
    console.error('❌ User Rewards API error:', error);

    // Return default values even on error to prevent page crashes
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        points: 0,
        totalPointsEarned: 0,
        totalPointsRedeemed: 0,
        lastEarnedAt: null,
        userType: 'unknown',
        userId: null
      })
    };
  }
};