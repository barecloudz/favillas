import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and } from 'drizzle-orm';
import { userPoints, pointsTransactions, loyaltyProgram, orders } from '../../shared/schema';

interface RewardPointsConfig {
  pointsPerDollar: number;
  bonusPointsThreshold: number;
  bonusPointsMultiplier: number;
  pointsForSignup: number;
  pointsForFirstOrder: number;
}

// Database connection utility
function getRewardsDB() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });
  
  return drizzle(sql, { 
    schema: { userPoints, pointsTransactions, loyaltyProgram, orders } 
  });
}

/**
 * Get the current loyalty program configuration
 */
export async function getLoyaltyProgramConfig(): Promise<RewardPointsConfig> {
  const db = getRewardsDB();
  
  const [config] = await db
    .select()
    .from(loyaltyProgram)
    .where(eq(loyaltyProgram.isActive, true))
    .limit(1);

  if (!config) {
    // Return default configuration if none exists
    return {
      pointsPerDollar: 1,
      bonusPointsThreshold: 50,
      bonusPointsMultiplier: 1.5,
      pointsForSignup: 100,
      pointsForFirstOrder: 50,
    };
  }

  return {
    pointsPerDollar: parseFloat(config.pointsPerDollar),
    bonusPointsThreshold: parseFloat(config.bonusPointsThreshold),
    bonusPointsMultiplier: parseFloat(config.bonusPointsMultiplier),
    pointsForSignup: config.pointsForSignup,
    pointsForFirstOrder: config.pointsForFirstOrder,
  };
}

/**
 * Calculate points to be earned for an order
 */
export function calculatePointsForOrder(orderAmount: number, config: RewardPointsConfig): number {
  let points = Math.floor(orderAmount * config.pointsPerDollar);
  
  // Apply bonus multiplier for large orders
  if (orderAmount >= config.bonusPointsThreshold) {
    points = Math.floor(points * config.bonusPointsMultiplier);
  }
  
  return points;
}

/**
 * Check if this is the user's first order
 */
export async function isFirstOrder(userId: number): Promise<boolean> {
  const db = getRewardsDB();
  
  const orderCount = await db
    .select({ count: orders.id })
    .from(orders)
    .where(and(
      eq(orders.userId, userId),
      eq(orders.status, 'completed')
    ));
  
  return orderCount.length === 0;
}

/**
 * Award points for order completion - main business logic
 */
export async function awardPointsForOrderCompletion(
  userId: number, 
  orderId: number, 
  orderAmount: number
): Promise<{ pointsAwarded: number; isFirstOrder: boolean; bonusApplied: boolean }> {
  const db = getRewardsDB();
  
  // Get loyalty program configuration
  const config = await getLoyaltyProgramConfig();
  
  // Check if this is user's first order
  const firstOrder = await isFirstOrder(userId);
  
  // Calculate base points for the order
  let basePoints = calculatePointsForOrder(orderAmount, config);
  let totalPointsAwarded = basePoints;
  let bonusApplied = orderAmount >= config.bonusPointsThreshold;
  
  // Add first order bonus if applicable
  if (firstOrder) {
    totalPointsAwarded += config.pointsForFirstOrder;
  }

  // Start transaction to ensure data consistency
  const sql = postgres(process.env.DATABASE_URL!, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });

  await sql.begin(async (sql) => {
    const transactionDb = drizzle(sql, { 
      schema: { userPoints, pointsTransactions, loyaltyProgram, orders } 
    });

    // Get or create user points record
    let [userPointsData] = await transactionDb
      .select()
      .from(userPoints)
      .where(eq(userPoints.userId, userId))
      .limit(1);

    if (!userPointsData) {
      // Create new points record for user
      [userPointsData] = await transactionDb
        .insert(userPoints)
        .values({
          userId,
          points: 0,
          totalEarned: 0,
          totalRedeemed: 0,
        })
        .returning();
    }

    // Update user points
    const newPoints = userPointsData.points + totalPointsAwarded;
    const newTotalEarned = userPointsData.totalEarned + totalPointsAwarded;

    await transactionDb
      .update(userPoints)
      .set({
        points: newPoints,
        totalEarned: newTotalEarned,
        lastEarnedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userPoints.userId, userId));

    // Create base points transaction
    await transactionDb
      .insert(pointsTransactions)
      .values({
        userId,
        orderId,
        type: 'earned',
        points: basePoints,
        description: `Points earned for order #${orderId}${bonusApplied ? ` (bonus applied for $${orderAmount}+ order)` : ''}`,
        orderAmount: orderAmount.toString(),
      });

    // Create first order bonus transaction if applicable
    if (firstOrder && config.pointsForFirstOrder > 0) {
      await transactionDb
        .insert(pointsTransactions)
        .values({
          userId,
          orderId,
          type: 'first_order',
          points: config.pointsForFirstOrder,
          description: `First order bonus for order #${orderId}`,
          orderAmount: orderAmount.toString(),
        });
    }
  });

  console.log(`Awarded ${totalPointsAwarded} points to user ${userId} for order ${orderId} ($${orderAmount})`);
  
  return {
    pointsAwarded: totalPointsAwarded,
    isFirstOrder: firstOrder,
    bonusApplied,
  };
}

/**
 * Award signup bonus points
 */
export async function awardSignupPoints(userId: number): Promise<number> {
  const db = getRewardsDB();
  const config = await getLoyaltyProgramConfig();
  
  if (config.pointsForSignup === 0) {
    return 0;
  }

  // Get or create user points record
  let [userPointsData] = await db
    .select()
    .from(userPoints)
    .where(eq(userPoints.userId, userId))
    .limit(1);

  if (!userPointsData) {
    // Create new points record with signup bonus
    await db
      .insert(userPoints)
      .values({
        userId,
        points: config.pointsForSignup,
        totalEarned: config.pointsForSignup,
        totalRedeemed: 0,
        lastEarnedAt: new Date(),
      });
  } else {
    // Update existing record
    await db
      .update(userPoints)
      .set({
        points: userPointsData.points + config.pointsForSignup,
        totalEarned: userPointsData.totalEarned + config.pointsForSignup,
        lastEarnedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userPoints.userId, userId));
  }

  // Create transaction record
  await db
    .insert(pointsTransactions)
    .values({
      userId,
      type: 'signup',
      points: config.pointsForSignup,
      description: 'Welcome bonus for new account',
    });

  console.log(`Awarded ${config.pointsForSignup} signup points to user ${userId}`);
  
  return config.pointsForSignup;
}

/**
 * Validate that a redemption is possible
 */
export async function validateRedemption(
  userId: number, 
  rewardId: number, 
  requiredPoints: number
): Promise<{ valid: boolean; error?: string }> {
  const db = getRewardsDB();
  
  // Check user's current points
  const [userPointsData] = await db
    .select()
    .from(userPoints)
    .where(eq(userPoints.userId, userId))
    .limit(1);

  if (!userPointsData) {
    return { valid: false, error: 'User points record not found' };
  }

  if (userPointsData.points < requiredPoints) {
    return { 
      valid: false, 
      error: `Insufficient points. Need ${requiredPoints}, have ${userPointsData.points}` 
    };
  }

  return { valid: true };
}

export { RewardPointsConfig };