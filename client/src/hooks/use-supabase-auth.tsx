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
        }

        if (session) {
          console.log('🔄 Found Supabase session (Google user)');
          setSession(session);
          // Fetch complete profile instead of using basic mapping
          const completeProfile = await fetchUserProfile();
          if (completeProfile) {
            setUser(completeProfile);
          } else {
            // Fallback to basic mapping if profile fetch fails
            const mappedUser = mapSupabaseUser(session?.user || null);
            setUser(mappedUser);
          }
        } else {
          // If no Supabase session, check for legacy JWT cookie
          console.log('🔄 No Supabase session, checking for legacy JWT cookie');
          try {
            const response = await apiRequest('GET', '/api/user');
            const userData = await response.json();

            if (userData && userData.id) {
              console.log('🔑 Found legacy JWT session:', userData.username);
              // Fetch complete profile for legacy users too
              const completeProfile = await fetchUserProfile();
              if (completeProfile) {
                setUser(completeProfile);
                console.log('✅ Legacy session restored with complete profile');
              } else {
                // Fallback to basic user data if profile fetch fails
                const mappedUser: MappedUser = {
                  id: userData.id?.toString() || '',
                  email: userData.email || userData.username || '',
                  firstName: userData.firstName || userData.username || 'User',
                  lastName: userData.lastName || '',
                  phone: userData.phone || '',
                  address: userData.address || '',
                  role: userData.role || 'customer',
                  isAdmin: userData.role === 'admin' || userData.role === 'superadmin' || userData.username === 'superadmin',
                  isGoogleUser: false
                };
                setUser(mappedUser);
                console.log('✅ Legacy session restored with basic data');
              }
            } else {
              console.log('❌ No valid authentication found');
            }
          } catch (authError) {
            console.log('❌ No legacy JWT session found');
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
        console.log('🔄 Auth state changed:', event, session ? 'Session exists' : 'No session');
        setSession(session);

        if (session) {
          // Fetch complete profile for authenticated users
          const completeProfile = await fetchUserProfile();
          if (completeProfile) {
            setUser(completeProfile);
          } else {
            // Fallback to basic mapping
            const mappedUser = mapSupabaseUser(session?.user || null);
            setUser(mappedUser);
          }
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

  // Email/password login mutation (using existing API)
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: async (user: SelectUser) => {
      console.log('🔑 Legacy login successful, updating auth state:', user);

      // Update query cache
      queryClient.setQueryData(["/api/user"], user);

      // Fetch complete profile after successful login
      const completeProfile = await fetchUserProfile();
      if (completeProfile) {
        setUser(completeProfile);
      } else {
        // Fallback to basic user data
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

  // Registration mutation (using existing API)
  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: async (user: SelectUser) => {
      console.log('🔑 Legacy registration successful, updating auth state:', user);

      // Update query cache
      queryClient.setQueryData(["/api/user"], user);

      // Fetch complete profile after successful registration
      const completeProfile = await fetchUserProfile();
      if (completeProfile) {
        setUser(completeProfile);
      } else {
        // Fallback to basic user data
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
      }

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
