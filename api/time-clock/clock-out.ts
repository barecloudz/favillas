import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, isNull } from 'drizzle-orm';
import postgres from 'postgres';
import { timeClockEntries, scheduleAlerts } from '../../shared/schema';
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
    schema: { timeClockEntries, scheduleAlerts }
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
      const { breakDurationMinutes, notes } = JSON.parse(event.body || '{}');

      if (!employeeId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Employee ID required' })
        };
      }

      console.log('🕐 Clock out request for employee:', employeeId, 'break minutes:', breakDurationMinutes, 'notes:', notes);

      const db = getDB();

      // Find the most recent active clock entry
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
        .limit(1);

      if (activeEntry.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No active clock entry found. Please clock in first.' })
        };
      }

      const entry = activeEntry[0];
      const now = new Date();

      // Calculate total hours worked
      const clockInTime = new Date(entry.clockInTime);
      const totalMinutes = (now.getTime() - clockInTime.getTime()) / (1000 * 60);
      const totalHours = totalMinutes / 60;

      // Calculate overtime (assuming 8 hours is regular time)
      const regularHours = Math.min(totalHours, 8);
      const overtimeHours = Math.max(0, totalHours - 8);

      // Update the clock entry with clock out information
      const updatedEntry = await db
        .update(timeClockEntries)
        .set({
          clockOutTime: now,
          breakDurationMinutes: breakDurationMinutes || entry.breakDurationMinutes || 0,
          totalHours: totalHours.toFixed(2),
          overtimeHours: overtimeHours.toFixed(2),
          notes: notes || entry.notes,
          status: 'completed',
          updatedAt: now
        })
        .where(eq(timeClockEntries.id, entry.id))
        .returning();

      console.log('✅ Clock out successful:', updatedEntry[0]);

      // Create alert for short shifts (less than 2 hours)
      if (totalHours < 2) {
        await db
          .insert(scheduleAlerts)
          .values({
            employeeId,
            alertType: 'short_shift',
            message: `${authPayload.username} worked a short shift (${totalHours.toFixed(2)} hours)`,
            timeEntryId: entry.id
          });
      }

      // Create alert for overtime
      if (overtimeHours > 0) {
        await db
          .insert(scheduleAlerts)
          .values({
            employeeId,
            alertType: 'overtime_worked',
            message: `${authPayload.username} worked ${overtimeHours.toFixed(2)} hours of overtime`,
            timeEntryId: entry.id
          });
      }

      const response = {
        success: true,
        clockEntry: {
          id: updatedEntry[0].id,
          clockInTime: updatedEntry[0].clockInTime,
          clockOutTime: updatedEntry[0].clockOutTime,
          totalHours: parseFloat(updatedEntry[0].totalHours),
          overtimeHours: parseFloat(updatedEntry[0].overtimeHours),
          breakDurationMinutes: updatedEntry[0].breakDurationMinutes,
          notes: updatedEntry[0].notes,
          status: updatedEntry[0].status
        },
        summary: {
          totalHours: Math.round(totalHours * 100) / 100,
          regularHours: Math.round(regularHours * 100) / 100,
          overtimeHours: Math.round(overtimeHours * 100) / 100,
          breakMinutes: breakDurationMinutes || entry.breakDurationMinutes || 0
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
    console.error('Clock out API error:', error);
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