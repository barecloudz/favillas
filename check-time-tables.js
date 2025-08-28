import { db } from "./server/db.js";
import { sql } from "drizzle-orm";

async function checkTables() {
  try {
    console.log("Checking if time tracking tables exist...");
    
    // Check if time_clock_entries table exists
    const tableResult = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('time_clock_entries', 'employee_schedules', 'schedule_alerts', 'pay_periods')
    `);
    
    const existingTables = tableResult || [];
    console.log("Existing time tracking tables:", existingTables);
    
    console.log("Creating time tracking tables...");
      
      // Create time_clock_entries table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS time_clock_entries (
          id SERIAL PRIMARY KEY,
          employee_id INTEGER REFERENCES users(id) NOT NULL,
          clock_in_time TIMESTAMP NOT NULL,
          clock_out_time TIMESTAMP,
          scheduled_shift_id INTEGER,
          break_duration_minutes INTEGER DEFAULT 0,
          total_hours DECIMAL(4,2),
          overtime_hours DECIMAL(4,2) DEFAULT 0,
          notes TEXT,
          status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'missed')),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Create employee_schedules table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS employee_schedules (
          id SERIAL PRIMARY KEY,
          employee_id INTEGER REFERENCES users(id) NOT NULL,
          schedule_date DATE NOT NULL,
          start_time TIME NOT NULL,
          end_time TIME NOT NULL,
          position TEXT NOT NULL,
          is_mandatory BOOLEAN DEFAULT true,
          created_by INTEGER REFERENCES users(id) NOT NULL,
          notes TEXT,
          status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'no_show', 'cancelled')),
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Create schedule_alerts table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS schedule_alerts (
          id SERIAL PRIMARY KEY,
          employee_id INTEGER REFERENCES users(id) NOT NULL,
          alert_type TEXT NOT NULL CHECK (alert_type IN ('early_clock_in', 'late_clock_in', 'unscheduled_clock_in', 'missed_shift', 'overtime')),
          message TEXT NOT NULL,
          scheduled_shift_id INTEGER,
          time_entry_id INTEGER,
          is_read BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Create pay_periods table
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS pay_periods (
          id SERIAL PRIMARY KEY,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid')),
          total_hours DECIMAL(8,2),
          total_cost DECIMAL(10,2),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      
      // Add missing columns to users table
      await db.execute(sql`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS employee_id TEXT,
        ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'kitchen',
        ADD COLUMN IF NOT EXISTS hire_date DATE
      `);
      
      console.log("Time tracking tables created successfully!");
    
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkTables();