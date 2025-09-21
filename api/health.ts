import { Handler } from '@netlify/functions';
import postgres from 'postgres';

export const handler: Handler = async (event, context) => {
  // Simple health check endpoint for monitoring
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    // Cache health check for 1 minute to reduce load
    'Cache-Control': 'public, max-age=60, s-maxage=60'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod === 'GET') {
    // Run migration if ?migrate=true is passed
    if (event.queryStringParameters?.migrate === 'true') {
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

        // Create tables
        await sql`
          CREATE TABLE IF NOT EXISTS store_settings (
            id SERIAL PRIMARY KEY,
            store_name VARCHAR(255) NOT NULL DEFAULT 'Favillas NY Pizza',
            address TEXT NOT NULL,
            latitude DECIMAL(10, 8) NOT NULL,
            longitude DECIMAL(11, 8) NOT NULL,
            phone VARCHAR(20),
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `;

        await sql`
          CREATE TABLE IF NOT EXISTS delivery_zones (
            id SERIAL PRIMARY KEY,
            zone_name VARCHAR(100) NOT NULL,
            min_distance_miles DECIMAL(4, 2) NOT NULL DEFAULT 0.0,
            max_distance_miles DECIMAL(4, 2) NOT NULL,
            delivery_fee DECIMAL(6, 2) NOT NULL,
            estimated_time_minutes INTEGER NOT NULL DEFAULT 30,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
          )
        `;

        await sql`
          CREATE TABLE IF NOT EXISTS delivery_blackouts (
            id SERIAL PRIMARY KEY,
            area_name VARCHAR(255) NOT NULL,
            zip_codes TEXT[],
            reason VARCHAR(255),
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
          )
        `;

        // Insert store location
        await sql`
          INSERT INTO store_settings (store_name, address, latitude, longitude, phone) VALUES
          ('Favillas NY Pizza', '5 Regent Park Blvd #107, Asheville, NC 28806', 35.59039, -82.58198, '(828) 225-2885')
          ON CONFLICT DO NOTHING
        `;

        // Insert delivery zones with updated pricing
        await sql`
          INSERT INTO delivery_zones (zone_name, min_distance_miles, max_distance_miles, delivery_fee, estimated_time_minutes) VALUES
          ('Close Zone', 0.0, 5.0, 6.99, 30),
          ('Medium Zone', 5.0, 8.0, 9.49, 40),
          ('Far Zone', 8.0, 10.0, 11.99, 50)
          ON CONFLICT DO NOTHING
        `;

        // Create indexes
        await sql`CREATE INDEX IF NOT EXISTS idx_delivery_zones_distance ON delivery_zones(min_distance_miles, max_distance_miles)`;
        await sql`CREATE INDEX IF NOT EXISTS idx_delivery_zones_active ON delivery_zones(is_active)`;

        // Get results
        const zones = await sql`SELECT * FROM delivery_zones ORDER BY min_distance_miles`;
        const store = await sql`SELECT * FROM store_settings LIMIT 1`;

        await sql.end();

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            status: 'migration-completed',
            message: 'Delivery settings migration completed successfully',
            deliveryZones: zones,
            storeLocation: store[0]
          })
        };
      } catch (error: any) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            status: 'migration-failed',
            error: error.message
          })
        };
      }
    }

    // Create superadmin user if ?create_superadmin=true is passed
    if (event.queryStringParameters?.create_superadmin === 'true') {
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
              status: 'superadmin-exists',
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
            status: 'superadmin-created',
            message: 'Superadmin user created successfully',
            user: newUser[0]
          })
        };

      } catch (error: any) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            status: 'superadmin-creation-failed',
            error: error.message
          })
        };
      }
    }

    // Fix superadmin password if ?fix_superadmin_password=true is passed
    if (event.queryStringParameters?.fix_superadmin_password === 'true') {
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

        // Import crypto functions for proper password hashing
        const crypto = await import('crypto');
        const { promisify } = await import('util');
        const scryptAsync = promisify(crypto.scrypt);

        // Generate proper password hash for "superadmin123"
        const password = "superadmin123";
        const salt = crypto.randomBytes(16).toString('hex');
        const hashedPassword = (await scryptAsync(password, salt, 64)) as Buffer;
        const passwordHash = `${hashedPassword.toString('hex')}.${salt}`;

        // Update the superadmin user's password
        const result = await sql`
          UPDATE users
          SET password = ${passwordHash}
          WHERE username = 'superadmin'
          RETURNING id, username, email
        `;

        await sql.end();

        if (result.length > 0) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              status: 'password-updated',
              message: 'Superadmin password updated successfully',
              user: result[0]
            })
          };
        } else {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({
              status: 'user-not-found',
              message: 'Superadmin user not found'
            })
          };
        }

      } catch (error: any) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            status: 'password-update-failed',
            error: error.message
          })
        };
      }
    }

    // Basic health check
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'healthy',
        service: 'pizza-spin-rewards-api',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'production',
        version: process.env.BUILD_ID || 'unknown',
        databaseConfigured: !!process.env.DATABASE_URL
      })
    };
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ message: 'Method not allowed' })
  };
};