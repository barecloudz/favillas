import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { scrypt, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import { getCorsHeaders, validateInput, loginSchema, withDB } from './utils/auth';

const scryptAsync = promisify(scrypt);


async function comparePasswords(supplied: string, stored: string) {
  try {
    if (!stored) return false;
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) return false;
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
}

export const handler: Handler = async (event, context) => {
  const headers = getCorsHeaders(event.headers.origin);
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    const requestData = JSON.parse(event.body || '{}');
    const { username, password } = requestData;

    // Validate input
    const validation = validateInput(requestData, loginSchema);
    if (!validation.isValid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          message: 'Validation failed',
          errors: validation.errors
        })
      };
    }

    // Query user data
    const user = await withDB(async (sql) => {
      const users = await sql`
        SELECT
          id,
          username,
          password,
          email,
          first_name,
          last_name,
          phone,
          address,
          city,
          state,
          zip_code,
          role,
          is_admin,
          is_active,
          rewards,
          stripe_customer_id,
          marketing_opt_in,
          created_at
        FROM users
        WHERE username = ${username}
        LIMIT 1
      `;
      return users[0];
    });

    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          message: 'Invalid credentials'
        })
      };
    }

    // Check password
    const isValidPassword = await comparePasswords(password, user.password);
    
    if (!isValidPassword) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          message: 'Invalid credentials' 
        })
      };
    }

    // Login successful - no sensitive data logging
    
    // Return user data (excluding password)
    const safeUser = {
      id: user.id,
      username: user.username || 'unknown',
      email: user.email || 'no-email',
      firstName: user.first_name || 'Unknown',
      lastName: user.last_name || 'User',
      phone: user.phone || null,
      address: user.address || null,
      city: user.city || null,
      state: user.state || null,
      zipCode: user.zip_code || null,
      role: user.role || 'customer',
      isAdmin: user.is_admin || false,
      isActive: user.is_active !== false,
      rewards: user.rewards || 0,
      stripeCustomerId: user.stripe_customer_id || null,
      marketingOptIn: user.marketing_opt_in !== false,
      createdAt: user.created_at
    };
    
    // User object prepared for response
    
    // Create JWT token with secure secret handling
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }
    
    const token = jwt.sign(
      { 
        userId: safeUser.id,
        username: safeUser.username,
        role: safeUser.role,
        isAdmin: safeUser.isAdmin 
      },
      secret,
      { expiresIn: '7d' } // Token expires in 7 days
    );
    
    // Set token as HTTP-only cookie
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieHeader = `auth-token=${token}; HttpOnly; Secure=${isProduction}; SameSite=${isProduction ? 'Strict' : 'Lax'}; Path=/; Max-Age=${7 * 24 * 60 * 60}`;
    
    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Set-Cookie': cookieHeader
      },
      body: JSON.stringify(safeUser)
    };
    
  } catch (error) {
    // Log error without sensitive data
    console.error('Login error occurred:', error instanceof Error ? error.message : 'Unknown error');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Internal server error'
      })
    };
  }
};