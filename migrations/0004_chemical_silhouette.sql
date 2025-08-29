CREATE TABLE "printer_config" (
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
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" text PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
ALTER TABLE "printer_config" ADD CONSTRAINT "printer_config_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;