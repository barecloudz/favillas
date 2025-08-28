import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
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
          keepalive: false,
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

    return res.status(200).json({
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
    });
    
  } catch (error) {
    console.error('DB test error:', error);
    return res.status(500).json({ 
      message: 'Database test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}