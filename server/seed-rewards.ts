import { db } from "./db";
import { rewards, pointsRewards, userPoints } from "@shared/schema";

async function seedRewards() {
  try {
    console.log("🌱 Seeding rewards data...");

    // Clear existing rewards
    await db.delete(rewards);
    await db.delete(pointsRewards);
    await db.delete(userPoints);

    // Insert sample rewards
    const sampleRewards = [
      {
        name: "10% Off Any Order",
        description: "Get 10% off your entire order",
        type: "discount",
        pointsRequired: 100,
        discount: 10,
        discountType: "percentage",
        minOrderAmount: "15.00",
        isActive: true,
        createdAt: new Date()
      },
      {
        name: "Free Medium Pizza",
        description: "Get a free medium pizza of your choice",
        type: "free_item",
        pointsRequired: 250,
        freeItem: "Medium Pizza",
        isActive: true,
        createdAt: new Date()
      },
      {
        name: "Free Delivery",
        description: "Free delivery on your next order",
        type: "free_delivery",
        pointsRequired: 75,
        isActive: true,
        createdAt: new Date()
      },
      {
        name: "20% Off Large Orders",
        description: "Get 20% off orders over $30",
        type: "discount",
        pointsRequired: 200,
        discount: 20,
        discountType: "percentage",
        minOrderAmount: "30.00",
        isActive: true,
        createdAt: new Date()
      },
      {
        name: "Free Appetizer",
        description: "Get a free appetizer with any order",
        type: "free_item",
        pointsRequired: 150,
        freeItem: "Appetizer",
        isActive: true,
        createdAt: new Date()
      },
      {
        name: "Priority Order",
        description: "Your order gets priority processing",
        type: "priority",
        pointsRequired: 50,
        isActive: true,
        createdAt: new Date()
      }
    ];

    // Insert rewards
    for (const reward of sampleRewards) {
      await db.insert(rewards).values(reward);
    }

    // Insert points rewards (for the points system)
    const pointsRewardsData = [
      {
        name: "10% Off Any Order",
        description: "Get 10% off your entire order",
        pointsRequired: 100,
        rewardType: "discount",
        rewardValue: "10.00",
        rewardDescription: "10% discount on total order",
        isActive: true,
        createdAt: new Date()
      },
      {
        name: "Free Medium Pizza",
        description: "Get a free medium pizza of your choice",
        pointsRequired: 250,
        rewardType: "free_item",
        rewardValue: "15.00",
        rewardDescription: "Free medium pizza",
        isActive: true,
        createdAt: new Date()
      },
      {
        name: "Free Delivery",
        description: "Free delivery on your next order",
        pointsRequired: 75,
        rewardType: "free_delivery",
        rewardValue: "3.99",
        rewardDescription: "Free delivery fee",
        isActive: true,
        createdAt: new Date()
      },
      {
        name: "20% Off Large Orders",
        description: "Get 20% off orders over $30",
        pointsRequired: 200,
        rewardType: "discount",
        rewardValue: "20.00",
        rewardDescription: "20% discount on orders over $30",
        isActive: true,
        createdAt: new Date()
      },
      {
        name: "Free Appetizer",
        description: "Get a free appetizer with any order",
        pointsRequired: 150,
        rewardType: "free_item",
        rewardValue: "8.00",
        rewardDescription: "Free appetizer",
        isActive: true,
        createdAt: new Date()
      },
      {
        name: "Priority Order",
        description: "Your order gets priority processing",
        pointsRequired: 50,
        rewardType: "priority",
        rewardValue: "5.00",
        rewardDescription: "Priority order processing",
        isActive: true,
        createdAt: new Date()
      }
    ];

    // Insert points rewards
    for (const reward of pointsRewardsData) {
      await db.insert(pointsRewards).values(reward);
    }

    // Give some initial points to existing users
    const initialUserPoints = [
      {
        userId: 1, // admin user
        points: 500,
        totalEarned: 500,
        totalRedeemed: 0,
        lastEarnedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId: 2, // customer user
        points: 150,
        totalEarned: 150,
        totalRedeemed: 0,
        lastEarnedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Insert user points
    for (const userPoint of initialUserPoints) {
      await db.insert(userPoints).values(userPoint);
    }

    console.log("✅ Rewards data seeded successfully!");
    console.log(`📊 Created ${sampleRewards.length} rewards`);
    console.log(`📊 Created ${pointsRewardsData.length} points rewards`);
    console.log(`👥 Added initial points to ${initialUserPoints.length} users`);

  } catch (error) {
    console.error("❌ Error seeding rewards:", error);
  } finally {
    process.exit(0);
  }
}

seedRewards();


