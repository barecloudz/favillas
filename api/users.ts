import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Import dependencies dynamically
    const { drizzle } = await import('drizzle-orm/postgres-js');
    const postgres = (await import('postgres')).default;
    const { users } = await import('../shared/schema.js');
    
    // Create database connection
    const sql = postgres(process.env.DATABASE_URL!, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keepalive: false,
    });
    
    const db = drizzle(sql);

    if (req.method === 'GET') {
      // Get all users (excluding passwords)
      const allUsers = await db.select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        role: users.role,
        isAdmin: users.isAdmin,
        isActive: users.isActive,
        rewards: users.rewards,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }).from(users);
      
      res.status(200).json(allUsers);
    } else if (req.method === 'POST') {
      // Create new user
      const userData = req.body;
      
      const newUser = await db
        .insert(users)
        .values({
          ...userData,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Remove password from response
      const { password: _, ...userWithoutPassword } = newUser[0];
      res.status(201).json(userWithoutPassword);
    } else {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    await sql.end();
  } catch (error) {
    console.error('Users API error:', error);
    res.status(500).json({ 
      message: 'Failed to process users request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}