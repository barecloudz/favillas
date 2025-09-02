import { VercelRequest, VercelResponse } from '@vercel/node';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, gte, lte } from 'drizzle-orm';
import { employeeSchedules, users } from '../../../shared/schema';
import jwt from 'jsonwebtoken';

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
  
  dbConnection = drizzle(sql, { schema: { employeeSchedules, users } });
  return dbConnection;
}

function authenticateToken(req: VercelRequest): { userId: number; username: string; role: string } | null {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return null;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
    }

    const payload = jwt.verify(token, jwtSecret) as { userId: number; username: string; role: string };
    return payload;
  } catch (error) {
    return null;
  }
}

function formatTime(timeString: string) {
  try {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return timeString;
  }
}

function calculateShiftHours(startTime: string, endTime: string) {
  try {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    return diff.toFixed(1);
  } catch {
    return '0.0';
  }
}

function getPositionColor(position: string) {
  const colors = {
    kitchen: '#3B82F6',
    cashier: '#10B981', 
    delivery: '#8B5CF6',
    manager: '#EF4444',
    server: '#F59E0B',
  };
  return colors[position as keyof typeof colors] || '#6B7280';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  const origin = req.headers.origin || 'http://localhost:3000';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Authentication not required for print view to support direct links
  // But we'll check if provided
  const authPayload = authenticateToken(req);

  try {
    const { startDate, endDate, format = 'html' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required' });
    }

    const db = getDB();
    
    // Get schedules for the date range with employee info
    const scheduleData = await db
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
        employee: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
          department: users.department,
        }
      })
      .from(employeeSchedules)
      .leftJoin(users, eq(employeeSchedules.employeeId, users.id))
      .where(and(
        gte(employeeSchedules.scheduleDate, new Date(startDate as string)),
        lte(employeeSchedules.scheduleDate, new Date(endDate as string))
      ))
      .orderBy(employeeSchedules.scheduleDate, employeeSchedules.startTime);

    // Group schedules by employee and date
    const employeeScheduleMap = scheduleData.reduce((acc, schedule) => {
      const employeeId = schedule.employeeId;
      if (!acc[employeeId]) {
        acc[employeeId] = {
          employee: schedule.employee,
          schedules: []
        };
      }
      acc[employeeId].schedules.push(schedule);
      return acc;
    }, {} as Record<number, { employee: any, schedules: any[] }>);

    // Generate week days
    const startDateObj = new Date(startDate as string);
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDateObj);
      date.setDate(startDateObj.getDate() + i);
      weekDays.push({
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.toISOString().split('T')[0],
        dayNumber: date.getDate(),
      });
    }

    if (format === 'json') {
      return res.status(200).json({
        dateRange: { startDate, endDate },
        weekDays,
        employeeSchedules: employeeScheduleMap,
        totalSchedules: scheduleData.length,
      });
    }

    // Generate HTML for printing
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Employee Schedule - Week of ${startDateObj.toLocaleDateString()}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: white;
            color: #333;
            line-height: 1.4;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #d73a31;
            padding-bottom: 20px;
        }
        
        .header h1 {
            color: #d73a31;
            font-size: 2.5rem;
            margin-bottom: 10px;
        }
        
        .header .subtitle {
            font-size: 1.2rem;
            color: #666;
            margin-bottom: 5px;
        }
        
        .date-range {
            font-size: 1.1rem;
            color: #333;
            font-weight: 600;
        }
        
        .schedule-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }
        
        .schedule-table th,
        .schedule-table td {
            padding: 12px 8px;
            text-align: center;
            border: 1px solid #ddd;
        }
        
        .schedule-table th {
            background: linear-gradient(135deg, #d73a31, #c73128);
            color: white;
            font-weight: 600;
            font-size: 0.95rem;
        }
        
        .schedule-table .employee-header {
            text-align: left;
            background: #f8f9fa;
            font-weight: 600;
            width: 200px;
            min-width: 200px;
        }
        
        .schedule-table .day-header {
            min-width: 120px;
        }
        
        .schedule-table .total-header {
            min-width: 100px;
        }
        
        .schedule-table tbody tr:nth-child(even) {
            background-color: #f9f9f9;
        }
        
        .schedule-table tbody tr:hover {
            background-color: #f0f8ff;
        }
        
        .employee-cell {
            text-align: left !important;
            padding: 15px 12px;
        }
        
        .employee-name {
            font-weight: 600;
            font-size: 1rem;
            color: #333;
            margin-bottom: 4px;
        }
        
        .employee-department {
            font-size: 0.8rem;
            color: #666;
        }
        
        .shift-block {
            background: #f0f9ff;
            border-radius: 6px;
            padding: 8px 6px;
            margin: 2px 0;
            border-left: 4px solid #3b82f6;
            font-size: 0.85rem;
        }
        
        .shift-block.kitchen { 
            background: #dbeafe; 
            border-left-color: #3b82f6; 
            color: #1e40af;
        }
        .shift-block.cashier { 
            background: #d1fae5; 
            border-left-color: #10b981; 
            color: #047857;
        }
        .shift-block.delivery { 
            background: #e9d5ff; 
            border-left-color: #8b5cf6; 
            color: #7c3aed;
        }
        .shift-block.manager { 
            background: #fee2e2; 
            border-left-color: #ef4444; 
            color: #dc2626;
        }
        .shift-block.server { 
            background: #fef3c7; 
            border-left-color: #f59e0b; 
            color: #d97706;
        }
        
        .shift-time {
            font-weight: 600;
            margin-bottom: 2px;
        }
        
        .shift-position {
            font-size: 0.75rem;
            text-transform: capitalize;
            opacity: 0.9;
        }
        
        .off-day {
            color: #999;
            font-style: italic;
            padding: 20px;
        }
        
        .total-hours {
            font-weight: 600;
            font-size: 1.1rem;
        }
        
        .total-hours.overtime {
            color: #dc2626;
            background: #fee2e2;
            padding: 4px 8px;
            border-radius: 4px;
        }
        
        .total-hours.normal {
            color: #059669;
        }
        
        .summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        
        .summary-card {
            background: linear-gradient(135deg, #f8f9fa, #e9ecef);
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #dee2e6;
        }
        
        .summary-card .number {
            font-size: 2rem;
            font-weight: bold;
            color: #d73a31;
            margin-bottom: 5px;
        }
        
        .summary-card .label {
            color: #666;
            font-size: 0.9rem;
        }
        
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
            font-size: 0.9rem;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        
        .legend {
            margin: 20px 0;
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 20px;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .legend-color {
            width: 16px;
            height: 16px;
            border-radius: 3px;
        }
        
        @media print {
            body { -webkit-print-color-adjust: exact; }
            .container { padding: 10px; }
            .header h1 { font-size: 2rem; }
            .schedule-table { font-size: 0.85rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Favilla's NY Pizza</h1>
            <div class="subtitle">Employee Work Schedule</div>
            <div class="date-range">
                Week of ${startDateObj.toLocaleDateString('en-US', { 
                  weekday: 'long',
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })} - ${new Date(endDate as string).toLocaleDateString('en-US', { 
                  weekday: 'long',
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
            </div>
        </div>
        
        <div class="legend">
            <div class="legend-item">
                <div class="legend-color" style="background: #3b82f6;"></div>
                <span>Kitchen</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #10b981;"></div>
                <span>Cashier</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #8b5cf6;"></div>
                <span>Delivery</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #ef4444;"></div>
                <span>Manager</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background: #f59e0b;"></div>
                <span>Server</span>
            </div>
        </div>
        
        <table class="schedule-table">
            <thead>
                <tr>
                    <th class="employee-header">Employee</th>
                    ${weekDays.map(day => `
                        <th class="day-header">
                            ${day.name}<br>
                            <small>${day.dayNumber}</small>
                        </th>
                    `).join('')}
                    <th class="total-header">Total Hours</th>
                </tr>
            </thead>
            <tbody>
                ${Object.values(employeeScheduleMap).map(({ employee, schedules }) => {
                  const weeklyHours = schedules.reduce((total, schedule) => {
                    return total + parseFloat(calculateShiftHours(schedule.startTime, schedule.endTime));
                  }, 0);
                  
                  return `
                    <tr>
                        <td class="employee-cell">
                            <div class="employee-name">${employee?.firstName || 'Unknown'} ${employee?.lastName || 'Employee'}</div>
                            <div class="employee-department">${employee?.department || employee?.role || 'Staff'}</div>
                        </td>
                        ${weekDays.map(day => {
                          const daySchedules = schedules.filter(s => s.scheduleDate === day.date);
                          
                          if (daySchedules.length === 0) {
                            return '<td class="off-day">OFF</td>';
                          }
                          
                          return `
                            <td>
                              ${daySchedules.map(schedule => `
                                <div class="shift-block ${schedule.position}">
                                  <div class="shift-time">${formatTime(schedule.startTime)} - ${formatTime(schedule.endTime)}</div>
                                  <div class="shift-position">${schedule.position}</div>
                                </div>
                              `).join('')}
                            </td>
                          `;
                        }).join('')}
                        <td>
                            <div class="total-hours ${weeklyHours > 40 ? 'overtime' : 'normal'}">
                                ${weeklyHours.toFixed(1)}h
                                ${weeklyHours > 40 ? '<br><small>OVERTIME</small>' : ''}
                            </div>
                        </td>
                    </tr>
                  `;
                }).join('')}
            </tbody>
        </table>
        
        <div class="summary">
            <div class="summary-card">
                <div class="number">${scheduleData.length}</div>
                <div class="label">Total Shifts</div>
            </div>
            <div class="summary-card">
                <div class="number">${Object.keys(employeeScheduleMap).length}</div>
                <div class="label">Staff Scheduled</div>
            </div>
            <div class="summary-card">
                <div class="number">${scheduleData.reduce((total, s) => 
                  total + parseFloat(calculateShiftHours(s.startTime, s.endTime)), 0
                ).toFixed(1)}h</div>
                <div class="label">Total Hours</div>
            </div>
            <div class="summary-card">
                <div class="number">$${(scheduleData.reduce((total, s) => 
                  total + parseFloat(calculateShiftHours(s.startTime, s.endTime)), 0
                ) * 15).toFixed(0)}</div>
                <div class="label">Est. Labor Cost</div>
            </div>
        </div>
        
        <div class="footer">
            Generated on ${new Date().toLocaleDateString('en-US', { 
              weekday: 'long',
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
            <br>
            Favilla's NY Pizza - Employee Schedule System
        </div>
    </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
    
  } catch (error) {
    console.error('Print schedules error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}