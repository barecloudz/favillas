-- Create half_half_toppings table
CREATE TABLE IF NOT EXISTS "half_half_toppings" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "price" numeric(10, 2) NOT NULL,
  "category" text NOT NULL,
  "order" integer DEFAULT 0 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "is_sold_out" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Create half_half_settings table
CREATE TABLE IF NOT EXISTS "half_half_settings" (
  "id" serial PRIMARY KEY NOT NULL,
  "is_enabled" boolean DEFAULT true NOT NULL,
  "choice_group_id" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Add foreign key constraint for choice_group_id
ALTER TABLE "half_half_settings" ADD CONSTRAINT "half_half_settings_choice_group_id_choice_groups_id_fk" FOREIGN KEY ("choice_group_id") REFERENCES "public"."choice_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "half_half_toppings_category_idx" ON "half_half_toppings" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "half_half_toppings_order_idx" ON "half_half_toppings" ("order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "half_half_toppings_active_idx" ON "half_half_toppings" ("is_active");--> statement-breakpoint