import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { authenticateToken, isStaff } from './_shared/auth';
import { Readable } from 'stream';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Supported image MIME types
 */
const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
];

/**
 * Maximum file size (10MB)
 */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Parse multipart form data manually for Netlify Functions
 */
function parseMultipartForm(bodyBuffer: Buffer, boundary: string): { imageData: Buffer | null; contentType: string | null } {
  const boundaryBuffer = Buffer.from('--' + boundary);
  let parts: Buffer[] = [];
  let start = 0;

  // Split buffer by boundary
  while (true) {
    const boundaryIndex = bodyBuffer.indexOf(boundaryBuffer, start);
    if (boundaryIndex === -1) break;

    if (start !== boundaryIndex) {
      parts.push(bodyBuffer.slice(start, boundaryIndex));
    }
    start = boundaryIndex + boundaryBuffer.length;
  }

  // Process each part
  for (const part of parts) {
    const partString = part.toString('utf8', 0, Math.min(500, part.length)); // Only convert headers to string

    if (partString.includes('Content-Disposition: form-data; name="image"')) {
      // Find Content-Type header
      const contentTypeMatch = partString.match(/Content-Type:\s*([^\r\n]+)/i);
      if (!contentTypeMatch) continue;

      const contentType = contentTypeMatch[1].trim();

      // Find the double CRLF that separates headers from data
      const headerEndIndex = part.indexOf(Buffer.from('\r\n\r\n'));
      if (headerEndIndex === -1) continue;

      // Extract binary data after headers
      const dataStart = headerEndIndex + 4; // Skip the \r\n\r\n
      let dataEnd = part.length;

      // Remove trailing CRLF if present
      if (part.slice(-2).equals(Buffer.from('\r\n'))) {
        dataEnd -= 2;
      }

      const imageData = part.slice(dataStart, dataEnd);

      if (imageData.length > 0) {
        return { imageData, contentType };
      }
    }
  }

  return { imageData: null, contentType: null };
}

/**
 * Generate a unique filename for uploaded images
 */
function generateUniqueFileName(contentType: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);

  // Determine extension from content type
  let extension = '.jpg'; // default
  switch (contentType) {
    case 'image/png':
      extension = '.png';
      break;
    case 'image/webp':
      extension = '.webp';
      break;
    case 'image/gif':
      extension = '.gif';
      break;
    case 'image/jpeg':
    case 'image/jpg':
    default:
      extension = '.jpg';
      break;
  }

  return `menu-item-${timestamp}-${randomString}${extension}`;
}

/**
 * Upload image to Supabase Storage
 */
async function uploadToSupabaseStorage(
  imageBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  try {
    console.log('Uploading to Supabase Storage:', {
      fileName,
      mimeType,
      bufferSize: imageBuffer.length
    });

    // Upload to Supabase Storage bucket 'menu-images'
    const { data, error } = await supabase.storage
      .from('menu-images')
      .upload(fileName, imageBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Supabase storage upload error:', error);
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    console.log('Storage upload successful:', data);

    // Get public URL for the uploaded file
    const { data: publicUrlData } = supabase.storage
      .from('menu-images')
      .getPublicUrl(fileName);

    if (!publicUrlData?.publicUrl) {
      throw new Error('Failed to get public URL for uploaded image');
    }

    console.log('Public URL generated:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading to Supabase storage:', error);
    throw error;
  }
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST requests
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
    console.log('=== IMAGE UPLOAD ENDPOINT HIT ===');
    console.log('Request method:', event.httpMethod);
    console.log('Content-Type:', event.headers['content-type']);
    console.log('Authorization header:', event.headers.authorization ? 'Present' : 'Missing');
    console.log('Cookie header:', event.headers.cookie ? 'Present' : 'Missing');

    // Log all cookies for debugging
    if (event.headers.cookie) {
      const cookies = event.headers.cookie.split(';').map(c => c.trim());
      console.log('All cookies:', cookies);

      // Look for any token-like cookies
      const tokenCookies = cookies.filter(c =>
        c.includes('token') || c.includes('auth') || c.includes('jwt')
      );
      console.log('Token-like cookies:', tokenCookies);
    }

    // Authenticate the request
    const authPayload = authenticateToken(event);
    console.log('Authentication result:', authPayload ? 'Success' : 'Failed');

    if (!authPayload) {
      console.log('Authentication failed - no valid token found');
      console.log('Headers available:', Object.keys(event.headers));
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Authentication required',
          debug: process.env.NODE_ENV === 'development' ? {
            hasAuthHeader: !!event.headers.authorization,
            hasCookies: !!event.headers.cookie,
            headerKeys: Object.keys(event.headers)
          } : undefined
        })
      };
    }

    // Check if user has admin/staff privileges
    if (!isStaff(authPayload)) {
      console.log('Authorization failed - user is not staff/admin:', authPayload.role);
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Admin privileges required for image uploads'
        })
      };
    }

    console.log('User authenticated and authorized:', {
      username: authPayload.username,
      role: authPayload.role,
      isSupabase: authPayload.isSupabase
    });

    // Check if request has multipart data
    const contentType = event.headers['content-type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Content-Type must be multipart/form-data'
        })
      };
    }

    // Extract boundary from Content-Type header
    const boundaryMatch = contentType.match(/boundary=([^;]+)/);
    if (!boundaryMatch) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Invalid multipart boundary'
        })
      };
    }

    const boundary = boundaryMatch[1];

    // Get request body
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'No request body provided'
        })
      };
    }

    // Decode body to Buffer (handle base64 encoding)
    const bodyBuffer = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body, 'utf8');

    console.log('Parsing multipart data with boundary:', boundary, 'Body size:', bodyBuffer.length);

    // Parse multipart form data
    const { imageData, contentType: imageContentType } = parseMultipartForm(bodyBuffer, boundary);

    // Check if image file was uploaded
    if (!imageData || !imageContentType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'No valid image file provided. Please select an image to upload.'
        })
      };
    }

    console.log('File details:', {
      contentType: imageContentType,
      size: imageData.length
    });

    // Validate file type
    if (!SUPPORTED_IMAGE_TYPES.includes(imageContentType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: `Unsupported file type: ${imageContentType}. Supported formats: ${SUPPORTED_IMAGE_TYPES.join(', ')}`
        })
      };
    }

    // Validate file size
    if (imageData.length > MAX_FILE_SIZE) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          error: `File too large: ${(imageData.length / (1024 * 1024)).toFixed(2)}MB. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        })
      };
    }

    // Generate unique filename
    const uniqueFileName = generateUniqueFileName(imageContentType);

    console.log('Uploading to Supabase Storage with filename:', uniqueFileName);

    // Upload to Supabase Storage
    const imageUrl = await uploadToSupabaseStorage(
      imageData,
      uniqueFileName,
      imageContentType
    );

    console.log('Upload successful, image URL:', imageUrl);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        imageUrl: imageUrl,
        filename: uniqueFileName,
        message: 'Image uploaded successfully'
      })
    };

  } catch (error: any) {
    console.error('Image upload error:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Internal server error during image upload',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      })
    };
  }
};