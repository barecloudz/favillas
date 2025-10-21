import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { insertUserSchema, User as SelectUser, InsertUser } from '@shared/schema';
import { apiRequest, queryClient } from '../lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { mapSupabaseUser, MappedUser } from '@/lib/user-mapping';
import { useLocation } from 'wouter';
import { EmailConfirmationModal } from '@/components/auth/email-confirmation-modal';

type LoginData = Pick<InsertUser, "email" | "password">;

interface AuthContextType {
  user: MappedUser | null;
  session: Session | null;
  loading: boolean;
  isLoading: boolean; // For backward compatibility
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, any>;
  refreshUserProfile: () => Promise<void>;
  confirmEmail: (token: string) => Promise<{ error?: any; data?: any }>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MappedUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEmailConfirmationModal, setShowEmailConfirmationModal] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState<string>('');
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
          isAdmin: userData.role === 'admin' || userData.role === 'super_admin' || userData.is_admin === true,
          isGoogleUser: !!userData.supabase_user_id
        };
        console.log('🔍 Mapped user object:', {
          role: mappedUser.role,
          isAdmin: mappedUser.isAdmin,
          rawRole: userData.role,
          rawIsAdmin: userData.is_admin
        });
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

  // Handle email confirmation modal
  const handleEmailConfirmation = () => {
    setShowEmailConfirmationModal(false);
    setConfirmationEmail('');
    // Navigate back to auth screen unless user is already logged in
    if (!user || (user as any).emailConfirmationRequired) {
      navigate('/auth?tab=login');
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
              // No profile found - this might be a new user, try to create database record
              console.log('🔍 No user profile found, attempting to create database record for new user');

              try {
                const createResponse = await apiRequest('POST', '/api/create-current-user');
                const createResult = await createResponse.json();
                console.log('✅ Created new user record:', createResult);

                // Now try to fetch the profile again
                const newProfile = await fetchUserProfile();
                if (newProfile) {
                  setUser(newProfile);
                } else {
                  // Still couldn't fetch, use basic mapping
                  const mappedUser = mapSupabaseUser(session?.user || null);
                  setUser(mappedUser);
                  console.log('⚠️ Created user but still using basic mapping');
                }
              } catch (createError) {
                console.warn('⚠️ Failed to create user record:', createError);
                // Fallback to basic mapping if user creation fails
                const mappedUser = mapSupabaseUser(session?.user || null);
                setUser(mappedUser);
                console.log('⚠️ Fallback to basic Supabase user mapping');
              }
            }
          } catch (profileError) {
            console.warn('⚠️ Failed to fetch complete profile, using basic mapping:', profileError);
            const mappedUser = mapSupabaseUser(session?.user || null);
            setUser(mappedUser);
          }
        } else {
          // No Supabase session found
          console.log('ℹ️ No Supabase session found - user needs to log in');
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
        console.log('🔔 Auth state changed:', event, 'Session:', !!session);
        setSession(session);

        if (session) {
          // Fetch complete user profile with timeout protection
          let userProfile: MappedUser | null = null;

          try {
            // Add 5 second timeout to prevent hanging
            const profilePromise = fetchUserProfile();
            const timeoutPromise = new Promise<null>((_, reject) =>
              setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
            );

            userProfile = await Promise.race([profilePromise, timeoutPromise]);
          } catch (profileError: any) {
            console.warn('⚠️ Auth state change: Profile fetch failed:', profileError.message);
            userProfile = null;
          }

          // GUARANTEED fallback: Always set user, either from profile or Supabase metadata
          if (userProfile) {
            setUser(userProfile);
            console.log('✅ Auth state change: Loaded complete profile from database');
          } else {
            const mappedUser = mapSupabaseUser(session?.user || null);
            setUser(mappedUser);
            console.log('⚠️ Auth state change: Using basic Supabase metadata mapping');
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

    // Force sign out first to clear any stuck session
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (error) {
      console.warn('Failed to clear session:', error);
    }

    const redirectUrl = `${window.location.origin}/auth/callback`

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

  // Supabase-only login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      // All authentication now goes through Supabase
      console.log('📧 Using Supabase authentication...');

      const { data, error } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (error) {
        console.error('❌ Supabase login failed:', error.message);
        throw new Error(error.message);
      }

      if (data.user) {
        console.log('✅ Supabase authentication successful');

        // Note: Don't manually set session here - the auth state change listener will handle it
        // This prevents duplicate auth state changes

        // Fetch complete user profile which will create database record if needed
        try {
          const completeProfile = await fetchUserProfile();
          if (completeProfile) {
            console.log('✅ Complete user profile loaded from database');
            return completeProfile;
          }
        } catch (profileError) {
          console.warn('⚠️ Failed to fetch complete profile during login:', profileError);
        }

        // Fallback to basic user data from Supabase metadata
        const userMetadata = data.user.user_metadata || {};
        console.log('⚠️ Using fallback user data from Supabase metadata');

        // Return user data in the expected format
        return {
          id: data.user.id,
          email: data.user.email,
          username: data.user.email,
          firstName: userMetadata.first_name || userMetadata.full_name?.split(' ')[0] || 'User',
          lastName: userMetadata.last_name || userMetadata.full_name?.split(' ').slice(1).join(' ') || '',
          role: userMetadata.role || 'customer',
          isAdmin: userMetadata.role === 'admin' || userMetadata.role === 'super_admin' || userMetadata.is_admin === true,
          isActive: true,
          rewards: 0
        };
      }

      throw new Error('Authentication failed');
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
        isAdmin: user.role === 'admin' || user.role === 'super_admin' || user.isAdmin === true,
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

  // Supabase-only registration mutation
  const registerMutation = useMutation({
    mutationFn: async (credentials: any) => {
      // All registration now goes through Supabase
      console.log('📧 Using Supabase registration...', credentials);

      if (!credentials.email) {
        throw new Error('Email is required for registration');
      }

      // Validate the input data manually to avoid Zod schema issues
      const registrationData = {
        email: credentials.email,
        password: credentials.password,
        firstName: credentials.firstName || '',
        lastName: credentials.lastName || '',
        phone: credentials.phone || '',
        address: credentials.address || '',
        role: 'customer',
        marketingOptIn: credentials.marketingOptIn !== false
      };

      console.log('📋 Registration data:', registrationData);

      const { data, error } = await supabase.auth.signUp({
        email: registrationData.email,
        password: registrationData.password,
        options: {
          data: {
            first_name: registrationData.firstName,
            last_name: registrationData.lastName,
            phone: registrationData.phone,
            address: registrationData.address,
            role: registrationData.role,
            marketing_opt_in: registrationData.marketingOptIn
          }
        }
      });

      if (error) {
        console.error('❌ Supabase registration failed:', error.message);
        throw new Error(error.message);
      }

      if (data.user) {
        console.log('✅ Supabase registration successful');

        // If we have an immediate session (no email confirmation required)
        if (data.session) {
          console.log('🔗 User has immediate session, creating database record');

          try {
            // Create the database user record immediately
            const createUserResponse = await apiRequest('PATCH', '/api/user-profile', {
              first_name: registrationData.firstName,
              last_name: registrationData.lastName,
              email: registrationData.email,
              phone: registrationData.phone || '',
              address: registrationData.address || '',
              city: '',
              state: '',
              zip_code: ''
            });
            console.log('✅ Database user record created successfully');
          } catch (apiError) {
            console.log('⚠️ Database user creation failed, will be created on first login:', apiError);
          }
        }

        // Check if email confirmation is required
        if (!data.session && data.user && !data.user.email_confirmed_at) {
          console.log('📧 Email confirmation required - database record will be created after confirmation');
          // Return a special indicator that email confirmation is needed
          return {
            id: data.user.id,
            email: data.user.email,
            username: data.user.email,
            firstName: registrationData.firstName,
            lastName: registrationData.lastName,
            phone: registrationData.phone,
            address: registrationData.address,
            role: registrationData.role,
            isAdmin: false,
            isActive: true,
            rewards: 0,
            marketingOptIn: registrationData.marketingOptIn,
            emailConfirmationRequired: true
          };
        }

        // Return user data in the expected format
        return {
          id: data.user.id,
          email: data.user.email,
          username: data.user.email,
          firstName: registrationData.firstName,
          lastName: registrationData.lastName,
          phone: registrationData.phone,
          address: registrationData.address,
          role: registrationData.role,
          isAdmin: false,
          isActive: true,
          rewards: 0,
          marketingOptIn: registrationData.marketingOptIn
        };
      }

      throw new Error('Registration failed');
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
        isAdmin: user.role === 'admin' || user.role === 'super_admin' || user.isAdmin === true,
        isGoogleUser: false
      };

      setUser(mappedUser);

      if ((user as any).emailConfirmationRequired) {
        setConfirmationEmail(user.email || '');
        setShowEmailConfirmationModal(true);
      } else {
        toast({
          title: "Registration successful",
          description: `Welcome to Favilla's, ${user.firstName || user.username}!`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation (kept for backward compatibility, but uses signOut)
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await signOut();
    },
    onSuccess: () => {
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

  // Email confirmation function
  const confirmEmail = async (token: string): Promise<{ error?: any; data?: any }> => {
    try {
      console.log('🔐 Attempting email confirmation with token:', token?.substring(0, 10) + '...');

      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: 'signup'
      });

      if (error) {
        console.error('❌ Email confirmation error:', error);
        return { error };
      }

      console.log('✅ Email confirmation successful:', data);

      // Refresh user profile after successful confirmation
      await refreshUserProfile();

      toast({
        title: "Email confirmed!",
        description: "Your account is now active. Welcome to Favilla's!",
      });

      return { data };
    } catch (error) {
      console.error('❌ Email confirmation exception:', error);
      return { error };
    }
  };

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
      refreshUserProfile,
      confirmEmail
    }}>
      {children}
      <EmailConfirmationModal
        open={showEmailConfirmationModal}
        email={confirmationEmail}
        onConfirmation={handleEmailConfirmation}
      />
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
