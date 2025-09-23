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
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();
    console.log('🔍 Debugging fallback delivery fee...');

    // Check if delivery_settings table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'delivery_settings'
      );
    `;
    console.log('📋 delivery_settings table exists:', tableExists[0].exists);

    if (tableExists[0].exists) {
      // Check table structure
      const columns = await sql`
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'delivery_settings'
        ORDER BY ordinal_position;
      `;
      console.log('🏗️ Table structure:', JSON.stringify(columns, null, 2));

      // Get all settings records
      const allSettings = await sql`SELECT * FROM delivery_settings ORDER BY id`;
      console.log('📊 All delivery settings records:', JSON.stringify(allSettings, null, 2));

      // Get the specific fallback fee value
      const fallbackFees = await sql`SELECT id, fallback_delivery_fee FROM delivery_settings ORDER BY id`;
      console.log('💰 Fallback delivery fees:', JSON.stringify(fallbackFees, null, 2));
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        tableExists: tableExists[0].exists,
        timestamp: new Date().toISOString(),
        message: 'Check console logs for detailed info'
      })
    };

  } catch (error) {
    console.error('❌ Debug error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};