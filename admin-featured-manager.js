import { db } from "./server/db.js";
import { menuItems } from "./shared/schema.js";
import { eq, or } from "drizzle-orm";

// Admin tool to manage featured items
async function manageFeaturedItems() {
  try {
    console.log("🍕 Featured Items Manager\n");
    
    // Show current featured items
    console.log("📋 Current Featured Items:");
    const featuredItems = await db
      .select()
      .from(menuItems)
      .where(or(eq(menuItems.isPopular, true), eq(menuItems.isBestSeller, true)));
    
    if (featuredItems.length === 0) {
      console.log("❌ No featured items set");
    } else {
      featuredItems.forEach((item, index) => {
        const badge = item.isBestSeller ? "🏆 BEST SELLER" : "⭐ POPULAR";
        console.log(`${index + 1}. ${item.name} - ${badge} ($${item.basePrice})`);
      });
    }
    
    console.log("\n📊 All Available Menu Items:");
    const allItems = await db.select().from(menuItems);
    allItems.forEach((item, index) => {
      const status = item.isBestSeller ? "🏆" : item.isPopular ? "⭐" : "⚪";
      console.log(`${index + 1}. ${status} ${item.name} ($${item.basePrice})`);
    });
    
    console.log("\n💡 To manage featured items:");
    console.log("1. Modify this script to set specific items as featured");
    console.log("2. Use the admin panel in your web app");
    console.log("3. Directly update the database");
    
    console.log("\n🔧 Example: To set a specific item as featured:");
    console.log(`// Set item with ID 1 as best seller:`);
    console.log(`await db.update(menuItems).set({ isBestSeller: true }).where(eq(menuItems.id, 1));`);
    
    process.exit(0);
  } catch (error) {
    console.error("Error managing featured items:", error);
    process.exit(1);
  }
}

manageFeaturedItems();