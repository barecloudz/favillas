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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

    if (event.httpMethod === 'GET') {
      // Get printer configurations
      const printers = await sql`
        SELECT * FROM printer_config 
        ORDER BY created_at DESC
      `;
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(printers.map(printer => ({
          id: printer.id,
          name: printer.name,
          ipAddress: printer.ip_address,
          port: printer.port,
          printerType: printer.printer_type,
          isActive: printer.is_active,
          createdAt: printer.created_at,
          updatedAt: printer.updated_at
        })))
      };

    } else if (event.httpMethod === 'POST') {
      // Create new printer configuration
      const { name, ipAddress, port, printerType, isActive } = JSON.parse(event.body || '{}');

      if (!name || !ipAddress || !port || !printerType) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            message: 'Missing required fields: name, ipAddress, port, printerType' 
          })
        };
      }

      const result = await sql`
        INSERT INTO printer_config (name, ip_address, port, printer_type, is_active)
        VALUES (${name}, ${ipAddress}, ${parseInt(port)}, ${printerType}, ${isActive !== false})
        RETURNING *
      `;

      const printer = result[0];
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({
          id: printer.id,
          name: printer.name,
          ipAddress: printer.ip_address,
          port: printer.port,
          printerType: printer.printer_type,
          isActive: printer.is_active,
          createdAt: printer.created_at,
          updatedAt: printer.updated_at
        })
      };

    } else if (event.httpMethod === 'PUT') {
      // Update printer configuration
      const { id, name, ipAddress, port, printerType, isActive } = JSON.parse(event.body || '{}');

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Printer ID is required' })
        };
      }

      const result = await sql`
        UPDATE printer_config 
        SET 
          name = ${name || null},
          ip_address = ${ipAddress || null},
          port = ${port ? parseInt(port) : null},
          printer_type = ${printerType || null},
          is_active = ${isActive !== undefined ? isActive : null},
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Printer configuration not found' })
        };
      }

      const printer = result[0];
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          id: printer.id,
          name: printer.name,
          ipAddress: printer.ip_address,
          port: printer.port,
          printerType: printer.printer_type,
          isActive: printer.is_active,
          createdAt: printer.created_at,
          updatedAt: printer.updated_at
        })
      };

    } else if (event.httpMethod === 'DELETE') {
      // Delete printer configuration
      const { id } = JSON.parse(event.body || '{}');

      if (!id) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ message: 'Printer ID is required' })
        };
      }

      const result = await sql`
        DELETE FROM printer_config 
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ message: 'Printer configuration not found' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Printer configuration deleted successfully' })
      };

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ message: 'Method not allowed' })
      };
    }

  } catch (error) {
    console.error('Printer Config API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      })
    };
  }
}