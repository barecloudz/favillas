import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

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
    let connectionDetails = null;
    
    if (hasDbUrl) {
      try {
        console.log('Testing database connection...');
        
        // Create database connection inline
        const databaseUrl = process.env.DATABASE_URL!;
        const sql = postgres(databaseUrl, {
          max: 1,
          idle_timeout: 20,
          connect_timeout: 10,
          prepare: false,
          keepalive: false,
        });
        
        const db = drizzle(sql);
        
        // Try a simple query
        console.log('Executing test query...');
        const result = await db.execute('SELECT 1 as test, NOW() as timestamp');
        console.log('Query result:', result);
        
        dbTestResult = 'success';
        connectionDetails = {
          queryResult: result,
          connectionCount: sql.options.max
        };
        
        // Close connection
        await sql.end();
        
      } catch (error) {
        console.error('Database test failed:', error);
        dbTestResult = 'failed';
        dbError = error instanceof Error ? error.message : 'Unknown database error';
      }
    }

    return res.status(200).json({
      message: 'Self-contained database test complete',
      timestamp: new Date().toISOString(),
      environment: {
        hasDbUrl,
        hasSessionSecret,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
        dbUrlLength: process.env.DATABASE_URL?.length || 0
      },
      database: {
        testResult: dbTestResult,
        error: dbError,
        details: connectionDetails
      }
    });
    
  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ 
      message: 'Database test handler failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}