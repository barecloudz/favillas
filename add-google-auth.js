import { db } from "./server/db.ts";
import { sql } from "drizzle-orm";

async function addGoogleAuthColumn() {
  try {
    console.log("Adding Google Auth support to users table...");
    
    // Add google_id column to users table
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE
    `);
    
    console.log("✅ Added google_id column to users table");
    
    // Make password field nullable for OAuth users
    await db.execute(sql`
      ALTER TABLE users 
      ALTER COLUMN password DROP NOT NULL
    `);
    
    console.log("✅ Made password field optional for OAuth users");
    
    console.log("\n🎉 Google OAuth support has been added to the database!");
    console.log("You can now use Google Sign-In in your application.");
    
    process.exit(0);
  } catch (error) {
    console.error("Error adding Google Auth support:", error);
    process.exit(1);
  }
}

addGoogleAuthColumn();