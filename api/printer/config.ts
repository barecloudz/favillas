import { VercelRequest, VercelResponse } from '@vercel/node';
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const sql = getDB();

    if (req.method === 'GET') {
      // Get printer configurations
      const printers = await sql`
        SELECT * FROM printer_config 
        ORDER BY created_at DESC
      `;
      
      return res.status(200).json(printers.map(printer => ({
        id: printer.id,
        name: printer.name,
        ipAddress: printer.ip_address,
        port: printer.port,
        printerType: printer.printer_type,
        isActive: printer.is_active,
        createdAt: printer.created_at,
        updatedAt: printer.updated_at
      })));

    } else if (req.method === 'POST') {
      // Create new printer configuration
      const { name, ipAddress, port, printerType, isActive } = req.body;

      if (!name || !ipAddress || !port || !printerType) {
        return res.status(400).json({ 
          message: 'Missing required fields: name, ipAddress, port, printerType' 
        });
      }

      const result = await sql`
        INSERT INTO printer_config (name, ip_address, port, printer_type, is_active)
        VALUES (${name}, ${ipAddress}, ${parseInt(port)}, ${printerType}, ${isActive !== false})
        RETURNING *
      `;

      const printer = result[0];
      return res.status(201).json({
        id: printer.id,
        name: printer.name,
        ipAddress: printer.ip_address,
        port: printer.port,
        printerType: printer.printer_type,
        isActive: printer.is_active,
        createdAt: printer.created_at,
        updatedAt: printer.updated_at
      });

    } else if (req.method === 'PUT') {
      // Update printer configuration
      const { id, name, ipAddress, port, printerType, isActive } = req.body;

      if (!id) {
        return res.status(400).json({ message: 'Printer ID is required' });
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
        return res.status(404).json({ message: 'Printer configuration not found' });
      }

      const printer = result[0];
      return res.status(200).json({
        id: printer.id,
        name: printer.name,
        ipAddress: printer.ip_address,
        port: printer.port,
        printerType: printer.printer_type,
        isActive: printer.is_active,
        createdAt: printer.created_at,
        updatedAt: printer.updated_at
      });

    } else if (req.method === 'DELETE') {
      // Delete printer configuration
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({ message: 'Printer ID is required' });
      }

      const result = await sql`
        DELETE FROM printer_config 
        WHERE id = ${id}
        RETURNING *
      `;

      if (result.length === 0) {
        return res.status(404).json({ message: 'Printer configuration not found' });
      }

      return res.status(200).json({ message: 'Printer configuration deleted successfully' });

    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

  } catch (error) {
    console.error('Printer Config API error:', error);
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
}