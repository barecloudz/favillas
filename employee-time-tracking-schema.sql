-- Employee Time Tracking System Database Schema

-- 1. Employee Profiles (extends existing users table)
ALTER TABLE users ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE; -- Badge/PIN number
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'kitchen'; -- kitchen, delivery, management
ALTER TABLE users ADD COLUMN IF NOT EXISTS hire_date DATE;

-- 2. Time Clock Records
CREATE TABLE time_clock_entries (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) NOT NULL,
    clock_in_time TIMESTAMP NOT NULL,
    clock_out_time TIMESTAMP,
    scheduled_shift_id INTEGER REFERENCES employee_schedules(id),
    break_duration_minutes INTEGER DEFAULT 0,
    total_hours DECIMAL(4,2), -- Calculated on clock out
    overtime_hours DECIMAL(4,2) DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'missed')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. Employee Schedules
CREATE TABLE employee_schedules (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) NOT NULL,
    schedule_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    position TEXT NOT NULL, -- 'kitchen', 'cashier', 'delivery', 'manager'
    is_mandatory BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id) NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'no_show', 'cancelled')),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Pay Periods
CREATE TABLE pay_periods (
    id SERIAL PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'paid')),
    total_hours DECIMAL(8,2),
    total_cost DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 5. Scheduling Alerts/Notifications
CREATE TABLE schedule_alerts (
    id SERIAL PRIMARY KEY,
    employee_id INTEGER REFERENCES users(id) NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('early_clock_in', 'late_clock_in', 'unscheduled_clock_in', 'missed_shift', 'overtime')),
    message TEXT NOT NULL,
    scheduled_shift_id INTEGER REFERENCES employee_schedules(id),
    time_entry_id INTEGER REFERENCES time_clock_entries(id),
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Indexes for performance
CREATE INDEX idx_time_clock_employee_date ON time_clock_entries(employee_id, DATE(clock_in_time));
CREATE INDEX idx_schedules_employee_date ON employee_schedules(employee_id, schedule_date);
CREATE INDEX idx_alerts_unread ON schedule_alerts(is_read, created_at);

-- 7. Sample data
INSERT INTO pay_periods (start_date, end_date, status) VALUES 
    ('2025-01-01', '2025-01-15', 'open'),
    ('2025-01-16', '2025-01-31', 'open');