import { pgTable, serial, text, numeric, boolean, jsonb, timestamp, foreignKey, integer, index, check, uniqueIndex, unique, date, varchar, json, time } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const menuItems = pgTable("menu_items", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text().notNull(),
	imageUrl: text("image_url"),
	basePrice: numeric("base_price", { precision: 10, scale:  2 }).notNull(),
	category: text().notNull(),
	isPopular: boolean("is_popular").default(false).notNull(),
	isNew: boolean("is_new").default(false).notNull(),
	isBestSeller: boolean("is_best_seller").default(false).notNull(),
	isAvailable: boolean("is_available").default(true).notNull(),
	options: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
	id: serial().primaryKey().notNull(),
	orderId: integer("order_id").notNull(),
	menuItemId: integer("menu_item_id").notNull(),
	quantity: integer().notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	options: jsonb(),
	specialInstructions: text("special_instructions"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.menuItemId],
			foreignColumns: [menuItems.id],
			name: "order_items_menu_item_id_menu_items_id_fk"
		}),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "order_items_order_id_orders_id_fk"
		}),
]);

export const orders = pgTable("orders", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	status: text().default('pending').notNull(),
	total: numeric({ precision: 10, scale:  2 }).notNull(),
	tax: numeric({ precision: 10, scale:  2 }).notNull(),
	deliveryFee: numeric("delivery_fee", { precision: 10, scale:  2 }).default('0').notNull(),
	tip: numeric({ precision: 10, scale:  2 }).default('0').notNull(),
	orderType: text("order_type").notNull(),
	paymentStatus: text("payment_status").default('pending').notNull(),
	paymentIntentId: text("payment_intent_id"),
	specialInstructions: text("special_instructions"),
	address: text(),
	phone: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	addressData: jsonb("address_data"),
	shipdayOrderId: text("shipday_order_id"),
	shipdayStatus: text("shipday_status"),
	fulfillmentTime: text("fulfillment_time").default('asap'),
	scheduledTime: timestamp("scheduled_time", { mode: 'string' }),
	refundId: text("refund_id"),
	refundAmount: numeric("refund_amount", { precision: 10, scale:  2 }),
	refundReason: text("refund_reason"),
	refundedBy: integer("refunded_by"),
	refundedAt: timestamp("refunded_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	supabaseUserId: text("supabase_user_id"),
	trackingUrl: text("tracking_url"),
	estimatedDeliveryTime: timestamp("estimated_delivery_time", { mode: 'string' }),
	driverLocation: jsonb("driver_location"),
}, (table) => [
	index("idx_orders_shipday_order_id").using("btree", table.shipdayOrderId.asc().nullsLast().op("text_ops")).where(sql`(shipday_order_id IS NOT NULL)`),
	index("idx_orders_supabase_user_id").using("btree", table.supabaseUserId.asc().nullsLast().op("text_ops")).where(sql`(supabase_user_id IS NOT NULL)`),
	foreignKey({
			columns: [table.refundedBy],
			foreignColumns: [users.id],
			name: "orders_refunded_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "orders_user_id_users_id_fk"
		}).onUpdate("cascade").onDelete("set null"),
	check("orders_user_identification_check", sql`(user_id IS NOT NULL) OR (supabase_user_id IS NOT NULL) OR ((phone IS NOT NULL) AND (length(phone) >= 10))`),
]);

export const userRewards = pgTable("user_rewards", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	rewardId: integer("reward_id").notNull(),
	isUsed: boolean("is_used").default(false).notNull(),
	usedAt: timestamp("used_at", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.rewardId],
			foreignColumns: [rewards.id],
			name: "user_rewards_reward_id_rewards_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_rewards_user_id_users_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	password: text(),
	email: text().notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	phone: text(),
	address: text(),
	city: text(),
	state: text(),
	zipCode: text("zip_code"),
	isAdmin: boolean("is_admin").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	rewards: integer().default(0).notNull(),
	stripeCustomerId: text("stripe_customer_id"),
	marketingOptIn: boolean("marketing_opt_in").default(true).notNull(),
	role: text().default('customer').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: integer("created_by"),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	hourlyRate: numeric("hourly_rate", { precision: 10, scale:  2 }),
	department: text(),
	employeeId: text("employee_id"),
	hireDate: date("hire_date"),
	googleId: text("google_id"),
	supabaseUserId: text("supabase_user_id"),
}, (table) => [
	uniqueIndex("idx_users_supabase_user_id").using("btree", table.supabaseUserId.asc().nullsLast().op("text_ops")).where(sql`(supabase_user_id IS NOT NULL)`),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [table.id],
			name: "users_created_by_users_id_fk"
		}),
	unique("users_username_unique").on(table.username),
	unique("users_email_unique").on(table.email),
	unique("users_google_id_key").on(table.googleId),
]);

export const session = pgTable("session", {
	sid: varchar().primaryKey().notNull(),
	sess: json().notNull(),
	expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
}, (table) => [
	index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const choiceGroups = pgTable("choice_groups", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	order: integer().default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	isRequired: boolean("is_required").default(false).notNull(),
	maxSelections: integer("max_selections"),
	minSelections: integer("min_selections").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const menuItemChoiceGroups = pgTable("menu_item_choice_groups", {
	id: serial().primaryKey().notNull(),
	menuItemId: integer("menu_item_id").notNull(),
	choiceGroupId: integer("choice_group_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	order: integer().default(0).notNull(),
	isRequired: boolean("is_required").default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.choiceGroupId],
			foreignColumns: [choiceGroups.id],
			name: "menu_item_choice_groups_choice_group_id_fkey"
		}),
	foreignKey({
			columns: [table.menuItemId],
			foreignColumns: [menuItems.id],
			name: "menu_item_choice_groups_menu_item_id_fkey"
		}),
	unique("menu_item_choice_groups_menu_item_id_choice_group_id_key").on(table.menuItemId, table.choiceGroupId),
]);

export const choiceItems = pgTable("choice_items", {
	id: serial().primaryKey().notNull(),
	choiceGroupId: integer("choice_group_id").notNull(),
	name: text().notNull(),
	description: text(),
	price: numeric({ precision: 10, scale:  2 }).default('0.00').notNull(),
	order: integer().default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.choiceGroupId],
			foreignColumns: [choiceGroups.id],
			name: "choice_items_choice_group_id_fkey"
		}),
]);

export const promoCodes = pgTable("promo_codes", {
	id: serial().primaryKey().notNull(),
	code: text().notNull(),
	name: text().notNull(),
	description: text(),
	discount: numeric({ precision: 10, scale:  2 }).notNull(),
	discountType: text("discount_type").notNull(),
	minOrderAmount: numeric("min_order_amount", { precision: 10, scale:  2 }).notNull(),
	maxUses: integer("max_uses").notNull(),
	currentUses: integer("current_uses").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("promo_codes_code_key").on(table.code),
]);

export const tipDistributions = pgTable("tip_distributions", {
	id: serial().primaryKey().notNull(),
	orderId: integer("order_id").notNull(),
	employeeId: integer("employee_id").notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	distributionDate: timestamp("distribution_date", { mode: 'string' }).defaultNow().notNull(),
	orderType: text("order_type").notNull(),
	originalTipAmount: numeric("original_tip_amount", { precision: 10, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [users.id],
			name: "tip_distributions_employee_id_fkey"
		}),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "tip_distributions_order_id_fkey"
		}),
]);

export const tipSettings = pgTable("tip_settings", {
	id: serial().primaryKey().notNull(),
	deliveryTipPercentageToEmployees: numeric("delivery_tip_percentage_to_employees", { precision: 5, scale:  2 }).default('25.00').notNull(),
	pickupTipSplitEnabled: boolean("pickup_tip_split_enabled").default(true).notNull(),
	deliveryTipSplitEnabled: boolean("delivery_tip_split_enabled").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const categoryChoiceGroups = pgTable("category_choice_groups", {
	id: serial().primaryKey().notNull(),
	categoryName: text("category_name").notNull(),
	choiceGroupId: integer("choice_group_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	order: integer().default(0).notNull(),
	isRequired: boolean("is_required").default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.choiceGroupId],
			foreignColumns: [choiceGroups.id],
			name: "category_choice_groups_choice_group_id_fkey"
		}),
	unique("category_choice_groups_category_name_choice_group_id_key").on(table.categoryName, table.choiceGroupId),
]);

export const receiptTemplates = pgTable("receipt_templates", {
	templateId: text("template_id").primaryKey().notNull(),
	templateData: jsonb("template_data").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_receipt_templates_updated_at").using("btree", table.updatedAt.asc().nullsLast().op("timestamptz_ops")),
]);

export const loyaltyProgram = pgTable("loyalty_program", {
	id: serial().primaryKey().notNull(),
	name: text().default('Favilla\'s Loyalty Program').notNull(),
	description: text(),
	pointsPerDollar: numeric("points_per_dollar", { precision: 10, scale:  2 }).default('1.00').notNull(),
	bonusPointsThreshold: numeric("bonus_points_threshold", { precision: 10, scale:  2 }).default('50.00').notNull(),
	bonusPointsMultiplier: numeric("bonus_points_multiplier", { precision: 10, scale:  2 }).default('1.50').notNull(),
	pointsForSignup: integer("points_for_signup").default(100).notNull(),
	pointsForFirstOrder: integer("points_for_first_order").default(50).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const userPoints = pgTable("user_points", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	points: integer().default(0).notNull(),
	totalEarned: integer("total_earned").default(0).notNull(),
	totalRedeemed: integer("total_redeemed").default(0).notNull(),
	lastEarnedAt: timestamp("last_earned_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	supabaseUserId: text("supabase_user_id"),
}, (table) => [
	index("idx_user_points_supabase_user_id").using("btree", table.supabaseUserId.asc().nullsLast().op("text_ops")).where(sql`(supabase_user_id IS NOT NULL)`),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_points_user_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_points_user_id_users_id_fk"
		}).onUpdate("cascade").onDelete("set null"),
	check("user_points_user_identification_check", sql`(user_id IS NOT NULL) OR (supabase_user_id IS NOT NULL)`),
]);

export const pointsRewards = pgTable("points_rewards", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text().notNull(),
	pointsRequired: integer("points_required").notNull(),
	rewardType: text("reward_type").notNull(),
	rewardValue: numeric("reward_value", { precision: 10, scale:  2 }),
	rewardDescription: text("reward_description"),
	isActive: boolean("is_active").default(true).notNull(),
	maxRedemptions: integer("max_redemptions"),
	currentRedemptions: integer("current_redemptions").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const pointsTransactions = pgTable("points_transactions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	orderId: integer("order_id"),
	type: text().notNull(),
	points: integer().notNull(),
	description: text().notNull(),
	orderAmount: numeric("order_amount", { precision: 10, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	supabaseUserId: text("supabase_user_id"),
}, (table) => [
	index("idx_points_transactions_supabase_user_id").using("btree", table.supabaseUserId.asc().nullsLast().op("text_ops")).where(sql`(supabase_user_id IS NOT NULL)`),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "points_transactions_order_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "points_transactions_user_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "points_transactions_user_id_users_id_fk"
		}).onUpdate("cascade").onDelete("set null"),
	check("points_transactions_user_identification_check", sql`(user_id IS NOT NULL) OR (supabase_user_id IS NOT NULL)`),
]);

export const userPointsRedemptions = pgTable("user_points_redemptions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	rewardId: integer("reward_id").notNull(),
	orderId: integer("order_id"),
	pointsSpent: integer("points_spent").notNull(),
	isUsed: boolean("is_used").default(false).notNull(),
	usedAt: timestamp("used_at", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	supabaseUserId: text("supabase_user_id"),
}, (table) => [
	index("idx_user_points_redemptions_supabase_user_id").using("btree", table.supabaseUserId.asc().nullsLast().op("text_ops")).where(sql`(supabase_user_id IS NOT NULL)`),
	foreignKey({
			columns: [table.orderId],
			foreignColumns: [orders.id],
			name: "user_points_redemptions_order_id_fkey"
		}),
	foreignKey({
			columns: [table.rewardId],
			foreignColumns: [rewards.id],
			name: "user_points_redemptions_reward_id_rewards_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_points_redemptions_user_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_points_redemptions_user_id_users_id_fk"
		}).onUpdate("cascade").onDelete("set null"),
	check("chk_user_points_redemptions_user_reference", sql`((user_id IS NOT NULL) AND (supabase_user_id IS NULL)) OR ((user_id IS NULL) AND (supabase_user_id IS NOT NULL))`),
	check("user_points_redemptions_user_identification_check", sql`(user_id IS NOT NULL) OR (supabase_user_id IS NOT NULL)`),
]);

export const categories = pgTable("categories", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	order: integer().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("categories_name_key").on(table.name),
]);

export const employeeSchedules = pgTable("employee_schedules", {
	id: serial().primaryKey().notNull(),
	employeeId: integer("employee_id").notNull(),
	scheduleDate: date("schedule_date").notNull(),
	startTime: time("start_time").notNull(),
	endTime: time("end_time").notNull(),
	position: text().notNull(),
	isMandatory: boolean("is_mandatory").default(true),
	createdBy: integer("created_by"),
	notes: text(),
	status: text().default('scheduled'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "employee_schedules_created_by_fkey"
		}),
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [users.id],
			name: "employee_schedules_employee_id_fkey"
		}),
	check("employee_schedules_status_check", sql`status = ANY (ARRAY['scheduled'::text, 'completed'::text, 'no_show'::text, 'cancelled'::text])`),
]);

export const timeClockEntries = pgTable("time_clock_entries", {
	id: serial().primaryKey().notNull(),
	employeeId: integer("employee_id").notNull(),
	clockInTime: timestamp("clock_in_time", { mode: 'string' }).notNull(),
	clockOutTime: timestamp("clock_out_time", { mode: 'string' }),
	scheduledShiftId: integer("scheduled_shift_id"),
	breakDurationMinutes: integer("break_duration_minutes").default(0),
	totalHours: numeric("total_hours", { precision: 4, scale:  2 }),
	overtimeHours: numeric("overtime_hours", { precision: 4, scale:  2 }).default('0'),
	notes: text(),
	status: text().default('active'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [users.id],
			name: "time_clock_entries_employee_id_fkey"
		}),
	check("time_clock_entries_status_check", sql`status = ANY (ARRAY['active'::text, 'completed'::text, 'missed'::text])`),
]);

export const systemSettings = pgTable("system_settings", {
	id: serial().primaryKey().notNull(),
	settingKey: text("setting_key").notNull(),
	settingValue: text("setting_value"),
	settingType: text("setting_type").default('text'),
	category: text().default('general'),
	displayName: text("display_name").notNull(),
	description: text(),
	isSensitive: boolean("is_sensitive").default(false),
	options: jsonb(),
	validationPattern: text("validation_pattern"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_system_settings_category").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("idx_system_settings_key").using("btree", table.settingKey.asc().nullsLast().op("text_ops")),
	unique("system_settings_setting_key_key").on(table.settingKey),
]);

export const scheduleAlerts = pgTable("schedule_alerts", {
	id: serial().primaryKey().notNull(),
	employeeId: integer("employee_id").notNull(),
	alertType: text("alert_type").notNull(),
	message: text().notNull(),
	scheduledShiftId: integer("scheduled_shift_id"),
	timeEntryId: integer("time_entry_id"),
	isRead: boolean("is_read").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.employeeId],
			foreignColumns: [users.id],
			name: "schedule_alerts_employee_id_fkey"
		}),
	check("schedule_alerts_alert_type_check", sql`alert_type = ANY (ARRAY['early_clock_in'::text, 'late_clock_in'::text, 'unscheduled_clock_in'::text, 'missed_shift'::text, 'overtime'::text])`),
]);

export const payPeriods = pgTable("pay_periods", {
	id: serial().primaryKey().notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	status: text().default('open'),
	totalHours: numeric("total_hours", { precision: 8, scale:  2 }),
	totalCost: numeric("total_cost", { precision: 10, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	check("pay_periods_status_check", sql`status = ANY (ARRAY['open'::text, 'closed'::text, 'paid'::text])`),
]);

export const rewards = pgTable("rewards", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text().notNull(),
	discount: numeric({ precision: 10, scale:  2 }),
	discountType: text("discount_type"),
	minOrderAmount: numeric("min_order_amount", { precision: 10, scale:  2 }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	pointsRequired: integer("points_required").default(100),
	rewardType: varchar("reward_type", { length: 50 }).default('discount'),
	freeItem: varchar("free_item", { length: 255 }),
	isActive: boolean("is_active").default(true),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const userVouchers = pgTable("user_vouchers", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	supabaseUserId: text("supabase_user_id"),
	rewardId: integer("reward_id"),
	voucherCode: text("voucher_code").notNull(),
	discountAmount: numeric("discount_amount", { precision: 10, scale:  2 }).notNull(),
	discountType: text("discount_type").default('fixed').notNull(),
	minOrderAmount: numeric("min_order_amount", { precision: 10, scale:  2 }).default('0'),
	pointsUsed: integer("points_used").notNull(),
	status: text().default('active').notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).default(sql`(now() + '30 days'::interval)`).notNull(),
	appliedToOrderId: integer("applied_to_order_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	usedAt: timestamp("used_at", { mode: 'string' }),
	title: text(),
	description: text(),
}, (table) => [
	index("idx_user_vouchers_code").using("btree", table.voucherCode.asc().nullsLast().op("text_ops")),
	uniqueIndex("idx_user_vouchers_code_unique").using("btree", table.voucherCode.asc().nullsLast().op("text_ops")),
	index("idx_user_vouchers_expires").using("btree", table.expiresAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_user_vouchers_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_user_vouchers_supabase_user_id").using("btree", table.supabaseUserId.asc().nullsLast().op("text_ops")).where(sql`(supabase_user_id IS NOT NULL)`),
	index("idx_user_vouchers_user_id").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_vouchers_user_id_fkey"
		}),
	unique("user_vouchers_voucher_code_key").on(table.voucherCode),
]);

export const halfHalfToppings = pgTable("half_half_toppings", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	category: text().notNull(),
	order: integer().default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	isSoldOut: boolean("is_sold_out").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("half_half_toppings_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("half_half_toppings_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("half_half_toppings_order_idx").using("btree", table.order.asc().nullsLast().op("int4_ops")),
]);

export const sessions = pgTable("sessions", {
	sid: varchar().notNull(),
	sess: json().notNull(),
	expire: timestamp({ precision: 6, mode: 'string' }).notNull(),
});

export const halfHalfSettings = pgTable("half_half_settings", {
	id: serial().primaryKey().notNull(),
	isEnabled: boolean("is_enabled").default(true).notNull(),
	choiceGroupId: integer("choice_group_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.choiceGroupId],
			foreignColumns: [choiceGroups.id],
			name: "half_half_settings_choice_group_id_choice_groups_id_fk"
		}),
]);

export const restaurantSettings = pgTable("restaurant_settings", {
	id: serial().primaryKey().notNull(),
	restaurantName: text("restaurant_name").default('Favilla\'s NY Pizza').notNull(),
	address: text().default('123 Main Street, New York, NY 10001').notNull(),
	phone: text().default('(555) 123-4567').notNull(),
	email: text().default('info@favillas.com').notNull(),
	website: text().default('https://favillas.com').notNull(),
	currency: text().default('USD').notNull(),
	timezone: text().default('America/New_York').notNull(),
	deliveryFee: numeric("delivery_fee", { precision: 10, scale:  2 }).default('3.99').notNull(),
	minimumOrder: numeric("minimum_order", { precision: 10, scale:  2 }).default('15.00').notNull(),
	autoAcceptOrders: boolean("auto_accept_orders").default(true).notNull(),
	sendOrderNotifications: boolean("send_order_notifications").default(true).notNull(),
	sendCustomerNotifications: boolean("send_customer_notifications").default(true).notNull(),
	outOfStockEnabled: boolean("out_of_stock_enabled").default(false).notNull(),
	deliveryEnabled: boolean("delivery_enabled").default(true).notNull(),
	pickupEnabled: boolean("pickup_enabled").default(true).notNull(),
	orderSchedulingEnabled: boolean("order_scheduling_enabled").default(false).notNull(),
	maxAdvanceOrderHours: integer("max_advance_order_hours").default(24).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const printerConfig = pgTable("printer_config", {
	id: serial().primaryKey().notNull(),
	name: text().default('Main Printer').notNull(),
	ipAddress: text("ip_address").notNull(),
	port: integer().default(80).notNull(),
	printerType: text("printer_type").default('epson_tm_m32').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	isPrimary: boolean("is_primary").default(false).notNull(),
	connectionStatus: text("connection_status").default('unknown').notNull(),
	lastConnected: timestamp("last_connected", { mode: 'string' }),
	lastError: text("last_error"),
	settings: jsonb().default({}).notNull(),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("printer_config_connection_status_idx").using("btree", table.connectionStatus.asc().nullsLast().op("text_ops")),
	index("printer_config_is_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("printer_config_is_primary_idx").using("btree", table.isPrimary.asc().nullsLast().op("bool_ops")),
]);

export const adminSettings = pgTable("admin_settings", {
	id: serial().primaryKey().notNull(),
	settingKey: varchar("setting_key", { length: 255 }).notNull(),
	settingValue: text("setting_value").notNull(),
	settingType: varchar("setting_type", { length: 50 }).default('string'),
	description: text(),
	updatedBy: varchar("updated_by", { length: 255 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("admin_settings_setting_key_key").on(table.settingKey),
]);

export const storeSettings = pgTable("store_settings", {
	id: serial().primaryKey().notNull(),
	storeName: varchar("store_name", { length: 255 }).default('Favillas NY Pizza').notNull(),
	address: text().notNull(),
	latitude: numeric({ precision: 10, scale:  8 }).notNull(),
	longitude: numeric({ precision: 11, scale:  8 }).notNull(),
	phone: varchar({ length: 20 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
});

export const deliveryBlackouts = pgTable("delivery_blackouts", {
	id: serial().primaryKey().notNull(),
	areaName: varchar("area_name", { length: 255 }).notNull(),
	zipCodes: text("zip_codes").array(),
	reason: varchar({ length: 255 }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const deliveryZones = pgTable("delivery_zones", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	maxRadius: numeric("max_radius", { precision: 8, scale:  2 }).notNull(),
	deliveryFee: numeric("delivery_fee", { precision: 10, scale:  2 }).notNull(),
	estimatedTimeMinutes: integer("estimated_time_minutes").default(30).notNull(),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [
	index("idx_delivery_zones_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_delivery_zones_radius").using("btree", table.maxRadius.asc().nullsLast().op("numeric_ops")),
	index("idx_delivery_zones_sort_order").using("btree", table.sortOrder.asc().nullsLast().op("int4_ops")),
]);

export const deliverySettings = pgTable("delivery_settings", {
	id: serial().primaryKey().notNull(),
	restaurantAddress: text("restaurant_address").notNull(),
	restaurantLat: numeric("restaurant_lat", { precision: 10, scale:  8 }),
	restaurantLng: numeric("restaurant_lng", { precision: 11, scale:  8 }),
	googleMapsApiKey: text("google_maps_api_key"),
	maxDeliveryRadius: numeric("max_delivery_radius", { precision: 8, scale:  2 }).default('10').notNull(),
	distanceUnit: varchar("distance_unit", { length: 20 }).default('miles').notNull(),
	isGoogleMapsEnabled: boolean("is_google_maps_enabled").default(false).notNull(),
	fallbackDeliveryFee: numeric("fallback_delivery_fee", { precision: 10, scale:  2 }).default('5.00').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
});
