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
      const { employeeSchedules, users } = await import('../../shared/schema.ts');
      const { eq, and, gte, lte } = await import('drizzle-orm');
      
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
  } else if (req.method === 'POST') {
    try {
      // Import dependencies dynamically
      const { drizzle } = await import('drizzle-orm/postgres-js');
      const postgres = (await import('postgres')).default;
      const { employeeSchedules } = await import('../../shared/schema.ts');
      
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
      
      const scheduleData = req.body;
      
      // Validate required fields
      if (!scheduleData.employeeId || !scheduleData.scheduleDate || !scheduleData.startTime || !scheduleData.endTime) {
        return res.status(400).json({ 
          message: 'Missing required fields: employeeId, scheduleDate, startTime, endTime' 
        });
      }
      
      const newSchedule = await db.insert(employeeSchedules).values({
        employeeId: scheduleData.employeeId,
        scheduleDate: scheduleData.scheduleDate,
        startTime: scheduleData.startTime,
        endTime: scheduleData.endTime,
        position: scheduleData.position || 'server',
        isMandatory: scheduleData.isMandatory || false,
        notes: scheduleData.notes || '',
        status: scheduleData.status || 'scheduled',
        createdBy: null, // Will be set when auth is implemented
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();
      
      res.status(201).json(newSchedule[0]);
    } catch (error) {
      console.error('Schedule creation error:', error);
      res.status(500).json({ 
        message: 'Failed to create schedule',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'PUT') {
    try {
      // Import dependencies dynamically
      const { drizzle } = await import('drizzle-orm/postgres-js');
      const postgres = (await import('postgres')).default;
      const { employeeSchedules } = await import('../../shared/schema.ts');
      const { eq } = await import('drizzle-orm');
      
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
      
      // Extract schedule ID from URL path
      const urlParts = req.url?.split('/') || [];
      const scheduleId = urlParts[urlParts.length - 1];
      
      if (!scheduleId || isNaN(parseInt(scheduleId))) {
        return res.status(400).json({ message: 'Invalid schedule ID' });
      }
      
      const scheduleData = req.body;
      
      const updatedSchedule = await db.update(employeeSchedules)
        .set({
          employeeId: scheduleData.employeeId,
          scheduleDate: scheduleData.scheduleDate,
          startTime: scheduleData.startTime,
          endTime: scheduleData.endTime,
          position: scheduleData.position,
          isMandatory: scheduleData.isMandatory,
          notes: scheduleData.notes,
          status: scheduleData.status,
          updatedAt: new Date(),
        })
        .where(eq(employeeSchedules.id, parseInt(scheduleId)))
        .returning();
      
      if (updatedSchedule.length === 0) {
        return res.status(404).json({ message: 'Schedule not found' });
      }
      
      res.status(200).json(updatedSchedule[0]);
    } catch (error) {
      console.error('Schedule update error:', error);
      res.status(500).json({ 
        message: 'Failed to update schedule',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Import dependencies dynamically
      const { drizzle } = await import('drizzle-orm/postgres-js');
      const postgres = (await import('postgres')).default;
      const { employeeSchedules } = await import('../../shared/schema.ts');
      const { eq } = await import('drizzle-orm');
      
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
      
      // Extract schedule ID from URL path
      const urlParts = req.url?.split('/') || [];
      const scheduleId = urlParts[urlParts.length - 1];
      
      if (!scheduleId || isNaN(parseInt(scheduleId))) {
        return res.status(400).json({ message: 'Invalid schedule ID' });
      }
      
      const deletedSchedule = await db.delete(employeeSchedules)
        .where(eq(employeeSchedules.id, parseInt(scheduleId)))
        .returning();
      
      if (deletedSchedule.length === 0) {
        return res.status(404).json({ message: 'Schedule not found' });
      }
      
      res.status(200).json({ message: 'Schedule deleted successfully' });
    } catch (error) {
      console.error('Schedule deletion error:', error);
      res.status(500).json({ 
        message: 'Failed to delete schedule',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}