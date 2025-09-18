// Shared authentication helper for both legacy and Supabase users
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: number | null;
  supabaseUserId: string | null;
  username: string;
  role: string;
  isSupabase: boolean;
}

export function authenticateToken(event: any): AuthPayload | null {
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

// Helper to get user points for both legacy and Supabase users
export async function getUserPoints(sql: any, authPayload: AuthPayload) {
  if (authPayload.isSupabase && authPayload.supabaseUserId) {
    // Get points for Supabase user
    const points = await sql`
      SELECT points, total_earned, total_redeemed, last_earned_at, created_at, updated_at
      FROM user_points
      WHERE supabase_user_id = ${authPayload.supabaseUserId}
    `;
    return points.length > 0 ? points[0] : null;
  } else if (!authPayload.isSupabase && authPayload.userId) {
    // Get points for legacy user
    const points = await sql`
      SELECT points, total_earned, total_redeemed, last_earned_at, created_at, updated_at
      FROM user_points
      WHERE user_id = ${authPayload.userId}
    `;
    return points.length > 0 ? points[0] : null;
  }
  return null;
}

// Helper to get user transactions for both legacy and Supabase users
export async function getUserTransactions(sql: any, authPayload: AuthPayload) {
  if (authPayload.isSupabase && authPayload.supabaseUserId) {
    // Get transactions for Supabase user
    return await sql`
      SELECT * FROM points_transactions
      WHERE supabase_user_id = ${authPayload.supabaseUserId}
      ORDER BY created_at DESC
    `;
  } else if (!authPayload.isSupabase && authPayload.userId) {
    // Get transactions for legacy user
    return await sql`
      SELECT * FROM points_transactions
      WHERE user_id = ${authPayload.userId}
      ORDER BY created_at DESC
    `;
  }
  return [];
}