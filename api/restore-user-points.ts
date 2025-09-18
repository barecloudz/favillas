import { Handler } from '@netlify/functions';
import postgres from 'postgres';

let dbConnection: any = null;

function getDB() {
  if (dbConnection) return dbConnection;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const sql = getDB();

    // For user UUID: bd3e778e-c5f1-4eec-8436-0a9ff3c5cf9a
    const userId = 13402295;   // New calculation (6 chars) - safe integer
    const pointsToRestore = 1446; // User's original points balance

    console.log(`🔄 Restoring ${pointsToRestore} points for user ${userId}`);

    // Begin transaction to restore points
    const result = await sql.begin(async (transaction: any) => {
      // Check if user exists
      const user = await transaction`SELECT * FROM users WHERE id = ${userId}`;

      if (user.length === 0) {
        // Create user if doesn't exist
        await transaction`
          INSERT INTO users (id, username, email, first_name, last_name, password, role, is_admin, is_active, marketing_opt_in, rewards, created_at, updated_at)
          VALUES (${userId}, 'blake@martindale.co', 'blake@martindale.co', 'Blake', 'User', '', 'customer', false, true, false, ${pointsToRestore}, NOW(), NOW())
        `;
        console.log('✅ Created user record');
      } else {
        // Update existing user's points
        await transaction`
          UPDATE users
          SET rewards = ${pointsToRestore},
              updated_at = NOW()
          WHERE id = ${userId}
        `;
        console.log('✅ Updated user points in users table');
      }

      // Check if user_points record exists
      const userPoints = await transaction`SELECT * FROM user_points WHERE user_id = ${userId}`;

      if (userPoints.length === 0) {
        // Create user_points record
        await transaction`
          INSERT INTO user_points (user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
          VALUES (${userId}, ${pointsToRestore}, ${pointsToRestore}, 0, NOW(), NOW(), NOW())
        `;
        console.log('✅ Created user_points record');
      } else {
        // Update existing user_points record
        await transaction`
          UPDATE user_points
          SET points = ${pointsToRestore},
              total_earned = GREATEST(total_earned, ${pointsToRestore}),
              last_earned_at = NOW(),
              updated_at = NOW()
          WHERE user_id = ${userId}
        `;
        console.log('✅ Updated user_points record');
      }

      // Add a transaction record for audit trail
      await transaction`
        INSERT INTO points_transactions (user_id, type, points, description, created_at)
        VALUES (${userId}, 'manual_restore', ${pointsToRestore}, 'Points restored after UUID conversion fix', NOW())
      `;
      console.log('✅ Added transaction record');

      return {
        userId,
        pointsRestored: pointsToRestore,
        timestamp: new Date().toISOString()
      };
    });

    console.log('✅ Points restoration completed successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Successfully restored ${pointsToRestore} points for user ${userId}`,
        details: result
      })
    };

  } catch (error) {
    console.error('❌ Points restoration failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Points restoration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};