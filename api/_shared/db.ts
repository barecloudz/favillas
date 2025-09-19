import postgres from 'postgres';

/**
 * Database connection interface
 */
export interface DatabaseConnection {
  (template: TemplateStringsArray, ...values: any[]): Promise<any>;
  begin: (callback: (sql: any) => Promise<any>) => Promise<any>;
  end: () => Promise<void>;
}

/**
 * Global database connection cache
 */
let dbConnection: DatabaseConnection | null = null;

/**
 * Database configuration options optimized for Netlify Functions
 */
const DB_CONFIG = {
  max: 1,                    // Single connection for serverless
  idle_timeout: 20,          // Shorter timeout for serverless
  connect_timeout: 10,       // Quick connection timeout
  prepare: false,            // Disable prepared statements for serverless compatibility
  keep_alive: false,         // Disable keepalive for serverless
  types: {
    bigint: postgres.BigInt,
  },
};

/**
 * Connection retry configuration
 */
const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 100,           // Start with 100ms delay
  maxDelay: 2000,           // Max 2 second delay
  backoffFactor: 2          // Exponential backoff
};

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Creates a new database connection with retry logic
 * @returns Promise<DatabaseConnection>
 */
async function createConnection(): Promise<DatabaseConnection> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      console.log(`🔗 Database connection attempt ${attempt}/${RETRY_CONFIG.maxRetries}`);

      const sql = postgres(databaseUrl, DB_CONFIG);

      // Test the connection with a simple query
      await sql`SELECT 1 as test`;

      console.log('✅ Database connection established successfully');
      return sql;

    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Database connection attempt ${attempt} failed:`, error);

      if (attempt < RETRY_CONFIG.maxRetries) {
        const delay = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt - 1),
          RETRY_CONFIG.maxDelay
        );
        console.log(`⏳ Retrying in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw new Error(`Failed to connect to database after ${RETRY_CONFIG.maxRetries} attempts. Last error: ${lastError?.message}`);
}

/**
 * Gets or creates a database connection with automatic retry and recovery
 * @returns Promise<DatabaseConnection>
 */
export async function getDB(): Promise<DatabaseConnection> {
  // Return existing connection if available
  if (dbConnection) {
    try {
      // Test the existing connection
      await dbConnection`SELECT 1 as test`;
      return dbConnection;
    } catch (error) {
      console.warn('🔄 Existing database connection failed, creating new one:', error);
      dbConnection = null;
    }
  }

  // Create new connection with retry logic
  dbConnection = await createConnection();
  return dbConnection;
}

/**
 * Executes a database query with automatic retry on connection failures
 * @param queryFn - Function that executes the database query
 * @returns Promise with query result
 */
export async function executeWithRetry<T>(
  queryFn: (sql: DatabaseConnection) => Promise<T>
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= RETRY_CONFIG.maxRetries; attempt++) {
    try {
      const sql = await getDB();
      return await queryFn(sql);
    } catch (error) {
      lastError = error as Error;
      console.error(`❌ Query attempt ${attempt} failed:`, error);

      // Check if this is a connection error that we should retry
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
      const isConnectionError =
        errorMessage.includes('connection') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('network') ||
        errorMessage.includes('econnreset') ||
        errorMessage.includes('enotfound');

      if (isConnectionError && attempt < RETRY_CONFIG.maxRetries) {
        console.log('🔄 Connection error detected, invalidating connection and retrying...');
        dbConnection = null; // Force new connection on next attempt

        const delay = Math.min(
          RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffFactor, attempt - 1),
          RETRY_CONFIG.maxDelay
        );
        console.log(`⏳ Retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        // Non-connection error or max retries reached, don't retry
        break;
      }
    }
  }

  throw lastError || new Error('Query failed after retries');
}

/**
 * Executes a database transaction with automatic retry
 * @param transactionFn - Function that executes database operations within transaction
 * @returns Promise with transaction result
 */
export async function executeTransaction<T>(
  transactionFn: (sql: DatabaseConnection) => Promise<T>
): Promise<T> {
  return executeWithRetry(async (sql) => {
    return sql.begin(transactionFn);
  });
}

/**
 * Closes the database connection
 */
export async function closeDB(): Promise<void> {
  if (dbConnection && typeof dbConnection.end === 'function') {
    try {
      await dbConnection.end();
      console.log('✅ Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database connection:', error);
    } finally {
      dbConnection = null;
    }
  }
}

/**
 * Health check function to verify database connectivity
 * @returns Promise<boolean> - true if database is healthy
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await executeWithRetry(async (sql) => {
      await sql`SELECT 1 as health_check`;
    });
    return true;
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return false;
  }
}

/**
 * Gets database connection statistics for monitoring
 * @returns Object with connection info
 */
export function getDatabaseStats(): {
  hasConnection: boolean;
  retryConfig: typeof RETRY_CONFIG;
  dbConfig: typeof DB_CONFIG;
} {
  return {
    hasConnection: !!dbConnection,
    retryConfig: RETRY_CONFIG,
    dbConfig: DB_CONFIG
  };
}