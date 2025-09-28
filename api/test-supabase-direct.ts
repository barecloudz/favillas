import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

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
    console.log('🔍 SUPABASE-TEST: Testing direct Supabase connection');

    const token = event.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'No token provided' })
      };
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    console.log('🔍 SUPABASE-TEST: Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnonKey: !!supabaseAnonKey,
      supabaseUrlPrefix: supabaseUrl?.substring(0, 30) + '...',
      anonKeyPrefix: supabaseAnonKey?.substring(0, 20) + '...'
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Supabase configuration missing',
          config: {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseAnonKey
          }
        })
      };
    }

    console.log('🔍 SUPABASE-TEST: Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log('🔍 SUPABASE-TEST: Testing token:', {
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20) + '...'
    });

    console.log('🔍 SUPABASE-TEST: Calling getUser...');
    const { data: { user }, error } = await supabase.auth.getUser(token);

    console.log('🔍 SUPABASE-TEST: getUser result:', {
      hasUser: !!user,
      hasError: !!error,
      errorMessage: error?.message,
      errorStatus: error?.status,
      userId: user?.id,
      userEmail: user?.email
    });

    if (error) {
      console.log('❌ SUPABASE-TEST: Detailed error:', {
        name: error.name,
        message: error.message,
        status: error.status,
        stack: error.stack
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: !error && !!user,
        user: user ? {
          id: user.id,
          email: user.email,
          created_at: user.created_at
        } : null,
        error: error ? {
          message: error.message,
          status: error.status
        } : null,
        config: {
          supabaseUrl: supabaseUrl?.substring(0, 30) + '...',
          hasAnonKey: !!supabaseAnonKey
        }
      })
    };

  } catch (error) {
    console.error('🔧 SUPABASE-TEST: Unexpected error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};