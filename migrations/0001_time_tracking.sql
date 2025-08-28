-- Time Tracking System Migration

-- Add hourly rate and department to users table
ALTER TABLE "users" ADD COLUMN "hourly_rate" numeric(10,2);
ALTER TABLE "users" ADD COLUMN "department" text;

-- Create time clock entries table
CREATE TABLE IF NOT EXISTS "time_clock_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"clock_in_time" timestamp NOT NULL,
	"clock_out_time" timestamp,
	"scheduled_shift_id" integer,
	"break_duration_minutes" integer DEFAULT 0,
	"total_hours" numeric(4,2),
	"overtime_hours" numeric(4,2) DEFAULT '0',
	"notes" text,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create employee schedules table
CREATE TABLE IF NOT EXISTS "employee_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"schedule_date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"position" text NOT NULL,
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"created_by" integer NOT NULL,
	"notes" text,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create schedule alerts table
CREATE TABLE IF NOT EXISTS "schedule_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"employee_id" integer NOT NULL,
	"alert_type" text NOT NULL,
	"message" text NOT NULL,
	"scheduled_shift_id" integer,
	"time_entry_id" integer,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Create pay periods table
CREATE TABLE IF NOT EXISTS "pay_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"total_hours" numeric(8,2),
	"total_cost" numeric(10,2),
	"created_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
ALTER TABLE "time_clock_entries" ADD CONSTRAINT "time_clock_entries_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "time_clock_entries" ADD CONSTRAINT "time_clock_entries_scheduled_shift_id_employee_schedules_id_fk" FOREIGN KEY ("scheduled_shift_id") REFERENCES "employee_schedules"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "employee_schedules" ADD CONSTRAINT "employee_schedules_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "employee_schedules" ADD CONSTRAINT "employee_schedules_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;

ALTER TABLE "schedule_alerts" ADD CONSTRAINT "schedule_alerts_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "schedule_alerts" ADD CONSTRAINT "schedule_alerts_scheduled_shift_id_employee_schedules_id_fk" FOREIGN KEY ("scheduled_shift_id") REFERENCES "employee_schedules"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "schedule_alerts" ADD CONSTRAINT "schedule_alerts_time_entry_id_time_clock_entries_id_fk" FOREIGN KEY ("time_entry_id") REFERENCES "time_clock_entries"("id") ON DELETE no action ON UPDATE no action;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS "time_clock_entries_employee_id_idx" ON "time_clock_entries" ("employee_id");
CREATE INDEX IF NOT EXISTS "time_clock_entries_clock_in_time_idx" ON "time_clock_entries" ("clock_in_time");
CREATE INDEX IF NOT EXISTS "time_clock_entries_status_idx" ON "time_clock_entries" ("status");

CREATE INDEX IF NOT EXISTS "employee_schedules_employee_id_idx" ON "employee_schedules" ("employee_id");
CREATE INDEX IF NOT EXISTS "employee_schedules_schedule_date_idx" ON "employee_schedules" ("schedule_date");

CREATE INDEX IF NOT EXISTS "schedule_alerts_employee_id_idx" ON "schedule_alerts" ("employee_id");
CREATE INDEX IF NOT EXISTS "schedule_alerts_is_read_idx" ON "schedule_alerts" ("is_read");
CREATE INDEX IF NOT EXISTS "schedule_alerts_created_at_idx" ON "schedule_alerts" ("created_at");

-- Insert sample employee data
UPDATE "users" SET "hourly_rate" = '15.00', "department" = 'Kitchen' WHERE "role" = 'employee' AND "first_name" = 'Employee';

-- Insert sample schedule for testing (optional)
-- INSERT INTO "employee_schedules" ("employee_id", "schedule_date", "start_time", "end_time", "position", "created_by")
-- VALUES (
--   (SELECT "id" FROM "users" WHERE "role" = 'employee' LIMIT 1),
--   CURRENT_DATE,
--   '09:00:00',
--   '17:00:00',
--   'kitchen',
--   (SELECT "id" FROM "users" WHERE "is_admin" = true LIMIT 1)
-- );