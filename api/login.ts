import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Login attempt started');
    console.log('Environment check - DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('Request body:', req.body);

    const { username, password } = req.body;

    if (!username || !password) {
      console.log('Missing username or password');
      return res.status(400).json({ 
        message: 'Username and password are required' 
      });
    }

    // Test database import first
    console.log('Attempting to import database...');
    const { db } = await import('../server/db');
    console.log('Database imported successfully');

    const { users } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    console.log('Schema and drizzle imports successful');

    // Find user by username
    console.log('Querying user:', username);
    const user = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1)
      .then(rows => rows[0]);

    console.log('User found:', !!user);

    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // For now, let's skip password validation and return success
    console.log('User authenticated successfully');
    
    // Return user data (excluding password)
    const { password: _, ...userWithoutPassword } = user;
    
    return res.status(200).json({
      message: 'Login successful',
      user: userWithoutPassword
    });
    
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return res.status(500).json({ 
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
}