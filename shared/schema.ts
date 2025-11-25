import { pgTable, text, serial, integer, boolean, timestamp, decimal, jsonb, date, time } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  googleId: text("google_id").unique(),
  supabaseUserId: text("supabase_user_id").unique(), // Full Supabase UUID for Google OAuth users
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  role: text("role").default("customer").notNull(), // customer, employee, admin, super_admin
  isAdmin: boolean("is_admin").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }),
  department: text("department"),
  createdBy: integer("created_by").references(() => users.id), // Track who created this user
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  rewards: integer("rewards").default(0).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  marketingOptIn: boolean("marketing_opt_in").default(true).notNull(),
  customNotificationSoundUrl: text("custom_notification_sound_url"),
});

// User vouchers schema
export const userVouchers = pgTable("user_vouchers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  supabaseUserId: text("supabase_user_id"),
  rewardId: integer("reward_id"),
  voucherCode: text("voucher_code").notNull().unique(),

  // Discount details
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
  discountType: text("discount_type").notNull().default("fixed"), // 'fixed' or 'percentage'
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }).default("0"),

  // Lifecycle
  pointsUsed: integer("points_used").notNull(),
  status: text("status").notNull().default("active"), // 'active', 'used', 'expired'
  expiresAt: timestamp("expires_at").notNull(),

  // Usage tracking
  appliedToOrderId: integer("applied_to_order_id").references(() => orders.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  usedAt: timestamp("used_at"),

  // Metadata
  title: text("title"),
  description: text("description"),
});

export const insertUserVoucherSchema = createInsertSchema(userVouchers);
export type SelectUserVoucher = typeof userVouchers.$inferSelect;
export type InsertUserVoucher = typeof userVouchers.$inferInsert;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  role: true,
  isAdmin: true,
  isActive: true,
  createdBy: true,
  marketingOptIn: true,
}).partial({
  isAdmin: true,
  createdBy: true,
  phone: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
}).extend({
  // Set default values for registration
  role: z.string().default("customer"),
  isActive: z.boolean().default(true),
  marketingOptIn: z.boolean().default(true),
});

// Categories schema
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  order: integer("order").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isTemporarilyUnavailable: boolean("is_temporarily_unavailable").default(false).notNull(),
  unavailableReason: text("unavailable_reason"),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
  createdAt: true,
});

// MenuItem schema
export const menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  isPopular: boolean("is_popular").default(false).notNull(),
  isNew: boolean("is_new").default(false).notNull(),
  isBestSeller: boolean("is_best_seller").default(false).notNull(),
  isAvailable: boolean("is_available").default(true).notNull(),
  options: jsonb("options"), // For storing size options, toppings, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  createdAt: true,
});

// Order schema
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  supabaseUserId: text("supabase_user_id"), // Links orders to Supabase users via UUID
  status: text("status").notNull().default("pending"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  tax: decimal("tax", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).default("0").notNull(),
  serviceFee: decimal("service_fee", { precision: 10, scale: 2 }).default("0").notNull(),
  tip: decimal("tip", { precision: 10, scale: 2 }).default("0").notNull(),
  orderType: text("order_type").notNull(), // delivery, pickup
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentIntentId: text("payment_intent_id"),
  specialInstructions: text("special_instructions"),
  address: text("address"),
  addressData: jsonb("address_data"), // Store parsed address components and coordinates
  shipdayOrderId: text("shipday_order_id"), // ShipDay order ID for tracking
  shipdayStatus: text("shipday_status"), // ShipDay delivery status
  fulfillmentTime: text("fulfillment_time").default("asap"), // asap or scheduled
  scheduledTime: timestamp("scheduled_time"), // For scheduled orders
  phone: text("phone").notNull(),
  refundId: text("refund_id"), // Stripe refund ID
  refundAmount: decimal("refund_amount", { precision: 10, scale: 2 }), // Amount refunded
  refundReason: text("refund_reason"), // Reason for refund
  refundedBy: integer("refunded_by").references(() => users.id), // Admin who processed refund
  refundedAt: timestamp("refunded_at"), // When refund was processed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  processedAt: true,
  completedAt: true,
});

// OrderItem schema
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  menuItemId: integer("menu_item_id").references(() => menuItems.id).notNull(),
  quantity: integer("quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  options: jsonb("options"), // For storing selected size, toppings, etc.
  specialInstructions: text("special_instructions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
  createdAt: true,
});

// Reward schema - fully admin configurable
export const rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),

  // Admin-configurable voucher properties
  pointsRequired: integer("points_required").notNull().default(50),
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }),
  discountType: text("discount_type").default("fixed"), // 'fixed', 'percentage', 'delivery_fee'
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }).default("0"),

  // Admin-configurable limits and validity
  voucherValidityDays: integer("voucher_validity_days").default(30),
  maxUsesPerUser: integer("max_uses_per_user").default(1),

  // Admin display and instructions
  usageInstructions: text("usage_instructions"),
  adminNotes: text("admin_notes"),
  active: boolean("active").default(true).notNull(),

  // Legacy fields (keep for compatibility)
  discount: decimal("discount", { precision: 10, scale: 2 }),
  expiresAt: timestamp("expires_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRewardSchema = createInsertSchema(rewards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SelectReward = typeof rewards.$inferSelect;
export type InsertReward = typeof rewards.$inferInsert;

// UserReward schema
export const userRewards = pgTable("user_rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  rewardId: integer("reward_id").references(() => rewards.id).notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserRewardSchema = createInsertSchema(userRewards).omit({
  id: true,
  createdAt: true,
});

// PromoCode schema
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  discount: decimal("discount", { precision: 10, scale: 2 }).notNull(),
  discountType: text("discount_type").notNull(), // percentage, fixed
  minOrderAmount: decimal("min_order_amount", { precision: 10, scale: 2 }).notNull(),
  maxUses: integer("max_uses").notNull(),
  currentUses: integer("current_uses").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPromoCodeSchema = z.object({
  code: z.string(),
  name: z.string(),
  description: z.string().optional(),
  discount: z.string(), // decimal fields expect strings
  discountType: z.string(),
  minOrderAmount: z.string(), // decimal fields expect strings
  maxUses: z.number(),
  currentUses: z.number().optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().transform((val) => new Date(val)), // Convert string to Date
  endDate: z.string().transform((val) => new Date(val)), // Convert string to Date
});

// Loyalty Program schema
export const loyaltyProgram = pgTable("loyalty_program", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Favilla's Loyalty Program"),
  description: text("description"),
  pointsPerDollar: decimal("points_per_dollar", { precision: 10, scale: 2 }).notNull().default("1.00"),
  bonusPointsThreshold: decimal("bonus_points_threshold", { precision: 10, scale: 2 }).notNull().default("50.00"),
  bonusPointsMultiplier: decimal("bonus_points_multiplier", { precision: 10, scale: 2 }).notNull().default("1.50"),
  pointsForSignup: integer("points_for_signup").notNull().default(100),
  pointsForFirstOrder: integer("points_for_first_order").notNull().default(50),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLoyaltyProgramSchema = createInsertSchema(loyaltyProgram).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User Points schema
export const userPoints = pgTable("user_points", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  points: integer("points").notNull().default(0),
  totalEarned: integer("total_earned").notNull().default(0),
  totalRedeemed: integer("total_redeemed").notNull().default(0),
  lastEarnedAt: timestamp("last_earned_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserPointsSchema = createInsertSchema(userPoints).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Points Transaction schema
export const pointsTransactions = pgTable("points_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  orderId: integer("order_id").references(() => orders.id),
  type: text("type").notNull(), // earned, redeemed, bonus, signup, first_order
  points: integer("points").notNull(),
  description: text("description").notNull(),
  orderAmount: decimal("order_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPointsTransactionSchema = createInsertSchema(pointsTransactions).omit({
  id: true,
  createdAt: true,
});

// Points Rewards schema
export const pointsRewards = pgTable("points_rewards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  pointsRequired: integer("points_required").notNull(),
  rewardType: text("reward_type").notNull(), // discount, free_item, free_delivery
  rewardValue: decimal("reward_value", { precision: 10, scale: 2 }),
  rewardDescription: text("reward_description"),
  isActive: boolean("is_active").default(true).notNull(),
  maxRedemptions: integer("max_redemptions"),
  currentRedemptions: integer("current_redemptions").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPointsRewardSchema = createInsertSchema(pointsRewards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// User Points Redemption schema
export const userPointsRedemptions = pgTable("user_points_redemptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  pointsRewardId: integer("points_reward_id").references(() => pointsRewards.id).notNull(),
  orderId: integer("order_id").references(() => orders.id),
  pointsSpent: integer("points_spent").notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserPointsRedemptionSchema = createInsertSchema(userPointsRedemptions).omit({
  id: true,
  createdAt: true,
});

// Vacation Mode schema
export const vacationMode = pgTable("vacation_mode", {
  id: serial("id").primaryKey(),
  isEnabled: boolean("is_enabled").default(false).notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  message: text("message").notNull().default("We are currently on vacation and will be back soon. Thank you for your patience!"),
  reason: text("reason"), // Optional reason for vacation
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertVacationModeSchema = createInsertSchema(vacationMode).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Store Hours schema
export const storeHours = pgTable("store_hours", {
  id: serial("id").primaryKey(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 = Sunday, 1 = Monday, etc.
  dayName: text("day_name").notNull(), // "Sunday", "Monday", etc.
  isOpen: boolean("is_open").default(true).notNull(),
  openTime: text("open_time"), // "09:00" format
  closeTime: text("close_time"), // "22:00" format
  isBreakTime: boolean("is_break_time").default(false).notNull(),
  breakStartTime: text("break_start_time"), // "14:00" format
  breakEndTime: text("break_end_time"), // "16:00" format
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertStoreHoursSchema = createInsertSchema(storeHours).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Restaurant Settings schema
export const restaurantSettings = pgTable("restaurant_settings", {
  id: serial("id").primaryKey(),
  restaurantName: text("restaurant_name").notNull().default("Favilla's NY Pizza"),
  address: text("address").notNull().default("123 Main Street, New York, NY 10001"),
  phone: text("phone").notNull().default("(555) 123-4567"),
  email: text("email").notNull().default("info@favillas.com"),
  website: text("website").notNull().default("https://favillas.com"),
  currency: text("currency").notNull().default("USD"),
  timezone: text("timezone").notNull().default("America/New_York"),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull().default("3.99"),
  minimumOrder: decimal("minimum_order", { precision: 10, scale: 2 }).notNull().default("15.00"),
  autoAcceptOrders: boolean("auto_accept_orders").default(true).notNull(),
  sendOrderNotifications: boolean("send_order_notifications").default(true).notNull(),
  sendCustomerNotifications: boolean("send_customer_notifications").default(true).notNull(),
  outOfStockEnabled: boolean("out_of_stock_enabled").default(false).notNull(),
  deliveryEnabled: boolean("delivery_enabled").default(true).notNull(),
  pickupEnabled: boolean("pickup_enabled").default(true).notNull(),
  orderSchedulingEnabled: boolean("order_scheduling_enabled").default(false).notNull(),
  maxAdvanceOrderHours: integer("max_advance_order_hours").default(24).notNull(),
  serviceFeePercentage: decimal("service_fee_percentage", { precision: 5, scale: 2 }).default("3.50").notNull(),
  serviceFeeEnabled: boolean("service_fee_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertRestaurantSettingsSchema = createInsertSchema(restaurantSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Choice Groups schema
export const choiceGroups = pgTable("choice_groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").default(true).notNull(),
  isRequired: boolean("is_required").default(false).notNull(),
  maxSelections: integer("max_selections"),
  minSelections: integer("min_selections").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChoiceGroupSchema = createInsertSchema(choiceGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Choice Items schema
export const choiceItems = pgTable("choice_items", {
  id: serial("id").primaryKey(),
  choiceGroupId: integer("choice_group_id").references(() => choiceGroups.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).default("0").notNull(),
  order: integer("order").notNull().default(0),
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  isTemporarilyUnavailable: boolean("is_temporarily_unavailable").default(false).notNull(),
  unavailableReason: text("unavailable_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChoiceItemSchema = createInsertSchema(choiceItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Menu Item Choice Groups relationship schema
export const menuItemChoiceGroups = pgTable("menu_item_choice_groups", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id").references(() => menuItems.id).notNull(),
  choiceGroupId: integer("choice_group_id").references(() => choiceGroups.id).notNull(),
  order: integer("order").notNull().default(0),
  isRequired: boolean("is_required").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMenuItemChoiceGroupSchema = createInsertSchema(menuItemChoiceGroups).omit({
  id: true,
  createdAt: true,
});

// Category Choice Groups relationship schema
export const categoryChoiceGroups = pgTable("category_choice_groups", {
  id: serial("id").primaryKey(),
  categoryName: text("category_name").notNull(),
  choiceGroupId: integer("choice_group_id").references(() => choiceGroups.id).notNull(),
  order: integer("order").notNull().default(0),
  isRequired: boolean("is_required").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCategoryChoiceGroupSchema = createInsertSchema(categoryChoiceGroups).omit({
  id: true,
  createdAt: true,
});

// Tax Categories schema
export const taxCategories = pgTable("tax_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  rate: decimal("rate", { precision: 5, scale: 2 }).notNull(), // e.g., 7.25 for 7.25%
  isActive: boolean("is_active").default(true).notNull(),
  appliesToDelivery: boolean("applies_to_delivery").default(false).notNull(),
  appliesToTips: boolean("applies_to_tips").default(false).notNull(),
  appliesToServiceFees: boolean("applies_to_service_fees").default(false).notNull(),
  appliesToMenuItems: boolean("applies_to_menu_items").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTaxCategorySchema = createInsertSchema(taxCategories).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Tax Settings schema
export const taxSettings = pgTable("tax_settings", {
  id: serial("id").primaryKey(),
  taxApplication: text("tax_application").notNull().default("on_top"), // "on_top" or "included"
  taxName: text("tax_name").notNull().default("Sales Tax"),
  defaultTaxCategoryId: integer("default_tax_category_id").references(() => taxCategories.id),
  deliveryFeeTaxRate: decimal("delivery_fee_tax_rate", { precision: 5, scale: 2 }).default("0").notNull(),
  tipsTaxRate: decimal("tips_tax_rate", { precision: 5, scale: 2 }).default("0").notNull(),
  serviceFeeTaxRate: decimal("service_fee_tax_rate", { precision: 5, scale: 2 }).default("0").notNull(),
  currency: text("currency").notNull().default("USD"),
  currencySymbol: text("currency_symbol").notNull().default("$"),
  currencyPosition: text("currency_position").notNull().default("before"), // "before" or "after"
  decimalPlaces: integer("decimal_places").notNull().default(2),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTaxSettingsSchema = createInsertSchema(taxSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Pause Services schema
export const pauseServices = pgTable("pause_services", {
  id: serial("id").primaryKey(),
  pauseType: text("pause_type").notNull(), // "all" or "specific"
  specificServices: text("specific_services").array(), // Array of service names
  pauseDuration: integer("pause_duration").notNull(), // Duration in minutes
  pauseUntilEndOfDay: boolean("pause_until_end_of_day").default(false).notNull(),
  notificationMessage: text("notification_message"),
  isActive: boolean("is_active").default(true).notNull(),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPauseServiceSchema = createInsertSchema(pauseServices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type definitions
export type User = typeof users.$inferSelect;
export type SelectUser = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;

export type Reward = typeof rewards.$inferSelect;
export type InsertReward = z.infer<typeof insertRewardSchema>;

export type UserReward = typeof userRewards.$inferSelect;
export type InsertUserReward = z.infer<typeof insertUserRewardSchema>;

export type PromoCode = typeof promoCodes.$inferSelect;
export type InsertPromoCode = z.infer<typeof insertPromoCodeSchema>;

export type LoyaltyProgram = typeof loyaltyProgram.$inferSelect;
export type InsertLoyaltyProgram = z.infer<typeof insertLoyaltyProgramSchema>;

export type UserPoints = typeof userPoints.$inferSelect;
export type InsertUserPoints = z.infer<typeof insertUserPointsSchema>;

export type PointsTransaction = typeof pointsTransactions.$inferSelect;
export type InsertPointsTransaction = z.infer<typeof insertPointsTransactionSchema>;

export type PointsReward = typeof pointsRewards.$inferSelect;
export type InsertPointsReward = z.infer<typeof insertPointsRewardSchema>;

export type UserPointsRedemption = typeof userPointsRedemptions.$inferSelect;
export type InsertUserPointsRedemption = z.infer<typeof insertUserPointsRedemptionSchema>;

export type VacationMode = typeof vacationMode.$inferSelect;
export type InsertVacationMode = z.infer<typeof insertVacationModeSchema>;

export type StoreHours = typeof storeHours.$inferSelect;
export type InsertStoreHours = z.infer<typeof insertStoreHoursSchema>;

export type RestaurantSettings = typeof restaurantSettings.$inferSelect;
export type InsertRestaurantSettings = z.infer<typeof insertRestaurantSettingsSchema>;

export type ChoiceGroup = typeof choiceGroups.$inferSelect;
export type InsertChoiceGroup = z.infer<typeof insertChoiceGroupSchema>;

export type ChoiceItem = typeof choiceItems.$inferSelect;
export type InsertChoiceItem = z.infer<typeof insertChoiceItemSchema>;

export type MenuItemChoiceGroup = typeof menuItemChoiceGroups.$inferSelect;
export type InsertMenuItemChoiceGroup = z.infer<typeof insertMenuItemChoiceGroupSchema>;

export type CategoryChoiceGroup = typeof categoryChoiceGroups.$inferSelect;
export type InsertCategoryChoiceGroup = z.infer<typeof insertCategoryChoiceGroupSchema>;

export type TaxCategory = typeof taxCategories.$inferSelect;
export type InsertTaxCategory = z.infer<typeof insertTaxCategorySchema>;

export type TaxSettings = typeof taxSettings.$inferSelect;
export type InsertTaxSettings = z.infer<typeof insertTaxSettingsSchema>;

export type PauseService = typeof pauseServices.$inferSelect;
export type InsertPauseService = z.infer<typeof insertPauseServiceSchema>;

// Time Clock Entries schema
export const timeClockEntries = pgTable("time_clock_entries", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => users.id).notNull(),
  clockInTime: timestamp("clock_in_time").notNull(),
  clockOutTime: timestamp("clock_out_time"),
  scheduledShiftId: integer("scheduled_shift_id").references(() => employeeSchedules.id),
  breakDurationMinutes: integer("break_duration_minutes").default(0),
  totalHours: decimal("total_hours", { precision: 4, scale: 2 }),
  overtimeHours: decimal("overtime_hours", { precision: 4, scale: 2 }).default("0"),
  notes: text("notes"),
  status: text("status").default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTimeClockEntrySchema = createInsertSchema(timeClockEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Employee Schedules schema
export const employeeSchedules = pgTable("employee_schedules", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => users.id).notNull(),
  scheduleDate: date("schedule_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  position: text("position").notNull(),
  isMandatory: boolean("is_mandatory").default(true).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  notes: text("notes"),
  status: text("status").default("scheduled").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertEmployeeScheduleSchema = createInsertSchema(employeeSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schedule Alerts schema
export const scheduleAlerts = pgTable("schedule_alerts", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").references(() => users.id).notNull(),
  alertType: text("alert_type").notNull(),
  message: text("message").notNull(),
  scheduledShiftId: integer("scheduled_shift_id").references(() => employeeSchedules.id),
  timeEntryId: integer("time_entry_id").references(() => timeClockEntries.id),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScheduleAlertSchema = createInsertSchema(scheduleAlerts).omit({
  id: true,
  createdAt: true,
});

// Pay Periods schema
export const payPeriods = pgTable("pay_periods", {
  id: serial("id").primaryKey(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  status: text("status").default("open").notNull(),
  totalHours: decimal("total_hours", { precision: 8, scale: 2 }),
  totalCost: decimal("total_cost", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPayPeriodSchema = createInsertSchema(payPeriods).omit({
  id: true,
  createdAt: true,
});

// Tip Distributions schema
export const tipDistributions = pgTable("tip_distributions", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  employeeId: integer("employee_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  distributionDate: timestamp("distribution_date").defaultNow().notNull(),
  orderType: text("order_type").notNull(), // delivery, pickup
  originalTipAmount: decimal("original_tip_amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTipDistributionSchema = createInsertSchema(tipDistributions).omit({
  id: true,
  createdAt: true,
});

// Tip Settings schema
export const tipSettings = pgTable("tip_settings", {
  id: serial("id").primaryKey(),
  deliveryTipPercentageToEmployees: decimal("delivery_tip_percentage_to_employees", { precision: 5, scale: 2 }).default("25.00").notNull(),
  pickupTipSplitEnabled: boolean("pickup_tip_split_enabled").default(true).notNull(),
  deliveryTipSplitEnabled: boolean("delivery_tip_split_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTipSettingsSchema = createInsertSchema(tipSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});


// Time tracking type definitions
export type TimeClockEntry = typeof timeClockEntries.$inferSelect;
export type InsertTimeClockEntry = z.infer<typeof insertTimeClockEntrySchema>;

export type EmployeeSchedule = typeof employeeSchedules.$inferSelect;
export type InsertEmployeeSchedule = z.infer<typeof insertEmployeeScheduleSchema>;

export type ScheduleAlert = typeof scheduleAlerts.$inferSelect;
export type InsertScheduleAlert = z.infer<typeof insertScheduleAlertSchema>;

export type PayPeriod = typeof payPeriods.$inferSelect;
export type InsertPayPeriod = z.infer<typeof insertPayPeriodSchema>;

export type TipDistribution = typeof tipDistributions.$inferSelect;
export type InsertTipDistribution = z.infer<typeof insertTipDistributionSchema>;

export type TipSettings = typeof tipSettings.$inferSelect;
export type InsertTipSettings = z.infer<typeof insertTipSettingsSchema>;


// Printer Configuration schema
export const printerConfig = pgTable("printer_config", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Main Printer"),
  ipAddress: text("ip_address").notNull(),
  port: integer("port").default(80).notNull(),
  printerType: text("printer_type").notNull().default("epson_tm_m32"), // epson_tm_m32, generic, etc.
  isActive: boolean("is_active").default(true).notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(), // Only one printer can be primary
  connectionStatus: text("connection_status").default("unknown").notNull(), // connected, disconnected, error, unknown
  lastConnected: timestamp("last_connected"),
  lastError: text("last_error"),
  settings: jsonb("settings").default({}).notNull(), // Additional printer-specific settings
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPrinterConfigSchema = createInsertSchema(printerConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Delivery Zones schema for Google Maps API radius-based pricing
export const deliveryZones = pgTable("delivery_zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // e.g., "Zone 1", "Close Range", "Extended Area"
  maxRadius: decimal("max_radius", { precision: 8, scale: 2 }).notNull(), // in miles or km
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull(), // fee for this zone
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(), // for ordering zones (closest first)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDeliveryZoneSchema = createInsertSchema(deliveryZones).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Delivery Settings schema for Google Maps configuration
export const deliverySettings = pgTable("delivery_settings", {
  id: serial("id").primaryKey(),
  restaurantAddress: text("restaurant_address").notNull(), // base address for distance calculation
  restaurantLat: decimal("restaurant_lat", { precision: 10, scale: 8 }),
  restaurantLng: decimal("restaurant_lng", { precision: 11, scale: 8 }),
  googleMapsApiKey: text("google_maps_api_key"), // encrypted API key
  maxDeliveryRadius: decimal("max_delivery_radius", { precision: 8, scale: 2 }).notNull().default("10"), // max delivery distance
  distanceUnit: text("distance_unit").notNull().default("miles"), // "miles" or "km"
  isGoogleMapsEnabled: boolean("is_google_maps_enabled").default(false).notNull(),
  fallbackDeliveryFee: decimal("fallback_delivery_fee", { precision: 10, scale: 2 }).notNull().default("5.00"), // if API fails
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDeliverySettingsSchema = createInsertSchema(deliverySettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Delivery types definition
export type DeliveryZone = typeof deliveryZones.$inferSelect;
export type InsertDeliveryZone = z.infer<typeof insertDeliveryZoneSchema>;

export type DeliverySettings = typeof deliverySettings.$inferSelect;
export type InsertDeliverySettings = z.infer<typeof insertDeliverySettingsSchema>;

// Printer type definition
export type PrinterConfig = typeof printerConfig.$inferSelect;
export type InsertPrinterConfig = z.infer<typeof insertPrinterConfigSchema>;

// Sessions schema for persistent session storage
export const sessions = pgTable("sessions", {
  sid: text("sid").primaryKey(),
  sess: jsonb("sess").notNull(),
  expire: timestamp("expire").notNull(),
});

export type Session = typeof sessions.$inferSelect;
