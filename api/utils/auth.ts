import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import postgres from 'postgres';

// Types
export interface AuthenticatedUser {
  id: string;
  legacyUserId?: number; // Added for legacy user ID lookup
  username?: string;
  email?: string;
  role?: string;
  isAdmin?: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

// Database connection singleton
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

// Secure token validation using official Supabase SDK
async function validateSupabaseToken(token: string): Promise<AuthResult> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: 'Supabase configuration missing' };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { success: false, error: 'Invalid Supabase token' };
    }

    // Get additional user data from our database - prioritize legacy users by email
    const sql = getDB();

    // First try to find legacy user by email (this gets user_id: 29 for barecloudz@gmail.com)
    const legacyUsers = await sql`
      SELECT id, username, email, role, is_admin, supabase_user_id
      FROM users
      WHERE email = ${user.email} AND id IS NOT NULL
      ORDER BY created_at ASC
      LIMIT 1
    `;

    // If no legacy user found, try by supabase_user_id
    const supabaseUsers = legacyUsers.length === 0 ? await sql`
      SELECT id, username, email, role, is_admin, supabase_user_id
      FROM users
      WHERE supabase_user_id = ${user.id}
      LIMIT 1
    ` : [];

    const dbUser = legacyUsers[0] || supabaseUsers[0];

    console.log('🔍 AUTH-UTILS: Database user lookup result:', {
      email: user.email,
      supabaseUserId: user.id,
      foundLegacyUser: !!legacyUsers[0],
      foundSupabaseUser: !!supabaseUsers[0],
      finalDbUser: dbUser ? {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.email,
        hasSupabaseLink: !!dbUser.supabase_user_id
      } : null
    });

    return {
      success: true,
      user: {
        id: user.id, // Always return Supabase UUID as id
        legacyUserId: dbUser?.id || undefined, // Add legacy user ID if found
        email: user.email || undefined,
        username: dbUser?.username || user.email || undefined,
        role: dbUser?.role || 'customer',
        isAdmin: dbUser?.is_admin || false
      }
    };
  } catch (error) {
    return {
      success: false,
      error: 'Token validation failed'
    };
  }
}

// Secure JWT validation with proper secret handling
async function validateJWTToken(token: string): Promise<AuthResult> {
  try {
    // Use only JWT_SECRET - no fallback to SESSION_SECRET
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return { success: false, error: 'JWT_SECRET not configured' };
    }

    const decoded = jwt.verify(token, jwtSecret) as any;

    if (!decoded.userId) {
      return { success: false, error: 'Invalid token payload' };
    }

    return {
      success: true,
      user: {
        id: decoded.userId,
        username: decoded.username,
        role: decoded.role || 'customer',
        isAdmin: decoded.isAdmin || false
      }
    };
  } catch (error) {
    return {
      success: false,
      error: 'Invalid JWT token'
    };
  }
}

// Main authentication function
export async function authenticateToken(authHeader?: string, cookies?: string): Promise<AuthResult> {
  try {
    let token: string | undefined;

    // Extract token from Authorization header
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Fallback to cookie if no Authorization header
    if (!token && cookies) {
      const authCookie = cookies
        .split(';')
        .find(c => c.trim().startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }

    if (!token) {
      return { success: false, error: 'No authentication token provided' };
    }

    // Try Supabase token validation first
    const supabaseResult = await validateSupabaseToken(token);
    if (supabaseResult.success) {
      return supabaseResult;
    }

    // Fallback to JWT validation for legacy tokens
    const jwtResult = await validateJWTToken(token);
    if (jwtResult.success) {
      return jwtResult;
    }

    return { success: false, error: 'Invalid authentication token' };

  } catch (error) {
    return {
      success: false,
      error: 'Authentication failed'
    };
  }
}

// Input validation schemas
export const loginSchema = {
  username: { required: true, type: 'string', minLength: 3, maxLength: 50 },
  password: { required: true, type: 'string', minLength: 6, maxLength: 100 }
};

export const registerSchema = {
  email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { required: true, type: 'string', minLength: 6, maxLength: 100 },
  firstName: { required: true, type: 'string', minLength: 1, maxLength: 50 },
  lastName: { required: true, type: 'string', minLength: 1, maxLength: 50 },
  phone: { required: false, type: 'string' },
  address: { required: false, type: 'string' }
};

// Validation function
export function validateInput(data: any, schema: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const [field, rules] of Object.entries(schema) as [string, any][]) {
    const value = data[field];

    if (rules.required && (!value || value.toString().trim() === '')) {
      errors.push(`${field} is required`);
      continue;
    }

    if (value && rules.type === 'string' && typeof value !== 'string') {
      errors.push(`${field} must be a string`);
      continue;
    }

    if (value && rules.minLength && value.length < rules.minLength) {
      errors.push(`${field} must be at least ${rules.minLength} characters`);
      continue;
    }

    if (value && rules.maxLength && value.length > rules.maxLength) {
      errors.push(`${field} must not exceed ${rules.maxLength} characters`);
      continue;
    }

    if (value && rules.pattern && !rules.pattern.test(value)) {
      errors.push(`${field} format is invalid`);
      continue;
    }
  }

  return { isValid: errors.length === 0, errors };
}

// CORS headers utility
export function getCorsHeaders(origin?: string) {
  return {
    'Access-Control-Allow-Origin': origin || 'http://localhost:3000',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };
}

// Database utility with error handling
export async function withDB<T>(
  handler: (sql: postgres.Sql) => Promise<T>
): Promise<T> {
  try {
    const sql = getDB();
    return await handler(sql);
  } catch (error) {
    // Reset connection on error and retry once
    dbConnection = null;
    const sql = getDB();
    return await handler(sql);
  }
}