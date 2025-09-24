import { Handler } from '@netlify/functions';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq, and, between, sql, desc } from 'drizzle-orm';
import postgres from 'postgres';
import { timeClockEntries, users, employeeSchedules, payPeriods } from '../../shared/schema';
import { authenticateToken, isStaff } from '../_shared/auth';

let dbConnection: any = null;

function getDB() {
  if (dbConnection) return dbConnection;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  const sqlClient = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });

  dbConnection = drizzle(sqlClient, {
    schema: { timeClockEntries, users, employeeSchedules, payPeriods }
  });
  return dbConnection;
}

// Helper function to calculate pay period dates
function getPayPeriodDates(date: Date) {
  // Assuming bi-weekly pay periods starting on Sunday
  const startOfWeek = new Date(date);
  const dayOfWeek = startOfWeek.getDay(); // 0 = Sunday
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

  // For bi-weekly, find the start of the current pay period
  const weeksSinceEpoch = Math.floor((startOfWeek.getTime() - new Date('2024-01-07').getTime()) / (7 * 24 * 60 * 60 * 1000));
  const payPeriodWeek = Math.floor(weeksSinceEpoch / 2) * 2;

  const payPeriodStart = new Date('2024-01-07');
  payPeriodStart.setDate(payPeriodStart.getDate() + (payPeriodWeek * 7));

  const payPeriodEnd = new Date(payPeriodStart);
  payPeriodEnd.setDate(payPeriodEnd.getDate() + 13); // 2 weeks - 1 day

  return { start: payPeriodStart, end: payPeriodEnd };
}

export const handler: Handler = async (event, context) => {
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    // Authenticate admin user
    const authPayload = await authenticateToken(event);
    if (!authPayload) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    if (!isStaff(authPayload)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Forbidden - Admin access required' })
      };
    }

    const db = getDB();

    if (event.httpMethod === 'GET') {
      // Parse query parameters
      const queryParams = new URLSearchParams(event.queryStringParameters || '');
      const startDate = queryParams.get('startDate');
      const endDate = queryParams.get('endDate');
      const employeeId = queryParams.get('employeeId');

      console.log('📊 Payroll request:', { startDate, endDate, employeeId });

      let dateStart: Date, dateEnd: Date;

      if (startDate && endDate) {
        dateStart = new Date(startDate);
        dateEnd = new Date(endDate);
      } else {
        // Default to current pay period
        const currentPeriod = getPayPeriodDates(new Date());
        dateStart = currentPeriod.start;
        dateEnd = currentPeriod.end;
      }

      // Build query conditions
      let whereConditions = [
        between(timeClockEntries.clockInTime, dateStart, dateEnd),
        eq(timeClockEntries.status, 'completed')
      ];

      if (employeeId) {
        whereConditions.push(eq(timeClockEntries.employeeId, parseInt(employeeId)));
      }

      // Get time entries with employee information
      const timeEntries = await db
        .select({
          id: timeClockEntries.id,
          employeeId: timeClockEntries.employeeId,
          employeeName: sql`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.username})`,
          employeeRole: users.role,
          clockInTime: timeClockEntries.clockInTime,
          clockOutTime: timeClockEntries.clockOutTime,
          totalHours: timeClockEntries.totalHours,
          overtimeHours: timeClockEntries.overtimeHours,
          breakDurationMinutes: timeClockEntries.breakDurationMinutes,
          notes: timeClockEntries.notes,
          scheduledShiftId: timeClockEntries.scheduledShiftId
        })
        .from(timeClockEntries)
        .innerJoin(users, eq(timeClockEntries.employeeId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(timeClockEntries.clockInTime));

      // Calculate payroll summary by employee
      const employeeSummary = new Map();

      timeEntries.forEach(entry => {
        const employeeId = entry.employeeId;
        const totalHours = parseFloat(entry.totalHours || '0');
        const overtimeHours = parseFloat(entry.overtimeHours || '0');
        const regularHours = totalHours - overtimeHours;

        if (!employeeSummary.has(employeeId)) {
          employeeSummary.set(employeeId, {
            employeeId,
            employeeName: entry.employeeName,
            employeeRole: entry.employeeRole,
            totalHours: 0,
            regularHours: 0,
            overtimeHours: 0,
            totalShifts: 0,
            totalBreakMinutes: 0,
            entries: []
          });
        }

        const summary = employeeSummary.get(employeeId);
        summary.totalHours += totalHours;
        summary.regularHours += regularHours;
        summary.overtimeHours += overtimeHours;
        summary.totalShifts += 1;
        summary.totalBreakMinutes += entry.breakDurationMinutes || 0;
        summary.entries.push({
          id: entry.id,
          clockInTime: entry.clockInTime,
          clockOutTime: entry.clockOutTime,
          totalHours,
          overtimeHours,
          breakDurationMinutes: entry.breakDurationMinutes,
          notes: entry.notes
        });
      });

      // Convert Map to Array and add pay calculations
      const payrollData = Array.from(employeeSummary.values()).map(employee => {
        // Standard rates - these could be stored in database
        const regularRate = 15.00; // $15/hour base rate
        const overtimeRate = regularRate * 1.5; // Time and a half

        const regularPay = employee.regularHours * regularRate;
        const overtimePay = employee.overtimeHours * overtimeRate;
        const totalPay = regularPay + overtimePay;

        return {
          ...employee,
          regularRate,
          overtimeRate,
          regularPay: Math.round(regularPay * 100) / 100,
          overtimePay: Math.round(overtimePay * 100) / 100,
          totalPay: Math.round(totalPay * 100) / 100,
          totalHours: Math.round(employee.totalHours * 100) / 100,
          regularHours: Math.round(employee.regularHours * 100) / 100,
          overtimeHours: Math.round(employee.overtimeHours * 100) / 100
        };
      });

      // Calculate grand totals
      const grandTotals = payrollData.reduce((totals, employee) => ({
        totalEmployees: totals.totalEmployees + 1,
        totalHours: totals.totalHours + employee.totalHours,
        totalRegularHours: totals.totalRegularHours + employee.regularHours,
        totalOvertimeHours: totals.totalOvertimeHours + employee.overtimeHours,
        totalPay: totals.totalPay + employee.totalPay,
        totalShifts: totals.totalShifts + employee.totalShifts
      }), {
        totalEmployees: 0,
        totalHours: 0,
        totalRegularHours: 0,
        totalOvertimeHours: 0,
        totalPay: 0,
        totalShifts: 0
      });

      const response = {
        payPeriod: {
          startDate: dateStart.toISOString().split('T')[0],
          endDate: dateEnd.toISOString().split('T')[0]
        },
        employees: payrollData,
        totals: {
          totalEmployees: grandTotals.totalEmployees,
          totalHours: Math.round(grandTotals.totalHours * 100) / 100,
          totalRegularHours: Math.round(grandTotals.totalRegularHours * 100) / 100,
          totalOvertimeHours: Math.round(grandTotals.totalOvertimeHours * 100) / 100,
          totalPay: Math.round(grandTotals.totalPay * 100) / 100,
          totalShifts: grandTotals.totalShifts
        }
      };

      console.log('✅ Payroll data generated:', {
        employees: payrollData.length,
        totalPay: response.totals.totalPay
      });

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
    console.error('Payroll API error:', error);
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