-- Enable Row Level Security on all tables
-- This migration enables RLS and sets up appropriate policies for data access control

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.choice_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.choice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.choice_item_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_choice_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_choice_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_blackouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tip_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tip_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY; -- Comment out if table doesn't exist
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.printer_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.half_half_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.half_half_toppings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_clock_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pay_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PUBLIC READ POLICIES (Menu, Categories, Hours, FAQs, etc.)
-- ============================================================================

-- Menu Items: Public read (available items only), service role sees all
CREATE POLICY "Public can view available menu items" ON public.menu_items
  FOR SELECT USING (
    "is_available" = true OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Service role can manage menu items" ON public.menu_items
  USING (auth.role() = 'service_role');

-- Categories: Public read (active only), service role sees all
CREATE POLICY "Public can view active categories" ON public.categories
  FOR SELECT USING (
    "is_active" = true OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Service role can manage categories" ON public.categories
  USING (auth.role() = 'service_role');

-- Choice Groups: Public read
CREATE POLICY "Public can view choice groups" ON public.choice_groups
  FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Service role can manage choice groups" ON public.choice_groups
  USING (auth.role() = 'service_role');

-- Choice Items: Public read (active only), service role sees all
CREATE POLICY "Public can view active choice items" ON public.choice_items
  FOR SELECT USING (
    "is_active" = true OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Service role can manage choice items" ON public.choice_items
  USING (auth.role() = 'service_role');

-- Choice Item Pricing: Public read
CREATE POLICY "Public can view choice item pricing" ON public.choice_item_pricing
  FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Service role can manage pricing" ON public.choice_item_pricing
  USING (auth.role() = 'service_role');

-- Store Hours: Public read
CREATE POLICY "Public can view store hours" ON public.store_hours
  FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Service role can manage store hours" ON public.store_hours
  USING (auth.role() = 'service_role');

-- FAQs: Public read
CREATE POLICY "Public can view FAQs" ON public.faqs
  FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Service role can manage FAQs" ON public.faqs
  USING (auth.role() = 'service_role');

-- QR Codes: Commented out - uncomment if table exists
-- CREATE POLICY "Service role can manage QR codes" ON public.qr_codes
--   USING (auth.role() = 'service_role');

-- Half & Half Settings: Public read
CREATE POLICY "Public can view half half settings" ON public.half_half_settings
  FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Service role can manage half half settings" ON public.half_half_settings
  USING (auth.role() = 'service_role');

CREATE POLICY "Public can view half half toppings" ON public.half_half_toppings
  FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Service role can manage half half toppings" ON public.half_half_toppings
  USING (auth.role() = 'service_role');

-- ============================================================================
-- USER DATA POLICIES (Users can access their own data)
-- ============================================================================

-- Users: Users can read/update their own data
CREATE POLICY "Users can view their own data" ON public.users
  FOR SELECT USING (
    auth.uid()::text = supabase_user_id OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Users can update their own data" ON public.users
  FOR UPDATE USING (
    auth.uid()::text = supabase_user_id OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Service role can insert users" ON public.users
  FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Orders: Users can view their own orders
CREATE POLICY "Users can view their own orders" ON public.orders
  FOR SELECT USING (
    auth.uid()::text = supabase_user_id OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Service role can manage orders" ON public.orders
  USING (auth.role() = 'service_role');

-- Order Items: Users can view items from their own orders
CREATE POLICY "Users can view their own order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND (orders.supabase_user_id = auth.uid()::text OR auth.role() = 'service_role')
    )
  );

CREATE POLICY "Service role can manage order items" ON public.order_items
  USING (auth.role() = 'service_role');

-- User Points: Users can view their own points
CREATE POLICY "Users can view their own points" ON public.user_points
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = user_points.user_id
      AND (users.supabase_user_id = auth.uid()::text OR auth.role() = 'service_role')
    )
  );

CREATE POLICY "Service role can manage user points" ON public.user_points
  USING (auth.role() = 'service_role');

-- Points Transactions: Users can view their own transactions
CREATE POLICY "Users can view their own points transactions" ON public.points_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = points_transactions.user_id
      AND (users.supabase_user_id = auth.uid()::text OR auth.role() = 'service_role')
    )
  );

CREATE POLICY "Service role can manage points transactions" ON public.points_transactions
  USING (auth.role() = 'service_role');

-- User Rewards: Users can view their own rewards
CREATE POLICY "Users can view their own rewards" ON public.user_rewards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = user_rewards.user_id
      AND (users.supabase_user_id = auth.uid()::text OR auth.role() = 'service_role')
    )
  );

CREATE POLICY "Service role can manage user rewards" ON public.user_rewards
  USING (auth.role() = 'service_role');

-- User Vouchers: Users can view their own vouchers
CREATE POLICY "Users can view their own vouchers" ON public.user_vouchers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = user_vouchers.user_id
      AND (users.supabase_user_id = auth.uid()::text OR auth.role() = 'service_role')
    )
  );

CREATE POLICY "Service role can manage user vouchers" ON public.user_vouchers
  USING (auth.role() = 'service_role');

-- User Points Redemptions: Users can view their own redemptions
CREATE POLICY "Users can view their own redemptions" ON public.user_points_redemptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = user_points_redemptions.user_id
      AND (users.supabase_user_id = auth.uid()::text OR auth.role() = 'service_role')
    )
  );

CREATE POLICY "Service role can manage redemptions" ON public.user_points_redemptions
  USING (auth.role() = 'service_role');

-- ============================================================================
-- LOYALTY & REWARDS POLICIES (Public read for available rewards)
-- ============================================================================

-- Loyalty Program: Public read
CREATE POLICY "Public can view loyalty program" ON public.loyalty_program
  FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Service role can manage loyalty program" ON public.loyalty_program
  USING (auth.role() = 'service_role');

-- Rewards: Public read for active rewards
CREATE POLICY "Public can view active rewards" ON public.rewards
  FOR SELECT USING (
    "is_active" = true OR
    auth.role() = 'service_role'
  );

CREATE POLICY "Service role can manage rewards" ON public.rewards
  USING (auth.role() = 'service_role');

-- Points Rewards: Public read
CREATE POLICY "Public can view points rewards" ON public.points_rewards
  FOR SELECT TO PUBLIC USING (true);

CREATE POLICY "Service role can manage points rewards" ON public.points_rewards
  USING (auth.role() = 'service_role');

-- Promo Codes: Service role only (prevent code enumeration)
CREATE POLICY "Service role can manage promo codes" ON public.promo_codes
  USING (auth.role() = 'service_role');

-- ============================================================================
-- SETTINGS & CONFIG POLICIES (Service role only)
-- ============================================================================

CREATE POLICY "Service role can manage system settings" ON public.system_settings
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage admin settings" ON public.admin_settings
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage restaurant settings" ON public.restaurant_settings
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage store settings" ON public.store_settings
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage delivery settings" ON public.delivery_settings
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage delivery zones" ON public.delivery_zones
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage delivery blackouts" ON public.delivery_blackouts
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage tax categories" ON public.tax_categories
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage tip settings" ON public.tip_settings
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage tip distributions" ON public.tip_distributions
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage printer config" ON public.printer_config
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage receipt templates" ON public.receipt_templates
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage menu item choice groups" ON public.menu_item_choice_groups
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage category choice groups" ON public.category_choice_groups
  USING (auth.role() = 'service_role');

-- ============================================================================
-- SESSION & LOG POLICIES (Service role only)
-- ============================================================================

CREATE POLICY "Service role can manage sessions" ON public.sessions
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage session table" ON public.session
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage email logs" ON public.email_logs
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage email campaigns" ON public.email_campaigns
  USING (auth.role() = 'service_role');

-- ============================================================================
-- EMPLOYEE & SCHEDULING POLICIES (Service role only)
-- ============================================================================

CREATE POLICY "Service role can manage employee schedules" ON public.employee_schedules
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage time clock entries" ON public.time_clock_entries
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage pay periods" ON public.pay_periods
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage schedule alerts" ON public.schedule_alerts
  USING (auth.role() = 'service_role');

-- ============================================================================
-- NOTES
-- ============================================================================
-- All database access from your API should use the service_role key
-- Frontend Supabase client should use anon/authenticated keys
-- RLS automatically enforces these policies for all queries
-- Service role bypasses RLS (use with caution in your APIs)
