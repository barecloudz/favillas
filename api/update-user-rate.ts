import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, isStaff } from './_shared/auth';

export const handler: Handler = async (event, context) => {
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'PUT, OPTIONS',
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

  console.log('💰 UPDATE USER RATE API CALLED');
  console.log('📋 Request Method:', event.httpMethod);

  // Authenticate using Supabase token
  const authPayload = await authenticateToken(event);
  if (!authPayload) {
    console.log('❌ Authentication failed - no valid token');
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  console.log('✅ Authentication successful:', authPayload);

  if (!isStaff(authPayload)) {
    console.log('❌ Authorization failed - insufficient role:', authPayload.role);
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Admin access required' })
    };
  }

  console.log('✅ Authorization successful - user has admin access');

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

    if (event.httpMethod === 'PUT') {
      const requestData = JSON.parse(event.body || '{}');
      const { userId, hourlyRate, department } = requestData;

      console.log('💰 Updating user pay rate:', { userId, hourlyRate, department });

      if (!userId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            error: 'User ID is required'
          })
        };
      }

      // Update user hourly rate and department
      const updatedUser = await sql`
        UPDATE users
        SET
          hourly_rate = ${hourlyRate || null},
          department = ${department || null},
          updated_at = NOW()
        WHERE id = ${userId}
        RETURNING id, first_name, last_name, email, role, hourly_rate, department
      `;

      if (updatedUser.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({
            error: 'User not found'
          })
        };
      }

      console.log('✅ User pay rate updated successfully:', updatedUser[0]);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'User pay rate updated successfully',
          user: {
            id: updatedUser[0].id,
            firstName: updatedUser[0].first_name,
            lastName: updatedUser[0].last_name,
            email: updatedUser[0].email,
            role: updatedUser[0].role,
            hourlyRate: parseFloat(updatedUser[0].hourly_rate) || null,
            department: updatedUser[0].department
          }
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error: any) {
    console.error('❌ Update user rate error:', error.message);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};