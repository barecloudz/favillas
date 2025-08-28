import { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from '../_db';
import { employeeSchedules, users } from '@shared/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

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