import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import { restaurantSettings } from '../shared/schema';
import { authenticateToken, isStaff } from './_shared/auth';

let dbConnection: any = null;

function getDB() {
  if (dbConnection) return dbConnection;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });

  dbConnection = drizzle(sql, { schema: { restaurantSettings } });
  return dbConnection;
}

export const handler: Handler = async (event, context) => {
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
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
    const db = getDB();

    // GET - Get restaurant settings (public access for display purposes)
    if (event.httpMethod === 'GET') {
      const [settings] = await db.select().from(restaurantSettings).limit(1);

      if (!settings) {
        // Return default settings if none exist
        const defaultSettings = {
          id: 1,
          restaurantName: "Favilla's NY Pizza",
          address: "123 Main Street, New York, NY 10001",
          phone: "(555) 123-4567",
          email: "info@favillas.com",
          website: "https://favillas.com",
          currency: "USD",
          timezone: "America/New_York",
          deliveryFee: "3.99",
          minimumOrder: "15.00",
          autoAcceptOrders: true,
          sendOrderNotifications: true,
          sendCustomerNotifications: true,
          outOfStockEnabled: false,
          deliveryEnabled: true,
          pickupEnabled: true,
          orderSchedulingEnabled: false,
          maxAdvanceOrderHours: 24,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(defaultSettings)
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(settings)
      };
    }

    // PUT - Update restaurant settings (admin only)
    if (event.httpMethod === 'PUT') {
      console.log('🏪 Updating restaurant settings...');

      // Authenticate admin user
      const authPayload = await authenticateToken(event);
      if (!authPayload) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized' })
        };
      }

      if (!isStaff(authPayload)) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Forbidden - Admin access required' })
        };
      }

      const updateData = JSON.parse(event.body || '{}');
      console.log('📋 Restaurant settings update data:', updateData);

      // Check if settings exist
      const [existingSettings] = await db.select().from(restaurantSettings).limit(1);

      let result;
      if (existingSettings) {
        // Update existing settings
        [result] = await db.update(restaurantSettings)
          .set({
            ...updateData,
            updatedAt: new Date()
          })
          .where(eq(restaurantSettings.id, existingSettings.id))
          .returning();
      } else {
        // Create new settings
        [result] = await db.insert(restaurantSettings)
          .values({
            ...updateData,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
      }

      console.log('✅ Restaurant settings updated successfully');

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result)
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Restaurant settings API error:', error);
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