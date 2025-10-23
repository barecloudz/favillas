import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { storeHours } from '../shared/schema';
import { checkStoreStatus } from './utils/store-hours-utils';

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
    types: {
      bigint: postgres.BigInt,
    },
  });

  dbConnection = drizzle(sql, { schema: { storeHours } });
  return dbConnection;
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const db = getDB();

    // Fetch all store hours
    const hours = await db.select().from(storeHours).orderBy(storeHours.dayOfWeek);

    // If no hours configured, return error
    if (hours.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          isOpen: false,
          isPastCutoff: true,
          message: 'Store hours not configured',
          canPlaceAsapOrders: false
        })
      };
    }

    // Check current store status
    const status = checkStoreStatus(hours);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        isOpen: status.isOpen,
        isPastCutoff: status.isPastCutoff,
        message: status.message,
        canPlaceAsapOrders: status.isOpen && !status.isPastCutoff,
        currentTime: status.currentTime,
        minutesUntilClose: status.minutesUntilClose,
        storeHours: status.storeHours
      })
    };

  } catch (error) {
    console.error('Store status API error:', error);
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
