import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Use PostgreSQL with postgres-js driver with optimized settings
const sql = postgres(databaseUrl, {
  max: 20,          // Increase max connections for better performance
  idle_timeout: 30, // Keep connections alive longer
  connect_timeout: 15, // Increase connection timeout
  prepare: false,   // Disable prepared statements for better compatibility
  keepalive: true,  // Enable TCP keepalive
  types: {
    bigint: postgres.BigInt,
  },
});

export const db = drizzle(sql, { schema });
