CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "category_choice_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_name" text NOT NULL,
	"choice_group_id" integer NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "choice_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"max_selections" integer,
	"min_selections" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "choice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"choice_group_id" integer NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_program" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'Favilla''s Loyalty Program' NOT NULL,
	"description" text,
	"points_per_dollar" numeric(10, 2) DEFAULT '1.00' NOT NULL,
	"bonus_points_threshold" numeric(10, 2) DEFAULT '50.00' NOT NULL,
	"bonus_points_multiplier" numeric(10, 2) DEFAULT '1.50' NOT NULL,
	"points_for_signup" integer DEFAULT 100 NOT NULL,
	"points_for_first_order" integer DEFAULT 50 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_item_choice_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"menu_item_id" integer NOT NULL,
	"choice_group_id" integer NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "menu_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"image_url" text,
	"base_price" numeric(10, 2) NOT NULL,
	"category" text NOT NULL,
	"is_popular" boolean DEFAULT false NOT NULL,
	"is_new" boolean DEFAULT false NOT NULL,
	"is_best_seller" boolean DEFAULT false NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL,
	"options" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"menu_item_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"options" jsonb,
	"special_instructions" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"status" text DEFAULT 'pending' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"tax" numeric(10, 2) NOT NULL,
	"delivery_fee" numeric(10, 2) DEFAULT '0' NOT NULL,
	"tip" numeric(10, 2) DEFAULT '0' NOT NULL,
	"order_type" text NOT NULL,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"payment_intent_id" text,
	"special_instructions" text,
	"address" text,
	"address_data" jsonb,
	"shipday_order_id" text,
	"shipday_status" text,
	"fulfillment_time" text DEFAULT 'asap',
	"scheduled_time" timestamp,
	"phone" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "pause_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"pause_type" text NOT NULL,
	"specific_services" text[],
	"pause_duration" integer NOT NULL,
	"pause_until_end_of_day" boolean DEFAULT false NOT NULL,
	"notification_message" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "points_rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"points_required" integer NOT NULL,
	"reward_type" text NOT NULL,
	"reward_value" numeric(10, 2),
	"reward_description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"max_redemptions" integer,
	"current_redemptions" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "points_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"order_id" integer,
	"type" text NOT NULL,
	"points" integer NOT NULL,
	"description" text NOT NULL,
	"order_amount" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promo_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"discount" numeric(10, 2) NOT NULL,
	"discount_type" text NOT NULL,
	"min_order_amount" numeric(10, 2) NOT NULL,
	"max_uses" integer NOT NULL,
	"current_uses" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "promo_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "restaurant_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"restaurant_name" text DEFAULT 'Favilla''s NY Pizza' NOT NULL,
	"address" text DEFAULT '123 Main Street, New York, NY 10001' NOT NULL,
	"phone" text DEFAULT '(555) 123-4567' NOT NULL,
	"email" text DEFAULT 'info@favillas.com' NOT NULL,
	"website" text DEFAULT 'https://favillas.com' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"delivery_fee" numeric(10, 2) DEFAULT '3.99' NOT NULL,
	"minimum_order" numeric(10, 2) DEFAULT '15.00' NOT NULL,
	"auto_accept_orders" boolean DEFAULT true NOT NULL,
	"send_order_notifications" boolean DEFAULT true NOT NULL,
	"send_customer_notifications" boolean DEFAULT true NOT NULL,
	"out_of_stock_enabled" boolean DEFAULT false NOT NULL,
	"delivery_enabled" boolean DEFAULT true NOT NULL,
	"pickup_enabled" boolean DEFAULT true NOT NULL,
	"order_scheduling_enabled" boolean DEFAULT false NOT NULL,
	"max_advance_order_hours" integer DEFAULT 24 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"discount" numeric(10, 2),
	"discount_type" text,
	"min_order_amount" numeric(10, 2),
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_hours" (
	"id" serial PRIMARY KEY NOT NULL,
	"day_of_week" integer NOT NULL,
	"day_name" text NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL,
	"open_time" text,
	"close_time" text,
	"is_break_time" boolean DEFAULT false NOT NULL,
	"break_start_time" text,
	"break_end_time" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"rate" numeric(5, 2) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"applies_to_delivery" boolean DEFAULT false NOT NULL,
	"applies_to_tips" boolean DEFAULT false NOT NULL,
	"applies_to_service_fees" boolean DEFAULT false NOT NULL,
	"applies_to_menu_items" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"tax_application" text DEFAULT 'on_top' NOT NULL,
	"tax_name" text DEFAULT 'Sales Tax' NOT NULL,
	"default_tax_category_id" integer,
	"delivery_fee_tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"tips_tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"service_fee_tax_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"currency_symbol" text DEFAULT '$' NOT NULL,
	"currency_position" text DEFAULT 'before' NOT NULL,
	"decimal_places" integer DEFAULT 2 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_points" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"total_earned" integer DEFAULT 0 NOT NULL,
	"total_redeemed" integer DEFAULT 0 NOT NULL,
	"last_earned_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_points_redemptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"points_reward_id" integer NOT NULL,
	"order_id" integer,
	"points_spent" integer NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"reward_id" integer NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"used_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"address" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"role" text DEFAULT 'customer' NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"rewards" integer DEFAULT 0 NOT NULL,
	"stripe_customer_id" text,
	"marketing_opt_in" boolean DEFAULT true NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vacation_mode" (
	"id" serial PRIMARY KEY NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"message" text DEFAULT 'We are currently on vacation and will be back soon. Thank you for your patience!' NOT NULL,
	"reason" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "category_choice_groups" ADD CONSTRAINT "category_choice_groups_choice_group_id_choice_groups_id_fk" FOREIGN KEY ("choice_group_id") REFERENCES "public"."choice_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "choice_items" ADD CONSTRAINT "choice_items_choice_group_id_choice_groups_id_fk" FOREIGN KEY ("choice_group_id") REFERENCES "public"."choice_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_choice_groups" ADD CONSTRAINT "menu_item_choice_groups_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "menu_item_choice_groups" ADD CONSTRAINT "menu_item_choice_groups_choice_group_id_choice_groups_id_fk" FOREIGN KEY ("choice_group_id") REFERENCES "public"."choice_groups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_menu_item_id_menu_items_id_fk" FOREIGN KEY ("menu_item_id") REFERENCES "public"."menu_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pause_services" ADD CONSTRAINT "pause_services_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_transactions" ADD CONSTRAINT "points_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "points_transactions" ADD CONSTRAINT "points_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_settings" ADD CONSTRAINT "tax_settings_default_tax_category_id_tax_categories_id_fk" FOREIGN KEY ("default_tax_category_id") REFERENCES "public"."tax_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_points" ADD CONSTRAINT "user_points_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_points_redemptions" ADD CONSTRAINT "user_points_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_points_redemptions" ADD CONSTRAINT "user_points_redemptions_points_reward_id_points_rewards_id_fk" FOREIGN KEY ("points_reward_id") REFERENCES "public"."points_rewards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_points_redemptions" ADD CONSTRAINT "user_points_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vacation_mode" ADD CONSTRAINT "vacation_mode_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;