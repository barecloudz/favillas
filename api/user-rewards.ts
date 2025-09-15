import { Handler } from '@netlify/functions';
import postgres from 'postgres';

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
    
    // Get user's rewards data
    const userRewards = await sql`
      SELECT 
        COALESCE(SUM(points_earned), 0) as total_points_earned,
        COALESCE(SUM(points_redeemed), 0) as total_points_redeemed,
        COALESCE(SUM(points_earned), 0) - COALESCE(SUM(points_redeemed), 0) as current_points,
        MAX(created_at) as last_earned_at
      FROM rewards 
      WHERE user_id = ${authPayload.userId}
    `;

    const rewardsData = userRewards[0] || {
      total_points_earned: 0,
      total_points_redeemed: 0,
      current_points: 0,
      last_earned_at: null
    };

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
    console.error('User Rewards API error:', error);
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
