// Time Tracking Storage Methods (add to existing storage.ts)

import { db } from "./db";
import { eq, and, between, isNull, desc } from "drizzle-orm";

// Add these schemas to shared/schema.ts
export const timeClockEntries = pgTable("time_clock_entries", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => users.id).notNull(),
  clockInTime: timestamp("clock_in_time").notNull(),
  clockOutTime: timestamp("clock_out_time"),
  scheduledShiftId: integer("scheduled_shift_id").references(() => employeeSchedules.id),
  breakDurationMinutes: integer("break_duration_minutes").default(0),
  totalHours: decimal("total_hours", { precision: 4, scale: 2 }),
  overtimeHours: decimal("overtime_hours", { precision: 4, scale: 2 }).default("0"),
  notes: text("notes"),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const employeeSchedules = pgTable("employee_schedules", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => users.id).notNull(),
  scheduleDate: date("schedule_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  position: text("position").notNull(),
  isMandatory: boolean("is_mandatory").default(true).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  notes: text("notes"),
  status: text("status").default("scheduled").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const scheduleAlerts = pgTable("schedule_alerts", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => users.id).notNull(),
  alertType: text("alert_type").notNull(),
  message: text("message").notNull(),
  scheduledShiftId: integer("scheduled_shift_id").references(() => employeeSchedules.id),
  timeEntryId: integer("time_entry_id").references(() => timeClockEntries.id),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const payPeriods = pgTable("pay_periods", {
  id: serial("id").primaryKey(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").default("open").notNull(),
  totalHours: decimal("total_hours", { precision: 8, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Storage interface additions
export interface ITimeTrackingStorage {
  // Time Clock Methods
  createTimeEntry(data: InsertTimeClockEntry): Promise<TimeClockEntry>;
  updateTimeEntry(id: number, data: Partial<InsertTimeClockEntry>): Promise<TimeClockEntry>;
  getTimeEntry(id: number): Promise<TimeClockEntry | undefined>;
  getActiveTimeEntry(employeeId: number): Promise<TimeClockEntry | undefined>;
  getEmployeeTimeSummary(employeeId: number, startDate: string, endDate: string): Promise<any>;
  
  // Schedule Methods
  createEmployeeSchedule(data: InsertEmployeeSchedule): Promise<EmployeeSchedule>;
  getEmployeeSchedules(startDate: string, endDate: string, employeeId?: number): Promise<EmployeeSchedule[]>;
  getTodaysSchedule(employeeId: number): Promise<EmployeeSchedule | undefined>;
  checkScheduleConflicts(employeeId: number, date: string, startTime: string, endTime: string): Promise<EmployeeSchedule[]>;
  
  // Alert Methods
  createScheduleAlert(data: InsertScheduleAlert): Promise<ScheduleAlert>;
  getScheduleAlerts(unreadOnly: boolean): Promise<ScheduleAlert[]>;
  markAlertAsRead(alertId: number): Promise<void>;
  
  // Payroll Methods
  getPayrollSummary(payPeriodId?: number, startDate?: string, endDate?: string): Promise<any>;
}

// Database Storage Implementation
export class DatabaseTimeTrackingStorage implements ITimeTrackingStorage {
  
  async createTimeEntry(data: InsertTimeClockEntry): Promise<TimeClockEntry> {
    const [newEntry] = await db
      .insert(timeClockEntries)
      .values(data)
      .returning();
    return newEntry;
  }

  async updateTimeEntry(id: number, data: Partial<InsertTimeClockEntry>): Promise<TimeClockEntry> {
    const [updatedEntry] = await db
      .update(timeClockEntries)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(timeClockEntries.id, id))
      .returning();
    return updatedEntry;
  }

  async getTimeEntry(id: number): Promise<TimeClockEntry | undefined> {
    const [entry] = await db
      .select()
      .from(timeClockEntries)
      .where(eq(timeClockEntries.id, id));
    return entry;
  }

  async getActiveTimeEntry(employeeId: number): Promise<TimeClockEntry | undefined> {
    const [activeEntry] = await db
      .select()
      .from(timeClockEntries)
      .where(
        and(
          eq(timeClockEntries.employeeId, employeeId),
          isNull(timeClockEntries.clockOutTime),
          eq(timeClockEntries.status, "active")
        )
      );
    return activeEntry;
  }

  async getEmployeeTimeSummary(employeeId: number, startDate: string, endDate: string): Promise<any> {
    const entries = await db
      .select()
      .from(timeClockEntries)
      .where(
        and(
          eq(timeClockEntries.employeeId, employeeId),
          between(timeClockEntries.clockInTime, new Date(startDate), new Date(endDate)),
          eq(timeClockEntries.status, "completed")
        )
      )
      .orderBy(desc(timeClockEntries.clockInTime));

    const totalHours = entries.reduce((sum, entry) => sum + parseFloat(entry.totalHours || "0"), 0);
    const totalOvertimeHours = entries.reduce((sum, entry) => sum + parseFloat(entry.overtimeHours || "0"), 0);
    
    // Get employee hourly rate
    const [employee] = await db
      .select({ hourlyRate: users.hourlyRate, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(eq(users.id, employeeId));

    const hourlyRate = parseFloat(employee?.hourlyRate || "0");
    const regularHours = totalHours - totalOvertimeHours;
    const regularPay = regularHours * hourlyRate;
    const overtimePay = totalOvertimeHours * hourlyRate * 1.5; // Time and a half
    const totalPay = regularPay + overtimePay;

    return {
      employee: employee,
      timeEntries: entries,
      summary: {
        totalHours: totalHours.toFixed(2),
        regularHours: regularHours.toFixed(2),
        overtimeHours: totalOvertimeHours.toFixed(2),
        hourlyRate: hourlyRate.toFixed(2),
        regularPay: regularPay.toFixed(2),
        overtimePay: overtimePay.toFixed(2),
        totalPay: totalPay.toFixed(2),
      }
    };
  }

  async createEmployeeSchedule(data: InsertEmployeeSchedule): Promise<EmployeeSchedule> {
    const [newSchedule] = await db
      .insert(employeeSchedules)
      .values(data)
      .returning();
    return newSchedule;
  }

  async getEmployeeSchedules(startDate: string, endDate: string, employeeId?: number): Promise<EmployeeSchedule[]> {
    const conditions = [
      between(employeeSchedules.scheduleDate, new Date(startDate), new Date(endDate))
    ];
    
    if (employeeId) {
      conditions.push(eq(employeeSchedules.employeeId, employeeId));
    }

    const schedules = await db
      .select({
        ...employeeSchedules,
        employeeName: sql`${users.firstName} || ' ' || ${users.lastName}`.as('employeeName')
      })
      .from(employeeSchedules)
      .leftJoin(users, eq(employeeSchedules.employeeId, users.id))
      .where(and(...conditions))
      .orderBy(employeeSchedules.scheduleDate, employeeSchedules.startTime);

    return schedules;
  }

  async getTodaysSchedule(employeeId: number): Promise<EmployeeSchedule | undefined> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    const [schedule] = await db
      .select()
      .from(employeeSchedules)
      .where(
        and(
          eq(employeeSchedules.employeeId, employeeId),
          eq(employeeSchedules.scheduleDate, new Date(today))
        )
      );
    return schedule;
  }

  async checkScheduleConflicts(employeeId: number, date: string, startTime: string, endTime: string): Promise<EmployeeSchedule[]> {
    const conflicts = await db
      .select()
      .from(employeeSchedules)
      .where(
        and(
          eq(employeeSchedules.employeeId, employeeId),
          eq(employeeSchedules.scheduleDate, new Date(date)),
          // Check for time overlap
          sql`(${employeeSchedules.startTime} < ${endTime} AND ${employeeSchedules.endTime} > ${startTime})`
        )
      );
    return conflicts;
  }

  async createScheduleAlert(data: InsertScheduleAlert): Promise<ScheduleAlert> {
    const [newAlert] = await db
      .insert(scheduleAlerts)
      .values(data)
      .returning();
    return newAlert;
  }

  async getScheduleAlerts(unreadOnly: boolean): Promise<ScheduleAlert[]> {
    const conditions = [];
    if (unreadOnly) {
      conditions.push(eq(scheduleAlerts.isRead, false));
    }

    const alerts = await db
      .select({
        ...scheduleAlerts,
        employeeName: sql`${users.firstName} || ' ' || ${users.lastName}`.as('employeeName')
      })
      .from(scheduleAlerts)
      .leftJoin(users, eq(scheduleAlerts.employeeId, users.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(scheduleAlerts.createdAt));

    return alerts;
  }

  async markAlertAsRead(alertId: number): Promise<void> {
    await db
      .update(scheduleAlerts)
      .set({ isRead: true })
      .where(eq(scheduleAlerts.id, alertId));
  }

  async getPayrollSummary(payPeriodId?: number, startDate?: string, endDate?: string): Promise<any> {
    let dateRange;
    
    if (payPeriodId) {
      const [payPeriod] = await db
        .select()
        .from(payPeriods)
        .where(eq(payPeriods.id, payPeriodId));
      
      if (!payPeriod) throw new Error("Pay period not found");
      
      dateRange = {
        start: payPeriod.startDate,
        end: payPeriod.endDate
      };
    } else if (startDate && endDate) {
      dateRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    } else {
      throw new Error("Either payPeriodId or date range is required");
    }

    // Get all employees with time entries in the date range
    const employeeData = await db
      .select({
        employeeId: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        hourlyRate: users.hourlyRate,
        department: users.department,
        totalHours: sql`COALESCE(SUM(${timeClockEntries.totalHours}), 0)`.as('totalHours'),
        overtimeHours: sql`COALESCE(SUM(${timeClockEntries.overtimeHours}), 0)`.as('overtimeHours'),
        totalEntries: sql`COUNT(${timeClockEntries.id})`.as('totalEntries')
      })
      .from(users)
      .leftJoin(
        timeClockEntries,
        and(
          eq(users.id, timeClockEntries.employeeId),
          between(timeClockEntries.clockInTime, dateRange.start, dateRange.end),
          eq(timeClockEntries.status, "completed")
        )
      )
      .where(eq(users.role, "employee"))
      .groupBy(users.id)
      .orderBy(users.lastName, users.firstName);

    // Calculate pay for each employee
    const payrollData = employeeData.map(emp => {
      const hourlyRate = parseFloat(emp.hourlyRate || "0");
      const totalHours = parseFloat(emp.totalHours || "0");
      const overtimeHours = parseFloat(emp.overtimeHours || "0");
      const regularHours = totalHours - overtimeHours;
      
      const regularPay = regularHours * hourlyRate;
      const overtimePay = overtimeHours * hourlyRate * 1.5;
      const totalPay = regularPay + overtimePay;

      return {
        ...emp,
        totalHours: totalHours.toFixed(2),
        regularHours: regularHours.toFixed(2),
        overtimeHours: overtimeHours.toFixed(2),
        hourlyRate: hourlyRate.toFixed(2),
        regularPay: regularPay.toFixed(2),
        overtimePay: overtimePay.toFixed(2),
        totalPay: totalPay.toFixed(2),
      };
    });

    // Calculate totals
    const totals = payrollData.reduce((acc, emp) => ({
      totalHours: acc.totalHours + parseFloat(emp.totalHours),
      totalRegularPay: acc.totalRegularPay + parseFloat(emp.regularPay),
      totalOvertimePay: acc.totalOvertimePay + parseFloat(emp.overtimePay),
      totalPay: acc.totalPay + parseFloat(emp.totalPay),
    }), { totalHours: 0, totalRegularPay: 0, totalOvertimePay: 0, totalPay: 0 });

    return {
      dateRange,
      employees: payrollData,
      totals: {
        totalHours: totals.totalHours.toFixed(2),
        totalRegularPay: totals.totalRegularPay.toFixed(2),
        totalOvertimePay: totals.totalOvertimePay.toFixed(2),
        totalPay: totals.totalPay.toFixed(2),
      }
    };
  }
}