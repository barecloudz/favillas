import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { insertUserSchema, User as SelectUser, InsertUser } from '@shared/schema';
import { apiRequest, queryClient } from '../lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { mapSupabaseUser, MappedUser } from '@/lib/user-mapping';
import { useLocation } from 'wouter';

type LoginData = Pick<InsertUser, "username" | "password">;

interface AuthContextType {
  user: MappedUser | null;
  session: Session | null;
  loading: boolean;
  isLoading: boolean; // For backward compatibility
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  refreshUserProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MappedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Fetch complete user profile including contact information
  const fetchUserProfile = async (): Promise<MappedUser | null> => {
    try {
      const response = await apiRequest('GET', '/api/user-profile');
      const userData = await response.json();

      if (userData && (userData.id || userData.supabase_user_id)) {
        console.log('📞 Fetched complete user profile:', userData);
        const mappedUser: MappedUser = {
          id: userData.id?.toString() || userData.supabase_user_id || '',
          email: userData.email || userData.username || '',
          firstName: userData.first_name || userData.username || 'User',
          lastName: userData.last_name || '',
          phone: userData.phone || '',
          address: userData.address || '',
          city: userData.city || '',
          state: userData.state || '',
          zipCode: userData.zip_code || '',
          role: userData.role || 'customer',
          isAdmin: userData.role === 'admin' || userData.role === 'superadmin' || userData.username === 'superadmin',
          isGoogleUser: !!userData.supabase_user_id
        };
        return mappedUser;
      }
    } catch (error) {
      console.log('❌ Failed to fetch user profile:', error);
      throw error; // Re-throw to trigger error handling in auth flows
    }
    return null;
  };

  // Function to refresh user profile (exposed to components)
  const refreshUserProfile = async () => {
    if (user) {
      const updatedProfile = await fetchUserProfile();
      if (updatedProfile) {
        setUser(updatedProfile);
        console.log('✅ User profile refreshed with contact info');
      }
    }
  };

  useEffect(() => {
    // Initialize auth state on app load
    const initializeAuth = async () => {
      try {
        setLoading(true);

        // First, try to get Supabase session for Google users
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Error getting session:', error);
          // Clear any corrupted local storage
          localStorage.removeItem('supabase.auth.token');
          await supabase.auth.signOut();
        }

        if (session) {
          setSession(session);

          // For Supabase users, fetch complete profile from database instead of just mapping metadata
          try {
            const completeProfile = await fetchUserProfile();
            if (completeProfile) {
              setUser(completeProfile);
            } else {
              // Fallback to basic mapping if profile fetch fails
              const mappedUser = mapSupabaseUser(session?.user || null);
              setUser(mappedUser);
              console.log('⚠️ Fallback to basic Supabase user mapping');
            }
          } catch (profileError) {
            console.warn('⚠️ Failed to fetch complete profile, using basic mapping:', profileError);
            const mappedUser = mapSupabaseUser(session?.user || null);
            setUser(mappedUser);
          }
        } else {
          // If no Supabase session, check for JWT auth cookies
          console.log('🔍 Available cookies on page load:', document.cookie);

          const hasJwtCookie = document.cookie.includes('auth-token') ||
                               document.cookie.includes('jwt') ||
                               document.cookie.includes('token') ||
                               document.cookie.includes('connect.sid');

          console.log('🍪 JWT cookie detection:', {
            hasAuthToken: document.cookie.includes('auth-token'),
            hasJwt: document.cookie.includes('jwt'),
            hasToken: document.cookie.includes('token'),
            hasConnectSid: document.cookie.includes('connect.sid'),
            hasJwtCookie
          });

          if (hasJwtCookie) {
            console.log('🔄 Attempting to restore authentication from cookies...');
            try {
              const response = await apiRequest('GET', '/api/user');
              const userData = await response.json();

              console.log('✅ User data restored from cookies:', userData);
              console.log('🔍 Role analysis:', {
                role: userData.role,
                isAdmin: userData.role === 'admin' || userData.role === 'super_admin' || userData.role === 'superadmin' || userData.username === 'superadmin',
                username: userData.username
              });

              if (userData && userData.id) {
                const mappedUser: MappedUser = {
                  id: userData.id?.toString() || '',
                  email: userData.email || userData.username || '',
                  firstName: userData.firstName || userData.username || 'User',
                  lastName: userData.lastName || '',
                  phone: userData.phone || '',
                  address: userData.address || '',
                  city: userData.city || '',
                  state: userData.state || '',
                  zipCode: userData.zipCode || userData.zip_code || '',
                  role: userData.role || 'customer',
                  isAdmin: userData.role === 'admin' || userData.role === 'super_admin' || userData.role === 'superadmin' || userData.username === 'superadmin',
                  isGoogleUser: false
                };
                setUser(mappedUser);
              }
            } catch (authError) {
              console.warn('❌ Failed to restore authentication from JWT cookie:', authError);
              console.warn('❌ Error details:', {
                message: authError instanceof Error ? authError.message : 'Unknown error'
              });
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);

        if (session) {
          const mappedUser = mapSupabaseUser(session?.user || null);
          setUser(mappedUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    // Initialize auth state
    initializeAuth();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);

    // Force sign out first to clear any stuck session
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.warn('Failed to clear session:', error);
    }

    const redirectUrl = window.location.hostname === 'localhost'
      ? `${window.location.origin}/auth/callback`
      : 'https://favillasnypizza.netlify.app/auth/callback'

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    if (error) {
      console.error('Error signing in with Google:', error.message);
      setLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error.message);
        // Don't throw error for session missing - user might already be logged out
        if (error.message.includes('Auth session missing')) {
          console.log('User already logged out, continuing...');
        } else {
          throw error;
        }
      }
      
      // Also call the API logout to clear any server-side sessions
      try {
        await apiRequest("POST", "/api/logout");
      } catch (apiError) {
        // Don't fail if API logout fails, Supabase logout is the important one
        console.warn('API logout failed:', apiError);
      }
      
      // Clear any cached data
      queryClient.clear();
      
      // Navigate to home page
      navigate('/');
      
      setLoading(false);
    } catch (error) {
      setLoading(false);
      // Don't throw error for logout - just log it and continue
      console.warn('Logout error (continuing anyway):', error);
      // Still clear cache and navigate
      queryClient.clear();
      navigate('/');
    }
  };

  // Email/password login mutation (Supabase for emails, legacy for username)
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      // Use Supabase for all email-based authentication
      if (credentials.username.includes('@')) {
        console.log('📧 Using Supabase email authentication...');
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.username,
          password: credentials.password,
        });

        if (error) {
          console.error('❌ Supabase login failed:', error.message);
          throw new Error(error.message);
        }

        if (data.user) {
          console.log('✅ Supabase email login successful');
          const userMetadata = data.user.user_metadata || {};

          // Return user data in the expected format
          return {
            id: data.user.id,
            email: data.user.email,
            username: data.user.email,
            firstName: userMetadata.first_name || userMetadata.full_name?.split(' ')[0] || 'User',
            lastName: userMetadata.last_name || userMetadata.full_name?.split(' ').slice(1).join(' ') || '',
            role: userMetadata.role || 'customer',
            isAdmin: userMetadata.role === 'admin' || userMetadata.role === 'superadmin',
            isActive: true,
            rewards: 0
          };
        }
      }

      // Legacy API for username-based login (temporary)
      console.log('🔐 Using legacy username/password login...');
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {

      // Update query cache
      queryClient.setQueryData(["/api/user"], user);

      // CRITICAL: Update the auth state that components are checking
      const mappedUser: MappedUser = {
        id: user.id?.toString() || '',
        email: user.email || user.username || '',
        firstName: user.firstName || user.username || 'User',
        lastName: user.lastName || '',
        phone: user.phone || '',
        address: user.address || '',
        role: user.role || 'customer',
        isAdmin: user.role === 'admin' || user.role === 'superadmin' || user.username === 'superadmin',
        isGoogleUser: false
      };

      setUser(mappedUser);

      // Save admin session to localStorage for AdminProtectedRoute
      if (mappedUser.isAdmin) {
        localStorage.setItem('admin-user', JSON.stringify({
          ...user,
          role: user.role === 'super_admin' ? 'admin' : user.role,
          isAdmin: true
        }));
        console.log('💾 Saved admin session to localStorage');
      }

      toast({
        title: "Login successful",
        description: `Welcome back, ${user.firstName || user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Registration mutation (using Supabase for email, legacy for username)
  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      // Use Supabase for email-based registration
      if (credentials.email) {
        console.log('📧 Using Supabase email registration...');
        const { data, error } = await supabase.auth.signUp({
          email: credentials.email,
          password: credentials.password,
          options: {
            data: {
              first_name: credentials.firstName,
              last_name: credentials.lastName,
              role: 'customer'
            }
          }
        });

        if (error) {
          console.error('❌ Supabase registration failed:', error.message);
          throw new Error(error.message);
        }

        if (data.user) {
          console.log('✅ Supabase registration successful');
          // Return user data in the expected format
          return {
            id: data.user.id,
            email: data.user.email,
            username: data.user.email,
            firstName: credentials.firstName,
            lastName: credentials.lastName,
            role: 'customer',
            isAdmin: false,
            isActive: true,
            rewards: 0
          };
        }
      }

      // Legacy API fallback for username-based registration
      console.log('🔐 Using legacy registration...');
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      console.log('🔑 Legacy registration successful, updating auth state:', user);

      // Update query cache
      queryClient.setQueryData(["/api/user"], user);

      // CRITICAL: Update the auth state that components are checking
      const mappedUser: MappedUser = {
        id: user.id?.toString() || '',
        email: user.email || user.username || '',
        firstName: user.firstName || user.username || 'User',
        lastName: user.lastName || '',
        phone: user.phone || '',
        address: user.address || '',
        role: user.role || 'customer',
        isAdmin: user.role === 'admin' || user.role === 'superadmin' || user.username === 'superadmin',
        isGoogleUser: false
      };

      setUser(mappedUser);

      toast({
        title: "Registration successful",
        description: `Welcome to Favilla's, ${user.firstName || user.username}!`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation (using existing API)
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.clear();
      navigate('/');
      toast({
        title: "Logout successful",
        description: "You have been logged out",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isLoading: loading, // For backward compatibility
      signInWithGoogle,
      signOut,
      loginMutation,
      logoutMutation,
      registerMutation,
      refreshUserProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
