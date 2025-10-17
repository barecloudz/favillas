import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { storage } from './storage';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Supabase URL or Service Role Key is not set. Server-side Supabase authentication will be disabled.');
}

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      firstName: string;
      lastName: string;
      username: string;
      role: string;
      isAdmin: boolean;
      supabaseUserId: string;
    }
  }
}

export async function authenticateSupabaseUser(req: Request, res: Response, next: NextFunction) {
  try {
    console.log('🔍 Supabase auth attempt:', {
      hasAuthHeader: !!req.headers.authorization,
      authHeader: req.headers.authorization?.substring(0, 20) + '...',
      supabaseUrl: supabaseUrl ? 'SET' : 'NOT SET',
      supabaseKey: supabaseServiceKey ? 'SET' : 'NOT SET'
    });

    // Check if Supabase is available
    if (!supabase) {
      console.warn('Supabase client not available, skipping Supabase authentication');
      return res.status(401).json({ message: 'Supabase authentication not configured' });
    }

    // Get the authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid authorization header');
      return res.status(401).json({ message: 'No authorization token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('🔑 Token received:', token.substring(0, 20) + '...');

    // Verify the JWT token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      console.log('❌ Supabase token verification failed:', error?.message);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }

    console.log('✅ Supabase user verified:', user.email);

    // Get user data from our database using the Supabase user ID
    const dbUser = await storage.getUserBySupabaseId(user.id);

    if (!dbUser) {
      console.log('👤 Creating new user in database');
      // If user doesn't exist in our database, create them
      const newUser = await storage.createUser({
        username: user.email?.split('@')[0] || `supabase_${user.id}`,
        email: user.email || '',
        firstName: user.user_metadata?.full_name?.split(' ')[0] || '',
        lastName: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '',
        password: '', // No password for Supabase users
        supabaseUserId: user.id,
        role: 'customer',
        isActive: true,
        marketingOptIn: user.user_metadata?.marketing_opt_in !== false, // Get from Supabase metadata, default to true
      });

      // Initialize user points to 0
      await storage.updateUserPoints(newUser.id, 0, 0, 0);

      req.user = {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        username: newUser.username,
        role: newUser.role,
        isAdmin: newUser.isAdmin,
        supabaseUserId: user.id,
      };
    } else {
      console.log('👤 Found existing user:', dbUser.email);
      req.user = {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        username: dbUser.username,
        role: dbUser.role,
        isAdmin: dbUser.isAdmin,
        supabaseUserId: user.id,
      };
    }

    console.log('✅ Authentication successful for user:', req.user.email);
    next();
  } catch (error) {
    console.error('❌ Supabase authentication error:', error);
    return res.status(500).json({ message: 'Authentication error' });
  }
}

// Middleware to check if user is authenticated (works with both Express sessions and Supabase)
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // First try Supabase authentication
  if (req.headers.authorization) {
    return authenticateSupabaseUser(req, res, next);
  }
  
  // Fallback to Express session authentication
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  return res.status(401).json({ message: 'Unauthorized' });
}
