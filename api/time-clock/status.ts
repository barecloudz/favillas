import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, isNull, desc } from 'drizzle-orm';
import postgres from 'postgres';
import { timeClockEntries, employeeSchedules, users } from '../../shared/schema';
import { authenticateToken, isStaff } from '../_shared/auth';

let dbConnection: any = null;

function getDB() {
  if (dbConnection) return dbConnection;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });

  dbConnection = drizzle(sql, {
    schema: { timeClockEntries, employeeSchedules, users }
  });
  return dbConnection;
}

export const handler: Handler = async (event, context) => {
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Authenticate user - employees should be able to check their own status
    const authPayload = await authenticateToken(event);
    if (!authPayload) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const db = getDB();

    if (event.httpMethod === 'GET') {
      const employeeId = authPayload.userId;

      if (!employeeId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Employee ID required' })
        };
      }

      console.log('🕐 Getting clock status for employee:', employeeId);

      // Get current active clock entry (clocked in but not out)
      const activeEntry = await db
        .select()
        .from(timeClockEntries)
        .where(
          and(
            eq(timeClockEntries.employeeId, employeeId),
            isNull(timeClockEntries.clockOutTime),
            eq(timeClockEntries.status, 'active')
          )
        )
        .orderBy(desc(timeClockEntries.clockInTime))
        .limit(1);

      // Get today's schedule
      const today = new Date().toISOString().split('T')[0];
      const todaySchedule = await db
        .select()
        .from(employeeSchedules)
        .where(
          and(
            eq(employeeSchedules.employeeId, employeeId),
            eq(employeeSchedules.scheduleDate, today),
            eq(employeeSchedules.status, 'scheduled')
          )
        )
        .limit(1);

      const isClockedIn = activeEntry.length > 0;
      const currentEntry = isClockedIn ? activeEntry[0] : null;

      // Calculate hours worked today (including current active session)
      let hoursWorkedToday = 0;

      // Get all completed entries for today
      const todayEntries = await db
        .select()
        .from(timeClockEntries)
        .where(
          and(
            eq(timeClockEntries.employeeId, employeeId),
            eq(timeClockEntries.clockInTime, today) // This might need date casting in real implementation
          )
        );

      for (const entry of todayEntries) {
        if (entry.totalHours) {
          hoursWorkedToday += parseFloat(entry.totalHours);
        }
      }

      // Add current session time if clocked in
      if (isClockedIn && currentEntry) {
        const now = new Date();
        const clockInTime = new Date(currentEntry.clockInTime);
        const currentSessionHours = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
        hoursWorkedToday += currentSessionHours;
      }

      const response = {
        isClockedIn,
        currentEntry: currentEntry ? {
          id: currentEntry.id,
          clockInTime: currentEntry.clockInTime,
          breakDurationMinutes: currentEntry.breakDurationMinutes || 0,
          notes: currentEntry.notes || '',
          scheduledShiftId: currentEntry.scheduledShiftId
        } : null,
        todaySchedule: todaySchedule.length > 0 ? {
          id: todaySchedule[0].id,
          scheduleDate: todaySchedule[0].scheduleDate,
          startTime: todaySchedule[0].startTime,
          endTime: todaySchedule[0].endTime,
          position: todaySchedule[0].position,
          isMandatory: todaySchedule[0].isMandatory
        } : null,
        hoursWorkedToday: Math.round(hoursWorkedToday * 100) / 100,
        canClockIn: !isClockedIn,
        canClockOut: isClockedIn
      };

      console.log('✅ Clock status retrieved:', response);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response)
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Time clock status API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};