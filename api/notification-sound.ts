import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Verify authentication
  const authHeader = event.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  const token = authHeader.substring(7);
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !authUser) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  try {
    // GET - Fetch user's custom notification sound URL
    if (event.httpMethod === 'GET') {
      const sql = postgres(process.env.DATABASE_URL!, {
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: false,
        keep_alive: false,
      });

      const db = drizzle(sql);

      const [user] = await db
        .select({ customNotificationSoundUrl: users.customNotificationSoundUrl })
        .from(users)
        .where(eq(users.supabaseUserId, authUser.id))
        .limit(1);

      await sql.end();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          customNotificationSoundUrl: user?.customNotificationSoundUrl || null,
        }),
      };
    }

    // POST - Upload custom notification sound
    if (event.httpMethod === 'POST') {
      const { audioFile, fileName } = JSON.parse(event.body || '{}');

      if (!audioFile || !fileName) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'audioFile and fileName are required' }),
        };
      }

      // Convert base64 to buffer
      const base64Data = audioFile.replace(/^data:audio\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Upload to Supabase Storage
      const filePath = `${authUser.id}/${Date.now()}-${fileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('notification-sounds')
        .upload(filePath, buffer, {
          contentType: 'audio/mpeg',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Failed to upload file', details: uploadError.message }),
        };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('notification-sounds')
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      // Update user's profile with the new sound URL
      const sql = postgres(process.env.DATABASE_URL!, {
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: false,
        keep_alive: false,
      });

      const db = drizzle(sql);

      await db
        .update(users)
        .set({ customNotificationSoundUrl: publicUrl })
        .where(eq(users.supabaseUserId, authUser.id));

      await sql.end();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          url: publicUrl,
        }),
      };
    }

    // DELETE - Remove custom notification sound
    if (event.httpMethod === 'DELETE') {
      const sql = postgres(process.env.DATABASE_URL!, {
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: false,
        keep_alive: false,
      });

      const db = drizzle(sql);

      // Get current sound URL to delete from storage
      const [user] = await db
        .select({ customNotificationSoundUrl: users.customNotificationSoundUrl })
        .from(users)
        .where(eq(users.supabaseUserId, authUser.id))
        .limit(1);

      if (user?.customNotificationSoundUrl) {
        // Extract file path from URL
        const url = new URL(user.customNotificationSoundUrl);
        const pathParts = url.pathname.split('/');
        const filePath = pathParts.slice(pathParts.indexOf('notification-sounds') + 1).join('/');

        // Delete from storage
        await supabase.storage
          .from('notification-sounds')
          .remove([filePath]);
      }

      // Clear the URL from database
      await db
        .update(users)
        .set({ customNotificationSoundUrl: null })
        .where(eq(users.supabaseUserId, authUser.id));

      await sql.end();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
