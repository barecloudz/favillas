import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Serverless-friendly PostgreSQL configuration
const sql = postgres(databaseUrl, {
  max: 1,           // Use single connection for serverless
  idle_timeout: 20, // Shorter timeout for serverless
  connect_timeout: 10, // Quick connection timeout
  prepare: false,   // Disable prepared statements for better serverless compatibility
  keepalive: false, // Disable keepalive for serverless
  types: {
    bigint: postgres.BigInt,
  },
});

export const db = drizzle(sql, { schema });
export { sql };