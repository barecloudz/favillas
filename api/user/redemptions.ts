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
    // First try to decode as Supabase JWT token
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      console.log('🔍 Supabase token payload:', payload);

      if (payload.iss && payload.iss.includes('supabase')) {
        // This is a Supabase token, extract user ID
        const supabaseUserId = payload.sub;
        console.log('✅ Supabase user ID:', supabaseUserId);

        // Convert Supabase UUID to numeric user ID using same logic as user-rewards API
        const numericUserId = parseInt(supabaseUserId.replace(/-/g, '').substring(0, 8), 16);
        console.log('✅ Converted to numeric ID:', numericUserId);

        // Return the Supabase user ID as the userId for now
        // We'll need to create a proper mapping later
        return {
          userId: parseInt(supabaseUserId.replace(/-/g, '').substring(0, 8), 16) || 1, // Convert to number
          username: payload.email || 'supabase_user',
          role: 'customer'
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

    console.log('🎁 Getting redemption history for user:', { userId: authPayload.userId });

    // Get user's redemption history (vouchers created from points) - use numeric user ID
    const redemptions = await sql`
      SELECT
        uv.*,
        r.name as reward_name,
        r.description as reward_description,
        r.points_required
      FROM user_vouchers uv
      LEFT JOIN rewards r ON uv.reward_id = r.id
      WHERE uv.user_id = ${authPayload.userId}
      ORDER BY uv.created_at DESC
    `;

    // Categorize redemptions
    const now = new Date();
    const categorizedRedemptions = {
      recent: [],
      active: [],
      used: [],
      expired: []
    };

    redemptions.forEach((redemption: any) => {
      const expiresAt = new Date(redemption.expires_at);
      const createdAt = new Date(redemption.created_at);
      const isRecent = (now.getTime() - createdAt.getTime()) < (7 * 24 * 60 * 60 * 1000); // Within 7 days

      if (isRecent) {
        categorizedRedemptions.recent.push(redemption);
      }

      if (redemption.status === 'used') {
        categorizedRedemptions.used.push(redemption);
      } else if (expiresAt < now) {
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