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
        console.log('✅ Supabase user ID:', supabaseUserId);
        
        // Return the Supabase user ID as the userId for now
        // We'll need to create a proper mapping later
        return {
          userId: parseInt(supabaseUserId.replace(/-/g, '').substring(0, 8), 16) || 1, // Convert to number
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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
    
    console.log('🔍 Getting rewards for user ID:', authPayload.userId);
    
    // First, ensure the user exists in the users table
    const userExists = await sql`
      SELECT id FROM users WHERE id = ${authPayload.userId}
    `;
    
    if (userExists.length === 0) {
      console.log('👤 User not found, creating new user');
      // Create a new user for this Supabase user
      const newUser = await sql`
        INSERT INTO users (id, username, email, first_name, last_name, password, role, is_admin, is_active, marketing_opt_in, created_at)
        VALUES (${authPayload.userId}, ${authPayload.username}, ${authPayload.username}, 'User', 'Name', '', 'customer', false, true, false, NOW())
        RETURNING id
      `;
      console.log('✅ Created new user:', newUser[0].id);
    }
    
    // Get user's rewards data
    const userRewards = await sql`
      SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'earned' THEN points_earned ELSE 0 END), 0) as total_points_earned,
        COALESCE(SUM(CASE WHEN transaction_type = 'redeemed' THEN points_redeemed ELSE 0 END), 0) as total_points_redeemed,
        COALESCE(SUM(CASE WHEN transaction_type = 'earned' THEN points_earned ELSE 0 END), 0) -
        COALESCE(SUM(CASE WHEN transaction_type = 'redeemed' THEN points_redeemed ELSE 0 END), 0) as current_points,
        MAX(created_at) as last_earned_at
      FROM user_points
      WHERE user_id = ${authPayload.userId}
    `;

    const rewardsData = userRewards[0] || {
      total_points_earned: 0,
      total_points_redeemed: 0,
      current_points: 0,
      last_earned_at: null
    };

    console.log('✅ Rewards data:', rewardsData);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        points: rewardsData.current_points,
        totalPointsEarned: rewardsData.total_points_earned,
        totalPointsRedeemed: rewardsData.total_points_redeemed,
        lastEarnedAt: rewardsData.last_earned_at
      })
    };

  } catch (error) {
    console.error('❌ User Rewards API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Failed to fetch user rewards',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
