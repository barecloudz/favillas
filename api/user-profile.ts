import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';
import { authenticateToken } from './_shared/auth';

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

// Using shared authentication function from _shared/auth.ts

export const handler: Handler = async (event, context) => {
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
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

  const authPayload = await authenticateToken(event);
  if (!authPayload) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  try {
    const sql = getDB();

    if (event.httpMethod === 'GET') {
      // Get user profile - support both authentication types
      let user;

      if (authPayload.isSupabase && authPayload.supabaseUserId) {
        console.log('📝 Getting Supabase user profile:', authPayload.supabaseUserId);

        // Get the most recent user record in case of duplicates
        user = await sql`
          SELECT id, username, email, phone, address, city, state, zip_code, role, created_at, supabase_user_id, first_name, last_name
          FROM users
          WHERE supabase_user_id = ${authPayload.supabaseUserId}
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        `;

        console.log('📝 Found user records count for supabase_user_id:', user.length);
        if (user.length > 0) {
          console.log('📝 Using user record:', { id: user[0].id, username: user[0].username, email: user[0].email });
        }
      } else if (authPayload.userId) {
        console.log('📝 Getting legacy user profile:', authPayload.userId);
        user = await sql`
          SELECT id, username, email, phone, address, city, state, zip_code, role, created_at
          FROM users
          WHERE id = ${authPayload.userId}
        `;
      } else {
        console.log('❌ No valid user ID found in auth payload:', authPayload);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid user authentication - missing user ID' })
        };
      }

      if (user.length === 0) {
        console.log('👤 User not found, creating new user record for:', authPayload.supabaseUserId || authPayload.userId);

        // Auto-create user if they don't exist
        try {
          let newUser;

          if (authPayload.isSupabase && authPayload.supabaseUserId) {
            // Create Supabase user
            newUser = await sql`
              INSERT INTO users (
                supabase_user_id, username, email, role, phone, address, city, state, zip_code,
                first_name, last_name, password, marketing_opt_in, created_at, updated_at
              ) VALUES (
                ${authPayload.supabaseUserId},
                ${authPayload.email || authPayload.username || 'google_user'},
                ${authPayload.email || authPayload.username || 'user@example.com'},
                ${authPayload.role || 'customer'},
                '',
                '',
                '',
                '',
                '',
                ${authPayload.firstName || (authPayload.fullName ? authPayload.fullName.split(' ')[0] : 'User')},
                ${authPayload.lastName || (authPayload.fullName ? authPayload.fullName.split(' ').slice(1).join(' ') : 'Customer')},
                'GOOGLE_USER',
                ${authPayload.marketingOptIn !== false},
                NOW(),
                NOW()
              )
              RETURNING *
            `;
          } else if (authPayload.userId) {
            // Create legacy user
            newUser = await sql`
              INSERT INTO users (
                id, username, email, role, phone, address, city, state, zip_code,
                first_name, last_name, password, created_at, updated_at
              ) VALUES (
                ${authPayload.userId},
                ${authPayload.username || 'user'},
                ${authPayload.username || 'user@example.com'},
                ${authPayload.role || 'customer'},
                '',
                '',
                '',
                '',
                '',
                'User',
                'Customer',
                'LEGACY_USER',
                NOW(),
                NOW()
              )
              RETURNING *
            `;
          }

          if (newUser && newUser.length > 0) {
            console.log('✅ Auto-created user:', newUser[0]);
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(newUser[0])
            };
          }
        } catch (createError) {
          console.error('❌ Failed to auto-create user:', createError);
        }

        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'User not found and could not be created' })
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(user[0])
      };

    } else if (event.httpMethod === 'PATCH') {
      // Update user profile - support comprehensive contact information
      const { first_name, last_name, email, phone, address, city, state, zip_code } = JSON.parse(event.body || '{}');

      console.log('🔄 Updating user profile:', {
        userId: authPayload.userId,
        supabaseUserId: authPayload.supabaseUserId,
        isSupabase: authPayload.isSupabase,
        username: authPayload.username,
        contactData: { first_name, last_name, email, phone, address, city, state, zip_code },
        rawBody: event.body
      });

      if (authPayload.isSupabase && authPayload.supabaseUserId) {
        // Handle Supabase user profile update - get most recent record
        const existingSupabaseUser = await sql`
          SELECT id, username, email, first_name, last_name FROM users
          WHERE supabase_user_id = ${authPayload.supabaseUserId}
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        `;

        console.log('🔍 PATCH: Found existing user records:', existingSupabaseUser.length);
        if (existingSupabaseUser.length > 0) {
          console.log('🔍 PATCH: Will update user record:', {
            id: existingSupabaseUser[0].id,
            currentUsername: existingSupabaseUser[0].username,
            currentEmail: existingSupabaseUser[0].email
          });
        }

        if (existingSupabaseUser.length === 0) {
          console.log('⚠️ Supabase user not found, creating user account for:', authPayload.supabaseUserId);
          console.log('🔍 Auth payload details:', {
            email: authPayload.email,
            username: authPayload.username,
            firstName: authPayload.firstName,
            lastName: authPayload.lastName,
            fullName: authPayload.fullName
          });

          try {
            // Create user record for Supabase user using actual Google data
            const newUserResult = await sql`
              INSERT INTO users (
                supabase_user_id, username, email, role, phone, address, city, state, zip_code,
                first_name, last_name, password, marketing_opt_in, created_at, updated_at
              ) VALUES (
                ${authPayload.supabaseUserId},
                ${authPayload.email || authPayload.username || 'google_user'},
                ${authPayload.email || authPayload.username || 'user@example.com'},
                'customer',
                ${phone || ''},
                ${address || ''},
                ${city || ''},
                ${state || ''},
                ${zip_code || ''},
                ${authPayload.firstName || (authPayload.fullName ? authPayload.fullName.split(' ')[0] : 'User')},
                ${authPayload.lastName || (authPayload.fullName ? authPayload.fullName.split(' ').slice(1).join(' ') : 'Google User')},
                'GOOGLE_USER',
                ${authPayload.marketingOptIn !== false},
                NOW(),
                NOW()
              )
              RETURNING *
            `;

            // Initialize user points using correct schema for Supabase user
            try {
              await sql`
                INSERT INTO user_points (supabase_user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
                VALUES (${authPayload.supabaseUserId}, 0, 0, 0, NOW(), NOW(), NOW())
              `;
            } catch (pointsError) {
              // User points might already exist - this is OK
              console.log('User points already exist for Supabase user:', authPayload.supabaseUserId);
            }

            console.log('✅ Created/Updated Supabase user account with points system:', newUserResult[0]);

            // Return the newly created user data
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify(newUserResult[0])
            };
          } catch (createError) {
            console.error('❌ Error creating Supabase user:', createError);
            return {
              statusCode: 500,
              headers,
              body: JSON.stringify({ error: 'Failed to create user profile', details: createError.message })
            };
          }
        }

        // Update Supabase user profile - include Google user data correction
        console.log('🔍 UPDATE: Auth payload details for name correction:', {
          firstName: authPayload.firstName,
          lastName: authPayload.lastName,
          fullName: authPayload.fullName,
          email: authPayload.email,
          calculatedFirstName: authPayload.firstName || (authPayload.fullName ? authPayload.fullName.split(' ')[0] : 'User'),
          calculatedLastName: authPayload.lastName || (authPayload.fullName ? authPayload.fullName.split(' ').slice(1).join(' ') : 'Google User')
        });

        const updatedUser = await sql`
          UPDATE users
          SET
            phone = ${phone || ''},
            address = ${address || ''},
            city = ${city || ''},
            state = ${state || ''},
            zip_code = ${zip_code || ''},
            email = ${email || authPayload.email || authPayload.username},
            first_name = ${first_name || authPayload.firstName || (authPayload.fullName ? authPayload.fullName.split(' ')[0] : 'User')},
            last_name = ${last_name || authPayload.lastName || (authPayload.fullName ? authPayload.fullName.split(' ').slice(1).join(' ') : 'Google User')},
            updated_at = NOW()
          WHERE id = ${existingSupabaseUser[0].id}
          RETURNING id, username, email, phone, address, city, state, zip_code, role, created_at, updated_at, supabase_user_id, first_name, last_name
        `;

        if (updatedUser.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'User not found' })
          };
        }

        console.log('✅ Supabase user profile updated successfully:', {
          updatedRows: updatedUser.length,
          updatedData: updatedUser[0]
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updatedUser[0])
        };

      } else if (authPayload.userId) {
        // Handle legacy user profile update
        const existingUser = await sql`SELECT id FROM users WHERE id = ${authPayload.userId}`;

        if (existingUser.length === 0) {
          console.log('⚠️ Legacy user not found, creating user account');

          // Create user record for legacy user
          try {
            await sql`
              INSERT INTO users (
                id, username, email, role, phone, address, city, state, zip_code,
                first_name, last_name, password, created_at, updated_at
              ) VALUES (
                ${authPayload.userId},
                ${authPayload.username || 'user'},
                ${authPayload.username || 'user@example.com'},
                'customer',
                ${phone || ''},
                ${address || ''},
                ${city || ''},
                ${state || ''},
                ${zip_code || ''},
                ${authPayload.username?.split('@')[0] || 'User'},
                'Customer',
                'AUTH_USER',
                NOW(),
                NOW()
              )
            `;
          } catch (userError) {
            // User might already exist - this is OK
            console.log('Legacy user already exists:', authPayload.userId);
          }

          // Initialize user points using correct schema for legacy user
          try {
            await sql`
              INSERT INTO user_points (user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
              VALUES (${authPayload.userId}, 0, 0, 0, NOW(), NOW(), NOW())
            `;
          } catch (pointsError) {
            // User points might already exist - this is OK
            console.log('User points already exist for legacy user:', authPayload.userId);
          }

          console.log('✅ Created legacy user account with points system');
        }

        // Update legacy user profile - allow setting to empty values
        const updatedUser = await sql`
          UPDATE users
          SET
            phone = ${phone || ''},
            address = ${address || ''},
            city = ${city || ''},
            state = ${state || ''},
            zip_code = ${zip_code || ''},
            email = ${email || authPayload.username},
            first_name = ${first_name || authPayload.username?.split('@')[0] || 'User'},
            last_name = ${last_name || 'Customer'},
            updated_at = NOW()
          WHERE id = ${authPayload.userId}
          RETURNING id, username, email, phone, address, city, state, zip_code, role, created_at, updated_at, first_name, last_name
        `;

        if (updatedUser.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'User not found' })
          };
        }

        console.log('✅ Legacy user profile updated successfully');

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updatedUser[0])
        };
      } else {
        console.log('❌ No valid user ID found in auth payload for PATCH:', authPayload);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid user authentication - missing user ID' })
        };
      }

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

  } catch (error: any) {
    console.error('User profile API error:', error);
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