import { Handler } from '@netlify/functions';
import jwt from 'jsonwebtoken';

export const handler: Handler = async (event, context) => {
  console.log('🚀 Admin-login function called:', {
    method: event.httpMethod,
    origin: event.headers.origin,
    hasBody: !!event.body
  });

  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || 'http://localhost:5173',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ message: 'Method not allowed' }) };
  }

  try {
    const { email, password } = JSON.parse(event.body || '{}');

    if (!email || !password) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'Email and password required' })
      };
    }

    // SECURITY FIX: Remove hardcoded credentials
    // Admin users must now authenticate via Google OAuth through Supabase
    // Or be created in the database via /api/users endpoint with admin role

    // Check database for admin user
    const postgres = (await import('postgres')).default;
    const sql = postgres(process.env.DATABASE_URL!, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
    });

    const { scrypt, randomBytes } = await import('crypto');
    const { promisify } = await import('util');
    const scryptAsync = promisify(scrypt);

    // Look up user by email
    const users = await sql`
      SELECT id, username, email, first_name, last_name, password, role, is_admin, is_active
      FROM users
      WHERE email = ${email}
      AND (role = 'admin' OR role = 'super_admin' OR is_admin = true)
      AND is_active = true
    `;

    if (users.length === 0) {
      await sql.end();
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'Invalid credentials' })
      };
    }

    const user = users[0];

    // Verify password using scrypt
    const [hashedPassword, salt] = user.password.split('.');
    const hashedPasswordBuf = Buffer.from(hashedPassword, 'hex');
    const suppliedPasswordBuf = (await scryptAsync(password, salt, 64)) as Buffer;

    if (!hashedPasswordBuf.equals(suppliedPasswordBuf)) {
      await sql.end();
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ message: 'Invalid credentials' })
      };
    }

    await sql.end();

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ message: 'Server configuration error' })
      };
    }

    const userPayload = {
      userId: user.id,
      username: user.username,
      role: user.role
    };

    const token = jwt.sign(userPayload, jwtSecret, { expiresIn: '7d' });

    // Set cookie
    const origin = event.headers.origin || '';
    const isProduction = origin.includes('netlify.app') || origin.includes('favillasnypizza');
    const cookieOptions = `auth-token=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; SameSite=Lax${isProduction ? '; Secure' : ''}`;

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Set-Cookie': cookieOptions
      },
      body: JSON.stringify({
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isAdmin: user.is_admin,
        isActive: user.is_active,
        rewards: 0
      })
    };

  } catch (error) {
    console.error('Admin login error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Server error' })
    };
  }
};