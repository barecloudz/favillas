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
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const sql = getDB();

    // GET - Public endpoint to check if catering button is enabled
    if (event.httpMethod === 'GET') {
      try {
        const result = await sql`
          SELECT setting_value FROM system_settings
          WHERE setting_key = 'catering_button_enabled'
        `;

        // Default to enabled if setting doesn't exist
        const isEnabled = result.length > 0 ? result[0].setting_value === 'true' : true;

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            catering_button_enabled: isEnabled
          })
        };
      } catch (error) {
        // If table doesn't exist, return default (enabled)
        console.log('Catering settings table check failed, returning default:', error);
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            catering_button_enabled: true
          })
        };
      }
    }

    // PUT - Admin only - Update catering button setting
    if (event.httpMethod === 'PUT') {
      // Authenticate admin user
      const authPayload = await authenticateToken(event);
      if (!authPayload) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized' })
        };
      }

      // Check role-based permissions
      const allowedRoles = ['admin', 'super_admin', 'manager'];
      if (!allowedRoles.includes(authPayload.role)) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Forbidden - Insufficient permissions' })
        };
      }

      const body = JSON.parse(event.body || '{}');
      const { catering_button_enabled } = body;

      if (catering_button_enabled === undefined) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'catering_button_enabled is required' })
        };
      }

      // Upsert the setting
      const updateResult = await sql`
        INSERT INTO system_settings (setting_key, setting_value, category, description, setting_type, display_name, updated_at)
        VALUES (
          'catering_button_enabled',
          ${catering_button_enabled.toString()},
          'catering',
          'Controls whether the catering button is visible in mobile navigation',
          'boolean',
          'Catering Button Enabled',
          NOW()
        )
        ON CONFLICT (setting_key)
        DO UPDATE SET
          setting_value = ${catering_button_enabled.toString()},
          updated_at = NOW()
        RETURNING *
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          catering_button_enabled: catering_button_enabled,
          setting: updateResult[0]
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Catering settings error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process catering settings request',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
