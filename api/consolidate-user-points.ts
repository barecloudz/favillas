import { Handler } from "@netlify/functions";
import postgres from "postgres";

let dbConnection: any = null;

function getDB() {
  if (dbConnection) return dbConnection;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  dbConnection = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });

  return dbConnection;
}

export const handler: Handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const sql = getDB();
    const targetSupabaseId = "fc644776-1ca0-46ad-ae6c-8f753478374b";
    const targetUserId = 29;

    console.log("🔧 CONSOLIDATE: Starting consolidation for user_id 29 and supabase_user_id:", targetSupabaseId);

    // Get all existing user_points records for this user
    const allRecords = await sql`
      SELECT id, user_id, supabase_user_id, points, total_earned, total_redeemed, created_at, updated_at
      FROM user_points
      WHERE supabase_user_id = ${targetSupabaseId} OR user_id = ${targetUserId}
      ORDER BY created_at ASC
    `;

    console.log("📊 Found records to consolidate:", allRecords.length);

    if (allRecords.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: "No records found to consolidate",
          action: "none"
        })
      };
    }

    // Calculate totals from all records
    const totalPoints = allRecords.reduce((sum, record) => sum + parseInt(record.points || 0), 0);
    const totalEarned = allRecords.reduce((sum, record) => sum + parseInt(record.total_earned || 0), 0);
    const totalRedeemed = allRecords.reduce((sum, record) => sum + parseInt(record.total_redeemed || 0), 0);
    const earliestCreated = allRecords[0].created_at;
    const latestUpdated = allRecords[allRecords.length - 1].updated_at;

    console.log("📊 Consolidation totals:", {
      totalPoints,
      totalEarned,
      totalRedeemed,
      recordCount: allRecords.length
    });

    // Begin transaction
    await sql.begin(async (tx) => {
      // Delete ALL existing records
      const deletedRecords = await tx`
        DELETE FROM user_points
        WHERE supabase_user_id = ${targetSupabaseId} OR user_id = ${targetUserId}
        RETURNING id
      `;

      console.log("🗑️ Deleted old records:", deletedRecords.length);

      // Create ONE consolidated record linked to BOTH user_id AND supabase_user_id
      const consolidatedRecord = await tx`
        INSERT INTO user_points (
          user_id,
          supabase_user_id,
          points,
          total_earned,
          total_redeemed,
          created_at,
          updated_at,
          last_earned_at
        ) VALUES (
          ${targetUserId},
          ${targetSupabaseId},
          ${totalPoints},
          ${totalEarned},
          ${totalRedeemed},
          ${earliestCreated},
          NOW(),
          ${latestUpdated}
        )
        RETURNING *
      `;

      console.log("✅ Created consolidated record:", consolidatedRecord[0]);

      // Update the users table rewards column to match
      await tx`
        UPDATE users
        SET rewards = ${totalPoints}, updated_at = NOW()
        WHERE id = ${targetUserId}
      `;

      console.log("✅ Updated users.rewards column");

      return consolidatedRecord[0];
    });

    // Verify the consolidation worked
    const finalCheck = await sql`
      SELECT * FROM user_points
      WHERE supabase_user_id = ${targetSupabaseId} OR user_id = ${targetUserId}
    `;

    const userRewardsCheck = await sql`
      SELECT rewards FROM users WHERE id = ${targetUserId}
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: "User points consolidated successfully",
        consolidation: {
          originalRecords: allRecords.length,
          totalPointsConsolidated: totalPoints,
          totalEarnedConsolidated: totalEarned,
          totalRedeemedConsolidated: totalRedeemed,
          finalRecordCount: finalCheck.length,
          finalPoints: finalCheck[0]?.points || 0,
          userRewardsColumn: userRewardsCheck[0]?.rewards || 0
        },
        deletedRecordIds: allRecords.map(r => r.id),
        finalRecord: finalCheck[0] || null
      })
    };

  } catch (error) {
    console.error("🔧 CONSOLIDATE: Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Failed to consolidate user points",
        details: error instanceof Error ? error.message : "Unknown error"
      })
    };
  }
};
