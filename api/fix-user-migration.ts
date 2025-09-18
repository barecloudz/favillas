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
    const oldUserId = 3174987662; // Original calculation (8 chars)
    const newUserId = 13402295;   // New calculation (6 chars)

    console.log(`🔄 Migrating user data from ${oldUserId} to ${newUserId}`);

    // Check if old user exists
    const oldUser = await sql`SELECT * FROM users WHERE id = ${oldUserId}`;
    const newUser = await sql`SELECT * FROM users WHERE id = ${newUserId}`;

    if (oldUser.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'Old user not found',
          oldUserId,
          newUserId
        })
      };
    }

    console.log(`✅ Found old user with ${oldUser[0].rewards || 0} points`);

    // Get user_points data
    const oldUserPoints = await sql`SELECT * FROM user_points WHERE user_id = ${oldUserId}`;

    // Begin transaction to migrate all data
    const result = await sql.begin(async (transaction: any) => {
      // If new user doesn't exist, create them
      if (newUser.length === 0) {
        await transaction`
          INSERT INTO users (id, username, email, first_name, last_name, password, role, is_admin, is_active, marketing_opt_in, rewards, created_at, updated_at)
          VALUES (${newUserId}, ${oldUser[0].username}, ${oldUser[0].email}, ${oldUser[0].first_name}, ${oldUser[0].last_name}, ${oldUser[0].password}, ${oldUser[0].role}, ${oldUser[0].is_admin}, ${oldUser[0].is_active}, ${oldUser[0].marketing_opt_in}, ${oldUser[0].rewards}, ${oldUser[0].created_at}, NOW())
        `;
        console.log('✅ Created new user record');
      } else {
        // Update existing new user with old user's data and points
        await transaction`
          UPDATE users
          SET rewards = ${oldUser[0].rewards},
              updated_at = NOW()
          WHERE id = ${newUserId}
        `;
        console.log('✅ Updated new user with old points');
      }

      // Migrate user_points if it exists
      if (oldUserPoints.length > 0) {
        // Check if new user has user_points record
        const newUserPoints = await transaction`SELECT * FROM user_points WHERE user_id = ${newUserId}`;

        if (newUserPoints.length === 0) {
          // Create new user_points record
          await transaction`
            INSERT INTO user_points (user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
            VALUES (${newUserId}, ${oldUserPoints[0].points}, ${oldUserPoints[0].total_earned}, ${oldUserPoints[0].total_redeemed}, ${oldUserPoints[0].last_earned_at}, ${oldUserPoints[0].created_at}, NOW())
          `;
        } else {
          // Update existing user_points record
          await transaction`
            UPDATE user_points
            SET points = ${oldUserPoints[0].points},
                total_earned = ${oldUserPoints[0].total_earned},
                total_redeemed = ${oldUserPoints[0].total_redeemed},
                last_earned_at = ${oldUserPoints[0].last_earned_at},
                updated_at = NOW()
            WHERE user_id = ${newUserId}
          `;
        }
        console.log('✅ Migrated user_points data');
      }

      // Migrate orders
      const ordersToMigrate = await transaction`SELECT * FROM orders WHERE user_id = ${oldUserId}`;
      if (ordersToMigrate.length > 0) {
        await transaction`UPDATE orders SET user_id = ${newUserId} WHERE user_id = ${oldUserId}`;
        console.log(`✅ Migrated ${ordersToMigrate.length} orders`);
      }

      // Migrate user_vouchers
      const vouchersToMigrate = await transaction`SELECT * FROM user_vouchers WHERE user_id = ${oldUserId}`;
      if (vouchersToMigrate.length > 0) {
        await transaction`UPDATE user_vouchers SET user_id = ${newUserId} WHERE user_id = ${oldUserId}`;
        console.log(`✅ Migrated ${vouchersToMigrate.length} vouchers`);
      }

      // Migrate points_transactions
      const transactionsToMigrate = await transaction`SELECT * FROM points_transactions WHERE user_id = ${oldUserId}`;
      if (transactionsToMigrate.length > 0) {
        await transaction`UPDATE points_transactions SET user_id = ${newUserId} WHERE user_id = ${oldUserId}`;
        console.log(`✅ Migrated ${transactionsToMigrate.length} transactions`);
      }

      return {
        oldUserId,
        newUserId,
        pointsMigrated: oldUserPoints.length > 0 ? oldUserPoints[0].points : oldUser[0].rewards,
        ordersMigrated: ordersToMigrate.length,
        vouchersMigrated: vouchersToMigrate.length,
        transactionsMigrated: transactionsToMigrate.length
      };
    });

    console.log('✅ Migration completed successfully');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'User data migration completed successfully',
        details: result
      })
    };

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Migration failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};