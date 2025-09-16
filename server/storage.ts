import { users, type User, type InsertUser, categories, type Category, type InsertCategory, menuItems, type MenuItem, type InsertMenuItem, orders, type Order, type InsertOrder, orderItems, type OrderItem, type InsertOrderItem, rewards, type Reward, type InsertReward, userRewards, type UserReward, type InsertUserReward, promoCodes, type PromoCode, type InsertPromoCode, loyaltyProgram, type LoyaltyProgram, type InsertLoyaltyProgram, userPoints, type UserPoints, type InsertUserPoints, pointsTransactions, type PointsTransaction, type InsertPointsTransaction, pointsRewards, type PointsReward, type InsertPointsReward, userPointsRedemptions, type UserPointsRedemption, type InsertUserPointsRedemption, vacationMode, type VacationMode, type InsertVacationMode, storeHours, type StoreHours, type InsertStoreHours, restaurantSettings, type RestaurantSettings, type InsertRestaurantSettings, choiceGroups, type ChoiceGroup, type InsertChoiceGroup, choiceItems, type ChoiceItem, type InsertChoiceItem, menuItemChoiceGroups, type MenuItemChoiceGroup, type InsertMenuItemChoiceGroup, categoryChoiceGroups, type CategoryChoiceGroup, type InsertCategoryChoiceGroup, taxCategories, type TaxCategory, type InsertTaxCategory, taxSettings, type TaxSettings, type InsertTaxSettings, pauseServices, type PauseService, type InsertPauseService, timeClockEntries, type TimeClockEntry, type InsertTimeClockEntry, employeeSchedules, type EmployeeSchedule, type InsertEmployeeSchedule, scheduleAlerts, type ScheduleAlert, type InsertScheduleAlert, payPeriods, type PayPeriod, type InsertPayPeriod, printerConfig, type PrinterConfig, type InsertPrinterConfig, sessions } from "@shared/schema";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { db } from "./db";
import { eq, and, or, ne, isNull, sql, asc } from "drizzle-orm";
import { log } from "./vite";
import postgres from "postgres";
import pkg from 'pg';
const { Pool } = pkg;

const PgSession = ConnectPgSimple(session);

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // Session store
  sessionStore: session.Store;
  
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserBySupabaseId(supabaseId: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Category operations
  getAllCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<boolean>;
  
  // Menu operations
  getAllMenuItems(): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | undefined>;
  getMenuItemsByCategory(category: string): Promise<MenuItem[]>;
  getFeaturedMenuItems(): Promise<MenuItem[]>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: number, menuItem: Partial<InsertMenuItem>): Promise<MenuItem | undefined>;
  deleteMenuItem(id: number): Promise<boolean>;
  
  // Order operations
  getAllOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrderWithItems(id: number): Promise<Order & { items: OrderItem[] }>;
  getOrdersByUserId(userId: number): Promise<Order[]>;
  getActiveOrders(): Promise<(Order & { items: OrderItem[] })[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  updateOrderPaymentStatus(id: number, status: string): Promise<Order | undefined>;
  updateOrderPaymentIntent(id: number, paymentIntentId: string): Promise<Order | undefined>;
  updateOrderTotal(id: number, total: number): Promise<Order | undefined>;
  updateOrderRefund(id: number, refundData: { refundId: string; refundAmount: number; refundReason: string; refundedBy: number; refundedAt: Date }): Promise<Order | undefined>;
  updateOrder(id: number, updates: Partial<InsertOrder>): Promise<Order | undefined>;
  deleteOrder(id: number): Promise<boolean>;
  
  // Order Item operations
  getOrderItemsByOrderId(orderId: number): Promise<OrderItem[]>;
  getAllOrderItems(): Promise<OrderItem[]>;
  createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem>;
  
  // Reward operations
  getAllRewards(): Promise<Reward[]>;
  getActiveRewards(): Promise<Reward[]>;
  getReward(id: number): Promise<Reward | undefined>;
  getRewardsByUserId(userId: number): Promise<(UserReward & { reward: Reward })[]>;
  createReward(reward: InsertReward): Promise<Reward>;
  updateReward(id: number, reward: Partial<InsertReward>): Promise<Reward | undefined>;
  deleteReward(id: number): Promise<boolean>;
  
  // User Points operations
  getUserPoints(userId: number): Promise<UserPoints | undefined>;
  updateUserPoints(userId: number, points: number, totalEarned?: number, totalRedeemed?: number): Promise<UserPoints | undefined>;
  createPointsTransaction(transaction: InsertPointsTransaction): Promise<PointsTransaction>;
  awardPointsForOrder(userId: number, orderId: number, orderAmount: number): Promise<void>;
  getPointsTransactions(userId: number, limit?: number): Promise<PointsTransaction[]>;
  
  // Points Rewards operations
  getAllPointsRewards(): Promise<PointsReward[]>;
  getActivePointsRewards(): Promise<PointsReward[]>;
  getPointsReward(id: number): Promise<PointsReward | undefined>;
  createPointsReward(reward: InsertPointsReward): Promise<PointsReward>;
  updatePointsReward(id: number, reward: Partial<InsertPointsReward>): Promise<PointsReward | undefined>;
  deletePointsReward(id: number): Promise<boolean>;
  
  // Reward Redemption operations
  redeemPointsReward(userId: number, rewardId: number, orderId?: number): Promise<UserPointsRedemption>;
  getUserPointsRedemptions(userId: number): Promise<(UserPointsRedemption & { reward: PointsReward })[]>;
  validatePointsRedemption(userId: number, rewardId: number): Promise<{ valid: boolean; error?: string }>;
  
  // Legacy Reward operations (for backwards compatibility)
  redeemReward(userId: number, rewardId: number): Promise<any>;
  getUserRedemptions(userId: number): Promise<any[]>;
  
  // User Reward operations
  getUserReward(id: number): Promise<UserReward | undefined>;
  createUserReward(userReward: InsertUserReward): Promise<UserReward>;
  useUserReward(id: number): Promise<UserReward | undefined>;
  
  // Promo Code operations
  getAllPromoCodes(): Promise<PromoCode[]>;
  getPromoCode(id: number): Promise<PromoCode | undefined>;
  getPromoCodeByCode(code: string): Promise<PromoCode | undefined>;
  createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode>;
  updatePromoCode(id: number, promoCode: Partial<InsertPromoCode>): Promise<PromoCode | undefined>;
  deletePromoCode(id: number): Promise<boolean>;
  incrementPromoCodeUsage(id: number): Promise<boolean>;
  
  // Vacation Mode operations
  getVacationMode(): Promise<VacationMode | undefined>;
  updateVacationMode(vacationMode: Partial<InsertVacationMode>): Promise<VacationMode | undefined>;
  
  // Store Hours operations
  getAllStoreHours(): Promise<StoreHours[]>;
  getStoreHoursByDay(dayOfWeek: number): Promise<StoreHours | undefined>;
  updateStoreHours(dayOfWeek: number, storeHours: Partial<InsertStoreHours>): Promise<StoreHours | undefined>;
  
  // Restaurant Settings operations
  getRestaurantSettings(): Promise<RestaurantSettings | undefined>;
  updateRestaurantSettings(settings: Partial<InsertRestaurantSettings>): Promise<RestaurantSettings | undefined>;

  // Choice Group operations
  getAllChoiceGroups(): Promise<ChoiceGroup[]>;
  getChoiceGroup(id: number): Promise<ChoiceGroup | undefined>;
  createChoiceGroup(choiceGroup: InsertChoiceGroup): Promise<ChoiceGroup>;
  updateChoiceGroup(id: number, choiceGroup: Partial<InsertChoiceGroup>): Promise<ChoiceGroup | undefined>;
  deleteChoiceGroup(id: number): Promise<boolean>;

  // Choice Item operations
  getAllChoiceItems(): Promise<ChoiceItem[]>;
  getChoiceItem(id: number): Promise<ChoiceItem | undefined>;
  createChoiceItem(choiceItem: InsertChoiceItem): Promise<ChoiceItem>;
  updateChoiceItem(id: number, choiceItem: Partial<InsertChoiceItem>): Promise<ChoiceItem | undefined>;
  deleteChoiceItem(id: number): Promise<boolean>;

  // Menu Item Choice Group operations
  getAllMenuItemChoiceGroups(): Promise<MenuItemChoiceGroup[]>;
  getMenuItemChoiceGroup(id: number): Promise<MenuItemChoiceGroup | undefined>;
  createMenuItemChoiceGroup(menuItemChoiceGroup: InsertMenuItemChoiceGroup): Promise<MenuItemChoiceGroup>;
  updateMenuItemChoiceGroup(id: number, menuItemChoiceGroup: Partial<InsertMenuItemChoiceGroup>): Promise<MenuItemChoiceGroup | undefined>;
  deleteMenuItemChoiceGroup(id: number): Promise<boolean>;

  // Category Choice Group operations
  getAllCategoryChoiceGroups(): Promise<CategoryChoiceGroup[]>;
  getCategoryChoiceGroup(id: number): Promise<CategoryChoiceGroup | undefined>;
  createCategoryChoiceGroup(categoryChoiceGroup: InsertCategoryChoiceGroup): Promise<CategoryChoiceGroup>;
  updateCategoryChoiceGroup(id: number, categoryChoiceGroup: Partial<InsertCategoryChoiceGroup>): Promise<CategoryChoiceGroup | undefined>;
  deleteCategoryChoiceGroup(id: number): Promise<boolean>;

  // Tax operations
  getAllTaxCategories(): Promise<TaxCategory[]>;
  getTaxCategory(id: number): Promise<TaxCategory | undefined>;
  createTaxCategory(taxCategory: InsertTaxCategory): Promise<TaxCategory>;
  updateTaxCategory(id: number, taxCategory: Partial<InsertTaxCategory>): Promise<TaxCategory | undefined>;
  deleteTaxCategory(id: number): Promise<boolean>;
  getTaxSettings(): Promise<TaxSettings | undefined>;
  updateTaxSettings(settings: Partial<InsertTaxSettings>): Promise<TaxSettings | undefined>;
  
  // Pause Services operations
  getAllPauseServices(): Promise<PauseService[]>;
  getPauseService(id: number): Promise<PauseService | undefined>;
  createPauseService(pauseService: InsertPauseService): Promise<PauseService>;
  updatePauseService(id: number, pauseService: Partial<InsertPauseService>): Promise<PauseService | undefined>;
  deletePauseService(id: number): Promise<boolean>;
  getActivePauseServices(): Promise<PauseService[]>;
  
  // Time Tracking operations
  createTimeEntry(data: any): Promise<any>;
  updateTimeEntry(id: number, data: any): Promise<any>;
  getTimeEntry(id: number): Promise<any>;
  getActiveTimeEntry(employeeId: number): Promise<any>;
  getEmployeeTimeSummary(employeeId: number, startDate: string, endDate: string): Promise<any>;
  
  // Schedule operations  
  createEmployeeSchedule(data: any): Promise<any>;
  getEmployeeSchedules(startDate: string, endDate: string, employeeId?: number): Promise<any[]>;
  getTodaysSchedule(employeeId: number): Promise<any>;
  checkScheduleConflicts(employeeId: number, date: string, startTime: string, endTime: string): Promise<any[]>;
  updateEmployeeSchedule(scheduleId: number, data: any): Promise<any>;
  deleteEmployeeSchedule(scheduleId: number): Promise<boolean>;
  
  // Alert operations
  createScheduleAlert(data: any): Promise<any>;
  getScheduleAlerts(unreadOnly: boolean): Promise<any[]>;
  markAlertAsRead(alertId: number): Promise<void>;
  
  // Payroll operations
  getPayrollSummary(payPeriodId?: number, startDate?: string, endDate?: string): Promise<any>;
  
  // Tip distribution operations
  getTipSettings(): Promise<any>;
  updateTipSettings(settings: any): Promise<any>;
  distributeTips(orderId: number, tipAmount: number, orderType: string): Promise<void>;
  getClockedInEmployees(): Promise<any[]>;
  createTipDistribution(tipDistribution: any): Promise<any>;
  
  // Receipt template operations
  getReceiptTemplate(templateId: string): Promise<any>;
  saveReceiptTemplate(templateId: string, template: any): Promise<any>;
  getAllReceiptTemplates(): Promise<any>;
  
  // System settings operations
  getSystemSetting(key: string): Promise<any>;
  updateSystemSetting(key: string, value: string): Promise<any>;
  getAllSystemSettings(): Promise<any[]>;
  getSystemSettingsByCategory(category: string): Promise<any[]>;
  

  // Printer Configuration operations
  getAllPrinterConfigs(): Promise<PrinterConfig[]>;
  getPrinterConfig(id: number): Promise<PrinterConfig | undefined>;
  getPrimaryPrinterConfig(): Promise<PrinterConfig | undefined>;
  createPrinterConfig(config: InsertPrinterConfig): Promise<PrinterConfig>;
  updatePrinterConfig(id: number, config: Partial<InsertPrinterConfig>): Promise<PrinterConfig | undefined>;
  deletePrinterConfig(id: number): Promise<boolean>;
  setPrimaryPrinter(id: number): Promise<boolean>;
  updatePrinterConnectionStatus(id: number, status: 'connected' | 'disconnected' | 'error' | 'unknown', error?: string): Promise<PrinterConfig | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private menuItems: Map<number, MenuItem>;
  private orders: Map<number, Order>;
  private orderItems: Map<number, OrderItem>;
  private rewards: Map<number, Reward>;
  private userRewards: Map<number, UserReward>;
  private userPoints: Map<number, UserPoints>;
  private userPointsRedemptions: Map<number, any>;
  private promoCodes: Map<number, PromoCode>;
  private storeHours: Map<number, StoreHours>;
  private vacationMode: VacationMode | undefined;
  private restaurantSettings: RestaurantSettings | undefined;
  private choiceGroups: Map<number, ChoiceGroup>;
  private choiceItems: Map<number, ChoiceItem>;
  private menuItemChoiceGroups: Map<number, MenuItemChoiceGroup>;
  private categoryChoiceGroups: Map<number, CategoryChoiceGroup>;
  private taxCategories: Map<number, TaxCategory>;
  private taxSettings: TaxSettings | undefined;
  private pauseServices: Map<number, PauseService>;
  private receiptTemplates: Map<string, any>;
  private systemSettings: Map<string, any>;
  sessionStore: session.Store;
  
  private userIdCounter: number;
  private menuItemIdCounter: number;
  private orderIdCounter: number;
  private orderItemIdCounter: number;
  private rewardIdCounter: number;
  private userRewardIdCounter: number;
  private userPointsIdCounter: number;
  private userPointsRedemptionIdCounter: number;
  private pointsTransactionIdCounter: number;
  private promoCodeIdCounter: number;
  private choiceGroupIdCounter: number;
  private choiceItemIdCounter: number;
  private menuItemChoiceGroupIdCounter: number;
  private categoryChoiceGroupIdCounter: number;
  private taxCategoryIdCounter: number;
  private pauseServiceIdCounter: number;

  constructor() {
    this.users = new Map();
    this.menuItems = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    this.rewards = new Map();
    this.userRewards = new Map();
    this.userPoints = new Map();
    this.userPointsRedemptions = new Map();
    this.promoCodes = new Map();
    this.storeHours = new Map();
    this.choiceGroups = new Map();
    this.choiceItems = new Map();
    this.menuItemChoiceGroups = new Map();
    this.categoryChoiceGroups = new Map();
    this.taxCategories = new Map();
    this.pauseServices = new Map();
    this.receiptTemplates = new Map();
    this.systemSettings = new Map();
    
    this.userIdCounter = 1;
    this.menuItemIdCounter = 1;
    this.orderIdCounter = 1;
    this.orderItemIdCounter = 1;
    this.rewardIdCounter = 1;
    this.userRewardIdCounter = 1;
    this.userPointsIdCounter = 1;
    this.userPointsRedemptionIdCounter = 1;
    this.pointsTransactionIdCounter = 1;
    this.promoCodeIdCounter = 1;
    this.choiceGroupIdCounter = 1;
    this.choiceItemIdCounter = 1;
    this.menuItemChoiceGroupIdCounter = 1;
    this.categoryChoiceGroupIdCounter = 1;
    this.taxCategoryIdCounter = 1;
    this.pauseServiceIdCounter = 1;
    
    // Use memory store for development to avoid session table conflicts
    if (process.env.NODE_ENV === 'development') {
      console.log('Using memory session store for development');
      this.sessionStore = new session.MemoryStore();
    } else {
      // Create a PostgreSQL connection for session store (production only)
      const sessionSql = postgres(process.env.DATABASE_URL!, {
        max: 10,
        idle_timeout: 20,
        connect_timeout: 10,
      });

      this.sessionStore = new PgSession({
        pool: sessionSql,
        tableName: 'sessions',
        createTableIfMissing: true, // Allow creating table if needed
      });
    }

    // Initialize with sample data - COMMENTED OUT TO PREVENT TEST DATA RESET
    // this.initializeSampleData();
    
    // Initialize sample choice groups and items - COMMENTED OUT TO PREVENT TEST DATA RESET
    // this.initializeSampleChoices();
  }

  private async initializeSampleData() {
    // Create admin users
    const adminUser = await this.createUser({
      username: "admin",
      email: "admin@favillas.com",
      password: "e36e06853d8be329715adab3e520913bf7d63039c084b0ce775f4ffcc98a6829a2ddf3196f5d19483b58ef86ecf2824c637f004863c881dcc1934d9afce01e18.7d43812587dbac804d1608c6dc4918a7", // "password"
      firstName: "Super",
      lastName: "Admin",
      phone: "555-0123",
      isAdmin: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    const superAdminUser = await this.createUser({
      username: "superadmin",
      email: "superadmin@favillas.com",
      password: "0e4f012c77eb59901e58c427862703e7f1cdee73645a560b02e3d80f129ba6238bb281b7b0f19bb9b69b64e0a7f2cf5428699afd72826c01c8f12e5738aa4ec9.082eda566d01ce0528bee7add3247a7c", // "superadmin123"
      firstName: "Super",
      lastName: "Admin",
      phone: "555-0124",
      isAdmin: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create a regular user
    const regularUser = await this.createUser({
      username: "customer",
      email: "customer@example.com",
      password: "e36e06853d8be329715adab3e520913bf7d63039c084b0ce775f4ffcc98a6829a2ddf3196f5d19483b58ef86ecf2824c637f004863c881dcc1934d9afce01e18.7d43812587dbac804d1608c6dc4918a7", // "password"
      firstName: "John",
      lastName: "Customer",
      phone: "555-0124",
      isAdmin: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

  }

  private async initializeSampleChoices() {
    // Create sample choice groups
    const toppingsGroup = await this.createChoiceGroup({
      name: "Toppings 10\"",
      description: "Toppings for 10\" pizzas",
      order: 1,
      isActive: true,
      isRequired: false,
      maxSelections: 5,
      minSelections: 0
    });

    const sizeGroup = await this.createChoiceGroup({
      name: "Size",
      description: "Pizza size options",
      order: 2,
      isActive: true,
      isRequired: true,
      maxSelections: 1,
      minSelections: 1
    });

    const sidesGroup = await this.createChoiceGroup({
      name: "Add A Side",
      description: "Additional sides and appetizers",
      order: 3,
      isActive: true,
      isRequired: false,
      maxSelections: 3,
      minSelections: 0
    });

    // Create sample choice items for toppings
    await this.createChoiceItem({
      choiceGroupId: toppingsGroup.id,
      name: "Pepperoni",
      description: "Classic pepperoni topping",
      price: "2.99",
      order: 1,
      isActive: true,
      isDefault: false
    });

    await this.createChoiceItem({
      choiceGroupId: toppingsGroup.id,
      name: "Mushrooms",
      description: "Fresh mushrooms",
      price: "1.99",
      order: 2,
      isActive: true,
      isDefault: false
    });

    await this.createChoiceItem({
      choiceGroupId: toppingsGroup.id,
      name: "Sausage",
      description: "Italian sausage",
      price: "2.99",
      order: 3,
      isActive: true,
      isDefault: false
    });

    await this.createChoiceItem({
      choiceGroupId: toppingsGroup.id,
      name: "Extra Cheese",
      description: "Additional mozzarella cheese",
      price: "1.99",
      order: 4,
      isActive: true,
      isDefault: false
    });

    // Create sample choice items for size
    await this.createChoiceItem({
      choiceGroupId: sizeGroup.id,
      name: "10\"",
      description: "Small pizza",
      price: "0.00",
      order: 1,
      isActive: true,
      isDefault: true
    });

    await this.createChoiceItem({
      choiceGroupId: sizeGroup.id,
      name: "14\"",
      description: "Medium pizza",
      price: "4.00",
      order: 2,
      isActive: true,
      isDefault: false
    });

    await this.createChoiceItem({
      choiceGroupId: sizeGroup.id,
      name: "16\"",
      description: "Large pizza",
      price: "6.00",
      order: 3,
      isActive: true,
      isDefault: false
    });

    // Create sample choice items for sides
    await this.createChoiceItem({
      choiceGroupId: sidesGroup.id,
      name: "French Fries",
      description: "Crispy golden fries",
      price: "3.99",
      order: 1,
      isActive: true,
      isDefault: false
    });

    await this.createChoiceItem({
      choiceGroupId: sidesGroup.id,
      name: "Garlic Bread",
      description: "Fresh baked garlic bread",
      price: "4.99",
      order: 2,
      isActive: true,
      isDefault: false
    });

    await this.createChoiceItem({
      choiceGroupId: sidesGroup.id,
      name: "Onion Rings",
      description: "Crispy onion rings",
      price: "5.99",
      order: 3,
      isActive: true,
      isDefault: false
    });

    // Add some sample menu items
    await this.createMenuItem({
      name: "Margherita Pizza",
      description: "Classic tomato sauce with mozzarella cheese and fresh basil",
      basePrice: "12.99",
      category: "Traditional Pizza",
      imageUrl: "/images/f1.png",
      isAvailable: true,
      isPopular: true,
      options: {
        sizes: [
          { name: "10\" Small", price: "12.99" },
          { name: "14\" Medium", price: "16.99" },
          { name: "16\" Large", price: "20.99" }
        ],
        toppings: [
          { name: "Extra Cheese", price: "2.50" },
          { name: "Pepperoni", price: "3.00" },
          { name: "Mushrooms", price: "2.00" },
          { name: "Bell Peppers", price: "2.00" },
          { name: "Onions", price: "1.50" },
          { name: "Olives", price: "2.50" },
          { name: "Sausage", price: "3.50" },
          { name: "Bacon", price: "3.00" }
        ],
        extras: [
          { name: "Extra Sauce", price: "1.00" },
          { name: "Extra Cheese", price: "2.50" },
          { name: "Well Done", price: "0.00" }
        ]
      }
    });

    await this.createMenuItem({
      name: "Pepperoni Pizza",
      description: "Spicy pepperoni with melted cheese and our signature sauce",
      basePrice: "14.99",
      category: "Traditional Pizza",
      imageUrl: "/images/f2.jpg",
      isAvailable: true,
      isBestSeller: true,
      options: {
        sizes: [
          { name: "10\" Small", price: "14.99" },
          { name: "14\" Medium", price: "18.99" },
          { name: "16\" Large", price: "22.99" }
        ],
        toppings: [
          { name: "Extra Cheese", price: "2.50" },
          { name: "Mushrooms", price: "2.00" },
          { name: "Bell Peppers", price: "2.00" },
          { name: "Onions", price: "1.50" },
          { name: "Olives", price: "2.50" },
          { name: "Sausage", price: "3.50" },
          { name: "Bacon", price: "3.00" },
          { name: "Ham", price: "3.00" }
        ],
        extras: [
          { name: "Extra Sauce", price: "1.00" },
          { name: "Extra Cheese", price: "2.50" },
          { name: "Well Done", price: "0.00" }
        ]
      }
    });

    await this.createMenuItem({
      name: "BBQ Chicken Pizza",
      description: "BBQ sauce, grilled chicken, red onions, and mozzarella",
      basePrice: "16.99",
      category: "10\" Specialty Gourmet Pizzas",
      imageUrl: "/images/f3.jpg",
      isAvailable: true,
      isNew: true,
      options: {
        sizes: [
          { name: "10\" Small", price: "16.99" },
          { name: "14\" Medium", price: "20.99" },
          { name: "16\" Large", price: "24.99" }
        ],
        addOns: [
          { name: "Extra Chicken", price: "4.00" },
          { name: "Extra BBQ Sauce", price: "1.50" },
          { name: "Bacon", price: "3.00" },
          { name: "Jalapeños", price: "1.50" }
        ]
      }
    });

    console.log("Sample data initialized with admin user (username: admin, password: password)");
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId,
    );
  }

  async getUserBySupabaseId(supabaseId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.supabaseUserId === supabaseId,
    );
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    const user: User = { 
      ...insertUser, 
      id, 
      createdAt, 
      rewards: 0,
      isAdmin: insertUser.isAdmin || false,
      stripeCustomerId: null,
      phone: insertUser.phone ?? null,
      address: insertUser.address ?? null,
      city: insertUser.city ?? null,
      state: insertUser.state ?? null,
      zipCode: insertUser.zipCode ?? null,
      marketingOptIn: insertUser.marketingOptIn !== undefined ? insertUser.marketingOptIn : true
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;

    const updatedUser: User = {
      ...user,
      ...userData,
      updatedAt: new Date(),
    };

    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Menu operations
  async getAllMenuItems(): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values());
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    return this.menuItems.get(id);
  }

  async getMenuItemsByCategory(category: string): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values()).filter(
      (menuItem) => menuItem.category === category,
    );
  }

  async getFeaturedMenuItems(): Promise<MenuItem[]> {
    // Return items marked as popular, best seller, or first 3 items as fallback
    const popularItems = Array.from(this.menuItems.values()).filter(
      (menuItem) => menuItem.isPopular || menuItem.isBestSeller
    );
    
    if (popularItems.length >= 3) {
      return popularItems.slice(0, 3);
    }
    
    // Fallback to first 3 available items
    return Array.from(this.menuItems.values()).slice(0, 3);
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const id = this.menuItemIdCounter++;
    const createdAt = new Date();
    const newMenuItem: MenuItem = { 
      ...menuItem, 
      id, 
      createdAt,
      options: menuItem.options ?? null,
      imageUrl: menuItem.imageUrl ?? null,
      isPopular: menuItem.isPopular ?? false,
      isNew: menuItem.isNew ?? false,
      isBestSeller: menuItem.isBestSeller ?? false,
      isAvailable: menuItem.isAvailable ?? true
    };
    this.menuItems.set(id, newMenuItem);
    return newMenuItem;
  }

  async updateMenuItem(id: number, menuItemData: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const existingMenuItem = this.menuItems.get(id);
    if (!existingMenuItem) {
      return undefined;
    }
    
    const updatedMenuItem: MenuItem = { 
      ...existingMenuItem, 
      ...menuItemData,
      options: menuItemData.options ?? existingMenuItem.options,
      imageUrl: menuItemData.imageUrl ?? existingMenuItem.imageUrl,
      isPopular: menuItemData.isPopular ?? existingMenuItem.isPopular,
      isNew: menuItemData.isNew ?? existingMenuItem.isNew,
      isBestSeller: menuItemData.isBestSeller ?? existingMenuItem.isBestSeller,
      isAvailable: menuItemData.isAvailable ?? existingMenuItem.isAvailable
    };
    
    this.menuItems.set(id, updatedMenuItem);
    return updatedMenuItem;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    const existingMenuItem = this.menuItems.get(id);
    if (!existingMenuItem) {
      return false;
    }
    
    this.menuItems.delete(id);
    return true;
  }

  // Order operations
  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrderWithItems(id: number): Promise<Order & { items: OrderItem[] }> {
    const order = this.orders.get(id);
    if (!order) {
      throw new Error(`Order with id ${id} not found`);
    }
    
    const items = await this.getOrderItemsByOrderId(id);
    return { ...order, items };
  }

  async getOrdersByUserId(userId: number): Promise<Order[]> {
    return Array.from(this.orders.values()).filter(
      (order) => order.userId === userId,
    );
  }

  async getActiveOrders(): Promise<(Order & { items: OrderItem[] })[]> {
    const activeOrders = Array.from(this.orders.values()).filter(
      (order) => ["pending", "processing"].includes(order.status),
    );
    
    const ordersWithItems = await Promise.all(
      activeOrders.map(async (order) => {
        const items = await this.getOrderItemsByOrderId(order.id);
        return { ...order, items };
      })
    );
    
    return ordersWithItems;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const id = this.orderIdCounter++;
    const createdAt = new Date();
    const newOrder: Order = { 
      ...order, 
      id, 
      createdAt,
      status: order.status ?? "pending",
      userId: order.userId ?? null,
      address: order.address ?? null,
      deliveryFee: order.deliveryFee ?? "0",
      tip: order.tip ?? "0",
      paymentStatus: order.paymentStatus ?? "pending",
      paymentIntentId: order.paymentIntentId ?? null,
      specialInstructions: order.specialInstructions ?? null,
      processedAt: null,
      completedAt: null
    };
    this.orders.set(id, newOrder);
    return newOrder;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) {
      return undefined;
    }
    
    const updatedOrder: Order = { ...order, status };
    
    // Update timestamps based on status
    if (status === "processing") {
      updatedOrder.processedAt = new Date();
    } else if (status === "completed") {
      updatedOrder.completedAt = new Date();
    }
    
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async updateOrderPaymentStatus(id: number, status: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) {
      return undefined;
    }
    
    const updatedOrder: Order = { ...order, paymentStatus: status };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async updateOrderPaymentIntent(id: number, paymentIntentId: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) {
      return undefined;
    }
    
    const updatedOrder: Order = { ...order, paymentIntentId };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async updateOrderTotal(id: number, total: number): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) {
      return undefined;
    }
    
    const updatedOrder: Order = { ...order, total: total.toString() };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async updateOrderRefund(id: number, refundData: { refundId: string; refundAmount: number; refundReason: string; refundedBy: number; refundedAt: Date }): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) {
      return undefined;
    }
    
    const updatedOrder: Order = { 
      ...order, 
      refundId: refundData.refundId,
      refundAmount: refundData.refundAmount.toString(),
      refundReason: refundData.refundReason,
      refundedBy: refundData.refundedBy,
      refundedAt: refundData.refundedAt
    };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async updateOrder(id: number, updates: Partial<InsertOrder>): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) {
      return undefined;
    }
    
    const updatedOrder: Order = { ...order, ...updates };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async deleteOrder(id: number): Promise<boolean> {
    const order = this.orders.get(id);
    if (!order) {
      return false;
    }
    
    // Delete associated order items first
    const orderItems = Array.from(this.orderItems.values()).filter(
      (orderItem) => orderItem.orderId === id
    );
    
    for (const orderItem of orderItems) {
      this.orderItems.delete(orderItem.id);
    }
    
    // Delete the order
    this.orders.delete(id);
    return true;
  }

  // Order Item operations
  async getOrderItemsByOrderId(orderId: number): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter(
      (orderItem) => orderItem.orderId === orderId,
    );
  }

  async getAllOrderItems(): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values());
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const id = this.orderItemIdCounter++;
    const createdAt = new Date();
    const newOrderItem: OrderItem = { 
      ...orderItem, 
      id, 
      createdAt,
      options: orderItem.options ?? {},
      specialInstructions: orderItem.specialInstructions ?? null
    };
    this.orderItems.set(id, newOrderItem);
    return newOrderItem;
  }

  // Reward operations
  async getAllRewards(): Promise<Reward[]> {
    return Array.from(this.rewards.values());
  }

  async getReward(id: number): Promise<Reward | undefined> {
    return this.rewards.get(id);
  }

  async getRewardsByUserId(userId: number): Promise<(UserReward & { reward: Reward })[]> {
    const userRewards = Array.from(this.userRewards.values()).filter(
      (userReward) => userReward.userId === userId && !userReward.isUsed,
    );
    
    return await Promise.all(
      userRewards.map(async (userReward) => {
        const reward = await this.getReward(userReward.rewardId);
        if (!reward) {
          throw new Error(`Reward with id ${userReward.rewardId} not found`);
        }
        return { ...userReward, reward };
      })
    );
  }

  async createReward(reward: InsertReward): Promise<Reward> {
    const id = this.rewardIdCounter++;
    const createdAt = new Date();
    const newReward: Reward = { 
      ...reward, 
      id, 
      createdAt,
      discount: reward.discount ?? null,
      discountType: reward.discountType ?? null,
      minOrderAmount: reward.minOrderAmount ?? null,
      expiresAt: reward.expiresAt ?? null
    };
    this.rewards.set(id, newReward);
    return newReward;
  }

  async getActiveRewards(): Promise<Reward[]> {
    return Array.from(this.rewards.values()).filter(reward => reward.isActive !== false);
  }

  async updateReward(id: number, reward: Partial<InsertReward>): Promise<Reward | undefined> {
    const existingReward = this.rewards.get(id);
    if (!existingReward) {
      return undefined;
    }
    
    const updatedReward: Reward = { ...existingReward, ...reward };
    this.rewards.set(id, updatedReward);
    return updatedReward;
  }

  async deleteReward(id: number): Promise<boolean> {
    return this.rewards.delete(id);
  }

  // User Points operations
  async getUserPoints(userId: number): Promise<UserPoints | undefined> {
    return this.userPoints.get(userId);
  }

  async updateUserPoints(userId: number, points: number, totalEarned?: number, totalRedeemed?: number): Promise<UserPoints | undefined> {
    const existing = this.userPoints.get(userId);
    
    if (existing) {
      const updatedUserPoints: UserPoints = {
        ...existing,
        points,
        totalEarned: totalEarned !== undefined ? totalEarned : existing.totalEarned,
        totalRedeemed: totalRedeemed !== undefined ? totalRedeemed : existing.totalRedeemed,
        lastEarnedAt: new Date(),
        updatedAt: new Date()
      };
      this.userPoints.set(userId, updatedUserPoints);
      return updatedUserPoints;
    } else {
      const newUserPoints: UserPoints = {
        id: this.userPointsIdCounter++,
        userId,
        points,
        totalEarned: totalEarned || 0,
        totalRedeemed: totalRedeemed || 0,
        lastEarnedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.userPoints.set(userId, newUserPoints);
      return newUserPoints;
    }
  }

  async createPointsTransaction(transaction: InsertPointsTransaction): Promise<PointsTransaction> {
    // For memory storage, we'll just create a mock transaction with an ID
    const newTransaction: PointsTransaction = {
      id: this.pointsTransactionIdCounter++,
      userId: transaction.userId,
      orderId: transaction.orderId || null,
      type: transaction.type,
      points: transaction.points,
      description: transaction.description,
      orderAmount: transaction.orderAmount || null,
      createdAt: new Date()
    };
    return newTransaction;
  }

  async awardPointsForOrder(userId: number, orderId: number, orderAmount: number): Promise<void> {
    // Calculate points (1 point per dollar)
    const pointsEarned = Math.floor(orderAmount);
    
    // Get or create user points record
    let userPointsRecord = this.userPoints.get(userId);
    
    if (!userPointsRecord) {
      // Create initial points record
      userPointsRecord = await this.updateUserPoints(userId, pointsEarned, pointsEarned, 0);
    } else {
      // Update existing points
      await this.updateUserPoints(
        userId, 
        userPointsRecord.points + pointsEarned, 
        userPointsRecord.totalEarned + pointsEarned, 
        userPointsRecord.totalRedeemed
      );
    }
    
    // Create transaction record
    await this.createPointsTransaction({
      userId,
      orderId,
      type: 'earned',
      points: pointsEarned,
      description: `Points earned from order #${orderId}`,
      orderAmount: orderAmount.toString()
    });
    
    log(`Awarded ${pointsEarned} points to user ${userId} for order ${orderId}`, 'server');
  }

  // Reward Redemption operations
  async redeemReward(userId: number, rewardId: number): Promise<any> {
    const reward = this.rewards.get(rewardId);
    if (!reward) {
      throw new Error("Reward not found");
    }

    const userPointsData = this.userPoints.get(userId);
    if (!userPointsData || userPointsData.points < reward.pointsRequired) {
      throw new Error("Insufficient points");
    }

    // Create redemption record
    const redemption = {
      id: this.userPointsRedemptionIdCounter++,
      userId,
      pointsRewardId: rewardId,
      pointsSpent: reward.pointsRequired,
      redeemedAt: new Date(),
      usedAt: null
    };

    // Update user points
    await this.updateUserPoints(
      userId,
      userPointsData.points - reward.pointsRequired,
      userPointsData.totalEarned,
      userPointsData.totalRedeemed + reward.pointsRequired
    );

    return {
      ...redemption,
      reward
    };
  }

  async getUserRedemptions(userId: number): Promise<any[]> {
    // This is a simplified implementation for MemStorage
    // In a real implementation, you'd have a separate map for redemptions
    return [];
  }

  // User Reward operations
  async getUserReward(id: number): Promise<UserReward | undefined> {
    return this.userRewards.get(id);
  }

  async createUserReward(userReward: InsertUserReward): Promise<UserReward> {
    const id = this.userRewardIdCounter++;
    const createdAt = new Date();
    const newUserReward: UserReward = { 
      ...userReward, 
      id, 
      createdAt, 
      isUsed: false,
      usedAt: null,
      expiresAt: userReward.expiresAt ?? null
    };
    this.userRewards.set(id, newUserReward);
    return newUserReward;
  }

  async useUserReward(id: number): Promise<UserReward | undefined> {
    const userReward = this.userRewards.get(id);
    if (!userReward) {
      return undefined;
    }
    
    const updatedUserReward: UserReward = {
      ...userReward,
      isUsed: true,
      usedAt: new Date()
    };
    
    this.userRewards.set(id, updatedUserReward);
    return updatedUserReward;
  }

  // Promo Code operations
  async getAllPromoCodes(): Promise<PromoCode[]> {
    return Array.from(this.promoCodes.values());
  }

  async getPromoCode(id: number): Promise<PromoCode | undefined> {
    return this.promoCodes.get(id);
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | undefined> {
    return Array.from(this.promoCodes.values()).find(
      promo => promo.code.toUpperCase() === code.toUpperCase()
    );
  }

  async createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode> {
    const id = this.promoCodeIdCounter++;
    const createdAt = new Date();
    const updatedAt = new Date();
    const newPromoCode: PromoCode = {
      ...promoCode,
      id,
      createdAt,
      updatedAt,
      currentUses: promoCode.currentUses || 0,
      isActive: promoCode.isActive !== undefined ? promoCode.isActive : true
    };
    this.promoCodes.set(id, newPromoCode);
    return newPromoCode;
  }

  async updatePromoCode(id: number, promoCode: Partial<InsertPromoCode>): Promise<PromoCode | undefined> {
    const existing = this.promoCodes.get(id);
    if (!existing) {
      return undefined;
    }
    
    const updatedPromoCode: PromoCode = {
      ...existing,
      ...promoCode,
      updatedAt: new Date()
    };
    
    this.promoCodes.set(id, updatedPromoCode);
    return updatedPromoCode;
  }

  async deletePromoCode(id: number): Promise<boolean> {
    const promoCode = this.promoCodes.get(id);
    if (!promoCode) {
      return false;
    }
    
    this.promoCodes.delete(id);
    return true;
  }

  async incrementPromoCodeUsage(id: number): Promise<boolean> {
    const promoCode = this.promoCodes.get(id);
    if (!promoCode) {
      return false;
    }
    
    const updatedPromoCode: PromoCode = {
      ...promoCode,
      currentUses: promoCode.currentUses + 1,
      updatedAt: new Date()
    };
    
    this.promoCodes.set(id, updatedPromoCode);
    return true;
  }

  // Vacation Mode operations
  async getVacationMode(): Promise<VacationMode | undefined> {
    return this.vacationMode;
  }

  async updateVacationMode(vacationModeData: Partial<InsertVacationMode>): Promise<VacationMode | undefined> {
    this.vacationMode = {
      ...this.vacationMode,
      ...vacationModeData,
      updatedAt: new Date()
    };
    return this.vacationMode;
  }

  // Store Hours operations
  async getAllStoreHours(): Promise<StoreHours[]> {
    return Array.from(this.storeHours.values());
  }

  async getStoreHoursByDay(dayOfWeek: number): Promise<StoreHours | undefined> {
    return this.storeHours.get(dayOfWeek);
  }

  async updateStoreHours(dayOfWeek: number, storeHoursData: Partial<InsertStoreHours>): Promise<StoreHours | undefined> {
    const existing = this.storeHours.get(dayOfWeek);
    if (existing) {
      const updatedStoreHours: StoreHours = {
        ...existing,
        ...storeHoursData,
        updatedAt: new Date()
      };
      this.storeHours.set(dayOfWeek, updatedStoreHours);
      return updatedStoreHours;
    } else {
      const newStoreHours: StoreHours = {
        ...storeHoursData,
        dayOfWeek,
        isOpen: storeHoursData.isOpen !== undefined ? storeHoursData.isOpen : true
      };
      this.storeHours.set(dayOfWeek, newStoreHours);
      return newStoreHours;
    }
  }

  // Restaurant Settings operations
  async getRestaurantSettings(): Promise<RestaurantSettings | undefined> {
    return this.restaurantSettings;
  }

  async updateRestaurantSettings(settingsData: Partial<InsertRestaurantSettings>): Promise<RestaurantSettings | undefined> {
    this.restaurantSettings = {
      ...this.restaurantSettings,
      ...settingsData,
      updatedAt: new Date()
    };
    return this.restaurantSettings;
  }

  // Choice Group operations
  async getAllChoiceGroups(): Promise<ChoiceGroup[]> {
    return Array.from(this.choiceGroups.values());
  }

  async getChoiceGroup(id: number): Promise<ChoiceGroup | undefined> {
    return this.choiceGroups.get(id);
  }

  async createChoiceGroup(choiceGroup: InsertChoiceGroup): Promise<ChoiceGroup> {
    const id = this.choiceGroupIdCounter++;
    const createdAt = new Date();
    const newChoiceGroup: ChoiceGroup = {
      ...choiceGroup,
      id,
      createdAt,
      updatedAt: new Date()
    };
    this.choiceGroups.set(id, newChoiceGroup);
    return newChoiceGroup;
  }

  async updateChoiceGroup(id: number, choiceGroupData: Partial<InsertChoiceGroup>): Promise<ChoiceGroup | undefined> {
    const existingChoiceGroup = this.choiceGroups.get(id);
    if (!existingChoiceGroup) {
      return undefined;
    }
    
    const updatedChoiceGroup: ChoiceGroup = {
      ...existingChoiceGroup,
      ...choiceGroupData,
      updatedAt: new Date()
    };
    
    this.choiceGroups.set(id, updatedChoiceGroup);
    return updatedChoiceGroup;
  }

  async deleteChoiceGroup(id: number): Promise<boolean> {
    const existingChoiceGroup = this.choiceGroups.get(id);
    if (!existingChoiceGroup) {
      return false;
    }
    
    this.choiceGroups.delete(id);
    return true;
  }

  // Choice Item operations
  async getAllChoiceItems(): Promise<ChoiceItem[]> {
    return Array.from(this.choiceItems.values());
  }

  async getChoiceItem(id: number): Promise<ChoiceItem | undefined> {
    return this.choiceItems.get(id);
  }

  async createChoiceItem(choiceItem: InsertChoiceItem): Promise<ChoiceItem> {
    const id = this.choiceItemIdCounter++;
    const createdAt = new Date();
    const newChoiceItem: ChoiceItem = {
      ...choiceItem,
      id,
      createdAt,
      updatedAt: new Date()
    };
    this.choiceItems.set(id, newChoiceItem);
    return newChoiceItem;
  }

  async updateChoiceItem(id: number, choiceItemData: Partial<InsertChoiceItem>): Promise<ChoiceItem | undefined> {
    const existingChoiceItem = this.choiceItems.get(id);
    if (!existingChoiceItem) {
      return undefined;
    }
    
    const updatedChoiceItem: ChoiceItem = {
      ...existingChoiceItem,
      ...choiceItemData,
      updatedAt: new Date()
    };
    
    this.choiceItems.set(id, updatedChoiceItem);
    return updatedChoiceItem;
  }

  async deleteChoiceItem(id: number): Promise<boolean> {
    const existingChoiceItem = this.choiceItems.get(id);
    if (!existingChoiceItem) {
      return false;
    }
    
    this.choiceItems.delete(id);
    return true;
  }

  // Menu Item Choice Group operations
  async getAllMenuItemChoiceGroups(): Promise<MenuItemChoiceGroup[]> {
    return Array.from(this.menuItemChoiceGroups.values());
  }

  async getMenuItemChoiceGroup(id: number): Promise<MenuItemChoiceGroup | undefined> {
    return this.menuItemChoiceGroups.get(id);
  }

  async createMenuItemChoiceGroup(menuItemChoiceGroup: InsertMenuItemChoiceGroup): Promise<MenuItemChoiceGroup> {
    const id = this.menuItemChoiceGroupIdCounter++;
    const createdAt = new Date();
    const newMenuItemChoiceGroup: MenuItemChoiceGroup = {
      ...menuItemChoiceGroup,
      id,
      createdAt,
      updatedAt: new Date()
    };
    this.menuItemChoiceGroups.set(id, newMenuItemChoiceGroup);
    return newMenuItemChoiceGroup;
  }

  async updateMenuItemChoiceGroup(id: number, menuItemChoiceGroupData: Partial<InsertMenuItemChoiceGroup>): Promise<MenuItemChoiceGroup | undefined> {
    const existingMenuItemChoiceGroup = this.menuItemChoiceGroups.get(id);
    if (!existingMenuItemChoiceGroup) {
      return undefined;
    }
    
    const updatedMenuItemChoiceGroup: MenuItemChoiceGroup = {
      ...existingMenuItemChoiceGroup,
      ...menuItemChoiceGroupData,
      updatedAt: new Date()
    };
    
    this.menuItemChoiceGroups.set(id, updatedMenuItemChoiceGroup);
    return updatedMenuItemChoiceGroup;
  }

  async deleteMenuItemChoiceGroup(id: number): Promise<boolean> {
    const existingMenuItemChoiceGroup = this.menuItemChoiceGroups.get(id);
    if (!existingMenuItemChoiceGroup) {
      return false;
    }
    
    this.menuItemChoiceGroups.delete(id);
    return true;
  }

  // Category Choice Group operations
  async getAllCategoryChoiceGroups(): Promise<CategoryChoiceGroup[]> {
    return Array.from(this.categoryChoiceGroups.values());
  }

  async getCategoryChoiceGroup(id: number): Promise<CategoryChoiceGroup | undefined> {
    return this.categoryChoiceGroups.get(id);
  }

  async createCategoryChoiceGroup(categoryChoiceGroup: InsertCategoryChoiceGroup): Promise<CategoryChoiceGroup> {
    const id = this.categoryChoiceGroupIdCounter++;
    const createdAt = new Date();
    const newCategoryChoiceGroup: CategoryChoiceGroup = {
      ...categoryChoiceGroup,
      id,
      createdAt,
      updatedAt: new Date()
    };
    this.categoryChoiceGroups.set(id, newCategoryChoiceGroup);
    return newCategoryChoiceGroup;
  }

  async updateCategoryChoiceGroup(id: number, categoryChoiceGroupData: Partial<InsertCategoryChoiceGroup>): Promise<CategoryChoiceGroup | undefined> {
    const existingCategoryChoiceGroup = this.categoryChoiceGroups.get(id);
    if (!existingCategoryChoiceGroup) {
      return undefined;
    }
    
    const updatedCategoryChoiceGroup: CategoryChoiceGroup = {
      ...existingCategoryChoiceGroup,
      ...categoryChoiceGroupData,
      updatedAt: new Date()
    };
    
    this.categoryChoiceGroups.set(id, updatedCategoryChoiceGroup);
    return updatedCategoryChoiceGroup;
  }

  async deleteCategoryChoiceGroup(id: number): Promise<boolean> {
    const existingCategoryChoiceGroup = this.categoryChoiceGroups.get(id);
    if (!existingCategoryChoiceGroup) {
      return false;
    }
    
    this.categoryChoiceGroups.delete(id);
    return true;
  }

  // Tax operations
  async getAllTaxCategories(): Promise<TaxCategory[]> {
    return Array.from(this.taxCategories.values());
  }

  async getTaxCategory(id: number): Promise<TaxCategory | undefined> {
    return this.taxCategories.get(id);
  }

  async createTaxCategory(taxCategory: InsertTaxCategory): Promise<TaxCategory> {
    const id = this.taxCategoryIdCounter++;
    const createdAt = new Date();
    const newTaxCategory: TaxCategory = {
      ...taxCategory,
      id,
      createdAt,
      updatedAt: new Date()
    };
    this.taxCategories.set(id, newTaxCategory);
    return newTaxCategory;
  }

  async updateTaxCategory(id: number, taxCategoryData: Partial<InsertTaxCategory>): Promise<TaxCategory | undefined> {
    const existingTaxCategory = this.taxCategories.get(id);
    if (!existingTaxCategory) {
      return undefined;
    }
    
    const updatedTaxCategory: TaxCategory = {
      ...existingTaxCategory,
      ...taxCategoryData,
      updatedAt: new Date()
    };
    
    this.taxCategories.set(id, updatedTaxCategory);
    return updatedTaxCategory;
  }

  async deleteTaxCategory(id: number): Promise<boolean> {
    const existingTaxCategory = this.taxCategories.get(id);
    if (!existingTaxCategory) {
      return false;
    }
    
    this.taxCategories.delete(id);
    return true;
  }

  async getTaxSettings(): Promise<TaxSettings | undefined> {
    return this.taxSettings;
  }

  async updateTaxSettings(settingsData: Partial<InsertTaxSettings>): Promise<TaxSettings | undefined> {
    this.taxSettings = {
      ...this.taxSettings,
      ...settingsData,
      updatedAt: new Date()
    };
    return this.taxSettings;
  }

  // Pause Services operations
  async getAllPauseServices(): Promise<PauseService[]> {
    return Array.from(this.pauseServices.values());
  }

  async getPauseService(id: number): Promise<PauseService | undefined> {
    return this.pauseServices.get(id);
  }

  async createPauseService(pauseService: InsertPauseService): Promise<PauseService> {
    const id = this.pauseServiceIdCounter++;
    const startTime = new Date();
    const endTime = pauseService.pauseUntilEndOfDay 
      ? new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate(), 23, 59, 59)
      : new Date(startTime.getTime() + (pauseService.pauseDuration * 60 * 1000));
    
    const newPauseService: PauseService = {
      ...pauseService,
      id,
      startTime,
      endTime,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.pauseServices.set(id, newPauseService);
    return newPauseService;
  }

  async updatePauseService(id: number, pauseServiceData: Partial<InsertPauseService>): Promise<PauseService | undefined> {
    const existingPauseService = this.pauseServices.get(id);
    if (!existingPauseService) {
      return undefined;
    }
    
    const updatedPauseService: PauseService = {
      ...existingPauseService,
      ...pauseServiceData,
      updatedAt: new Date()
    };
    
    this.pauseServices.set(id, updatedPauseService);
    return updatedPauseService;
  }

  async deletePauseService(id: number): Promise<boolean> {
    const existingPauseService = this.pauseServices.get(id);
    if (!existingPauseService) {
      return false;
    }
    
    this.pauseServices.delete(id);
    return true;
  }

  async getActivePauseServices(): Promise<PauseService[]> {
    const now = new Date();
    return Array.from(this.pauseServices.values()).filter(
      pauseService => pauseService.isActive && pauseService.endTime > now
    );
  }

  // Receipt Template operations
  async getReceiptTemplate(templateId: string): Promise<any> {
    return this.receiptTemplates.get(templateId);
  }

  async saveReceiptTemplate(templateId: string, template: any): Promise<any> {
    this.receiptTemplates.set(templateId, template);
    return template;
  }

  async getAllReceiptTemplates(): Promise<any> {
    const templates: any = {};
    for (const [id, template] of this.receiptTemplates.entries()) {
      templates[id] = template;
    }
    return templates;
  }

  // Time tracking operations
  async createTimeEntry(data: any): Promise<any> {
    throw new Error('Time tracking not implemented in MemStorage');
  }

  async updateTimeEntry(id: number, data: any): Promise<any> {
    throw new Error('Time tracking not implemented in MemStorage');
  }

  async getTimeEntry(id: number): Promise<any> {
    throw new Error('Time tracking not implemented in MemStorage');
  }

  async getActiveTimeEntry(employeeId: number): Promise<any> {
    throw new Error('Time tracking not implemented in MemStorage');
  }

  async getEmployeeTimeSummary(employeeId: number, startDate: string, endDate: string): Promise<any> {
    throw new Error('Time tracking not implemented in MemStorage');
  }

  // Schedule operations
  async createEmployeeSchedule(data: any): Promise<any> {
    throw new Error('Schedule operations not implemented in MemStorage');
  }

  async getEmployeeSchedules(startDate: string, endDate: string, employeeId?: number): Promise<any[]> {
    throw new Error('Schedule operations not implemented in MemStorage');
  }

  async getTodaysSchedule(employeeId: number): Promise<any> {
    throw new Error('Schedule operations not implemented in MemStorage');
  }

  async checkScheduleConflicts(employeeId: number, date: string, startTime: string, endTime: string): Promise<any[]> {
    throw new Error('Schedule operations not implemented in MemStorage');
  }

  async updateEmployeeSchedule(scheduleId: number, data: any): Promise<any> {
    throw new Error('Schedule operations not implemented in MemStorage');
  }

  async deleteEmployeeSchedule(scheduleId: number): Promise<boolean> {
    throw new Error('Schedule operations not implemented in MemStorage');
  }

  // Alert operations
  async createScheduleAlert(data: any): Promise<any> {
    throw new Error('Alert operations not implemented in MemStorage');
  }

  async getScheduleAlerts(unreadOnly: boolean): Promise<any[]> {
    throw new Error('Alert operations not implemented in MemStorage');
  }

  async markAlertAsRead(alertId: number): Promise<void> {
    throw new Error('Alert operations not implemented in MemStorage');
  }

  // Payroll operations
  async getPayrollSummary(payPeriodId?: number, startDate?: string, endDate?: string): Promise<any> {
    throw new Error('Payroll operations not implemented in MemStorage');
  }

  // Tip distribution operations
  async getTipSettings(): Promise<any> {
    throw new Error('Tip operations not implemented in MemStorage');
  }

  async updateTipSettings(settings: any): Promise<any> {
    throw new Error('Tip operations not implemented in MemStorage');
  }

  async distributeTips(orderId: number, tipAmount: number, orderType: string): Promise<void> {
    throw new Error('Tip operations not implemented in MemStorage');
  }

  async getClockedInEmployees(): Promise<any[]> {
    throw new Error('Employee operations not implemented in MemStorage');
  }

  async createTipDistribution(tipDistribution: any): Promise<any> {
    throw new Error('Tip operations not implemented in MemStorage');
  }

  // System settings operations
  async getSystemSetting(key: string): Promise<any> {
    return this.systemSettings.get(key);
  }

  async updateSystemSetting(key: string, value: string): Promise<any> {
    const setting = { key, value, updated_at: new Date() };
    this.systemSettings.set(key, setting);
    return setting;
  }

  async getAllSystemSettings(): Promise<any[]> {
    return Array.from(this.systemSettings.values());
  }

  async getSystemSettingsByCategory(category: string): Promise<any[]> {
    return Array.from(this.systemSettings.values()).filter(s => s.category === category);
  }
  
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    // Use memory store for development to avoid session table conflicts
    if (process.env.NODE_ENV === 'development') {
      console.log('DatabaseStorage: Using memory session store for development');
      this.sessionStore = new session.MemoryStore();
    } else {
      // Create a PostgreSQL connection pool for session store using pg (production only)
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 20000,
        connectionTimeoutMillis: 10000,
      });

      this.sessionStore = new PgSession({
        pool: pool,
        tableName: 'sessions',
        createTableIfMissing: false, // Table should already exist
      });
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.googleId, googleId));
    return user;
  }

  async getUserBySupabaseId(supabaseId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.supabaseUserId, supabaseId));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        isAdmin: insertUser.isAdmin || false,
        rewards: 0,
        stripeCustomerId: null,
        phone: insertUser.phone ?? null,
        address: insertUser.address ?? null,
        city: insertUser.city ?? null,
        state: insertUser.state ?? null,
        zipCode: insertUser.zipCode ?? null,
        marketingOptIn: insertUser.marketingOptIn !== undefined ? insertUser.marketingOptIn : true
      })
      .returning();
    return user;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  // Category operations
  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(asc(categories.order));
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [newCategory] = await db.insert(categories).values(category).returning();
    return newCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updatedCategory] = await db
      .update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const result = await db.delete(categories).where(eq(categories.id, id));
    return result.rowCount > 0;
  }

  // Menu operations
  async getAllMenuItems(): Promise<MenuItem[]> {
    return await db.select().from(menuItems);
  }

  async getMenuItem(id: number): Promise<MenuItem | undefined> {
    const [menuItem] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return menuItem;
  }

  async getMenuItemsByCategory(category: string): Promise<MenuItem[]> {
    return await db.select().from(menuItems).where(eq(menuItems.category, category));
  }

  async getFeaturedMenuItems(): Promise<MenuItem[]> {
    // First try to get items marked as popular or best seller
    const featuredItems = await db
      .select()
      .from(menuItems)
      .where(or(eq(menuItems.isPopular, true), eq(menuItems.isBestSeller, true)))
      .limit(3);
    
    if (featuredItems.length >= 3) {
      return featuredItems;
    }
    
    // If not enough featured items, get the first available items to make up 3 total
    const remainingCount = 3 - featuredItems.length;
    const additionalItems = await db
      .select()
      .from(menuItems)
      .where(and(eq(menuItems.isPopular, false), eq(menuItems.isBestSeller, false)))
      .limit(remainingCount);
    
    return [...featuredItems, ...additionalItems];
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const [newMenuItem] = await db
      .insert(menuItems)
      .values({
        ...menuItem,
        options: menuItem.options ?? null,
        imageUrl: menuItem.imageUrl ?? null,
        isPopular: menuItem.isPopular ?? false,
        isNew: menuItem.isNew ?? false,
        isBestSeller: menuItem.isBestSeller ?? false,
        isAvailable: menuItem.isAvailable ?? true
      })
      .returning();
    return newMenuItem;
  }

  async updateMenuItem(id: number, menuItemData: Partial<InsertMenuItem>): Promise<MenuItem | undefined> {
    const [updatedMenuItem] = await db
      .update(menuItems)
      .set({
        ...menuItemData,
        updatedAt: new Date(),
      })
      .where(eq(menuItems.id, id))
      .returning();
    return updatedMenuItem;
  }

  async deleteMenuItem(id: number): Promise<boolean> {
    const result = await db.delete(menuItems).where(eq(menuItems.id, id));
    return result.rowCount > 0;
  }

  // Order operations
  async getAllOrders(): Promise<Order[]> {
    return await db.select().from(orders);
  }

  async getOrder(id: number): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async getOrderWithItems(id: number): Promise<Order & { items: OrderItem[] }> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) {
      throw new Error(`Order with id ${id} not found`);
    }

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    return { ...order, items };
  }

  async getOrdersByUserId(userId: number): Promise<Order[]> {
    return await db.select().from(orders).where(eq(orders.userId, userId));
  }

  async getActiveOrders(): Promise<(Order & { items: OrderItem[] })[]> {
    const activeOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          ne(orders.status, "completed"),
          ne(orders.status, "cancelled")
        )
      );

    return Promise.all(
      activeOrders.map(async (order) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        return { ...order, items };
      })
    );
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db
      .insert(orders)
      .values({
        ...order,
        status: order.status ?? "pending",
        userId: order.userId ?? null,
        address: order.address ?? null,
        deliveryFee: order.deliveryFee ?? "0",
        tip: order.tip ?? "0",
        paymentStatus: order.paymentStatus ?? "pending",
        paymentIntentId: order.paymentIntentId ?? null,
        specialInstructions: order.specialInstructions ?? null,
        processedAt: null,
        completedAt: null
      })
      .returning();
    return newOrder;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    let updateData: any = { status };
    
    // Update timestamps based on status
    if (status === "processing") {
      updateData.processedAt = new Date();
    } else if (status === "completed") {
      updateData.completedAt = new Date();
    }
    
    const [updatedOrder] = await db
      .update(orders)
      .set(updateData)
      .where(eq(orders.id, id))
      .returning();
    
    return updatedOrder;
  }

  async updateOrderPaymentStatus(id: number, status: string): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ paymentStatus: status })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async updateOrderPaymentIntent(id: number, paymentIntentId: string): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ paymentIntentId })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async updateOrderTotal(id: number, total: number): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ total: total.toString() })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async updateOrderRefund(id: number, refundData: { refundId: string; refundAmount: number; refundReason: string; refundedBy: number; refundedAt: Date }): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set({
        refundId: refundData.refundId,
        refundAmount: refundData.refundAmount.toString(),
        refundReason: refundData.refundReason,
        refundedBy: refundData.refundedBy,
        refundedAt: refundData.refundedAt
      })
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async updateOrder(id: number, updates: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updatedOrder] = await db
      .update(orders)
      .set(updates)
      .where(eq(orders.id, id))
      .returning();
    return updatedOrder;
  }

  async deleteOrder(id: number): Promise<boolean> {
    try {
      // Delete associated order items first
      await db
        .delete(orderItems)
        .where(eq(orderItems.orderId, id));
      
      // Delete the order
      await db
        .delete(orders)
        .where(eq(orders.id, id));
      
      return true;
    } catch (error) {
      console.error('Error deleting order:', error);
      return false;
    }
  }

  // Order Item operations
  async getOrderItemsByOrderId(orderId: number): Promise<OrderItem[]> {
    return await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
  }

  async getAllOrderItems(): Promise<OrderItem[]> {
    return await db.select().from(orderItems);
  }

  async createOrderItem(orderItem: InsertOrderItem): Promise<OrderItem> {
    const [newOrderItem] = await db
      .insert(orderItems)
      .values({
        ...orderItem,
        options: orderItem.options ?? {},
        specialInstructions: orderItem.specialInstructions ?? null
      })
      .returning();
    return newOrderItem;
  }

  // Reward operations
  async getAllRewards(): Promise<Reward[]> {
    return await db.select().from(rewards);
  }

  async getReward(id: number): Promise<Reward | undefined> {
    const [reward] = await db
      .select()
      .from(rewards)
      .where(eq(rewards.id, id));
    return reward;
  }

  async getRewardsByUserId(userId: number): Promise<(UserReward & { reward: Reward })[]> {
    const userRewardsList = await db
      .select()
      .from(userRewards)
      .where(
        and(
          eq(userRewards.userId, userId),
          eq(userRewards.isUsed, false)
        )
      );
    
    return Promise.all(
      userRewardsList.map(async (userReward) => {
        const [reward] = await db
          .select()
          .from(rewards)
          .where(eq(rewards.id, userReward.rewardId));
        
        if (!reward) {
          throw new Error(`Reward with id ${userReward.rewardId} not found`);
        }
        
        return { ...userReward, reward };
      })
    );
  }

  async createReward(reward: InsertReward): Promise<Reward> {
    const [newReward] = await db
      .insert(rewards)
      .values({
        ...reward,
        discount: reward.discount ?? null,
        discountType: reward.discountType ?? null,
        minOrderAmount: reward.minOrderAmount ?? null,
        expiresAt: reward.expiresAt ?? null
      })
      .returning();
    return newReward;
  }

  async getActiveRewards(): Promise<Reward[]> {
    return await db
      .select()
      .from(rewards)
      .where(eq(rewards.isActive, true));
  }

  async updateReward(id: number, reward: Partial<InsertReward>): Promise<Reward | undefined> {
    const [updatedReward] = await db
      .update(rewards)
      .set(reward)
      .where(eq(rewards.id, id))
      .returning();
    return updatedReward;
  }

  async deleteReward(id: number): Promise<boolean> {
    const result = await db
      .delete(rewards)
      .where(eq(rewards.id, id));
    return result.rowCount > 0;
  }

  // User Points operations
  async getUserPoints(userId: number): Promise<UserPoints | undefined> {
    const [userPointsData] = await db
      .select()
      .from(userPoints)
      .where(eq(userPoints.userId, userId));
    return userPointsData;
  }

  async updateUserPoints(userId: number, points: number, totalEarned?: number, totalRedeemed?: number): Promise<UserPoints | undefined> {
    const existing = await this.getUserPoints(userId);
    
    if (existing) {
      const [updatedUserPoints] = await db
        .update(userPoints)
        .set({
          points,
          totalEarned: totalEarned !== undefined ? totalEarned : existing.totalEarned,
          totalRedeemed: totalRedeemed !== undefined ? totalRedeemed : existing.totalRedeemed,
          lastEarnedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userPoints.userId, userId))
        .returning();
      return updatedUserPoints;
    } else {
      const [newUserPoints] = await db
        .insert(userPoints)
        .values({
          userId,
          points,
          totalEarned: totalEarned || 0,
          totalRedeemed: totalRedeemed || 0,
          lastEarnedAt: new Date()
        })
        .returning();
      return newUserPoints;
    }
  }

  async createPointsTransaction(transaction: InsertPointsTransaction): Promise<PointsTransaction> {
    const [newTransaction] = await db
      .insert(pointsTransactions)
      .values(transaction)
      .returning();
    return newTransaction;
  }

  async awardPointsForOrder(userId: number, orderId: number, orderAmount: number): Promise<void> {
    // Calculate points (1 point per dollar)
    const pointsEarned = Math.floor(orderAmount);
    
    // Get or create user points record
    let userPointsRecord = await this.getUserPoints(userId);
    
    if (!userPointsRecord) {
      // Create initial points record
      userPointsRecord = await this.updateUserPoints(userId, pointsEarned, pointsEarned, 0);
    } else {
      // Update existing points
      await this.updateUserPoints(
        userId, 
        userPointsRecord.points + pointsEarned, 
        userPointsRecord.totalEarned + pointsEarned, 
        userPointsRecord.totalRedeemed
      );
    }
    
    // Create transaction record
    await this.createPointsTransaction({
      userId,
      orderId,
      type: 'earned',
      points: pointsEarned,
      description: `Points earned from order #${orderId}`,
      orderAmount: orderAmount.toString()
    });
    
    log(`Awarded ${pointsEarned} points to user ${userId} for order ${orderId}`, 'server');
  }

  async getPointsTransactions(userId: number, limit: number = 20): Promise<PointsTransaction[]> {
    const transactions = await db
      .select()
      .from(pointsTransactions)
      .where(eq(pointsTransactions.userId, userId))
      .orderBy(sql`${pointsTransactions.createdAt} DESC`)
      .limit(limit);
    return transactions;
  }

  // Points Rewards operations
  async getAllPointsRewards(): Promise<PointsReward[]> {
    return await db
      .select()
      .from(pointsRewards)
      .orderBy(asc(pointsRewards.pointsRequired));
  }

  async getActivePointsRewards(): Promise<PointsReward[]> {
    return await db
      .select()
      .from(pointsRewards)
      .where(eq(pointsRewards.isActive, true))
      .orderBy(asc(pointsRewards.pointsRequired));
  }

  async getPointsReward(id: number): Promise<PointsReward | undefined> {
    const [reward] = await db
      .select()
      .from(pointsRewards)
      .where(eq(pointsRewards.id, id));
    return reward;
  }

  async createPointsReward(reward: InsertPointsReward): Promise<PointsReward> {
    const [newReward] = await db
      .insert(pointsRewards)
      .values(reward)
      .returning();
    return newReward;
  }

  async updatePointsReward(id: number, reward: Partial<InsertPointsReward>): Promise<PointsReward | undefined> {
    const [updatedReward] = await db
      .update(pointsRewards)
      .set({
        ...reward,
        updatedAt: new Date(),
      })
      .where(eq(pointsRewards.id, id))
      .returning();
    return updatedReward;
  }

  async deletePointsReward(id: number): Promise<boolean> {
    const result = await db
      .delete(pointsRewards)
      .where(eq(pointsRewards.id, id))
      .returning();
    return result.length > 0;
  }

  async redeemPointsReward(userId: number, rewardId: number, orderId?: number): Promise<UserPointsRedemption> {
    // This should be called within a transaction context
    // Get the reward first
    const reward = await this.getPointsReward(rewardId);
    if (!reward) {
      throw new Error('Reward not found');
    }

    // Create redemption record
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Expire in 30 days

    const [redemption] = await db
      .insert(userPointsRedemptions)
      .values({
        userId,
        pointsRewardId: rewardId,
        orderId: orderId || null,
        pointsSpent: reward.pointsRequired,
        expiresAt,
      })
      .returning();

    return redemption;
  }

  async getUserPointsRedemptions(userId: number): Promise<(UserPointsRedemption & { reward: PointsReward })[]> {
    const redemptions = await db
      .select({
        id: userPointsRedemptions.id,
        userId: userPointsRedemptions.userId,
        pointsRewardId: userPointsRedemptions.pointsRewardId,
        orderId: userPointsRedemptions.orderId,
        pointsSpent: userPointsRedemptions.pointsSpent,
        isUsed: userPointsRedemptions.isUsed,
        usedAt: userPointsRedemptions.usedAt,
        expiresAt: userPointsRedemptions.expiresAt,
        createdAt: userPointsRedemptions.createdAt,
        reward: {
          id: pointsRewards.id,
          name: pointsRewards.name,
          description: pointsRewards.description,
          pointsRequired: pointsRewards.pointsRequired,
          rewardType: pointsRewards.rewardType,
          rewardValue: pointsRewards.rewardValue,
          rewardDescription: pointsRewards.rewardDescription,
          isActive: pointsRewards.isActive,
          maxRedemptions: pointsRewards.maxRedemptions,
          currentRedemptions: pointsRewards.currentRedemptions,
          createdAt: pointsRewards.createdAt,
          updatedAt: pointsRewards.updatedAt,
        }
      })
      .from(userPointsRedemptions)
      .innerJoin(pointsRewards, eq(userPointsRedemptions.pointsRewardId, pointsRewards.id))
      .where(eq(userPointsRedemptions.userId, userId))
      .orderBy(sql`${userPointsRedemptions.createdAt} DESC`);

    return redemptions.map(r => ({
      ...r,
      reward: r.reward as PointsReward
    }));
  }

  async validatePointsRedemption(userId: number, rewardId: number): Promise<{ valid: boolean; error?: string }> {
    // Check if reward exists and is active
    const reward = await this.getPointsReward(rewardId);
    if (!reward) {
      return { valid: false, error: 'Reward not found' };
    }

    if (!reward.isActive) {
      return { valid: false, error: 'Reward is not active' };
    }

    // Check redemption limits
    if (reward.maxRedemptions && reward.currentRedemptions >= reward.maxRedemptions) {
      return { valid: false, error: 'Reward redemption limit reached' };
    }

    // Check user's points
    const userPointsData = await this.getUserPoints(userId);
    if (!userPointsData) {
      return { valid: false, error: 'User points record not found' };
    }

    if (userPointsData.points < reward.pointsRequired) {
      return { 
        valid: false, 
        error: `Insufficient points. Need ${reward.pointsRequired}, have ${userPointsData.points}` 
      };
    }

    return { valid: true };
  }

  // Legacy Reward Redemption operations (for backwards compatibility)
  async redeemReward(userId: number, rewardId: number): Promise<any> {
    // Get the reward
    const reward = await this.getReward(rewardId);
    if (!reward) {
      throw new Error("Reward not found");
    }

    // Get user points
    const userPointsData = await this.getUserPoints(userId);
    if (!userPointsData || userPointsData.points < reward.pointsRequired) {
      throw new Error("Insufficient points");
    }

    // Create redemption record
    const [redemption] = await db
      .insert(userPointsRedemptions)
      .values({
        userId,
        pointsRewardId: rewardId,
        pointsSpent: reward.pointsRequired,
        redeemedAt: new Date()
      })
      .returning();

    // Update user points
    await this.updateUserPoints(
      userId,
      userPointsData.points - reward.pointsRequired,
      userPointsData.totalEarned,
      userPointsData.totalRedeemed + reward.pointsRequired
    );

    return {
      ...redemption,
      reward
    };
  }

  async getUserRedemptions(userId: number): Promise<any[]> {
    return await db
      .select({
        id: userPointsRedemptions.id,
        userId: userPointsRedemptions.userId,
        pointsRewardId: userPointsRedemptions.pointsRewardId,
        pointsSpent: userPointsRedemptions.pointsSpent,
        redeemedAt: userPointsRedemptions.redeemedAt,
        usedAt: userPointsRedemptions.usedAt,
        reward: {
          id: pointsRewards.id,
          name: pointsRewards.name,
          description: pointsRewards.description,
          pointsRequired: pointsRewards.pointsRequired,
          rewardType: pointsRewards.rewardType,
          rewardValue: pointsRewards.rewardValue,
          rewardDescription: pointsRewards.rewardDescription,
          isActive: pointsRewards.isActive
        }
      })
      .from(userPointsRedemptions)
      .innerJoin(pointsRewards, eq(userPointsRedemptions.pointsRewardId, pointsRewards.id))
      .where(eq(userPointsRedemptions.userId, userId))
      .orderBy(userPointsRedemptions.redeemedAt);
  }

  // User Reward operations
  async getUserReward(id: number): Promise<UserReward | undefined> {
    const [userReward] = await db
      .select()
      .from(userRewards)
      .where(eq(userRewards.id, id));
    return userReward;
  }

  async createUserReward(userReward: InsertUserReward): Promise<UserReward> {
    const [newUserReward] = await db
      .insert(userRewards)
      .values({
        ...userReward,
        isUsed: false,
        usedAt: null,
        expiresAt: userReward.expiresAt ?? null
      })
      .returning();
    return newUserReward;
  }

  async useUserReward(id: number): Promise<UserReward | undefined> {
    const [updatedUserReward] = await db
      .update(userRewards)
      .set({
        isUsed: true,
        usedAt: new Date()
      })
      .where(eq(userRewards.id, id))
      .returning();
    return updatedUserReward;
  }

  // Promo Code operations
  async getAllPromoCodes(): Promise<PromoCode[]> {
    return await db.select().from(promoCodes);
  }

  async getPromoCode(id: number): Promise<PromoCode | undefined> {
    const [promoCode] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.id, id));
    return promoCode;
  }

  async getPromoCodeByCode(code: string): Promise<PromoCode | undefined> {
    const [promoCode] = await db
      .select()
      .from(promoCodes)
      .where(eq(promoCodes.code, code.toUpperCase()));
    return promoCode;
  }

  async createPromoCode(promoCode: InsertPromoCode): Promise<PromoCode> {
    const [newPromoCode] = await db
      .insert(promoCodes)
      .values({
        ...promoCode,
        currentUses: promoCode.currentUses || 0,
        isActive: promoCode.isActive !== undefined ? promoCode.isActive : true
      })
      .returning();
    return newPromoCode;
  }

  async updatePromoCode(id: number, promoCode: Partial<InsertPromoCode>): Promise<PromoCode | undefined> {
    const [updatedPromoCode] = await db
      .update(promoCodes)
      .set({
        ...promoCode,
        updatedAt: new Date()
      })
      .where(eq(promoCodes.id, id))
      .returning();
    return updatedPromoCode;
  }

  async deletePromoCode(id: number): Promise<boolean> {
    try {
      await db
        .delete(promoCodes)
        .where(eq(promoCodes.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting promo code:', error);
      return false;
    }
  }

  async incrementPromoCodeUsage(id: number): Promise<boolean> {
    try {
      await db
        .update(promoCodes)
        .set({
          currentUses: sql`${promoCodes.currentUses} + 1`,
          updatedAt: new Date()
        })
        .where(eq(promoCodes.id, id));
      return true;
    } catch (error) {
      console.error('Error incrementing promo code usage:', error);
      return false;
    }
  }

  // Vacation Mode operations
  async getVacationMode(): Promise<VacationMode | undefined> {
    const [vacationModeData] = await db
      .select()
      .from(vacationMode)
      .limit(1);
    return vacationModeData;
  }

  async updateVacationMode(vacationModeData: Partial<InsertVacationMode>): Promise<VacationMode | undefined> {
    const existing = await this.getVacationMode();
    
    if (existing) {
      const [updatedVacationMode] = await db
        .update(vacationMode)
        .set({
          ...vacationModeData,
          updatedAt: new Date()
        })
        .where(eq(vacationMode.id, existing.id))
        .returning();
      return updatedVacationMode;
    } else {
      const [newVacationMode] = await db
        .insert(vacationMode)
        .values({
          ...vacationModeData,
          isEnabled: vacationModeData.isEnabled || false,
          message: vacationModeData.message || "We are currently on vacation and will be back soon. Thank you for your patience!"
        })
        .returning();
      return newVacationMode;
    }
  }

  // Store Hours operations
  async getAllStoreHours(): Promise<StoreHours[]> {
    return await db
      .select()
      .from(storeHours)
      .orderBy(storeHours.dayOfWeek);
  }

  async getStoreHoursByDay(dayOfWeek: number): Promise<StoreHours | undefined> {
    const [storeHoursData] = await db
      .select()
      .from(storeHours)
      .where(eq(storeHours.dayOfWeek, dayOfWeek));
    return storeHoursData;
  }

  async updateStoreHours(dayOfWeek: number, storeHoursData: Partial<InsertStoreHours>): Promise<StoreHours | undefined> {
    const existing = await this.getStoreHoursByDay(dayOfWeek);
    
    if (existing) {
      const [updatedStoreHours] = await db
        .update(storeHours)
        .set({
          ...storeHoursData,
          updatedAt: new Date()
        })
        .where(eq(storeHours.dayOfWeek, dayOfWeek))
        .returning();
      return updatedStoreHours;
    } else {
      const [newStoreHours] = await db
        .insert(storeHours)
        .values({
          ...storeHoursData,
          dayOfWeek,
          isOpen: storeHoursData.isOpen !== undefined ? storeHoursData.isOpen : true
        })
        .returning();
      return newStoreHours;
    }
  }

  // Restaurant Settings operations
  async getRestaurantSettings(): Promise<RestaurantSettings | undefined> {
    const [settings] = await db
      .select()
      .from(restaurantSettings)
      .limit(1);
    return settings;
  }

  async updateRestaurantSettings(settingsData: Partial<InsertRestaurantSettings>): Promise<RestaurantSettings | undefined> {
    const existing = await this.getRestaurantSettings();
    
    if (existing) {
      const [updatedSettings] = await db
        .update(restaurantSettings)
        .set({
          ...settingsData,
          updatedAt: new Date()
        })
        .where(eq(restaurantSettings.id, existing.id))
        .returning();
      return updatedSettings;
    } else {
      const [newSettings] = await db
        .insert(restaurantSettings)
        .values({
          ...settingsData,
          restaurantName: settingsData.restaurantName || "Favilla's NY Pizza",
          address: settingsData.address || "123 Main Street, New York, NY 10001",
          phone: settingsData.phone || "(555) 123-4567",
          email: settingsData.email || "info@favillas.com",
          website: settingsData.website || "https://favillas.com",
          currency: settingsData.currency || "USD",
          timezone: settingsData.timezone || "America/New_York",
          deliveryFee: settingsData.deliveryFee || "3.99",
          minimumOrder: settingsData.minimumOrder || "15.00",
          autoAcceptOrders: settingsData.autoAcceptOrders !== undefined ? settingsData.autoAcceptOrders : true,
          sendOrderNotifications: settingsData.sendOrderNotifications !== undefined ? settingsData.sendOrderNotifications : true,
          sendCustomerNotifications: settingsData.sendCustomerNotifications !== undefined ? settingsData.sendCustomerNotifications : true,
          outOfStockEnabled: settingsData.outOfStockEnabled !== undefined ? settingsData.outOfStockEnabled : false,
          deliveryEnabled: settingsData.deliveryEnabled !== undefined ? settingsData.deliveryEnabled : true,
          pickupEnabled: settingsData.pickupEnabled !== undefined ? settingsData.pickupEnabled : true,
          orderSchedulingEnabled: settingsData.orderSchedulingEnabled !== undefined ? settingsData.orderSchedulingEnabled : false,
          maxAdvanceOrderHours: settingsData.maxAdvanceOrderHours || 24
        })
        .returning();
      return newSettings;
    }
  }

  // Choice Group operations
  async getAllChoiceGroups(): Promise<ChoiceGroup[]> {
    return await db.select().from(choiceGroups);
  }

  async getChoiceGroup(id: number): Promise<ChoiceGroup | undefined> {
    const [choiceGroup] = await db.select().from(choiceGroups).where(eq(choiceGroups.id, id));
    return choiceGroup;
  }

  async createChoiceGroup(choiceGroup: InsertChoiceGroup): Promise<ChoiceGroup> {
    const [newChoiceGroup] = await db
      .insert(choiceGroups)
      .values({
        ...choiceGroup,
        updatedAt: new Date()
      })
      .returning();
    return newChoiceGroup;
  }

  async updateChoiceGroup(id: number, choiceGroupData: Partial<InsertChoiceGroup>): Promise<ChoiceGroup | undefined> {
    const [updatedChoiceGroup] = await db
      .update(choiceGroups)
      .set({
        ...choiceGroupData,
        updatedAt: new Date()
      })
      .where(eq(choiceGroups.id, id))
      .returning();
    return updatedChoiceGroup;
  }

  async deleteChoiceGroup(id: number): Promise<boolean> {
    const result = await db.delete(choiceGroups).where(eq(choiceGroups.id, id));
    return result.rowCount > 0;
  }

  // Choice Item operations
  async getAllChoiceItems(): Promise<ChoiceItem[]> {
    return await db.select().from(choiceItems);
  }

  async getChoiceItem(id: number): Promise<ChoiceItem | undefined> {
    const [choiceItem] = await db.select().from(choiceItems).where(eq(choiceItems.id, id));
    return choiceItem;
  }

  async createChoiceItem(choiceItem: InsertChoiceItem): Promise<ChoiceItem> {
    const [newChoiceItem] = await db
      .insert(choiceItems)
      .values({
        ...choiceItem,
        updatedAt: new Date()
      })
      .returning();
    return newChoiceItem;
  }

  async updateChoiceItem(id: number, choiceItemData: Partial<InsertChoiceItem>): Promise<ChoiceItem | undefined> {
    const [updatedChoiceItem] = await db
      .update(choiceItems)
      .set({
        ...choiceItemData,
        updatedAt: new Date()
      })
      .where(eq(choiceItems.id, id))
      .returning();
    return updatedChoiceItem;
  }

  async deleteChoiceItem(id: number): Promise<boolean> {
    const result = await db.delete(choiceItems).where(eq(choiceItems.id, id));
    return result.rowCount > 0;
  }

  // Menu Item Choice Group operations
  async getAllMenuItemChoiceGroups(): Promise<MenuItemChoiceGroup[]> {
    return await db.select().from(menuItemChoiceGroups);
  }

  async getMenuItemChoiceGroup(id: number): Promise<MenuItemChoiceGroup | undefined> {
    const [menuItemChoiceGroup] = await db.select().from(menuItemChoiceGroups).where(eq(menuItemChoiceGroups.id, id));
    return menuItemChoiceGroup;
  }

  async createMenuItemChoiceGroup(menuItemChoiceGroup: InsertMenuItemChoiceGroup): Promise<MenuItemChoiceGroup> {
    const [newMenuItemChoiceGroup] = await db
      .insert(menuItemChoiceGroups)
      .values({
        ...menuItemChoiceGroup,
        updatedAt: new Date()
      })
      .returning();
    return newMenuItemChoiceGroup;
  }

  async updateMenuItemChoiceGroup(id: number, menuItemChoiceGroupData: Partial<InsertMenuItemChoiceGroup>): Promise<MenuItemChoiceGroup | undefined> {
    const [updatedMenuItemChoiceGroup] = await db
      .update(menuItemChoiceGroups)
      .set({
        ...menuItemChoiceGroupData,
        updatedAt: new Date()
      })
      .where(eq(menuItemChoiceGroups.id, id))
      .returning();
    return updatedMenuItemChoiceGroup;
  }

  async deleteMenuItemChoiceGroup(id: number): Promise<boolean> {
    const result = await db.delete(menuItemChoiceGroups).where(eq(menuItemChoiceGroups.id, id));
    return result.rowCount > 0;
  }

  // Category Choice Group operations
  async getAllCategoryChoiceGroups(): Promise<CategoryChoiceGroup[]> {
    return await db.select().from(categoryChoiceGroups);
  }

  async getCategoryChoiceGroup(id: number): Promise<CategoryChoiceGroup | undefined> {
    const [categoryChoiceGroup] = await db.select().from(categoryChoiceGroups).where(eq(categoryChoiceGroups.id, id));
    return categoryChoiceGroup;
  }

  async createCategoryChoiceGroup(categoryChoiceGroup: InsertCategoryChoiceGroup): Promise<CategoryChoiceGroup> {
    const [newCategoryChoiceGroup] = await db
      .insert(categoryChoiceGroups)
      .values(categoryChoiceGroup)
      .returning();
    return newCategoryChoiceGroup;
  }

  async updateCategoryChoiceGroup(id: number, categoryChoiceGroupData: Partial<InsertCategoryChoiceGroup>): Promise<CategoryChoiceGroup | undefined> {
    const [updatedCategoryChoiceGroup] = await db
      .update(categoryChoiceGroups)
      .set({
        ...categoryChoiceGroupData,
        updatedAt: new Date()
      })
      .where(eq(categoryChoiceGroups.id, id))
      .returning();
    return updatedCategoryChoiceGroup;
  }

  async deleteCategoryChoiceGroup(id: number): Promise<boolean> {
    const result = await db.delete(categoryChoiceGroups).where(eq(categoryChoiceGroups.id, id));
    return result.rowCount > 0;
  }

  // Tax operations
  async getAllTaxCategories(): Promise<TaxCategory[]> {
    return Array.from(this.taxCategories.values());
  }

  async getTaxCategory(id: number): Promise<TaxCategory | undefined> {
    return this.taxCategories.get(id);
  }

  async createTaxCategory(taxCategory: InsertTaxCategory): Promise<TaxCategory> {
    const id = this.taxCategoryIdCounter++;
    const createdAt = new Date();
    const newTaxCategory: TaxCategory = {
      ...taxCategory,
      id,
      createdAt,
      updatedAt: new Date()
    };
    this.taxCategories.set(id, newTaxCategory);
    return newTaxCategory;
  }

  async updateTaxCategory(id: number, taxCategoryData: Partial<InsertTaxCategory>): Promise<TaxCategory | undefined> {
    const existingTaxCategory = this.taxCategories.get(id);
    if (!existingTaxCategory) {
      return undefined;
    }
    
    const updatedTaxCategory: TaxCategory = {
      ...existingTaxCategory,
      ...taxCategoryData,
      updatedAt: new Date()
    };
    
    this.taxCategories.set(id, updatedTaxCategory);
    return updatedTaxCategory;
  }

  async deleteTaxCategory(id: number): Promise<boolean> {
    const existingTaxCategory = this.taxCategories.get(id);
    if (!existingTaxCategory) {
      return false;
    }
    
    this.taxCategories.delete(id);
    return true;
  }

  async getTaxSettings(): Promise<TaxSettings | undefined> {
    return this.taxSettings;
  }

  async updateTaxSettings(settingsData: Partial<InsertTaxSettings>): Promise<TaxSettings | undefined> {
    this.taxSettings = {
      ...this.taxSettings,
      ...settingsData,
      updatedAt: new Date()
    };
    return this.taxSettings;
  }

  // Time Tracking operations
  async createTimeEntry(data: any): Promise<any> {
    // For now, return a placeholder - needs to be implemented with database queries
    return { id: 1, ...data };
  }

  async updateTimeEntry(id: number, data: any): Promise<any> {
    // For now, return a placeholder - needs to be implemented with database queries
    return { id, ...data };
  }

  async getTimeEntry(id: number): Promise<any> {
    // For now, return a placeholder - needs to be implemented with database queries
    return null;
  }

  async getActiveTimeEntry(employeeId: number): Promise<any> {
    // For now, return a placeholder - needs to be implemented with database queries
    return null;
  }

  async getEmployeeTimeSummary(employeeId: number, startDate: string, endDate: string): Promise<any> {
    // For now, return a placeholder - needs to be implemented with database queries
    return { timeEntries: [], summary: {} };
  }

  // Schedule operations  
  async createEmployeeSchedule(data: any): Promise<any> {
    try {
      log(`Creating schedule for employee ${data.employeeId} on ${data.scheduleDate} from ${data.startTime} to ${data.endTime}`, 'server');
      
      const result = await db
        .insert(employeeSchedules)
        .values({
          employeeId: data.employeeId,
          scheduleDate: data.scheduleDate, // Keep as string in YYYY-MM-DD format
          startTime: data.startTime,
          endTime: data.endTime,
          position: data.position,
          isMandatory: data.isMandatory,
          createdBy: data.createdBy,
          notes: data.notes,
          status: 'scheduled',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      const newSchedule = result[0];
      log(`Schedule created successfully with ID ${newSchedule.id} for employee ${data.employeeId}`, 'server');
      return newSchedule;
    } catch (error) {
      log(`Error creating employee schedule: ${error}`, 'server');
      throw error;
    }
  }

  async getEmployeeSchedules(startDate: string, endDate: string, employeeId?: number): Promise<any[]> {
    try {
      log(`Fetching schedules for date range: ${startDate} to ${endDate}${employeeId ? ` for employee ${employeeId}` : ''}`, 'server');
      
      // First, let's check if there are ANY schedules in the table
      const allSchedulesCount = await db.select().from(employeeSchedules);
      log(`Total schedules in database: ${allSchedulesCount.length}`, 'server');
      if (allSchedulesCount.length > 0) {
        log(`Sample schedule dates: ${allSchedulesCount.slice(0, 3).map(s => s.scheduleDate).join(', ')}`, 'server');
      }
      
      let whereConditions = [
        sql`${employeeSchedules.scheduleDate} >= ${startDate}`,
        sql`${employeeSchedules.scheduleDate} <= ${endDate}`
      ];

      if (employeeId) {
        whereConditions.push(eq(employeeSchedules.employeeId, employeeId));
      }

      const query = db
        .select({
          id: employeeSchedules.id,
          employeeId: employeeSchedules.employeeId,
          scheduleDate: employeeSchedules.scheduleDate,
          startTime: employeeSchedules.startTime,
          endTime: employeeSchedules.endTime,
          position: employeeSchedules.position,
          isMandatory: employeeSchedules.isMandatory,
          notes: employeeSchedules.notes,
          status: employeeSchedules.status,
          employeeName: sql`CONCAT(${users.firstName}, ' ', ${users.lastName})`.as('employeeName'),
        })
        .from(employeeSchedules)
        .leftJoin(users, eq(employeeSchedules.employeeId, users.id))
        .where(and(...whereConditions))
        .orderBy(employeeSchedules.scheduleDate, employeeSchedules.startTime);

      const result = await query;
      log(`Found ${result.length} schedules`, 'server');
      
      // Add debug logging to see actual data
      if (result.length > 0) {
        result.forEach((schedule, index) => {
          log(`Schedule ${index + 1}: Employee ${schedule.employeeId} (${schedule.employeeName}) on ${schedule.scheduleDate} from ${schedule.startTime} to ${schedule.endTime}`, 'server');
        });
      }
      
      return result;
    } catch (error) {
      log(`Error fetching employee schedules: ${error}`, 'server');
      return [];
    }
  }

  async getTodaysSchedule(employeeId: number): Promise<any> {
    try {
      const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
      log(`Fetching today's schedule for employee ${employeeId} on ${today}`, 'server');
      
      const [schedule] = await db
        .select({
          id: employeeSchedules.id,
          employeeId: employeeSchedules.employeeId,
          scheduleDate: employeeSchedules.scheduleDate,
          startTime: employeeSchedules.startTime,
          endTime: employeeSchedules.endTime,
          position: employeeSchedules.position,
          isMandatory: employeeSchedules.isMandatory,
          notes: employeeSchedules.notes,
          status: employeeSchedules.status,
        })
        .from(employeeSchedules)
        .where(
          and(
            eq(employeeSchedules.employeeId, employeeId),
            sql`${employeeSchedules.scheduleDate} = ${today}`,
            eq(employeeSchedules.status, 'scheduled')
          )
        )
        .limit(1);

      log(`Today's schedule result: ${schedule ? 'found' : 'not found'}`, 'server');
      return schedule || null;
    } catch (error) {
      log(`Error fetching today's schedule: ${error}`, 'server');
      return null;
    }
  }

  async checkScheduleConflicts(employeeId: number, date: string, startTime: string, endTime: string): Promise<any[]> {
    // For now, return a placeholder - needs to be implemented with database queries
    return [];
  }

  async updateEmployeeSchedule(scheduleId: number, data: any): Promise<any> {
    try {
      log(`Updating schedule ${scheduleId} with data: ${JSON.stringify(data)}`, 'server');
      
      const result = await db
        .update(employeeSchedules)
        .set({
          employeeId: data.employeeId,
          scheduleDate: data.scheduleDate,
          startTime: data.startTime,
          endTime: data.endTime,
          position: data.position,
          isMandatory: data.isMandatory,
          notes: data.notes,
          updatedAt: new Date()
        })
        .where(eq(employeeSchedules.id, scheduleId))
        .returning();

      if (result.length > 0) {
        log(`Schedule ${scheduleId} updated successfully`, 'server');
        return result[0];
      } else {
        log(`Schedule ${scheduleId} not found for update`, 'server');
        return null;
      }
    } catch (error) {
      log(`Error updating schedule ${scheduleId}: ${error}`, 'server');
      throw error;
    }
  }

  async deleteEmployeeSchedule(scheduleId: number): Promise<boolean> {
    try {
      log(`Deleting schedule with ID ${scheduleId}`, 'server');
      
      const result = await db
        .delete(employeeSchedules)
        .where(eq(employeeSchedules.id, scheduleId))
        .returning();

      if (result.length > 0) {
        log(`Schedule ${scheduleId} deleted successfully`, 'server');
        return true;
      } else {
        log(`Schedule ${scheduleId} not found`, 'server');
        return false;
      }
    } catch (error) {
      log(`Error deleting schedule ${scheduleId}: ${error}`, 'server');
      throw error;
    }
  }

  // Alert operations
  async createScheduleAlert(data: any): Promise<any> {
    // For now, return a placeholder - needs to be implemented with database queries
    return { id: 1, ...data };
  }

  async getScheduleAlerts(unreadOnly: boolean): Promise<any[]> {
    // For now, return a placeholder - needs to be implemented with database queries
    return [];
  }

  async markAlertAsRead(alertId: number): Promise<void> {
    // For now, return a placeholder - needs to be implemented with database queries
  }

  // Payroll operations
  async getPayrollSummary(payPeriodId?: number, startDate?: string, endDate?: string): Promise<any> {
    // For now, return a placeholder - needs to be implemented with database queries
    return { employees: [], totals: {} };
  }

  // Tip distribution operations
  async getTipSettings(): Promise<any> {
    const result = await db.execute("SELECT * FROM tip_settings ORDER BY id DESC LIMIT 1");
    return result.rows[0] || {
      delivery_tip_percentage_to_employees: 25.00,
      pickup_tip_split_enabled: true,
      delivery_tip_split_enabled: true
    };
  }

  async updateTipSettings(settings: any): Promise<any> {
    const result = await db.execute(`
      UPDATE tip_settings 
      SET delivery_tip_percentage_to_employees = $1,
          pickup_tip_split_enabled = $2,
          delivery_tip_split_enabled = $3,
          updated_at = now()
      WHERE id = (SELECT id FROM tip_settings ORDER BY id DESC LIMIT 1)
      RETURNING *
    `, [
      settings.deliveryTipPercentageToEmployees,
      settings.pickupTipSplitEnabled,
      settings.deliveryTipSplitEnabled
    ]);
    return result.rows[0];
  }

  async getClockedInEmployees(): Promise<any[]> {
    const result = await db.execute(`
      SELECT DISTINCT u.id, u.username, u.first_name, u.last_name, u.role
      FROM users u
      INNER JOIN time_clock_entries tce ON u.id = tce.employee_id
      WHERE u.role = 'employee' 
        AND tce.clock_out_time IS NULL
        AND tce.status = 'active'
        AND u.is_active = true
    `);
    return result.rows;
  }

  async createTipDistribution(tipDistribution: any): Promise<any> {
    const result = await db.execute(`
      INSERT INTO tip_distributions (order_id, employee_id, amount, order_type, original_tip_amount)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [
      tipDistribution.orderId,
      tipDistribution.employeeId,
      tipDistribution.amount,
      tipDistribution.orderType,
      tipDistribution.originalTipAmount
    ]);
    return result.rows[0];
  }

  async distributeTips(orderId: number, tipAmount: number, orderType: string): Promise<void> {
    if (tipAmount <= 0) return;

    const tipSettings = await this.getTipSettings();
    const clockedInEmployees = await this.getClockedInEmployees();

    if (clockedInEmployees.length === 0) {
      console.log('No clocked-in employees to distribute tips to');
      return;
    }

    let amountToDistribute = tipAmount;

    // For delivery orders, only distribute the configured percentage to employees
    if (orderType === 'delivery' && tipSettings.delivery_tip_split_enabled) {
      const percentageToEmployees = parseFloat(tipSettings.delivery_tip_percentage_to_employees) / 100;
      amountToDistribute = tipAmount * percentageToEmployees;
    } else if (orderType === 'pickup' && !tipSettings.pickup_tip_split_enabled) {
      return; // Don't distribute pickup tips if disabled
    } else if (orderType === 'delivery' && !tipSettings.delivery_tip_split_enabled) {
      return; // Don't distribute delivery tips if disabled
    }

    // Split the amount evenly among clocked-in employees
    const tipPerEmployee = amountToDistribute / clockedInEmployees.length;

    // Create tip distribution records for each employee
    for (const employee of clockedInEmployees) {
      await this.createTipDistribution({
        orderId,
        employeeId: employee.id,
        amount: tipPerEmployee,
        orderType,
        originalTipAmount: tipAmount
      });
    }

    console.log(`Distributed $${amountToDistribute.toFixed(2)} in tips among ${clockedInEmployees.length} employees`);
  }

  // Receipt Template operations
  async getReceiptTemplate(templateId: string): Promise<any> {
    try {
      const result = await db.execute(
        'SELECT * FROM receipt_templates WHERE template_id = $1',
        [templateId]
      );
      return result.rows[0] ? JSON.parse(result.rows[0].template_data) : null;
    } catch (error) {
      console.error('Error getting receipt template:', error);
      return null;
    }
  }

  async saveReceiptTemplate(templateId: string, template: any): Promise<any> {
    try {
      const result = await db.execute(`
        INSERT INTO receipt_templates (template_id, template_data, updated_at)
        VALUES ($1, $2, now())
        ON CONFLICT (template_id) 
        DO UPDATE SET template_data = $2, updated_at = now()
        RETURNING *
      `, [templateId, JSON.stringify(template)]);
      return result.rows[0] ? JSON.parse(result.rows[0].template_data) : template;
    } catch (error) {
      console.error('Error saving receipt template:', error);
      return template; // Return the template as fallback
    }
  }

  async getAllReceiptTemplates(): Promise<any> {
    try {
      const result = await db.execute('SELECT * FROM receipt_templates');
      const templates: any = {};
      for (const row of result.rows) {
        templates[row.template_id] = JSON.parse(row.template_data);
      }
      return templates;
    } catch (error) {
      console.error('Error getting all receipt templates:', error);
      return {};
    }
  }

  // System settings operations
  async getSystemSetting(key: string): Promise<any> {
    try {
      const result = await db.execute(
        'SELECT * FROM system_settings WHERE setting_key = $1',
        [key]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error getting system setting:', error);
      return null;
    }
  }

  async updateSystemSetting(key: string, value: string): Promise<any> {
    try {
      const result = await db.execute(`
        UPDATE system_settings 
        SET setting_value = $1, updated_at = now()
        WHERE setting_key = $2
        RETURNING *
      `, [value, key]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('Error updating system setting:', error);
      return null;
    }
  }

  async getAllSystemSettings(): Promise<any[]> {
    try {
      const result = await db.execute(`
        SELECT * FROM system_settings 
        ORDER BY category, display_name
      `);
      return result.rows;
    } catch (error) {
      console.error('Error getting all system settings:', error);
      return [];
    }
  }

  async getSystemSettingsByCategory(category: string): Promise<any[]> {
    try {
      const result = await db.execute(`
        SELECT * FROM system_settings 
        WHERE category = $1 
        ORDER BY display_name
      `, [category]);
      return result.rows;
    } catch (error) {
      console.error('Error getting system settings by category:', error);
      return [];
    }
  }


  // Printer Configuration operations
  async getAllPrinterConfigs(): Promise<PrinterConfig[]> {
    try {
      const result = await db.select()
        .from(printerConfig)
        .orderBy(asc(printerConfig.isPrimary), asc(printerConfig.name));
      return result;
    } catch (error) {
      console.error('Error getting all printer configurations:', error);
      return [];
    }
  }

  async getPrinterConfig(id: number): Promise<PrinterConfig | undefined> {
    try {
      const result = await db.select()
        .from(printerConfig)
        .where(eq(printerConfig.id, id))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting printer configuration:', error);
      return undefined;
    }
  }

  async getPrimaryPrinterConfig(): Promise<PrinterConfig | undefined> {
    try {
      const result = await db.select()
        .from(printerConfig)
        .where(and(
          eq(printerConfig.isPrimary, true),
          eq(printerConfig.isActive, true)
        ))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting primary printer configuration:', error);
      return undefined;
    }
  }

  async createPrinterConfig(config: InsertPrinterConfig): Promise<PrinterConfig> {
    try {
      const result = await db.insert(printerConfig)
        .values(config)
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error creating printer configuration:', error);
      throw error;
    }
  }

  async updatePrinterConfig(id: number, config: Partial<InsertPrinterConfig>): Promise<PrinterConfig | undefined> {
    try {
      const result = await db.update(printerConfig)
        .set({ ...config, updatedAt: new Date() })
        .where(eq(printerConfig.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating printer configuration:', error);
      return undefined;
    }
  }

  async deletePrinterConfig(id: number): Promise<boolean> {
    try {
      // Don't allow deleting the primary printer
      const printerToDelete = await this.getPrinterConfig(id);
      if (printerToDelete?.isPrimary) {
        throw new Error('Cannot delete primary printer configuration');
      }

      const result = await db.delete(printerConfig)
        .where(eq(printerConfig.id, id));
      return result.rowCount > 0;
    } catch (error) {
      console.error('Error deleting printer configuration:', error);
      return false;
    }
  }

  async setPrimaryPrinter(id: number): Promise<boolean> {
    try {
      await db.transaction(async (tx) => {
        // First, set all printers to non-primary
        await tx.update(printerConfig)
          .set({ isPrimary: false, updatedAt: new Date() })
          .where(eq(printerConfig.isPrimary, true));

        // Then set the specified printer as primary
        await tx.update(printerConfig)
          .set({ isPrimary: true, isActive: true, updatedAt: new Date() })
          .where(eq(printerConfig.id, id));
      });
      return true;
    } catch (error) {
      console.error('Error setting primary printer:', error);
      return false;
    }
  }

  async updatePrinterConnectionStatus(id: number, status: 'connected' | 'disconnected' | 'error' | 'unknown', error?: string): Promise<PrinterConfig | undefined> {
    try {
      const updateData: any = {
        connectionStatus: status,
        updatedAt: new Date()
      };

      if (status === 'connected') {
        updateData.lastConnected = new Date();
        updateData.lastError = null;
      } else if (status === 'error' && error) {
        updateData.lastError = error;
      }

      const result = await db.update(printerConfig)
        .set(updateData)
        .where(eq(printerConfig.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating printer connection status:', error);
      return undefined;
    }
  }
}

// Use database storage to persist data
export const storage = new DatabaseStorage();

