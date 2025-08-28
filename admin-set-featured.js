import { db } from "./server/db.js";
import { menuItems } from "./shared/schema.js";
import { eq } from "drizzle-orm";

// Script to easily set featured items for homepage
async function setFeaturedItems() {
  try {
    console.log("Setting featured items...");
    
    // Get all menu items
    const allItems = await db.select().from(menuItems);
    console.log(`Found ${allItems.length} menu items`);
    
    if (allItems.length === 0) {
      console.log("No menu items found. Add some menu items first.");
      return;
    }
    
    // Clear all existing featured flags
    await db.update(menuItems).set({ 
      isPopular: false, 
      isBestSeller: false 
    });
    
    console.log("Cleared all existing featured flags");
    
    // Set first 3 items as featured for now (you can modify this logic)
    const itemsToFeature = allItems.slice(0, 3);
    
    for (let i = 0; i < itemsToFeature.length; i++) {
      const item = itemsToFeature[i];
      
      if (i === 0) {
        // First item as "Best Seller"
        await db.update(menuItems)
          .set({ isBestSeller: true })
          .where(eq(menuItems.id, item.id));
        console.log(`✅ Set "${item.name}" as BEST SELLER`);
      } else {
        // Other items as "Popular"
        await db.update(menuItems)
          .set({ isPopular: true })
          .where(eq(menuItems.id, item.id));
        console.log(`✅ Set "${item.name}" as POPULAR`);
      }
    }
    
    console.log("\n🎉 Featured items have been set!");
    console.log("Now visit your homepage to see the featured items.");
    
    process.exit(0);
  } catch (error) {
    console.error("Error setting featured items:", error);
    process.exit(1);
  }
}

setFeaturedItems();