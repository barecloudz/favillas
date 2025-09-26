// IMPROVED ORDERS API - POINTS AWARDING LOGIC
// This file contains the fixed version of the points awarding logic that should replace
// the problematic sections in api/orders.ts (lines 898-1104)

// Key improvements:
// 1. Better error handling that doesn't silently fail
// 2. Failed points tracking for manual recovery
// 3. More robust user record creation
// 4. Improved logging and debugging
// 5. Atomic transaction integrity

// =============================================================================
// 1. FAILED POINTS TRACKING TABLE CREATION
// =============================================================================

/*
-- Run this SQL to create the failed points tracking table:

CREATE TABLE IF NOT EXISTS failed_points_awards (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  user_id INTEGER REFERENCES users(id),
  supabase_user_id TEXT,
  expected_points INTEGER NOT NULL,
  error_message TEXT,
  error_details JSONB,
  recovered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  recovered_at TIMESTAMP,
  recovery_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_failed_points_order_id ON failed_points_awards(order_id);
CREATE INDEX IF NOT EXISTS idx_failed_points_unrecovered ON failed_points_awards(recovered) WHERE recovered = FALSE;
*/

// =============================================================================
// 2. IMPROVED POINTS AWARDING LOGIC
// =============================================================================

// Replace the points awarding section in api/orders.ts with this improved version:

export async function awardPointsWithFailsafe(sql: any, userId: number | null, supabaseUserId: string | null, newOrder: any, authPayload: any) {
  const pointsToAward = Math.floor(parseFloat(newOrder.total));
  const userIdentifier = userId || supabaseUserId;

  console.log('🎁 Orders API: ENHANCED POINTS AWARD starting:', {
    userType: userId ? 'legacy' : 'supabase',
    userId,
    supabaseUserId,
    userIdentifier,
    pointsToAward,
    orderTotal: newOrder.total,
    orderId: newOrder.id
  });

  if (!userId && !supabaseUserId) {
    console.log('⚠️ Orders API: No user ID available for points awarding');
    return { success: false, reason: 'No user identification' };
  }

  try {
    // Use atomic transaction for points operations with enhanced error handling
    const pointsResult = await sql.begin(async (sql: any) => {
      console.log('🔒 Orders API: Starting enhanced atomic transaction for points award');

      if (userId) {
        return await awardPointsToLegacyUserEnhanced(sql, userId, newOrder, pointsToAward);
      } else if (supabaseUserId) {
        return await awardPointsToSupabaseUserEnhanced(sql, supabaseUserId, newOrder, pointsToAward, authPayload);
      }
    });

    console.log('🎁 Orders API: Enhanced points transaction result:', pointsResult);
    return pointsResult;

  } catch (pointsError: any) {
    console.error('❌ Orders API: CRITICAL - Enhanced points awarding failed:', pointsError);

    // Enhanced error logging
    const errorDetails = {
      name: pointsError.name,
      message: pointsError.message,
      constraint: pointsError.constraint,
      table: pointsError.table,
      column: pointsError.column,
      code: pointsError.code,
      stack: pointsError.stack?.substring(0, 1000), // Truncate for storage
      timestamp: new Date().toISOString(),
      orderData: {
        id: newOrder.id,
        total: newOrder.total,
        userId,
        supabaseUserId
      }
    };

    console.error('❌ Orders API: Enhanced error details:', errorDetails);

    // Log failure for manual recovery - CRITICAL for customer service
    try {
      await sql`
        INSERT INTO failed_points_awards (
          order_id,
          user_id,
          supabase_user_id,
          expected_points,
          error_message,
          error_details,
          created_at
        )
        VALUES (
          ${newOrder.id},
          ${userId},
          ${supabaseUserId},
          ${pointsToAward},
          ${pointsError.message},
          ${JSON.stringify(errorDetails)},
          NOW()
        )
        ON CONFLICT (order_id) DO UPDATE SET
          error_message = EXCLUDED.error_message,
          error_details = EXCLUDED.error_details,
          created_at = NOW()
      `;

      console.log('✅ Orders API: Failed points award logged for manual recovery');

      // Send alert to monitoring system (if configured)
      if (process.env.ALERT_WEBHOOK_URL) {
        fetch(process.env.ALERT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            alert: 'Points Awarding Failure',
            severity: 'HIGH',
            orderId: newOrder.id,
            userId: userIdentifier,
            expectedPoints: pointsToAward,
            error: pointsError.message,
            timestamp: new Date().toISOString()
          })
        }).catch(alertError => {
          console.error('❌ Failed to send points failure alert:', alertError);
        });
      }

    } catch (loggingError) {
      console.error('❌ Orders API: CRITICAL - Failed to log points failure:', loggingError);
      // If we can't even log the failure, this is a serious system issue
    }

    // Return structured error for potential retry
    return {
      success: false,
      error: 'Points awarding failed',
      details: errorDetails,
      canRetry: isRetryableError(pointsError),
      orderId: newOrder.id,
      expectedPoints: pointsToAward
    };
  }
}

// =============================================================================
// 3. ENHANCED LEGACY USER POINTS LOGIC
// =============================================================================

async function awardPointsToLegacyUserEnhanced(sql: any, userId: number, newOrder: any, pointsToAward: number) {
  // Check if user exists in users table with enhanced verification
  const userExists = await sql`
    SELECT id, username, email, created_at FROM users WHERE id = ${userId}
  `;

  console.log('🎁 Orders API: Enhanced legacy user verification:', {
    userId,
    exists: userExists.length > 0,
    userInfo: userExists[0] || null
  });

  if (userExists.length === 0) {
    throw new Error(`Legacy user ${userId} not found in users table - data integrity issue`);
  }

  // Check if points transaction already exists with enhanced duplicate detection
  const existingTransaction = await sql`
    SELECT id, points, created_at, description FROM points_transactions
    WHERE order_id = ${newOrder.id} AND user_id = ${userId}
  `;

  if (existingTransaction.length > 0) {
    console.log('⚠️ Orders API: Points transaction already exists for legacy user order:', {
      transactionId: existingTransaction[0].id,
      existingPoints: existingTransaction[0].points,
      expectedPoints: pointsToAward,
      isCorrect: existingTransaction[0].points === pointsToAward
    });

    if (existingTransaction[0].points !== pointsToAward) {
      console.error('❌ Orders API: Existing transaction has WRONG POINTS AMOUNT');
      throw new Error(`Points mismatch: existing ${existingTransaction[0].points}, expected ${pointsToAward}`);
    }

    return {
      success: false,
      reason: 'Points already awarded for this order',
      transactionId: existingTransaction[0].id,
      skipReason: 'duplicate_prevention'
    };
  }

  // Record points transaction in audit table with enhanced metadata
  const pointsTransaction = await sql`
    INSERT INTO points_transactions (
      user_id,
      order_id,
      type,
      points,
      description,
      order_amount,
      created_at
    )
    VALUES (
      ${userId},
      ${newOrder.id},
      'earned',
      ${pointsToAward},
      ${'Order #' + newOrder.id + ' - Enhanced Processing'},
      ${newOrder.total},
      NOW()
    )
    RETURNING id, created_at
  `;

  const transactionId = pointsTransaction[0]?.id;
  console.log('✅ Orders API: Enhanced points transaction created:', {
    transactionId,
    points: pointsToAward,
    createdAt: pointsTransaction[0]?.created_at
  });

  // Use enhanced UPSERT with better error handling for user_points table
  const userPointsUpdate = await sql`
    INSERT INTO user_points (
      user_id,
      points,
      total_earned,
      total_redeemed,
      last_earned_at,
      created_at,
      updated_at
    )
    VALUES (
      ${userId},
      ${pointsToAward},
      ${pointsToAward},
      0,
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      points = COALESCE(user_points.points, 0) + ${pointsToAward},
      total_earned = COALESCE(user_points.total_earned, 0) + ${pointsToAward},
      last_earned_at = NOW(),
      updated_at = NOW()
    RETURNING user_id, points, total_earned, total_redeemed
  `;

  console.log('✅ Orders API: Enhanced user points updated:', userPointsUpdate[0]);

  // Update legacy rewards column with enhanced error handling
  try {
    await sql`
      UPDATE users
      SET
        rewards = (SELECT points FROM user_points WHERE user_id = ${userId}),
        updated_at = NOW()
      WHERE id = ${userId}
    `;
    console.log('✅ Orders API: Enhanced legacy rewards column updated');
  } catch (legacyUpdateError) {
    console.error('❌ Orders API: Legacy rewards update failed (non-critical):', legacyUpdateError);
    // Don't throw - this is just for backward compatibility
  }

  console.log('✅ Orders API: Enhanced points awarded successfully to legacy user');
  return {
    success: true,
    pointsAwarded: pointsToAward,
    userType: 'legacy',
    transactionId,
    finalBalance: userPointsUpdate[0]?.points
  };
}

// =============================================================================
// 4. ENHANCED SUPABASE USER POINTS LOGIC
// =============================================================================

async function awardPointsToSupabaseUserEnhanced(sql: any, supabaseUserId: string, newOrder: any, pointsToAward: number, authPayload: any) {
  console.log('🎁 Orders API: Enhanced Supabase user points awarding:', supabaseUserId);

  // Enhanced user record verification and creation
  let userRecord = await sql`
    SELECT id, email, first_name, last_name, phone, created_at
    FROM users
    WHERE supabase_user_id = ${supabaseUserId}
  `;

  if (userRecord.length === 0) {
    console.log('❌ Orders API: Supabase user not found in users table, creating with enhanced data...');

    const userData = {
      supabaseUserId: supabaseUserId,
      email: authPayload?.email || authPayload?.username || 'customer@example.com',
      firstName: authPayload?.firstName || authPayload?.given_name || 'Customer',
      lastName: authPayload?.lastName || authPayload?.family_name || 'User',
      username: authPayload?.email || authPayload?.username || `customer_${supabaseUserId.substring(0, 8)}`
    };

    console.log('👤 Orders API: Creating user with enhanced data:', {
      supabaseUserId: userData.supabaseUserId,
      email: userData.email,
      name: `${userData.firstName} ${userData.lastName}`
    });

    try {
      await sql`
        INSERT INTO users (
          supabase_user_id,
          username,
          email,
          role,
          phone,
          address,
          city,
          state,
          zip_code,
          first_name,
          last_name,
          password,
          created_at,
          updated_at
        )
        VALUES (
          ${userData.supabaseUserId},
          ${userData.username},
          ${userData.email},
          'customer',
          '', '', '', '', '',
          ${userData.firstName},
          ${userData.lastName},
          'SUPABASE_USER',
          NOW(),
          NOW()
        )
        ON CONFLICT (supabase_user_id) DO UPDATE SET
          email = COALESCE(NULLIF(EXCLUDED.email, ''), users.email),
          first_name = COALESCE(NULLIF(EXCLUDED.first_name, ''), users.first_name),
          last_name = COALESCE(NULLIF(EXCLUDED.last_name, ''), users.last_name),
          username = COALESCE(NULLIF(EXCLUDED.username, ''), users.username),
          updated_at = NOW()
        RETURNING id, email, first_name, last_name
      `;

      // Re-fetch user record after creation
      userRecord = await sql`
        SELECT id, email, first_name, last_name, phone, created_at
        FROM users
        WHERE supabase_user_id = ${supabaseUserId}
      `;

      console.log('✅ Orders API: Enhanced Supabase user record created/updated:', userRecord[0]);

    } catch (createUserError) {
      console.error('❌ Orders API: Enhanced user creation failed:', createUserError);
      throw new Error(`Failed to create user record for Supabase user ${supabaseUserId}: ${createUserError.message}`);
    }
  }

  // Enhanced duplicate transaction check
  const existingTransaction = await sql`
    SELECT id, points, created_at, description FROM points_transactions
    WHERE order_id = ${newOrder.id} AND supabase_user_id = ${supabaseUserId}
  `;

  if (existingTransaction.length > 0) {
    console.log('⚠️ Orders API: Points transaction already exists for Supabase user order:', {
      transactionId: existingTransaction[0].id,
      existingPoints: existingTransaction[0].points,
      expectedPoints: pointsToAward,
      isCorrect: existingTransaction[0].points === pointsToAward
    });

    if (existingTransaction[0].points !== pointsToAward) {
      console.error('❌ Orders API: Existing transaction has WRONG POINTS AMOUNT');
      throw new Error(`Points mismatch: existing ${existingTransaction[0].points}, expected ${pointsToAward}`);
    }

    return {
      success: false,
      reason: 'Points already awarded for this order',
      transactionId: existingTransaction[0].id,
      skipReason: 'duplicate_prevention'
    };
  }

  // Record enhanced points transaction
  let pointsTransactionId: number;
  try {
    const pointsTransaction = await sql`
      INSERT INTO points_transactions (
        user_id,
        supabase_user_id,
        order_id,
        type,
        points,
        description,
        order_amount,
        created_at
      )
      VALUES (
        NULL,
        ${supabaseUserId},
        ${newOrder.id},
        'earned',
        ${pointsToAward},
        ${'Order #' + newOrder.id + ' - Enhanced Supabase Processing'},
        ${newOrder.total},
        NOW()
      )
      RETURNING id, created_at
    `;

    pointsTransactionId = pointsTransaction[0]?.id;
    console.log('✅ Orders API: Enhanced Supabase points transaction created:', {
      transactionId: pointsTransactionId,
      points: pointsToAward,
      createdAt: pointsTransaction[0]?.created_at
    });

  } catch (transactionError) {
    console.error('❌ Orders API: Enhanced points transaction creation failed:', transactionError);
    throw new Error(`Failed to create points transaction: ${transactionError.message}`);
  }

  // Enhanced UPSERT for Supabase user points with better error handling
  try {
    const userPointsUpdate = await sql`
      INSERT INTO user_points (
        user_id,
        supabase_user_id,
        points,
        total_earned,
        total_redeemed,
        last_earned_at,
        created_at,
        updated_at
      )
      VALUES (
        NULL,
        ${supabaseUserId},
        ${pointsToAward},
        ${pointsToAward},
        0,
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT (supabase_user_id) DO UPDATE SET
        points = COALESCE(user_points.points, 0) + ${pointsToAward},
        total_earned = COALESCE(user_points.total_earned, 0) + ${pointsToAward},
        last_earned_at = NOW(),
        updated_at = NOW()
      RETURNING supabase_user_id, points, total_earned, total_redeemed
    `;

    console.log('✅ Orders API: Enhanced Supabase user points updated:', userPointsUpdate[0]);

    console.log('✅ Orders API: Enhanced points awarded successfully to Supabase user');
    return {
      success: true,
      pointsAwarded: pointsToAward,
      userType: 'supabase',
      transactionId: pointsTransactionId,
      finalBalance: userPointsUpdate[0]?.points,
      userInfo: userRecord[0]
    };

  } catch (pointsUpdateError) {
    console.error('❌ Orders API: Enhanced user points update failed:', pointsUpdateError);
    throw new Error(`Failed to update user points: ${pointsUpdateError.message}`);
  }
}

// =============================================================================
// 5. UTILITY FUNCTIONS
// =============================================================================

function isRetryableError(error: any): boolean {
  // Determine if this error might succeed on retry
  const retryableCodes = [
    'ECONNRESET',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNREFUSED',
    '40001', // PostgreSQL serialization failure
    '40P01', // PostgreSQL deadlock detected
  ];

  return retryableCodes.some(code =>
    error.code === code ||
    error.message?.includes(code) ||
    error.name?.includes('timeout') ||
    error.name?.includes('connection')
  );
}

// =============================================================================
// 6. RECOVERY API ENDPOINT
// =============================================================================

// Create a separate API endpoint: api/recover-failed-points.ts
export const recoverFailedPointsHandler = async (event: any, context: any) => {
  // This endpoint allows manual recovery of failed points awards
  // Should be restricted to admin users only

  // Implementation would:
  // 1. Query failed_points_awards table for unrecovered entries
  // 2. Attempt to re-award points for each failed case
  // 3. Mark as recovered when successful
  // 4. Provide detailed recovery report
};

// =============================================================================
// USAGE INSTRUCTIONS
// =============================================================================

/*
To implement this fix:

1. Create the failed_points_awards table using the SQL at the top
2. Replace the points awarding logic in api/orders.ts (lines 898-1104) with the enhanced version
3. Add environment variable ALERT_WEBHOOK_URL for monitoring (optional)
4. Create the recovery endpoint for manual intervention
5. Set up monitoring dashboard to track failed_points_awards table

The enhanced logic provides:
- Better error handling and logging
- Failed points tracking for customer service
- More robust user record creation
- Enhanced duplicate detection
- Detailed success/failure reporting
- Monitoring integration
- Manual recovery capabilities
*/