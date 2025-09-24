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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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
    // Authenticate admin user
    const authPayload = await authenticateToken(event);
    if (!authPayload || !isStaff(authPayload)) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized - Admin access required' })
      };
    }

    const sql = getDB();

    // Create qr_codes table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS qr_codes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) NOT NULL DEFAULT 'menu', -- 'menu', 'social', 'table', 'promotion'
        url TEXT NOT NULL,
        qr_data TEXT NOT NULL,
        table_number INTEGER,
        is_active BOOLEAN DEFAULT true,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by_user_id INTEGER REFERENCES users(id)
      )
    `;

    if (event.httpMethod === 'GET') {
      // Get all QR codes
      const qrCodes = await sql`
        SELECT
          qc.*,
          u.first_name,
          u.last_name,
          u.username
        FROM qr_codes qc
        LEFT JOIN users u ON qc.created_by_user_id = u.id
        ORDER BY qc.created_at DESC
      `;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(qrCodes)
      };
    }

    if (event.httpMethod === 'POST') {
      // Create new QR code
      const { name, description, type, url, table_number } = JSON.parse(event.body || '{}');

      if (!name || !url) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Name and URL are required' })
        };
      }

      // Generate QR code data URL
      const baseUrl = process.env.URL || 'https://favillasnypizza.netlify.app';
      const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;

      // For now, we'll store the URL directly. In a production app, you'd generate actual QR code image data
      const qrData = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fullUrl)}`;

      const newQrCode = await sql`
        INSERT INTO qr_codes (name, description, type, url, qr_data, table_number, created_by_user_id)
        VALUES (${name}, ${description || ''}, ${type || 'menu'}, ${fullUrl}, ${qrData}, ${table_number || null}, ${authPayload.userId})
        RETURNING *
      `;

      console.log(`✅ Created QR code: ${name} -> ${fullUrl}`);

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(newQrCode[0])
      };
    }

    if (event.httpMethod === 'PUT') {
      // Update existing QR code
      const pathParts = event.path.split('/');
      const qrCodeId = pathParts[pathParts.length - 1];

      if (!qrCodeId || isNaN(parseInt(qrCodeId))) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid QR code ID' })
        };
      }

      const { name, description, type, url, table_number, is_active } = JSON.parse(event.body || '{}');

      // Generate new QR code data if URL changed
      let updateData: any = {
        name,
        description: description || '',
        type: type || 'menu',
        table_number: table_number || null,
        is_active: is_active !== undefined ? is_active : true,
        updated_at: new Date()
      };

      if (url) {
        const baseUrl = process.env.URL || 'https://favillasnypizza.netlify.app';
        const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
        updateData.url = fullUrl;
        updateData.qr_data = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fullUrl)}`;
      }

      const updatedQrCode = await sql`
        UPDATE qr_codes
        SET ${sql(updateData)}
        WHERE id = ${qrCodeId}
        RETURNING *
      `;

      if (updatedQrCode.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'QR code not found' })
        };
      }

      console.log(`✅ Updated QR code: ${qrCodeId}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedQrCode[0])
      };
    }

    if (event.httpMethod === 'DELETE') {
      // Delete QR code
      const pathParts = event.path.split('/');
      const qrCodeId = pathParts[pathParts.length - 1];

      if (!qrCodeId || isNaN(parseInt(qrCodeId))) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid QR code ID' })
        };
      }

      const deletedQrCode = await sql`
        DELETE FROM qr_codes
        WHERE id = ${qrCodeId}
        RETURNING *
      `;

      if (deletedQrCode.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'QR code not found' })
        };
      }

      console.log(`✅ Deleted QR code: ${qrCodeId}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'QR code deleted successfully' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('QR Codes API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Failed to manage QR codes',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};