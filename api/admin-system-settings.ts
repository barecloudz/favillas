import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken } from './_shared/auth';

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
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Authenticate admin user
  const authPayload = await authenticateToken(event);
  if (!authPayload) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({
        error: 'Unauthorized',
        debug: {
          hasCookies: !!event.headers.cookie,
          hasAuthHeader: !!event.headers.authorization,
          cookieNames: event.headers.cookie ?
            event.headers.cookie.split(';').map(c => c.trim().split('=')[0]) : [],
          timestamp: new Date().toISOString()
        }
      })
    };
  }

  if (authPayload.role !== 'admin' && authPayload.role !== 'super_admin') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Admin access required' })
    };
  }

  try {
    const sql = getDB();

    if (event.httpMethod === 'GET') {
      const { category } = event.queryStringParameters || {};

      if (category) {
        // Get settings by category
        const settings = await sql`
          SELECT * FROM system_settings
          WHERE category = ${category}
          ORDER BY setting_key
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(settings)
        };
      } else {
        // Get all system settings
        const settings = await sql`
          SELECT * FROM system_settings
          ORDER BY category, setting_key
        `;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(settings)
        };
      }

    } else if (event.httpMethod === 'POST') {
      // Update or create multiple settings
      const { settings } = JSON.parse(event.body || '{}');

      if (!settings || !Array.isArray(settings)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid settings data - expected array' })
        };
      }

      const updatedSettings = [];

      for (const setting of settings) {
        if (!setting.setting_key || setting.setting_value === undefined) {
          continue; // Skip invalid settings
        }

        // Upsert setting (update if exists, insert if not)
        const [updatedSetting] = await sql`
          INSERT INTO system_settings (setting_key, setting_value, category, description, setting_type, updated_at)
          VALUES (
            ${setting.setting_key},
            ${setting.setting_value},
            ${setting.category || 'general'},
            ${setting.description || ''},
            ${setting.setting_type || 'text'},
            NOW()
          )
          ON CONFLICT (setting_key)
          DO UPDATE SET
            setting_value = EXCLUDED.setting_value,
            category = EXCLUDED.category,
            description = EXCLUDED.description,
            setting_type = EXCLUDED.setting_type,
            updated_at = NOW()
          RETURNING *
        `;

        if (updatedSetting) {
          updatedSettings.push(updatedSetting);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedSettings)
      };

    } else if (event.httpMethod === 'PUT') {
      // Update single setting by key from URL path
      const pathParts = event.path.split('/');
      const settingKey = pathParts[pathParts.length - 1];
      const { setting_value, category, description, setting_type } = JSON.parse(event.body || '{}');

      if (!settingKey || setting_value === undefined) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Key and value are required' })
        };
      }

      const [updatedSetting] = await sql`
        UPDATE system_settings
        SET
          setting_value = ${setting_value},
          category = COALESCE(${category}, category),
          description = COALESCE(${description}, description),
          setting_type = COALESCE(${setting_type}, setting_type),
          updated_at = NOW()
        WHERE setting_key = ${settingKey}
        RETURNING *
      `;

      if (!updatedSetting) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Setting not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedSetting)
      };

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

  } catch (error) {
    console.error('System settings API error:', error);

    // If table doesn't exist, return default branding settings
    if (error instanceof Error && error.message.includes('does not exist')) {
      const defaultBrandingSettings = [
        {
          setting_key: 'company_name',
          setting_value: "Favilla's NY Pizza",
          category: 'branding',
          description: 'Restaurant name',
          setting_type: 'text'
        },
        {
          setting_key: 'logo_url',
          setting_value: '',
          category: 'branding',
          description: 'Company logo URL',
          setting_type: 'text'
        },
        {
          setting_key: 'primary_color',
          setting_value: '#d97706',
          category: 'branding',
          description: 'Primary brand color',
          setting_type: 'text'
        },
        {
          setting_key: 'secondary_color',
          setting_value: '#ffffff',
          category: 'branding',
          description: 'Secondary brand color',
          setting_type: 'text'
        }
      ];

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(defaultBrandingSettings)
      };
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};