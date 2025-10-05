import { Handler } from '@netlify/functions';
import postgres from 'postgres';

/**
 * Upgrade an existing user to admin
 * Updates their role and is_admin flag in the database
 */
export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // SECURITY: Check setup key
  const setupKey = event.headers['x-setup-key'];
  const expectedKey = process.env.SETUP_SECRET_KEY || 'CHANGE_THIS_SECRET_KEY_12345';

  if (setupKey !== expectedKey) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({
        error: 'Invalid setup key'
      })
    };
  }

  try {
    const { email } = JSON.parse(event.body || '{}');

    if (!email) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Email is required' })
      };
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'DATABASE_URL not configured' })
      };
    }

    const sql = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
    });

    // Update user to admin
    const result = await sql`
      UPDATE users
      SET
        role = 'super_admin',
        is_admin = true,
        updated_at = NOW()
      WHERE email = ${email}
      RETURNING id, email, role, is_admin
    `;

    await sql.end();

    if (result.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'User not found with that email'
        })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User upgraded to super admin',
        user: {
          id: result[0].id,
          email: result[0].email,
          role: result[0].role,
          isAdmin: result[0].is_admin
        }
      })
    };

  } catch (error) {
    console.error('Upgrade error:', error);
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
