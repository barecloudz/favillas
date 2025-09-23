import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { restaurantSettings } from '../shared/schema';
import { authenticateToken } from './_shared/auth';

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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true'
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

  // Only admin can manage restaurant settings
  if (authPayload.role !== 'admin' && authPayload.role !== 'super_admin') {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Forbidden - Admin access required' })
    };
  }

  try {
    const db = getDB();

    if (event.httpMethod === 'GET') {
      // Get restaurant settings (return first record or default)
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
        
        // Create default settings
        const [newSettings] = await db
          .insert(restaurantSettings)
          .values(defaultSettings)
          .returning();
          
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(newSettings)
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(settings)
      };
      
    } else if (event.httpMethod === 'PUT' || event.httpMethod === 'PATCH') {
      // Update restaurant settings
      const settingsData = JSON.parse(event.body || '{}');
      
      // Check if settings exist
      const [existingSettings] = await db.select().from(restaurantSettings).limit(1);
      
      if (!existingSettings) {
        // Create new settings if none exist
        const [newSettings] = await db
          .insert(restaurantSettings)
          .values({
            ...settingsData,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
          
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(newSettings)
        };
      } else {
        // Update existing settings
        const [updatedSettings] = await db
          .update(restaurantSettings)
          .set({
            ...settingsData,
            updatedAt: new Date(),
          })
          .where(eq(restaurantSettings.id, existingSettings.id))
          .returning();
          
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updatedSettings)
        };
      }
      
    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }
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
}