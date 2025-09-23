import * as jwt from 'jsonwebtoken';
const postgres = require('postgres');

// Create a new database connection for each request (serverless-friendly)
function getDB() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  return postgres(databaseUrl, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 5,
    prepare: false,
    keep_alive: false,
  });
}

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
  marketingOptIn?: boolean;
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
export async function authenticateToken(event: NetlifyEvent): Promise<AuthPayload | null> {
  console.log('🔐 authenticateToken called:', {
    hasAuthHeader: !!event.headers.authorization,
    hasCookies: !!event.headers.cookie,
    path: event.path,
    method: event.httpMethod,
    authHeaderPreview: event.headers.authorization ? event.headers.authorization.substring(0, 20) + '...' : 'none'
  });

  // Check for JWT token in Authorization header first
  const authHeader = event.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // If no Authorization header, check for auth-token cookie
  if (!token) {
    const cookies = event.headers.cookie;
    if (cookies) {
      console.log('🍪 Raw cookies received:', cookies);

      // Try multiple cookie names for backwards compatibility
      const cookiesToTry = ['auth-token=', 'token=', 'jwt=', 'session='];

      for (const cookieName of cookiesToTry) {
        const authCookie = cookies.split(';').find((c: string) => c.trim().startsWith(cookieName));
        if (authCookie) {
          token = authCookie.split('=')[1];
          console.log(`🔍 Found token in cookie: ${cookieName.slice(0, -1)}, token length: ${token?.length}`);
          break;
        }
      }

      if (!token) {
        console.log('❌ No auth token found in cookies:', cookies.split(';').map(c => c.trim().split('=')[0]));
      }
    } else {
      console.log('❌ No cookies received in request');
    }
  }

  if (!token) {
    console.log('❌ No authentication token found');
    return null;
  }

  console.log('🔍 Found token, length:', token.length, 'preview:', token.substring(0, 20) + '...');

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

        // Look up user role from database for Supabase users
        let userRole = 'customer';
        let sql;
        try {
          sql = getDB();
          const dbUsers = await sql`
            SELECT role, is_admin
            FROM users
            WHERE supabase_user_id = ${supabaseUserId}
            LIMIT 1
          `;

          if (dbUsers.length > 0) {
            userRole = dbUsers[0].role || 'customer';
            console.log('🔍 Supabase user role from database:', userRole, 'is_admin:', dbUsers[0].is_admin);
          } else {
            console.log('⚠️ No database record found for Supabase user:', supabaseUserId);
          }
        } catch (dbError) {
          console.error('❌ Error looking up Supabase user role:', dbError);
          // Default to customer role on database error
        } finally {
          // Always close the database connection
          if (sql) {
            try {
              await sql.end();
            } catch (closeError) {
              console.error('❌ Error closing database connection:', closeError);
            }
          }
        }

        // For Supabase users, use metadata role if database lookup fails
        const finalRole = userRole !== 'customer' ? userRole : (userMetadata.role || 'customer');

        console.log('✅ Supabase user authenticated:', {
          email: payload.email,
          supabaseUserId: supabaseUserId,
          userRole: userRole,
          metadataRole: userMetadata.role,
          finalRole: finalRole,
          fromDatabase: userRole !== 'customer',
          fromMetadata: userMetadata.role,
          allMetadata: userMetadata
        });

        // For Supabase users, return the UUID and extracted metadata
        return {
          userId: null, // No integer user ID for Supabase users
          supabaseUserId: supabaseUserId,
          username: payload.email || 'supabase_user',
          role: finalRole,
          isSupabase: true,
          // Extract Google user information from metadata
          email: payload.email,
          fullName: userMetadata.full_name || userMetadata.name,
          firstName: userMetadata.name?.split(' ')[0] || userMetadata.full_name?.split(' ')[0] || userMetadata.first_name,
          lastName: userMetadata.name?.split(' ').slice(1).join(' ') || userMetadata.full_name?.split(' ').slice(1).join(' ') || userMetadata.last_name,
          marketingOptIn: userMetadata.marketing_opt_in !== false // Default to true
        };
      }
    } catch (supabaseError) {
      console.log('❌ Not a Supabase token or failed to decode:', supabaseError.message);
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