import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import * as crypto from 'crypto';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod === 'POST') {
    try {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) {
        throw new Error('DATABASE_URL not configured');
      }

      const sql = postgres(databaseUrl, {
        max: 1,
        idle_timeout: 20,
        connect_timeout: 10,
        prepare: false,
        keep_alive: false,
      });

      // Check if superadmin already exists
      const existingUser = await sql`
        SELECT id, username FROM users WHERE username = 'superadmin'
      `;

      if (existingUser.length > 0) {
        await sql.end();
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Superadmin user already exists',
            userId: existingUser[0].id
          })
        };
      }

      // Create the superadmin user with the same hashed password from storage.ts
      const hashedPassword = "0e4f012c77eb59901e58c427862703e7f1cdee73645a560b02e3d80f129ba6238bb281b7b0f19bb9b69b64e0a7f2cf5428699afd72826c01c8f12e5738aa4ec9.082eda566d01ce0528bee7add3247a7c"; // "superadmin123"

      const newUser = await sql`
        INSERT INTO users (
          username,
          email,
          password,
          first_name,
          last_name,
          phone,
          is_admin,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          'superadmin',
          'superadmin@favillas.com',
          ${hashedPassword},
          'Super',
          'Admin',
          '555-0124',
          true,
          true,
          NOW(),
          NOW()
        ) RETURNING id, username, email
      `;

      await sql.end();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Superadmin user created successfully',
          user: newUser[0]
        })
      };

    } catch (error: any) {
      console.error('Error creating superadmin:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: error.message
        })
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ message: 'Method not allowed' })
  };
};