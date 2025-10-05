import { Handler } from '@netlify/functions';
import postgres from 'postgres';

// Database connection
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
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
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

    // Extract printer ID from URL path (e.g., /api/printer/config/8/set-primary)
    const pathMatch = event.path.match(/\/printer\/config\/(\d+)\/set-primary/);
    const printerId = pathMatch ? parseInt(pathMatch[1]) : null;

    if (!printerId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Printer ID is required'
        })
      };
    }

    // Set all printers to inactive first
    await sql`
      UPDATE printer_config SET is_active = false
    `;

    // Set the selected printer as primary (active)
    const result = await sql`
      UPDATE printer_config
      SET is_active = true, updated_at = NOW()
      WHERE id = ${printerId}
      RETURNING *
    `;

    if (result.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Printer not found'
        })
      };
    }

    const printer = result[0];
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `${printer.name} is now the primary printer`,
        printer: {
          id: printer.id,
          name: printer.name,
          ipAddress: printer.ip_address,
          port: printer.port,
          printerType: printer.printer_type,
          isActive: printer.is_active
        }
      })
    };

  } catch (error) {
    console.error('Set primary printer error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}
