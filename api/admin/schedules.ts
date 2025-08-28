import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Note: In a real app, you'd need to verify authentication here
  // For now, we'll skip auth to get the basic functionality working
  
  if (req.method === 'GET') {
    try {
      const { startDate, endDate, employeeId } = req.query;
      
      // Import dependencies dynamically
      const { drizzle } = await import('drizzle-orm/postgres-js');
      const postgres = (await import('postgres')).default;
      const { employeeSchedules, users } = await import('@shared/schema');
      const { eq, and, gte, lte } = await import('drizzle-orm');
      
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
      
      let query = db
        .select({
          id: employeeSchedules.id,
          employeeId: employeeSchedules.employeeId,
          scheduleDate: employeeSchedules.scheduleDate,
          startTime: employeeSchedules.startTime,
          endTime: employeeSchedules.endTime,
          position: employeeSchedules.position,
          isMandatory: employeeSchedules.isMandatory,
          notes: employeeSchedules.notes,
          status: employeeSchedules.status,
          createdAt: employeeSchedules.createdAt,
          updatedAt: employeeSchedules.updatedAt,
          employee: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            email: users.email,
            role: users.role
          }
        })
        .from(employeeSchedules)
        .leftJoin(users, eq(employeeSchedules.employeeId, users.id));

      // Add filters if provided
      const conditions = [];
      
      if (startDate) {
        conditions.push(gte(employeeSchedules.scheduleDate, startDate as string));
      }
      
      if (endDate) {
        conditions.push(lte(employeeSchedules.scheduleDate, endDate as string));
      }
      
      if (employeeId) {
        conditions.push(eq(employeeSchedules.employeeId, parseInt(employeeId as string)));
      }
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const schedules = await query;
      
      res.status(200).json(schedules);
    } catch (error) {
      console.error('Schedules API error:', error);
      res.status(500).json({ 
        message: 'Failed to fetch schedules',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}