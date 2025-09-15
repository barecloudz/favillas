import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Check environment variables
    const hasDbUrl = !!process.env.DATABASE_URL;
    const hasSessionSecret = !!process.env.SESSION_SECRET;
    
    let dbTestResult = 'not_tested';
    let dbError = null;
    
    if (hasDbUrl) {
      try {
        // Import database dependencies directly
        const { drizzle } = await import('drizzle-orm/postgres-js');
        const postgres = (await import('postgres')).default;
        
        // Create database connection
        const sql = postgres(process.env.DATABASE_URL!, {
          max: 1,
          idle_timeout: 20,
          connect_timeout: 10,
          prepare: false,
          keep_alive: false,
          types: {
            bigint: postgres.BigInt,
          },
        });
        
        const db = drizzle(sql);
        
        // Try a simple query
        const result = await db.execute('SELECT 1 as test');
        dbTestResult = 'success';
        
      } catch (error) {
        dbTestResult = 'failed';
        dbError = error instanceof Error ? error.message : 'Unknown database error';
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        message: 'Database test complete',
        timestamp: new Date().toISOString(),
        environment: {
          hasDbUrl,
          hasSessionSecret,
          nodeEnv: process.env.NODE_ENV,
          vercelEnv: process.env.VERCEL_ENV
        },
        database: {
          testResult: dbTestResult,
          error: dbError
        }
      })
    };
    
  } catch (error) {
    console.error('DB test error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        message: 'Database test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      })
    };
  }
}