import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import { getCorsHeaders, validateInput, registerSchema, withDB } from './utils/auth';

const scryptAsync = promisify(scrypt);


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
    const { firstName, lastName, email, phone, address, password } = requestData;

    // Validate input
    const validation = validateInput(requestData, registerSchema);
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

    // Check if user already exists
    const existingUser = await withDB(async (sql) => {
      return await sql`SELECT id FROM users WHERE email = ${email}`;
    });

    if (existingUser.length > 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ message: 'User already exists with this email' })
      };
    }
    
    // Hash password
    const salt = randomBytes(16).toString('hex');
    const hashedPassword = (await scryptAsync(password, salt, 64)) as Buffer;
    const passwordHash = `${hashedPassword.toString('hex')}.${salt}`;
    
    // Create user with proper points initialization
    const result = await withDB(async (sql) => {
      return await sql.begin(async (sql: any) => {
      // Create user
      const userResult = await sql`
        INSERT INTO users (first_name, last_name, email, phone, address, password_hash, role, is_active, rewards, created_at, updated_at)
        VALUES (${firstName}, ${lastName}, ${email}, ${phone || ''}, ${address || ''}, ${passwordHash}, 'customer', true, 0, NOW(), NOW())
        RETURNING id, first_name, last_name, email, phone, address, role, is_active, created_at
      `;
      
      const user = userResult[0];
      
      // Initialize user_points record with 0 points
      await sql`
        INSERT INTO user_points (user_id, points, total_earned, total_redeemed, created_at, updated_at)
        VALUES (${user.id}, 0, 0, 0, NOW(), NOW())
      `;
      
      // Create initial transaction record for audit trail
      await sql`
        INSERT INTO points_transactions (user_id, type, points, description, created_at)
        VALUES (${user.id}, 'signup', 0, 'User account created with 0 points', NOW())
      `;
      
        return user;
      });
    });
    
    const user = result;
    
    // Generate JWT token with secure secret handling
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.email,
        role: user.role 
      },
      jwtSecret,
      { expiresIn: '7d' }
    );
    
    // Return user data without password
    const safeUser = {
      id: user.id,
      username: user.email,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      address: user.address,
      role: user.role,
      isActive: user.is_active,
      createdAt: user.created_at,
      token
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(safeUser)
    };
  } catch (error: any) {
    // Log error without sensitive data
    console.error('Registration error occurred:', error instanceof Error ? error.message : 'Unknown error');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Internal server error'
      })
    };
  }
};