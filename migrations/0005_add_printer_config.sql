-- Migration: Add printer configuration table
-- Created: 2025-01-25

-- Create printer_config table
CREATE TABLE IF NOT EXISTS "printer_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'Main Printer' NOT NULL,
	"ip_address" text NOT NULL,
	"port" integer DEFAULT 80 NOT NULL,
	"printer_type" text DEFAULT 'epson_tm_m32' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"connection_status" text DEFAULT 'unknown' NOT NULL,
	"last_connected" timestamp,
	"last_error" text,
	"settings" jsonb DEFAULT '{}' NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraint
DO $$ BEGIN
 ALTER TABLE "printer_config" ADD CONSTRAINT "printer_config_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "printer_config_is_active_idx" ON "printer_config" ("is_active");
CREATE INDEX IF NOT EXISTS "printer_config_is_primary_idx" ON "printer_config" ("is_primary");
CREATE INDEX IF NOT EXISTS "printer_config_connection_status_idx" ON "printer_config" ("connection_status");

-- Insert default printer configuration if environment variable exists
-- This will migrate from environment-based to database-based configuration
INSERT INTO "printer_config" ("name", "ip_address", "port", "printer_type", "is_active", "is_primary", "connection_status")
SELECT 
  'Main Printer',
  CASE 
    WHEN position(':' in current_setting('env.PRINTER_IP', true)) > 0 
    THEN split_part(current_setting('env.PRINTER_IP', true), ':', 1)
    ELSE COALESCE(current_setting('env.PRINTER_IP', true), 'localhost')
  END,
  CASE 
    WHEN position(':' in current_setting('env.PRINTER_IP', true)) > 0 
    THEN split_part(current_setting('env.PRINTER_IP', true), ':', 2)::integer
    ELSE 80
  END,
  'epson_tm_m32',
  true,
  true,
  'unknown'
WHERE NOT EXISTS (SELECT 1 FROM "printer_config" WHERE "is_primary" = true);

-- Add comment
COMMENT ON TABLE "printer_config" IS 'Stores printer configuration settings including IP addresses, connection status, and printer-specific settings';