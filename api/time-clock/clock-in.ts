import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, isNull } from 'drizzle-orm';
import postgres from 'postgres';
import { timeClockEntries, employeeSchedules, scheduleAlerts } from '../../shared/schema';
import { authenticateToken } from '../_shared/auth';

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
    schema: { timeClockEntries, employeeSchedules, scheduleAlerts }
  });
  return dbConnection;
}

export const handler: Handler = async (event, context) => {
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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
    // Authenticate user
    const authPayload = await authenticateToken(event);
    if (!authPayload) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    if (event.httpMethod === 'POST') {
      const employeeId = authPayload.userId;
      const { notes, isUnscheduled } = JSON.parse(event.body || '{}');

      if (!employeeId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Employee ID required' })
        };
      }

      console.log('🕐 Clock in request for employee:', employeeId, 'notes:', notes, 'unscheduled:', isUnscheduled);

      const db = getDB();

      // Check if employee is already clocked in
      const existingEntry = await db
        .select()
        .from(timeClockEntries)
        .where(
          and(
            eq(timeClockEntries.employeeId, employeeId),
            isNull(timeClockEntries.clockOutTime),
            eq(timeClockEntries.status, 'active')
          )
        )
        .limit(1);

      if (existingEntry.length > 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Employee is already clocked in' })
        };
      }

      const now = new Date();
      const today = now.toISOString().split('T')[0];

      // Check for today's schedule unless it's an unscheduled shift
      let scheduledShiftId = null;
      let isLate = false;
      let isEarly = false;

      if (!isUnscheduled) {
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

        if (todaySchedule.length > 0) {
          scheduledShiftId = todaySchedule[0].id;

          // Check if late or early
          const scheduledStart = new Date(`${today}T${todaySchedule[0].startTime}`);
          const currentTime = now;

          // Consider late if more than 15 minutes after scheduled start
          const lateThresholdMs = 15 * 60 * 1000; // 15 minutes
          // Consider early if more than 30 minutes before scheduled start
          const earlyThresholdMs = 30 * 60 * 1000; // 30 minutes

          if (currentTime.getTime() > (scheduledStart.getTime() + lateThresholdMs)) {
            isLate = true;
          } else if (currentTime.getTime() < (scheduledStart.getTime() - earlyThresholdMs)) {
            isEarly = true;
          }
        }
      }

      // Create clock-in entry
      const newEntry = await db
        .insert(timeClockEntries)
        .values({
          employeeId,
          clockInTime: now,
          scheduledShiftId,
          notes: notes || null,
          status: 'active',
          breakDurationMinutes: 0
        })
        .returning();

      console.log('✅ Clock in successful:', newEntry[0]);

      // Create alerts for late/early/unscheduled shifts
      const alerts = [];

      if (isUnscheduled) {
        await db
          .insert(scheduleAlerts)
          .values({
            employeeId,
            alertType: 'unscheduled_shift',
            message: `${authPayload.username} clocked in for an unscheduled shift`,
            timeEntryId: newEntry[0].id
          });
        alerts.push('Unscheduled shift alert created');
      }

      if (isLate) {
        await db
          .insert(scheduleAlerts)
          .values({
            employeeId,
            alertType: 'late_clock_in',
            message: `${authPayload.username} clocked in late`,
            scheduledShiftId,
            timeEntryId: newEntry[0].id
          });
        alerts.push('Late clock-in alert created');
      }

      if (isEarly) {
        await db
          .insert(scheduleAlerts)
          .values({
            employeeId,
            alertType: 'early_clock_in',
            message: `${authPayload.username} clocked in early`,
            scheduledShiftId,
            timeEntryId: newEntry[0].id
          });
        alerts.push('Early clock-in alert created');
      }

      const response = {
        success: true,
        clockEntry: {
          id: newEntry[0].id,
          clockInTime: newEntry[0].clockInTime,
          employeeId: newEntry[0].employeeId,
          scheduledShiftId: newEntry[0].scheduledShiftId,
          notes: newEntry[0].notes,
          status: newEntry[0].status
        },
        alerts,
        warnings: {
          isLate,
          isEarly,
          isUnscheduled
        }
      };

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
    console.error('Clock in API error:', error);
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