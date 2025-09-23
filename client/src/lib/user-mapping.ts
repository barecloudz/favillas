import { User } from '@supabase/supabase-js';

export interface MappedUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  username?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  isAdmin: boolean;
  role: string;
  avatarUrl?: string;
  isGoogleUser: boolean; // New field to identify Google users
}

export function mapSupabaseUser(supabaseUser: User | null): MappedUser | null {
  if (!supabaseUser) return null;

  // Extract data from Supabase user metadata
  const userMetadata = supabaseUser.user_metadata || {};
  const appMetadata = supabaseUser.app_metadata || {};
  
  // Parse name from user metadata (handles both Google and email/password users)
  const firstName = userMetadata.first_name ||
                   userMetadata.name?.split(' ')[0] ||
                   userMetadata.full_name?.split(' ')[0] ||
                   'User';
  const lastName = userMetadata.last_name ||
                  userMetadata.name?.split(' ').slice(1).join(' ') ||
                  userMetadata.full_name?.split(' ').slice(1).join(' ') ||
                  '';

  // Check if this is a Google user based on provider info
  const isGoogleUser = appMetadata.provider === 'google' || 
                      userMetadata.provider === 'google' ||
                      userMetadata.iss === 'https://accounts.google.com';

  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    firstName,
    lastName,
    username: userMetadata.username || userMetadata.preferred_username || '',
    phone: userMetadata.phone || '',
    address: userMetadata.address || '',
    city: userMetadata.city || '',
    state: userMetadata.state || '',
    zipCode: userMetadata.zipCode || userMetadata.postal_code || '',
    isAdmin: appMetadata.isAdmin || userMetadata.role === 'admin' || userMetadata.role === 'superadmin',
    role: appMetadata.role || userMetadata.role || 'customer',
    avatarUrl: userMetadata.avatar_url || userMetadata.picture || '',
    isGoogleUser,
  };
}
