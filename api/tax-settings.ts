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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
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
      // Get tax settings from system_settings table
      const settings = await sql`
        SELECT setting_key as key, setting_value as value FROM system_settings
        WHERE setting_key LIKE 'tax_%'
        ORDER BY setting_key
      `;
      
      // Convert to object format
      const taxSettings = {
        enabled: false,
        rate: 0.08,
        includeTaxInPrice: false,
        taxCategories: []
      };
      
      settings.forEach(setting => {
        if (setting.key === 'tax_enabled') taxSettings.enabled = setting.value === 'true';
        if (setting.key === 'tax_rate') taxSettings.rate = parseFloat(setting.value) || 0.08;
        if (setting.key === 'tax_include_in_price') taxSettings.includeTaxInPrice = setting.value === 'true';
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(taxSettings)
      };
    }

    if (event.httpMethod === 'PUT') {
      // Update tax settings
      const data = JSON.parse(event.body || '{}');
      
      await sql.begin(async (sql) => {
        await sql`
          INSERT INTO system_settings (key, value) 
          VALUES ('tax_enabled', ${data.enabled ? 'true' : 'false'})
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `;
        
        await sql`
          INSERT INTO system_settings (key, value) 
          VALUES ('tax_rate', ${data.rate?.toString() || '0.08'})
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `;
        
        await sql`
          INSERT INTO system_settings (key, value) 
          VALUES ('tax_include_in_price', ${data.includeTaxInPrice ? 'true' : 'false'})
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `;
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Tax settings updated' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Tax Settings API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Failed to process tax settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
