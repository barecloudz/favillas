import { Handler } from '@netlify/functions';
import postgres from 'postgres';

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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  try {
    const sql = getDB();

    if (event.httpMethod === 'GET') {
      // Get pause services settings from system_settings table
      const settings = await sql`
        SELECT setting_key as key, setting_value as value FROM system_settings
        WHERE setting_key LIKE 'pause_%'
        ORDER BY setting_key
      `;
      
      // Convert to object format
      const pauseSettings = {
        isPaused: false,
        pauseMessage: 'We are temporarily closed. Please check back later.',
        pauseStartTime: null,
        pauseEndTime: null,
        pauseReason: 'maintenance'
      };
      
      settings.forEach(setting => {
        if (setting.key === 'pause_enabled') pauseSettings.isPaused = setting.value === 'true';
        if (setting.key === 'pause_message') pauseSettings.pauseMessage = setting.value;
        if (setting.key === 'pause_start_time') pauseSettings.pauseStartTime = setting.value;
        if (setting.key === 'pause_end_time') pauseSettings.pauseEndTime = setting.value;
        if (setting.key === 'pause_reason') pauseSettings.pauseReason = setting.value;
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(pauseSettings)
      };
    }

    if (event.httpMethod === 'POST') {
      // Update pause services settings
      const data = JSON.parse(event.body || '{}');
      
      await sql.begin(async (sql) => {
        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('pause_enabled', ${data.isPaused ? 'true' : 'false'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('pause_message', ${data.pauseMessage || 'We are temporarily closed. Please check back later.'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('pause_start_time', ${data.pauseStartTime || ''})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('pause_end_time', ${data.pauseEndTime || ''})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('pause_reason', ${data.pauseReason || 'maintenance'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Pause settings updated' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Pause Services API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Failed to process pause settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
