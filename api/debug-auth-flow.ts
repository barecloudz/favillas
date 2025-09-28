import { Handler } from '@netlify/functions';
import { authenticateToken as authenticateTokenFromUtils } from './utils/auth';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🔍 DEBUG-AUTH: Starting authentication flow debug');

    // ENHANCED AUTHENTICATION: Use multiple attempts with better error handling
    let authPayload = null;
    let authAttempts = 0;
    const maxAuthAttempts = 3;

    console.log('🔍 DEBUG-AUTH: Starting enhanced authentication process');

    while (!authPayload && authAttempts < maxAuthAttempts) {
      authAttempts++;
      console.log(`🔄 DEBUG-AUTH: Authentication attempt ${authAttempts}/${maxAuthAttempts}`);

      const authResult = await authenticateTokenFromUtils(
        event.headers.authorization || event.headers.Authorization,
        event.headers.cookie || event.headers.Cookie
      );

      console.log(`🔍 DEBUG-AUTH: Auth attempt ${authAttempts} result:`, {
        success: authResult.success,
        error: authResult.error,
        hasUser: !!authResult.user,
        userId: authResult.user?.id,
        email: authResult.user?.email,
        legacyUserId: authResult.user?.legacyUserId
      });

      if (authResult.success && authResult.user) {
        authPayload = {
          userId: authResult.user.legacyUserId || null, // Use the legacy user ID from auth utils
          supabaseUserId: authResult.user.id && isNaN(Number(authResult.user.id)) ? authResult.user.id : null,
          username: authResult.user.email || authResult.user.username || 'user',
          role: authResult.user.role || 'customer',
          isSupabase: authResult.user.id && isNaN(Number(authResult.user.id)),
          hasLegacyUser: !!authResult.user.legacyUserId // Track if we found legacy user
        };

        console.log('✅ DEBUG-AUTH: Authentication successful on attempt', authAttempts);
        break;
      } else {
        console.log(`❌ DEBUG-AUTH: Auth attempt ${authAttempts} failed:`, authResult.error);

        // Wait before retry if not the last attempt
        if (authAttempts < maxAuthAttempts) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }

    if (authPayload) {
      console.log('🎯 DEBUG-AUTH: FINAL AUTH SUCCESS:', {
        isSupabase: authPayload.isSupabase,
        hasLegacyUser: authPayload.hasLegacyUser,
        userId: authPayload.userId,
        supabaseUserId: authPayload.supabaseUserId,
        username: authPayload.username,
        role: authPayload.role
      });
    } else {
      console.log('❌ DEBUG-AUTH: Authentication failed after all attempts');
    }

    // Now simulate the finalUserId logic from orders.ts
    let finalUserId = null;
    let finalSupabaseUserId = null;

    console.log('🔍 DEBUG-AUTH: Starting user identification process');

    if (authPayload) {
      if (authPayload.isSupabase) {
        // FIXED: Use legacy user ID already found by auth utils instead of redundant lookup
        console.log('🔄 DEBUG-AUTH: Using legacy user ID from auth utils (no redundant lookup needed)');

        if (authPayload.hasLegacyUser && authPayload.userId) {
          // Auth utils already found the legacy user - use it directly!
          finalUserId = authPayload.userId;
          finalSupabaseUserId = null;
          console.log('✅ DEBUG-AUTH: Using existing legacy user ID from auth utils:', finalUserId);
        } else {
          // No legacy user found by auth utils - would create new one
          console.log('➕ DEBUG-AUTH: Would create new legacy user (auth utils found none)');
          finalSupabaseUserId = authPayload.supabaseUserId;
          finalUserId = null;
          console.log('🆘 DEBUG-AUTH: Would fallback to Supabase pattern');
        }
      } else {
        // Legacy JWT user - use their ID directly
        finalUserId = authPayload.userId;
        finalSupabaseUserId = null;
        console.log('🔑 DEBUG-AUTH: Using legacy JWT user ID:', finalUserId);
      }
    } else {
      // Guest order
      console.log('👤 DEBUG-AUTH: Guest order - no user association');
      finalUserId = null;
      finalSupabaseUserId = null;
    }

    console.log('🎯 DEBUG-AUTH: FINAL USER IDENTIFICATION:', {
      finalUserId,
      finalSupabaseUserId,
      authPayload
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        authFlowDebug: {
          authAttempts,
          authPayload,
          finalUserId,
          finalSupabaseUserId,
          wouldCreateOrderWith: {
            user_id: finalUserId,
            supabase_user_id: finalSupabaseUserId
          }
        }
      })
    };

  } catch (error) {
    console.error('🔧 DEBUG-AUTH: Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};