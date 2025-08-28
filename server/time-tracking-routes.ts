import { Express } from "express";
import { z } from "zod";
import { storage } from "./storage";
import { log } from "./vite";

// Validation schemas
const clockInSchema = z.object({
  employeeId: z.string().optional(), // Badge number or PIN
  location: z.string().optional(), // GPS coordinates or store location
});

const clockOutSchema = z.object({
  timeEntryId: z.number(),
  breakDuration: z.number().min(0).default(0),
  notes: z.string().optional(),
});

const scheduleSchema = z.object({
  employeeId: z.number(),
  scheduleDate: z.string(), // YYYY-MM-DD format
  startTime: z.string(), // HH:MM format
  endTime: z.string(), // HH:MM format
  position: z.enum(['kitchen', 'cashier', 'delivery', 'manager']),
  isMandatory: z.boolean().default(true),
  notes: z.string().optional(),
});

// Helper functions for printing schedules
function formatScheduleForPrint(schedules: any[], startDate: string, endDate: string) {
  // Group schedules by date
  const schedulesByDate = schedules.reduce((acc, schedule) => {
    const date = schedule.scheduleDate;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(schedule);
    return acc;
  }, {} as Record<string, any[]>);

  // Sort each day's schedules by start time
  Object.keys(schedulesByDate).forEach(date => {
    schedulesByDate[date].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  return {
    dateRange: { startDate, endDate },
    schedulesByDate,
    totalShifts: schedules.length,
    employees: [...new Set(schedules.map(s => s.employeeName))].filter(Boolean),
    summary: {
      totalHours: schedules.reduce((total, schedule) => {
        const start = new Date(`1970-01-01T${schedule.startTime}`);
        const end = new Date(`1970-01-01T${schedule.endTime}`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }, 0)
    }
  };
}

function generateScheduleHTML(schedules: any[], startDate: string, endDate: string) {
  const printData = formatScheduleForPrint(schedules, startDate, endDate);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <title>Employee Schedule - ${startDate} to ${endDate}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { text-align: center; margin-bottom: 30px; }
    .date-section { margin-bottom: 30px; page-break-inside: avoid; }
    .date-header { font-size: 18px; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #333; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f5f5f5; font-weight: bold; }
    .no-schedules { font-style: italic; color: #666; }
    .summary { margin-top: 30px; padding: 15px; background-color: #f9f9f9; border: 1px solid #ddd; }
    @media print {
      body { margin: 0; }
      .date-section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>Employee Schedule</h1>
  <p style="text-align: center; margin-bottom: 30px;">
    <strong>${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}</strong>
  </p>
  
  ${Object.keys(printData.schedulesByDate).sort().map(date => {
    const daySchedules = printData.schedulesByDate[date];
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    
    return `
    <div class="date-section">
      <div class="date-header">${dayName}, ${new Date(date).toLocaleDateString()}</div>
      ${daySchedules.length > 0 ? `
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Position</th>
              <th>Start Time</th>
              <th>End Time</th>
              <th>Hours</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            ${daySchedules.map(schedule => {
              const start = new Date(`1970-01-01T${schedule.startTime}`);
              const end = new Date(`1970-01-01T${schedule.endTime}`);
              const hours = ((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(1);
              
              return `
              <tr>
                <td>${schedule.employeeName || 'Unknown Employee'}</td>
                <td>${schedule.position}</td>
                <td>${schedule.startTime}</td>
                <td>${schedule.endTime}</td>
                <td>${hours} hrs</td>
                <td>${schedule.notes || ''}</td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      ` : '<p class="no-schedules">No schedules for this date</p>'}
    </div>
    `;
  }).join('')}
  
  <div class="summary">
    <h3>Summary</h3>
    <p><strong>Total Shifts:</strong> ${printData.totalShifts}</p>
    <p><strong>Total Hours:</strong> ${printData.summary.totalHours.toFixed(1)} hours</p>
    <p><strong>Employees:</strong> ${printData.employees.join(', ') || 'None'}</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `.trim();
}

export function setupTimeTrackingRoutes(app: Express) {
  
  // Employee Clock In
  app.post("/api/time-clock/clock-in", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { employeeId, location } = clockInSchema.parse(req.body);
      const user = req.user;
      
      // Check if employee has an active clock-in (with 12-hour auto clock-out check)
      let activeEntry = await storage.getActiveTimeEntry(user.id);
      if (activeEntry) {
        const clockInTime = new Date(activeEntry.clockInTime);
        const now = new Date();
        const hoursWorked = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursWorked >= 12) {
          // Auto clock out the previous shift after 12 hours
          const clockOutTime = new Date(clockInTime.getTime() + (12 * 60 * 60 * 1000));
          const totalHours = 12;
          const overtimeHours = Math.max(0, totalHours - 8);

          await storage.updateTimeEntry(activeEntry.id, {
            clockOutTime,
            totalHours: totalHours,
            overtimeHours: overtimeHours,
            notes: (activeEntry.notes || '') + ' [AUTO CLOCK-OUT: 12 hour limit reached before new clock-in]',
            status: 'completed',
          });

          await storage.createScheduleAlert({
            employeeId: user.id,
            alertType: 'overtime',
            message: `${user.firstName} ${user.lastName} was automatically clocked out after 12 hours before new clock-in`,
            timeEntryId: activeEntry.id,
          });

          log(`Employee ${user.firstName} ${user.lastName} auto-clocked out previous shift before new clock-in`, "time-tracking");
          
          // Clear active entry to allow new clock-in
          activeEntry = null;
        } else {
          return res.status(400).json({ 
            message: "You are already clocked in",
            activeEntry 
          });
        }
      }

      // Check for scheduled shift
      const todaysSchedule = await storage.getTodaysSchedule(user.id);
      const currentTime = new Date();
      
      let scheduleAlert = null;
      if (todaysSchedule) {
        const scheduleStart = new Date(`${todaysSchedule.scheduleDate}T${todaysSchedule.startTime}`);
        const timeDiff = (currentTime.getTime() - scheduleStart.getTime()) / (1000 * 60); // minutes
        
        if (timeDiff < -15) {
          // Clocking in more than 15 minutes early
          scheduleAlert = await storage.createScheduleAlert({
            employeeId: user.id,
            alertType: 'early_clock_in',
            message: `${user.firstName} ${user.lastName} clocked in ${Math.abs(timeDiff).toFixed(0)} minutes early`,
            scheduledShiftId: todaysSchedule.id,
          });
        } else if (timeDiff > 15) {
          // Clocking in more than 15 minutes late
          scheduleAlert = await storage.createScheduleAlert({
            employeeId: user.id,
            alertType: 'late_clock_in',
            message: `${user.firstName} ${user.lastName} clocked in ${timeDiff.toFixed(0)} minutes late`,
            scheduledShiftId: todaysSchedule.id,
          });
        }
      } else {
        // No scheduled shift - unscheduled clock in
        scheduleAlert = await storage.createScheduleAlert({
          employeeId: user.id,
          alertType: 'unscheduled_clock_in',
          message: `${user.firstName} ${user.lastName} clocked in without a scheduled shift`,
        });
      }

      // Create time entry
      const timeEntry = await storage.createTimeEntry({
        employeeId: user.id,
        clockInTime: currentTime,
        scheduledShiftId: todaysSchedule?.id,
      });

      log(`Employee ${user.firstName} ${user.lastName} clocked in`, "time-tracking");

      res.status(201).json({
        timeEntry,
        schedule: todaysSchedule,
        alert: scheduleAlert,
      });

    } catch (error) {
      log(`Clock in error: ${error instanceof Error ? error.message : error}`, "time-tracking");
      res.status(500).json({ message: "Failed to clock in" });
    }
  });

  // Employee Clock Out
  app.post("/api/time-clock/clock-out", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { timeEntryId, breakDuration, notes } = clockOutSchema.parse(req.body);
      const user = req.user;

      // Verify the time entry belongs to the user
      const timeEntry = await storage.getTimeEntry(timeEntryId);
      if (!timeEntry || timeEntry.employeeId !== user.id) {
        return res.status(404).json({ message: "Time entry not found" });
      }

      if (timeEntry.clockOutTime) {
        return res.status(400).json({ message: "Already clocked out" });
      }

      const clockOutTime = new Date();
      const clockInTime = new Date(timeEntry.clockInTime);
      
      // Calculate total hours (subtract break time)
      const totalMinutes = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60);
      const totalHours = Math.max(0, (totalMinutes - (breakDuration || 0)) / 60);
      
      // Calculate overtime (over 8 hours)
      const overtimeHours = Math.max(0, totalHours - 8);

      // Update time entry
      const updatedEntry = await storage.updateTimeEntry(timeEntryId, {
        clockOutTime,
        breakDurationMinutes: breakDuration || 0,
        totalHours: parseFloat(totalHours.toFixed(2)),
        overtimeHours: parseFloat(overtimeHours.toFixed(2)),
        notes,
        status: 'completed',
      });

      // Check for overtime alert
      if (overtimeHours > 0) {
        await storage.createScheduleAlert({
          employeeId: user.id,
          alertType: 'overtime',
          message: `${user.firstName} ${user.lastName} worked ${overtimeHours.toFixed(2)} hours of overtime`,
          timeEntryId: timeEntryId,
        });
      }

      log(`Employee ${user.firstName} ${user.lastName} clocked out - ${totalHours.toFixed(2)} hours`, "time-tracking");

      res.json({
        timeEntry: updatedEntry,
        totalHours: totalHours.toFixed(2),
        overtimeHours: overtimeHours.toFixed(2),
      });

    } catch (error) {
      log(`Clock out error: ${error instanceof Error ? error.message : error}`, "time-tracking");
      res.status(500).json({ message: "Failed to clock out" });
    }
  });

  // Get Employee Time Summary
  app.get("/api/time-clock/summary", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const { startDate, endDate } = req.query;
      const user = req.user;

      const summary = await storage.getEmployeeTimeSummary(
        user.id, 
        startDate as string, 
        endDate as string
      );

      res.json(summary);

    } catch (error) {
      res.status(500).json({ message: "Failed to get time summary" });
    }
  });

  // Admin: Get All Employee Hours (Pay Period)
  app.get("/api/admin/payroll", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const { payPeriodId, startDate, endDate } = req.query;
      
      const payrollData = await storage.getPayrollSummary(
        payPeriodId ? parseInt(payPeriodId as string) : undefined,
        startDate as string,
        endDate as string
      );

      res.json(payrollData);

    } catch (error) {
      res.status(500).json({ message: "Failed to get payroll data" });
    }
  });

  // Admin: Create Employee Schedule
  app.post("/api/admin/schedules", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const scheduleData = scheduleSchema.parse(req.body);
      log(`Processing schedule creation: ${JSON.stringify(scheduleData)}`, "scheduling");
      
      // Check for scheduling conflicts
      const conflicts = await storage.checkScheduleConflicts(
        scheduleData.employeeId,
        scheduleData.scheduleDate,
        scheduleData.startTime,
        scheduleData.endTime
      );

      if (conflicts.length > 0) {
        return res.status(400).json({ 
          message: "Scheduling conflict detected",
          conflicts 
        });
      }

      const schedule = await storage.createEmployeeSchedule({
        ...scheduleData,
        createdBy: req.user.id,
      });

      log(`Schedule created for employee ${scheduleData.employeeId}`, "scheduling");

      res.status(201).json(schedule);

    } catch (error) {
      res.status(500).json({ message: "Failed to create schedule" });
    }
  });

  // Admin: Get All Schedules
  app.get("/api/admin/schedules", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const { startDate, endDate, employeeId } = req.query;
      
      const schedules = await storage.getEmployeeSchedules(
        startDate as string,
        endDate as string,
        employeeId ? parseInt(employeeId as string) : undefined
      );

      res.json(schedules);

    } catch (error) {
      res.status(500).json({ message: "Failed to get schedules" });
    }
  });

  // Admin: Update Employee Schedule
  app.put("/api/admin/schedules/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const scheduleId = parseInt(req.params.id);
      
      if (isNaN(scheduleId)) {
        return res.status(400).json({ message: "Invalid schedule ID" });
      }

      const validation = scheduleSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Invalid schedule data",
          errors: validation.error.issues 
        });
      }

      const scheduleData = {
        ...validation.data,
        createdBy: req.user.id,
        updatedAt: new Date()
      };

      log(`Updating schedule ${scheduleId}: ${JSON.stringify(scheduleData)}`, "scheduling");

      const updated = await storage.updateEmployeeSchedule(scheduleId, scheduleData);

      if (updated) {
        log(`Schedule ${scheduleId} updated by admin ${req.user.id}`, "scheduling");
        res.json({ message: "Schedule updated successfully", schedule: updated });
      } else {
        res.status(404).json({ message: "Schedule not found" });
      }

    } catch (error) {
      log(`Update schedule error: ${error instanceof Error ? error.message : error}`, "scheduling");
      res.status(500).json({ message: "Failed to update schedule" });
    }
  });

  // Admin: Delete Employee Schedule
  app.delete("/api/admin/schedules/:id", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const scheduleId = parseInt(req.params.id);
      
      if (isNaN(scheduleId)) {
        return res.status(400).json({ message: "Invalid schedule ID" });
      }

      const deleted = await storage.deleteEmployeeSchedule(scheduleId);

      if (deleted) {
        log(`Schedule ${scheduleId} deleted by admin ${req.user.id}`, "scheduling");
        res.json({ message: "Schedule deleted successfully" });
      } else {
        res.status(404).json({ message: "Schedule not found" });
      }

    } catch (error) {
      log(`Delete schedule error: ${error instanceof Error ? error.message : error}`, "scheduling");
      res.status(500).json({ message: "Failed to delete schedule" });
    }
  });

  // Admin: Print Schedule (formatted for printing)
  app.get("/api/admin/schedules/print", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const { startDate, endDate, format = 'json' } = req.query;
      
      // Default to current week if no dates provided
      const start = startDate as string || new Date().toISOString().split('T')[0];
      const end = endDate as string || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const schedules = await storage.getEmployeeSchedules(start, end);

      if (format === 'html') {
        // Return HTML formatted schedule for printing
        const html = generateScheduleHTML(schedules, start, end);
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
      } else {
        // Return JSON with print-formatted data
        const printData = formatScheduleForPrint(schedules, start, end);
        res.json(printData);
      }

    } catch (error) {
      log(`Print schedule error: ${error instanceof Error ? error.message : error}`, "scheduling");
      res.status(500).json({ message: "Failed to generate print schedule" });
    }
  });

  // Admin: Get Schedule Alerts
  app.get("/api/admin/alerts", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const { unreadOnly } = req.query;
      
      const alerts = await storage.getScheduleAlerts(unreadOnly === 'true');

      res.json(alerts);

    } catch (error) {
      res.status(500).json({ message: "Failed to get alerts" });
    }
  });

  // Admin: Mark Alert as Read
  app.patch("/api/admin/alerts/:id/read", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(401).json({ message: "Admin access required" });
    }

    try {
      const alertId = parseInt(req.params.id);
      await storage.markAlertAsRead(alertId);
      res.json({ message: "Alert marked as read" });

    } catch (error) {
      res.status(500).json({ message: "Failed to mark alert as read" });
    }
  });

  // Get Current Clock Status
  app.get("/api/time-clock/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }

    try {
      const user = req.user;
      let activeEntry = await storage.getActiveTimeEntry(user.id);
      const todaysSchedule = await storage.getTodaysSchedule(user.id);

      // Check for 12-hour auto clock-out
      if (activeEntry) {
        const clockInTime = new Date(activeEntry.clockInTime);
        const now = new Date();
        const hoursWorked = (now.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursWorked >= 12) {
          // Auto clock out after 12 hours
          const clockOutTime = new Date(clockInTime.getTime() + (12 * 60 * 60 * 1000)); // Exactly 12 hours after clock in
          const totalMinutes = 12 * 60; // 12 hours in minutes
          const totalHours = 12;
          const overtimeHours = Math.max(0, totalHours - 8);

          // Update time entry with auto clock-out
          await storage.updateTimeEntry(activeEntry.id, {
            clockOutTime,
            totalHours: totalHours,
            overtimeHours: overtimeHours,
            notes: (activeEntry.notes || '') + ' [AUTO CLOCK-OUT: 12 hour limit reached]',
            status: 'completed',
          });

          // Create alert for auto clock-out
          await storage.createScheduleAlert({
            employeeId: user.id,
            alertType: 'overtime',
            message: `${user.firstName} ${user.lastName} was automatically clocked out after 12 hours`,
            timeEntryId: activeEntry.id,
          });

          log(`Employee ${user.firstName} ${user.lastName} auto-clocked out after 12 hours`, "time-tracking");

          // Clear active entry since they've been clocked out
          activeEntry = null;
        }
      }

      res.json({
        isClocked: !!activeEntry,
        activeEntry,
        todaysSchedule,
      });

    } catch (error) {
      res.status(500).json({ message: "Failed to get clock status" });
    }
  });
}