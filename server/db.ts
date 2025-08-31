import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "@shared/schema";

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

// PostgreSQL configuration optimized for development
const sql = postgres(databaseUrl, {
  max: process.env.NODE_ENV === 'production' ? 1 : 10,
  idle_timeout: process.env.NODE_ENV === 'production' ? 20 : 300,
  connect_timeout: process.env.NODE_ENV === 'production' ? 10 : 60,
  prepare: false,   // Disable prepared statements for better serverless compatibility
  keep_alive: process.env.NODE_ENV === 'production' ? false : true,
  types: {
    bigint: postgres.BigInt,
  },
});

export const db = drizzle(sql, { schema });
