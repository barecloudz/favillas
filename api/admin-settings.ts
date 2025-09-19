import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, isStaff } from './_shared/auth';

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
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const authPayload = authenticateToken(event);
  if (!authPayload) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  // Only staff can access admin settings
  if (!isStaff(authPayload)) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Access denied - admin access required' })
    };
  }

  try {
    const sql = getDB();

    if (event.httpMethod === 'GET') {
      // Get current settings
      const settings = await sql`
        SELECT * FROM admin_settings
        ORDER BY setting_key
      `;

      // Convert to key-value object for easier frontend consumption
      const settingsObject = settings.reduce((acc, setting) => {
        acc[setting.setting_key] = {
          value: setting.setting_value,
          type: setting.setting_type,
          description: setting.description,
          updatedAt: setting.updated_at,
          updatedBy: setting.updated_by
        };
        return acc;
      }, {});

      // Ensure default pickup time exists
      if (!settingsObject.pickup_time_minutes) {
        await sql`
          INSERT INTO admin_settings (setting_key, setting_value, setting_type, description, updated_by, created_at, updated_at)
          VALUES ('pickup_time_minutes', '25', 'integer', 'Default pickup time in minutes', ${authPayload.username}, NOW(), NOW())
          ON CONFLICT (setting_key) DO NOTHING
        `;
        settingsObject.pickup_time_minutes = {
          value: '25',
          type: 'integer',
          description: 'Default pickup time in minutes',
          updatedAt: new Date().toISOString(),
          updatedBy: authPayload.username
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ settings: settingsObject })
      };

    } else if (event.httpMethod === 'PATCH') {
      // Update settings
      const { settings } = JSON.parse(event.body || '{}');

      if (!settings || typeof settings !== 'object') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Settings object required' })
        };
      }

      const updatedSettings = [];

      for (const [key, value] of Object.entries(settings)) {
        // Validate setting values
        if (key === 'pickup_time_minutes') {
          const minutes = parseInt(value as string);
          if (isNaN(minutes) || minutes < 10 || minutes > 120) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({
                error: `Invalid pickup time: ${value}. Must be between 10 and 120 minutes.`
              })
            };
          }
        }

        // Update or insert setting
        const result = await sql`
          INSERT INTO admin_settings (setting_key, setting_value, setting_type, description, updated_by, created_at, updated_at)
          VALUES (
            ${key},
            ${value as string},
            ${key === 'pickup_time_minutes' ? 'integer' : 'string'},
            ${key === 'pickup_time_minutes' ? 'Default pickup time in minutes' : `Setting for ${key}`},
            ${authPayload.username},
            NOW(),
            NOW()
          )
          ON CONFLICT (setting_key) DO UPDATE SET
            setting_value = EXCLUDED.setting_value,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
          RETURNING *
        `;

        updatedSettings.push(result[0]);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'Settings updated successfully',
          updatedSettings
        })
      };

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

  } catch (error: any) {
    console.error('Admin settings API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};