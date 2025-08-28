CREATE TABLE "tip_distributions" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"distribution_date" timestamp DEFAULT now() NOT NULL,
	"order_type" text NOT NULL,
	"original_tip_amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tip_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"delivery_tip_percentage_to_employees" numeric(5, 2) DEFAULT '25.00' NOT NULL,
	"pickup_tip_split_enabled" boolean DEFAULT true NOT NULL,
	"delivery_tip_split_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tip_distributions" ADD CONSTRAINT "tip_distributions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tip_distributions" ADD CONSTRAINT "tip_distributions_employee_id_users_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;