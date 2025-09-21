import jwt from 'jsonwebtoken';

/**
 * Authentication payload interface for consistent type checking
 */
export interface AuthPayload {
  userId: number | null;
  supabaseUserId: string | null;
  username: string;
  role: string;
  isSupabase: boolean;
  // Additional fields for Google users
  email?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Netlify Functions event interface for headers
 */
export interface NetlifyEvent {
  headers: {
    authorization?: string;
    cookie?: string;
    origin?: string;
    [key: string]: string | undefined;
  };
  httpMethod: string;
  path: string;
  body?: string;
}

/**
 * Centralized authentication function that handles both Supabase and legacy JWT tokens
 * @param event - Netlify Functions event object
 * @returns AuthPayload if authentication successful, null otherwise
 */
export function authenticateToken(event: NetlifyEvent): AuthPayload | null {
  // Check for JWT token in Authorization header first
  const authHeader = event.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // If no Authorization header, check for auth-token cookie
  if (!token) {
    const cookies = event.headers.cookie;
    if (cookies) {
      // Try multiple cookie names for backwards compatibility
      const cookiesToTry = ['auth-token=', 'token=', 'jwt=', 'session='];

      for (const cookieName of cookiesToTry) {
        const authCookie = cookies.split(';').find((c: string) => c.trim().startsWith(cookieName));
        if (authCookie) {
          token = authCookie.split('=')[1];
          console.log(`🔍 Found token in cookie: ${cookieName.slice(0, -1)}`);
          break;
        }
      }

      if (!token) {
        console.log('❌ No auth token found in cookies:', cookies.split(';').map(c => c.trim().split('=')[0]));
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

      if (payload.iss && payload.iss.includes('supabase')) {
        // This is a Supabase token, extract user ID and metadata
        const supabaseUserId = payload.sub;
        const userMetadata = payload.user_metadata || {};

        console.log('🔍 Google user metadata extracted:', {
          email: payload.email,
          fullName: userMetadata.full_name,
          firstName: userMetadata.name?.split(' ')[0],
          lastName: userMetadata.name?.split(' ').slice(1).join(' '),
          metadataKeys: Object.keys(userMetadata)
        });

        // For Supabase users, return the UUID and extracted metadata
        return {
          userId: null, // No integer user ID for Supabase users
          supabaseUserId: supabaseUserId,
          username: payload.email || 'supabase_user',
          role: 'customer',
          isSupabase: true,
          // Extract Google user information from metadata
          email: payload.email,
          fullName: userMetadata.full_name || userMetadata.name,
          firstName: userMetadata.name?.split(' ')[0] || userMetadata.full_name?.split(' ')[0],
          lastName: userMetadata.name?.split(' ').slice(1).join(' ') || userMetadata.full_name?.split(' ').slice(1).join(' ')
        };
      }
    } catch (supabaseError) {
      console.log('Not a Supabase token, trying JWT verification');
    }

    // Fallback to our JWT verification
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
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

/**
 * Checks if user has required role for authorization
 * @param authPayload - Authentication payload from authenticateToken
 * @param requiredRoles - Array of roles that are allowed access
 * @returns true if user has required role, false otherwise
 */
export function hasRequiredRole(authPayload: AuthPayload | null, requiredRoles: string[]): boolean {
  if (!authPayload) return false;
  return requiredRoles.includes(authPayload.role);
}

/**
 * Checks if user is admin or has staff privileges
 * @param authPayload - Authentication payload from authenticateToken
 * @returns true if user is admin/staff, false otherwise
 */
export function isStaff(authPayload: AuthPayload | null): boolean {
  if (!authPayload) return false;
  return ['admin', 'kitchen', 'manager'].includes(authPayload.role);
}

/**
 * Gets user identifier based on authentication type
 * @param authPayload - Authentication payload from authenticateToken
 * @returns user ID (number for legacy, string for Supabase) or null
 */
export function getUserId(authPayload: AuthPayload | null): number | string | null {
  if (!authPayload) return null;
  return authPayload.isSupabase ? authPayload.supabaseUserId : authPayload.userId;
}

/**
 * Creates user identifier object for database queries
 * @param authPayload - Authentication payload from authenticateToken
 * @returns object with userId and supabaseUserId fields
 */
export function getUserIdentifiers(authPayload: AuthPayload | null): {
  userId: number | null;
  supabaseUserId: string | null;
} {
  if (!authPayload) {
    return { userId: null, supabaseUserId: null };
  }

  return {
    userId: authPayload.isSupabase ? null : authPayload.userId,
    supabaseUserId: authPayload.isSupabase ? authPayload.supabaseUserId : null
  };
}