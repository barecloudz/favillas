import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken, isStaff } from './_shared/auth';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed. Only POST requests are supported.'
      })
    };
  }

  try {
    // Authenticate the request
    const authPayload = authenticateToken(event);
    if (!authPayload) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Authentication required'
        })
      };
    }

    // Check if user has admin/staff privileges
    if (!isStaff(authPayload)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Admin privileges required'
        })
      };
    }

    console.log('Setting up Supabase Storage bucket...');

    // Check if bucket already exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('Error listing buckets:', listError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to check existing buckets',
          details: listError.message
        })
      };
    }

    const existingBucket = buckets.find(bucket => bucket.name === 'menu-images');

    if (existingBucket) {
      console.log('Bucket "menu-images" already exists');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Storage bucket "menu-images" already exists',
          bucket: existingBucket
        })
      };
    }

    // Create the menu-images bucket
    const { data: bucket, error: createError } = await supabase.storage.createBucket('menu-images', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
      fileSizeLimit: 10485760 // 10MB
    });

    if (createError) {
      console.error('Error creating bucket:', createError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Failed to create storage bucket',
          details: createError.message
        })
      };
    }

    console.log('Storage bucket created successfully:', bucket);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Storage bucket "menu-images" created successfully',
        bucket: bucket
      })
    };

  } catch (error: any) {
    console.error('Storage setup error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error during storage setup',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};