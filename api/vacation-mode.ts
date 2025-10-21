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

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  // For GET requests (checking vacation mode status), allow public access
  // For PUT requests (updating settings), require admin authentication
  if (event.httpMethod === 'PUT') {
    const authPayload = await authenticateToken(event);
    if (!authPayload || !isStaff(authPayload)) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized - Admin access required' })
      };
    }
  }

  try {
    const sql = getDB();

    if (event.httpMethod === 'GET') {
      // Get vacation mode settings from system_settings table
      const settings = await sql`
        SELECT setting_key as key, setting_value as value FROM system_settings
        WHERE setting_key LIKE 'vacation_%' OR setting_key LIKE 'pause_%'
        ORDER BY setting_key
      `;

      // Convert to object format with defaults
      const vacationMode = {
        isEnabled: false,
        startDate: '',
        endDate: '',
        message: 'We are currently on vacation and will be back soon. Thank you for your patience!',
        reason: '',
        // Also include pause settings for compatibility
        isPaused: false,
        pauseMessage: 'We are temporarily closed. Please check back later.'
      };

      settings.forEach(setting => {
        if (setting.key === 'vacation_enabled') vacationMode.isEnabled = setting.value === 'true';
        if (setting.key === 'vacation_start_date') vacationMode.startDate = setting.value || '';
        if (setting.key === 'vacation_end_date') vacationMode.endDate = setting.value || '';
        if (setting.key === 'vacation_message') vacationMode.message = setting.value || vacationMode.message;
        if (setting.key === 'vacation_reason') vacationMode.reason = setting.value || '';
        if (setting.key === 'pause_enabled') vacationMode.isPaused = setting.value === 'true';
        if (setting.key === 'pause_message') vacationMode.pauseMessage = setting.value || vacationMode.pauseMessage;
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(vacationMode)
      };
    }

    if (event.httpMethod === 'PUT') {
      // Update vacation mode settings
      const data = JSON.parse(event.body || '{}');

      await sql.begin(async (sql) => {
        // Update vacation mode settings
        await sql`
          INSERT INTO system_settings (setting_key, setting_value, display_name)
          VALUES ('vacation_enabled', ${data.isEnabled ? 'true' : 'false'}, 'Vacation Mode Enabled')
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value, display_name)
          VALUES ('vacation_start_date', ${data.startDate || ''}, 'Vacation Start Date')
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value, display_name)
          VALUES ('vacation_end_date', ${data.endDate || ''}, 'Vacation End Date')
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value, display_name)
          VALUES ('vacation_message', ${data.message || 'We are currently on vacation and will be back soon. Thank you for your patience!'}, 'Vacation Message')
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value, display_name)
          VALUES ('vacation_reason', ${data.reason || ''}, 'Vacation Reason')
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;
      });

      console.log(`✅ Vacation mode updated: ${data.isEnabled ? 'ENABLED' : 'DISABLED'}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Vacation mode settings updated' })
      };
    }

  } catch (error) {
    console.error('Vacation Mode API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Failed to process vacation mode settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};