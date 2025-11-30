import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, isAdmin } from './_shared/auth';

let dbConnection: any = null;

function getDB() {
  if (dbConnection) return dbConnection;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  dbConnection = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });
  return dbConnection;
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();

    // GET - Fetch all animations (public endpoint)
    if (event.httpMethod === 'GET') {
      const animations = await sql`
        SELECT
          id,
          animation_key,
          is_enabled,
          settings,
          pages,
          start_date,
          end_date
        FROM animations_settings
        ORDER BY animation_key
      `;

      // Check if animations should be enabled based on date range
      const now = new Date();
      const activeAnimations = animations.map((anim: any) => {
        let isActive = anim.is_enabled;

        // Check date range if specified
        if (anim.start_date && anim.end_date) {
          const startDate = new Date(anim.start_date);
          const endDate = new Date(anim.end_date);
          const isInDateRange = now >= startDate && now <= endDate;
          isActive = isActive && isInDateRange;
        }

        return {
          ...anim,
          is_enabled: isActive
        };
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(activeAnimations)
      };
    }

    // POST/PUT - Update animation settings (admin only)
    if (event.httpMethod === 'POST' || event.httpMethod === 'PUT') {
      // Authenticate admin
      const authPayload = await authenticateToken(event);
      if (!authPayload || !isAdmin(authPayload)) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized - Admin access required' })
        };
      }

      const body = JSON.parse(event.body || '{}');
      const { animation_key, is_enabled, settings, pages, start_date, end_date } = body;

      if (!animation_key) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'animation_key is required' })
        };
      }

      console.log(`🎨 Animations: Updating ${animation_key}`);

      const result = await sql`
        UPDATE animations_settings
        SET
          is_enabled = ${is_enabled !== undefined ? is_enabled : false},
          settings = ${settings ? JSON.stringify(settings) : '{}'}::jsonb,
          pages = ${pages || sql`ARRAY[]::TEXT[]`},
          start_date = ${start_date || null},
          end_date = ${end_date || null},
          updated_at = NOW()
        WHERE animation_key = ${animation_key}
        RETURNING *
      `;

      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Animation not found' })
        };
      }

      console.log(`✅ Animation ${animation_key} updated`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          animation: result[0]
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error: any) {
    console.error('❌ Animations error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Internal server error' })
    };
  }
};
