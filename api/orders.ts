import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';
import { authenticateToken as authenticateTokenFromUtils } from './utils/auth';

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

// Removed old authenticateToken function - now using utils/auth.ts for proper Supabase token validation

function isStaff(authPayload: any): boolean {
  if (!authPayload) return false;
  return ['admin', 'kitchen', 'manager'].includes(authPayload.role);
}

// Helper function for legacy user points
async function awardPointsToLegacyUser(sql: any, userId: number, newOrder: any, pointsToAward: number) {
  // Check if user exists in users table
  const userExists = await sql`SELECT id FROM users WHERE id = ${userId}`;
  console.log('🎁 Orders API: Legacy user exists check:', userExists.length > 0, 'for user:', userId);

  if (userExists.length === 0) {
    console.log('❌ Orders API: Legacy user not found in users table');
    return { success: false, reason: 'Legacy user not found' };
  }

  // Check if points transaction already exists for this order
  const existingTransaction = await sql`
    SELECT id FROM points_transactions
    WHERE order_id = ${newOrder.id} AND user_id = ${userId}
  `;

  if (existingTransaction.length > 0) {
    console.log('⚠️ Orders API: Points transaction already exists for legacy user order:', existingTransaction[0].id);
    return { success: false, reason: 'Points already awarded for this order', transactionId: existingTransaction[0].id };
  }

  // Record points transaction in audit table
  const pointsTransaction = await sql`
    INSERT INTO points_transactions (user_id, order_id, type, points, description, order_amount, created_at)
    VALUES (${userId}, ${newOrder.id}, 'earned', ${pointsToAward}, ${'Order #' + newOrder.id}, ${newOrder.total}, NOW())
    RETURNING id
  `;
  console.log('✅ Orders API: Points transaction created:', pointsTransaction[0]?.id);

  // Use UPSERT with optimistic locking for user_points table
  const userPointsUpdate = await sql`
    INSERT INTO user_points (user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
    VALUES (${userId}, ${pointsToAward}, ${pointsToAward}, 0, NOW(), NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      points = user_points.points + ${pointsToAward},
      total_earned = user_points.total_earned + ${pointsToAward},
      last_earned_at = NOW(),
      updated_at = NOW()
    RETURNING user_id, points, total_earned
  `;
  console.log('✅ Orders API: User points updated with UPSERT:', userPointsUpdate[0]);

  // Also update legacy rewards column for backward compatibility
  try {
    await sql`
      UPDATE users
      SET rewards = (SELECT points FROM user_points WHERE user_id = ${userId}), updated_at = NOW()
      WHERE id = ${userId}
    `;
    console.log('✅ Orders API: Legacy rewards column updated');
  } catch (legacyUpdateError) {
    console.error('❌ Orders API: Legacy rewards update failed:', legacyUpdateError);
    // Don't throw - this is just for backward compatibility
  }

  console.log('✅ Orders API: Points awarded successfully - Total:', pointsToAward, 'points');
  return { success: true, pointsAwarded: pointsToAward, userType: 'legacy' };
}

// Helper function for Supabase user points with robust error handling
async function awardPointsToSupabaseUser(sql: any, supabaseUserId: string, newOrder: any, pointsToAward: number, authPayload: any) {
  console.log('🎁 Orders API: Awarding points to Supabase user:', supabaseUserId);

  // Ensure user exists in users table - create if needed with proper data
  let userRecord = await sql`SELECT id, email, first_name, last_name FROM users WHERE supabase_user_id = ${supabaseUserId}`;

  if (userRecord.length === 0) {
    console.log('❌ Orders API: Supabase user not found in users table, creating...');
    try {
      const userData = {
        supabaseUserId: supabaseUserId,
        email: authPayload?.email || 'customer@example.com',
        firstName: authPayload?.firstName || 'Customer',
        lastName: authPayload?.lastName || 'User',
        username: authPayload?.email || `customer_${supabaseUserId.substring(0, 8)}`
      };

      await sql`
        INSERT INTO users (
          supabase_user_id, username, email, role, phone, address, city, state, zip_code,
          first_name, last_name, password, created_at, updated_at
        ) VALUES (
          ${userData.supabaseUserId},
          ${userData.username},
          ${userData.email},
          'customer',
          '', '', '', '', '',
          ${userData.firstName}, ${userData.lastName},
          'SUPABASE_USER',
          NOW(), NOW()
        )
        ON CONFLICT (supabase_user_id) DO UPDATE SET
          email = EXCLUDED.email,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          updated_at = NOW()
      `;
      console.log('✅ Orders API: Created/updated Supabase user record');
    } catch (createUserError) {
      console.error('❌ Orders API: Failed to create Supabase user record:', createUserError);
      // Continue with points awarding even if user creation fails
    }
  }

  // Check if points transaction already exists for this order
  const existingTransaction = await sql`
    SELECT id FROM points_transactions
    WHERE order_id = ${newOrder.id} AND supabase_user_id = ${supabaseUserId}
  `;

  if (existingTransaction.length > 0) {
    console.log('⚠️ Orders API: Points transaction already exists for this order:', existingTransaction[0].id);
    return { success: false, reason: 'Points already awarded for this order', transactionId: existingTransaction[0].id };
  }

  // Record points transaction in audit table with enhanced error handling
  let pointsTransactionId;
  try {
    const pointsTransaction = await sql`
      INSERT INTO points_transactions (user_id, supabase_user_id, order_id, type, points, description, order_amount, created_at)
      VALUES (NULL, ${supabaseUserId}, ${newOrder.id}, 'earned', ${pointsToAward}, ${'Order #' + newOrder.id}, ${newOrder.total}, NOW())
      RETURNING id
    `;
    pointsTransactionId = pointsTransaction[0]?.id;
    console.log('✅ Orders API: Supabase points transaction created:', pointsTransactionId);
  } catch (transactionError) {
    console.error('❌ Orders API: Failed to create points transaction:', transactionError);
    throw transactionError;
  }

  // Use robust UPSERT for Supabase user points with better error handling
  try {
    const userPointsUpdate = await sql`
      INSERT INTO user_points (user_id, supabase_user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
      VALUES (NULL, ${supabaseUserId}, ${pointsToAward}, ${pointsToAward}, 0, NOW(), NOW(), NOW())
      ON CONFLICT (supabase_user_id) DO UPDATE SET
        points = COALESCE(user_points.points, 0) + ${pointsToAward},
        total_earned = COALESCE(user_points.total_earned, 0) + ${pointsToAward},
        last_earned_at = NOW(),
        updated_at = NOW()
      RETURNING supabase_user_id, points, total_earned
    `;
    console.log('✅ Orders API: Supabase user points updated with UPSERT:', userPointsUpdate[0]);

    console.log('✅ Orders API: Points awarded successfully to Supabase user - Total:', pointsToAward, 'points');
    return { success: true, pointsAwarded: pointsToAward, userType: 'supabase', transactionId: pointsTransactionId };
  } catch (pointsUpdateError) {
    console.error('❌ Orders API: Failed to update user points:', pointsUpdateError);
    // If points update fails, we should rollback the transaction by throwing
    throw pointsUpdateError;
  }
}

export const handler: Handler = async (event, context) => {
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // ENHANCED AUTHENTICATION: Use multiple attempts with better error handling
  let authPayload = null;
  let authAttempts = 0;
  const maxAuthAttempts = 3;

  console.log('🔍 Orders API: Starting enhanced authentication process');

  while (!authPayload && authAttempts < maxAuthAttempts) {
    authAttempts++;
    console.log(`🔄 Orders API: Authentication attempt ${authAttempts}/${maxAuthAttempts}`);

    const authResult = await authenticateTokenFromUtils(
      event.headers.authorization || event.headers.Authorization,
      event.headers.cookie || event.headers.Cookie
    );

    // ENHANCED DEBUG: Log authentication headers and full result
    console.log('🔍 Orders API: ENHANCED AUTH DEBUG - Headers received:', {
      authorization: event.headers.authorization || event.headers.Authorization,
      cookie: event.headers.cookie || event.headers.Cookie,
      origin: event.headers.origin,
      userAgent: event.headers['user-agent']
    });

    console.log('🔍 Orders API: ENHANCED AUTH DEBUG - Full auth result:', JSON.stringify(authResult, null, 2));

    console.log(`🔍 Orders API: Auth attempt ${authAttempts} result:`, {
      success: authResult.success,
      error: authResult.error,
      hasUser: !!authResult.user,
      userId: authResult.user?.id,
      email: authResult.user?.email,
      legacyUserId: authResult.user?.legacyUserId
    });

    if (authResult.success && authResult.user) {
      // Debug the user ID type and value
      console.log('🔍 Orders API: USER ID DEBUG:', {
        rawId: authResult.user.id,
        typeOfId: typeof authResult.user.id,
        legacyUserId: authResult.user.legacyUserId,
        isNumber: typeof authResult.user.id === 'number',
        isNaN: isNaN(Number(authResult.user.id)),
        parsedValue: parseInt(authResult.user.id)
      });

      authPayload = {
        // CRITICAL FIX: Determine user type based on auth source, not ID format
        // Auth utils return legacyUserId when they find a legacy user record
        userId: authResult.user.legacyUserId, // Always use legacy ID if available
        supabaseUserId: authResult.user.id, // Always store Supabase UUID
        username: authResult.user.email || authResult.user.username || 'user',
        role: authResult.user.role || 'customer',
        // FIXED: Use presence of legacyUserId to determine user type, not ID format
        isSupabase: !authResult.user.legacyUserId, // If no legacy user found, treat as Supabase-only
        hasLegacyUser: !!authResult.user.legacyUserId, // Track if we found legacy user
        rawUserId: authResult.user.id // Store the raw ID for debugging
      };

      console.log('🔍 Orders API: ENHANCED AUTH DEBUG - Created authPayload:', JSON.stringify(authPayload, null, 2));

      console.log('✅ Orders API: Authentication successful on attempt', authAttempts);
      break;
    } else {
      console.log(`❌ Orders API: Auth attempt ${authAttempts} failed:`, authResult.error);

      // Wait before retry if not the last attempt
      if (authAttempts < maxAuthAttempts) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
  }

  if (authPayload) {
    console.log('🎯 Orders API: FINAL AUTH SUCCESS:', {
      isSupabase: authPayload.isSupabase,
      hasLegacyUser: authPayload.hasLegacyUser,
      userId: authPayload.userId,
      supabaseUserId: authPayload.supabaseUserId,
      username: authPayload.username,
      role: authPayload.role
    });
  } else {
    console.log('❌ Orders API: Authentication failed after all attempts');
  }

  try {
    const sql = getDB();

    if (event.httpMethod === 'GET') {
      // GET requests require authentication
      if (!authPayload) {
        console.log('❌ Orders API: No authentication payload');
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized' })
        };
      }

      // Check if this is a request for a specific order (e.g., /api/orders/123)
      const pathParts = event.path.split('/');
      const orderIdFromPath = pathParts[pathParts.length - 1];

      if (orderIdFromPath && !isNaN(parseInt(orderIdFromPath))) {
        // Request for specific order by ID
        const orderId = parseInt(orderIdFromPath);
        console.log('🔍 Orders API: Getting specific order:', orderId, 'for user:', authPayload.userId || authPayload.supabaseUserId);

        let orderQuery;
        if (isStaff(authPayload)) {
          // Staff can see any order
          orderQuery = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
        } else {
          // CRITICAL FIX: Customers can only see their own orders
          console.log('🔍 Orders API: Single order lookup for user:', {
            orderId,
            hasLegacyUserId: !!authPayload.userId,
            legacyUserId: authPayload.userId,
            supabaseUserId: authPayload.supabaseUserId
          });

          if (authPayload.hasLegacyUser && authPayload.userId) {
            // User has legacy account - search by user_id
            orderQuery = await sql`SELECT * FROM orders WHERE id = ${orderId} AND user_id = ${authPayload.userId}`;
          } else if (authPayload.supabaseUserId) {
            // Supabase-only user - search by supabase_user_id
            orderQuery = await sql`SELECT * FROM orders WHERE id = ${orderId} AND supabase_user_id = ${authPayload.supabaseUserId}`;
          } else {
            console.log('❌ Orders API: No valid user identifier for single order lookup');
            orderQuery = [];
          }
        }

        if (orderQuery.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Order not found' })
          };
        }

        const order = orderQuery[0];

        // Get order items for this specific order
        const items = await sql`
          SELECT
            oi.*,
            mi.name as menu_item_name,
            mi.description as menu_item_description,
            mi.base_price as menu_item_price,
            mi.image_url as menu_item_image_url,
            mi.category as menu_item_category
          FROM order_items oi
          LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
          WHERE oi.order_id = ${orderId}
        `;

        // Transform the data to match expected frontend structure
        const transformedItems = items.map(item => {
          // Parse options if they're a JSON string
          let parsedOptions = item.options;
          if (typeof item.options === 'string' && item.options) {
            try {
              parsedOptions = JSON.parse(item.options);
            } catch (e) {
              console.error(`Failed to parse options for item ${item.id}:`, e);
              parsedOptions = null;
            }
          }

          return {
            ...item,
            options: parsedOptions,
            name: item.menu_item_name || 'Unknown Item',
            menuItem: item.menu_item_name ? {
              name: item.menu_item_name,
              description: item.menu_item_description,
              price: item.menu_item_price,
              imageUrl: item.menu_item_image_url,
              category: item.menu_item_category
            } : null
          };
        });

        // Fetch user contact information for single order view
        let userContactInfo = null;
        if (order.user_id || order.supabase_user_id) {
          try {
            let userQuery;
            if (order.supabase_user_id) {
              userQuery = await sql`
                SELECT phone, address, city, state, zip_code
                FROM users
                WHERE supabase_user_id = ${order.supabase_user_id}
              `;
            } else {
              userQuery = await sql`
                SELECT phone, address, city, state, zip_code
                FROM users
                WHERE id = ${order.user_id}
              `;
            }

            if (userQuery.length > 0) {
              userContactInfo = userQuery[0];
            }
          } catch (contactInfoError) {
            console.error('❌ Orders API: Error retrieving user contact info for single order:', contactInfoError);
          }
        }

        console.log('✅ Orders API: Successfully retrieved order', orderId);

        // Transform database fields to frontend expected format with numeric conversion
        const transformedOrder = {
          ...order,
          orderType: order.order_type, // Transform snake_case to camelCase for frontend
          createdAt: order.created_at, // Transform snake_case to camelCase
          processedAt: order.processed_at,
          completedAt: order.completed_at,
          total: parseFloat(order.total || '0'),
          tax: parseFloat(order.tax || '0'),
          delivery_fee: parseFloat(order.delivery_fee || '0'),
          tip: parseFloat(order.tip || '0'),
          shipday_status: order.shipday_status, // Include shipday status
          items: transformedItems,
          userContactInfo
        };

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(transformedOrder)
        };
      }

      // Request for all orders (existing logic)
      console.log('🔍 Orders API: Getting orders for user:', authPayload.userId || authPayload.supabaseUserId, 'role:', authPayload.role);

      let allOrders;
      
      if (isStaff(authPayload)) {
        // Staff can see all orders
        console.log('📋 Orders API: Getting all orders (staff access)');
        allOrders = await sql`SELECT * FROM orders ORDER BY created_at DESC`;
      } else {
        // CRITICAL FIX: Customers can only see their own orders
        // Use comprehensive query to find orders by any available identifier
        console.log('📋 Orders API: Getting orders for user:', {
          hasLegacyUserId: !!authPayload.userId,
          legacyUserId: authPayload.userId,
          supabaseUserId: authPayload.supabaseUserId,
          isSupabaseUser: authPayload.isSupabase
        });

        if (authPayload.hasLegacyUser && authPayload.userId) {
          // User has legacy account - search by user_id
          console.log('📋 Orders API: Searching by legacy user_id:', authPayload.userId);
          allOrders = await sql`SELECT * FROM orders WHERE user_id = ${authPayload.userId} ORDER BY created_at DESC`;
        } else if (authPayload.supabaseUserId) {
          // Supabase-only user - search by supabase_user_id
          console.log('📋 Orders API: Searching by supabase_user_id:', authPayload.supabaseUserId);
          allOrders = await sql`SELECT * FROM orders WHERE supabase_user_id = ${authPayload.supabaseUserId} ORDER BY created_at DESC`;
        } else {
          console.log('❌ Orders API: No valid user identifier found');
          allOrders = [];
        }
      }
      
      console.log('📋 Orders API: Found', allOrders.length, 'orders');
      
      // Get order items for each order with menu item details AND user info
      const ordersWithItems = await Promise.all(
        allOrders.map(async (order) => {
          try {
            const items = await sql`
              SELECT
                oi.*,
                mi.name as menu_item_name,
                mi.description as menu_item_description,
                mi.base_price as menu_item_price,
                mi.image_url as menu_item_image_url,
                mi.category as menu_item_category
              FROM order_items oi
              LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
              WHERE oi.order_id = ${order.id}
            `;

            // Transform the data to match expected frontend structure
            const transformedItems = items.map(item => {
              // Parse options if they're a JSON string
              let parsedOptions = item.options;
              if (typeof item.options === 'string' && item.options) {
                try {
                  parsedOptions = JSON.parse(item.options);
                } catch (e) {
                  console.error(`Failed to parse options for item ${item.id}:`, e);
                  parsedOptions = null;
                }
              }

              return {
                ...item,
                options: parsedOptions,
                name: item.menu_item_name || 'Unknown Item',
                menuItem: item.menu_item_name ? {
                  name: item.menu_item_name,
                  description: item.menu_item_description,
                  price: item.menu_item_price,
                  imageUrl: item.menu_item_image_url,
                  category: item.menu_item_category
                } : null
              };
            });

            // Get user info for customer name
            let customerName = 'Guest';
            if (order.user_id || order.supabase_user_id) {
              try {
                const userQuery = order.user_id
                  ? await sql`SELECT first_name, last_name FROM users WHERE id = ${order.user_id}`
                  : await sql`SELECT first_name, last_name FROM users WHERE supabase_user_id = ${order.supabase_user_id}`;

                if (userQuery.length > 0 && userQuery[0].first_name && userQuery[0].last_name) {
                  customerName = `${userQuery[0].first_name} ${userQuery[0].last_name}`.trim();
                }
              } catch (userError) {
                console.error('❌ Error fetching user for order', order.id, ':', userError);
              }
            }

            // Get points earned for this order
            let pointsEarned = 0;
            if (order.user_id || order.supabase_user_id) {
              try {
                const pointsQuery = order.user_id
                  ? await sql`SELECT points FROM points_transactions WHERE order_id = ${order.id} AND user_id = ${order.user_id} AND type = 'earned'`
                  : await sql`SELECT points FROM points_transactions WHERE order_id = ${order.id} AND supabase_user_id = ${order.supabase_user_id} AND type = 'earned'`;

                if (pointsQuery.length > 0) {
                  pointsEarned = parseInt(pointsQuery[0].points);
                }
              } catch (pointsError) {
                console.error('❌ Error fetching points for order', order.id, ':', pointsError);
              }
            }

            // Ensure numeric values are properly converted for frontend
            const transformedOrder = {
              ...order,
              orderType: order.order_type, // Transform snake_case to camelCase
              createdAt: order.created_at, // Transform snake_case to camelCase
              processedAt: order.processed_at,
              completedAt: order.completed_at,
              total: parseFloat(order.total || '0'),
              tax: parseFloat(order.tax || '0'),
              delivery_fee: parseFloat(order.delivery_fee || '0'),
              tip: parseFloat(order.tip || '0'),
              shipday_status: order.shipday_status, // Include shipday status
              customerName: customerName,
              customer_name: customerName, // Also include snake_case for backward compat
              pointsEarned: pointsEarned,
              items: transformedItems
            };

            return transformedOrder;
          } catch (itemError) {
            console.error('❌ Error getting items for order', order.id, ':', itemError);
            // Still ensure numeric conversion even on error
            return {
              ...order,
              orderType: order.order_type, // Transform snake_case to camelCase
              createdAt: order.created_at, // Transform snake_case to camelCase
              processedAt: order.processed_at,
              completedAt: order.completed_at,
              total: parseFloat(order.total || '0'),
              tax: parseFloat(order.tax || '0'),
              delivery_fee: parseFloat(order.delivery_fee || '0'),
              tip: parseFloat(order.tip || '0'),
              shipday_status: order.shipday_status, // Include shipday status
              customerName: 'Guest',
              customer_name: 'Guest',
              pointsEarned: 0,
              items: []
            };
          }
        })
      );

      console.log('✅ Orders API: Successfully retrieved orders with items');
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(ordersWithItems)
      };
      
    } else if (event.httpMethod === 'POST') {
      // Create new order - support both authenticated users and guests
      console.log('🛒 Orders API: Creating new order');
      
      try {
        const { items, ...orderData } = JSON.parse(event.body || '{}');
        
        console.log('🛒 Orders API: Order data received (v2):', {
          hasItems: !!items,
          itemsCount: items?.length || 0,
          hasAuthPayload: !!authPayload,
          userId: authPayload?.userId,
          orderData: {
            total: orderData.total,
            tax: orderData.tax,
            orderType: orderData.orderType,
            phone: orderData.phone,
            fulfillmentTime: orderData.fulfillmentTime,
            scheduledTime: orderData.scheduledTime,
            scheduledTimeType: typeof orderData.scheduledTime
          }
        });

        // Check if services are paused or in vacation mode before allowing orders
        console.log('🔍 Orders API: Checking service status...');
        const serviceSettings = await sql`
          SELECT setting_key as key, setting_value as value FROM system_settings
          WHERE setting_key IN ('pause_enabled', 'pause_message', 'vacation_enabled', 'vacation_message')
        `;

        let isPaused = false;
        let pauseMessage = 'We are temporarily closed. Please check back later.';
        let isVacation = false;
        let vacationMessage = 'We are currently on vacation and will be back soon. Thank you for your patience!';

        serviceSettings.forEach(setting => {
          if (setting.key === 'pause_enabled') isPaused = setting.value === 'true';
          if (setting.key === 'pause_message') pauseMessage = setting.value || pauseMessage;
          if (setting.key === 'vacation_enabled') isVacation = setting.value === 'true';
          if (setting.key === 'vacation_message') vacationMessage = setting.value || vacationMessage;
        });

        if (isPaused || isVacation) {
          // Allow scheduled orders to proceed during pause, but block ASAP orders
          if (orderData.fulfillmentTime === 'scheduled' && orderData.scheduledTime) {
            console.log(`✅ Orders API: Allowing scheduled order during ${isPaused ? 'PAUSE' : 'VACATION'} mode`);
          } else {
            // Block ASAP orders when paused
            console.log(`❌ Orders API: Service unavailable for ASAP orders - ${isPaused ? 'PAUSED' : 'VACATION'}`);
            return {
              statusCode: 503,
              headers,
              body: JSON.stringify({
                error: 'Service temporarily unavailable',
                message: isPaused ? pauseMessage : vacationMessage,
                reason: isPaused ? 'paused' : 'vacation',
                scheduledOrdersAllowed: true // Inform frontend that scheduled orders are still allowed
              })
            };
          }
        }

        console.log('✅ Orders API: Service available, proceeding with order creation');
        
        // Validate required fields - allow zero values but not null/undefined
        if (orderData.total === null || orderData.total === undefined ||
            orderData.tax === null || orderData.tax === undefined ||
            !orderData.orderType || !orderData.phone) {
          console.log('❌ Orders API: Missing required fields', {
            total: orderData.total,
            tax: orderData.tax,
            orderType: orderData.orderType,
            phone: orderData.phone
          });
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: 'Missing required fields: total, tax, orderType, phone'
            })
          };
        }
      
        // SIMPLIFIED: User identification with better error handling
        let finalUserId = null;
        let finalSupabaseUserId = null;

        if (authPayload) {
          console.log('🔍 Orders API: AUTH PAYLOAD DEBUG:', authPayload);

          // FIXED: Handle both legacy users and modern Supabase users correctly
          if (authPayload.userId) {
            // User has a legacy/database user_id (integer) - use this for points
            finalUserId = authPayload.userId;
            console.log('✅ Orders API: Using database user ID:', finalUserId);
          } else if (authPayload.supabaseUserId) {
            // Pure Supabase user without database user_id - check if they have a database record
            console.log('🔍 Orders API: Checking if Supabase user exists in database...');

            try {
              const existingUser = await sql`
                SELECT id FROM users WHERE supabase_user_id = ${authPayload.supabaseUserId}
              `;

              if (existingUser.length > 0) {
                finalUserId = existingUser[0].id;
                console.log('✅ Orders API: Found database user for Supabase user:', finalUserId);
              } else {
                // Create database user for this Supabase user
                const newUser = await sql`
                  INSERT INTO users (username, email, role, supabase_user_id, created_at)
                  VALUES (${authPayload.username}, ${authPayload.username}, 'customer', ${authPayload.supabaseUserId}, NOW())
                  RETURNING id
                `;
                finalUserId = newUser[0].id;
                console.log('✅ Orders API: Created new database user for Supabase user:', finalUserId);

                // Initialize user points
                await sql`
                  INSERT INTO user_points (user_id, points, total_earned, total_redeemed, created_at, updated_at)
                  VALUES (${finalUserId}, 0, 0, 0, NOW(), NOW())
                `;
                console.log('✅ Orders API: Initialized points for new user');
              }
            } catch (dbError) {
              console.error('❌ Orders API: Database user lookup/creation failed:', dbError);
              finalSupabaseUserId = authPayload.supabaseUserId;
              console.log('⚠️ Orders API: Falling back to Supabase-only user handling');
            }
          }
        } else {
          console.log('👤 Orders API: Guest order - no user association');
        }

        console.log('🎯 Orders API: FINAL USER IDENTIFICATION:', {
          finalUserId,
          finalSupabaseUserId,
          willAwardPoints: !!(finalUserId || finalSupabaseUserId)
        });

        // Handle scheduled time formatting
        let formattedScheduledTime = null;
        if (orderData.fulfillmentTime === 'scheduled' && orderData.scheduledTime) {
          try {
            // Convert string to proper timestamp format
            formattedScheduledTime = new Date(orderData.scheduledTime).toISOString();
            console.log('🛒 Orders API: Formatted scheduled time:', formattedScheduledTime);
          } catch (error) {
            console.error('❌ Orders API: Error formatting scheduled time:', error);
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ 
                error: 'Invalid scheduled time format' 
              })
            };
          }
        }
        
        console.log('🛒 Orders API: Creating order with userId:', finalUserId, 'scheduledTime:', formattedScheduledTime);

        // Calculate server-side totals from items to prevent frontend manipulation
        let calculatedSubtotal = 0;
        let validItems = [];

        if (items && items.length > 0) {
          console.log('🧮 Orders API: Calculating server-side totals from items');

          for (const item of items) {
            // Validate item has required fields
            if (!item.menuItemId || !item.quantity || !item.price) {
              console.warn('❌ Orders API: Invalid item, skipping:', item);
              continue;
            }

            // Get menu item from database to verify pricing
            const menuItems = await sql`
              SELECT id, base_price FROM menu_items WHERE id = ${item.menuItemId}
            `;

            if (menuItems.length === 0) {
              console.warn('❌ Orders API: Menu item not found, skipping:', item.menuItemId);
              continue;
            }

            const menuItem = menuItems[0];
            const itemPrice = parseFloat(item.price);
            const basePrice = parseFloat(menuItem.base_price);
            const quantity = parseInt(item.quantity);

            // Detect if frontend sent total price (price * quantity) vs individual price
            const expectedTotalPrice = basePrice * quantity;
            const individualPrice = itemPrice / quantity;

            let finalItemPrice = basePrice; // Default to base price
            let itemTotal = 0;

            // Check if the price looks like an individual price or total price
            if (Math.abs(itemPrice - basePrice) < Math.abs(itemPrice - expectedTotalPrice)) {
              // Price is close to base price - treat as individual price
              if (itemPrice >= basePrice * 0.5 && itemPrice <= basePrice * 2) {
                finalItemPrice = itemPrice;
                itemTotal = itemPrice * quantity;
                console.log(`   ✅ Item ${item.menuItemId}: Individual price $${itemPrice} x ${quantity} = $${itemTotal.toFixed(2)}`);
              } else {
                finalItemPrice = basePrice;
                itemTotal = basePrice * quantity;
                console.log(`   ⚠️ Item ${item.menuItemId}: Invalid individual price, using base price $${basePrice} x ${quantity} = $${itemTotal.toFixed(2)}`);
              }
            } else {
              // Price looks like total price - divide by quantity to get individual price
              if (individualPrice >= basePrice * 0.5 && individualPrice <= basePrice * 2) {
                finalItemPrice = individualPrice;
                itemTotal = itemPrice; // Use the total that was sent
                console.log(`   ✅ Item ${item.menuItemId}: Total price $${itemPrice} ÷ ${quantity} = $${individualPrice.toFixed(2)} each`);
              } else {
                finalItemPrice = basePrice;
                itemTotal = basePrice * quantity;
                console.log(`   ⚠️ Item ${item.menuItemId}: Invalid total price, using base price $${basePrice} x ${quantity} = $${itemTotal.toFixed(2)}`);
              }
            }

            // Update item with correct individual price for storage
            item.price = finalItemPrice.toString();
            calculatedSubtotal += itemTotal;
            validItems.push(item);

            console.log(`   Item ${item.menuItemId}: ${item.quantity} x $${item.price} = $${itemTotal.toFixed(2)}`);
          }
        }

        // Calculate final totals with potential voucher discount
        const deliveryFee = parseFloat(orderData.deliveryFee || '0');
        const tip = parseFloat(orderData.tip || '0');
        let discountAmount = 0;
        let discountedSubtotal = calculatedSubtotal;

        // Apply voucher discount if provided
        let voucherDiscountInfo = null;
        if (orderData.voucherCode && orderData.voucherDiscount) {
          voucherDiscountInfo = orderData.voucherDiscount;
          if (voucherDiscountInfo.type === 'fixed') {
            discountAmount = parseFloat(voucherDiscountInfo.amount);
            discountedSubtotal = Math.max(0, calculatedSubtotal - discountAmount);
          } else if (voucherDiscountInfo.type === 'percentage') {
            discountAmount = calculatedSubtotal * (parseFloat(voucherDiscountInfo.amount) / 100);
            discountedSubtotal = calculatedSubtotal - discountAmount;
          } else if (voucherDiscountInfo.type === 'delivery_fee') {
            // Delivery fee discount
            discountAmount = Math.min(deliveryFee, parseFloat(voucherDiscountInfo.amount));
            // Don't change subtotal for delivery fee discounts
          }
        }

        const tax = discountedSubtotal * 0.0825; // 8.25% tax rate on discounted subtotal
        const adjustedDeliveryFee = voucherDiscountInfo?.type === 'delivery_fee'
          ? Math.max(0, deliveryFee - discountAmount)
          : deliveryFee;
        const finalTotal = discountedSubtotal + tax + adjustedDeliveryFee + tip;

        console.log('🧮 Orders API: Server-calculated totals:', {
          originalSubtotal: calculatedSubtotal.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
          discountedSubtotal: discountedSubtotal.toFixed(2),
          tax: tax.toFixed(2),
          deliveryFee: deliveryFee.toFixed(2),
          adjustedDeliveryFee: adjustedDeliveryFee.toFixed(2),
          tip: tip.toFixed(2),
          finalTotal: finalTotal.toFixed(2),
          frontendTotal: orderData.total,
          voucherCode: orderData.voucherCode
        });

        // FIXED: Use frontend calculation when it includes valid orderBreakdown data
        let finalOrderData;

        // Check if frontend sent valid orderBreakdown data
        if (orderData.orderMetadata && orderData.orderMetadata.subtotal && orderData.orderMetadata.finalSubtotal) {
          const frontendBreakdown = orderData.orderMetadata;
          const frontendSubtotal = parseFloat(frontendBreakdown.finalSubtotal);
          const frontendTotal = parseFloat(orderData.total);

          // Validate frontend calculation is reasonable (subtotal should be > 0 and total should be reasonable)
          if (frontendSubtotal > 0 && frontendTotal > frontendSubtotal && frontendTotal < frontendSubtotal * 2) {
            console.log('✅ Orders API: Using FRONTEND calculation with valid breakdown:', {
              frontendSubtotal: frontendSubtotal.toFixed(2),
              frontendTotal: frontendTotal.toFixed(2),
              backendSubtotal: discountedSubtotal.toFixed(2),
              backendTotal: finalTotal.toFixed(2)
            });

            // Use frontend values with their breakdown data
            finalOrderData = {
              ...orderData,
              total: frontendTotal.toFixed(2),
              tax: (frontendTotal - frontendSubtotal - deliveryFee - tip).toFixed(2),
              subtotal: frontendSubtotal.toFixed(2),
              discountAmount: (frontendBreakdown.discount || 0).toFixed(2),
              deliveryFee: deliveryFee.toFixed(2),
              items: validItems
            };
          } else {
            console.log('⚠️ Orders API: Frontend breakdown invalid, using server calculation');
            finalOrderData = {
              ...orderData,
              total: finalTotal.toFixed(2),
              tax: tax.toFixed(2),
              subtotal: discountedSubtotal.toFixed(2),
              discountAmount: discountAmount.toFixed(2),
              deliveryFee: adjustedDeliveryFee.toFixed(2),
              items: validItems
            };
          }
        } else {
          console.log('🔍 Orders API: No frontend breakdown data, using server calculation');
          finalOrderData = {
            ...orderData,
            total: finalTotal.toFixed(2),
            tax: tax.toFixed(2),
            subtotal: discountedSubtotal.toFixed(2),
            discountAmount: discountAmount.toFixed(2),
            deliveryFee: adjustedDeliveryFee.toFixed(2),
            items: validItems
          };
        }

        // Keep the serverCalculatedOrder name for compatibility
        const serverCalculatedOrder = finalOrderData;

        // Save contact information to user profile for authenticated users
        console.log('🔍 Orders API: Contact info saving check:', {
          hasFinalUserId: !!finalUserId,
          hasFinalSupabaseUserId: !!finalSupabaseUserId,
          hasPhone: !!orderData.phone,
          hasAddress: !!orderData.address,
          hasAddressData: !!orderData.addressData
        });

        if ((finalUserId || finalSupabaseUserId) && (orderData.phone || orderData.address || orderData.addressData)) {
          try {
            console.log('💾 Orders API: Saving contact info to user profile for user:', finalUserId || finalSupabaseUserId);

            // Extract address components from orderData
            const addressComponents = {
              phone: orderData.phone || '',
              address: orderData.address || '',
              city: orderData.addressData?.city || '',
              state: orderData.addressData?.state || '',
              zip_code: orderData.addressData?.zipCode || orderData.addressData?.zip || ''
            };

            console.log('📍 Address components to save:', addressComponents);

            if (finalUserId) {
              // Update user profile with contact info
              await sql`
                UPDATE users SET
                  phone = COALESCE(NULLIF(${addressComponents.phone}, ''), phone),
                  address = COALESCE(NULLIF(${addressComponents.address}, ''), address),
                  city = COALESCE(NULLIF(${addressComponents.city}, ''), city),
                  state = COALESCE(NULLIF(${addressComponents.state}, ''), state),
                  zip_code = COALESCE(NULLIF(${addressComponents.zip_code}, ''), zip_code),
                  updated_at = NOW()
                WHERE id = ${finalUserId}
              `;
              console.log('✅ Updated user profile with contact info for user ID:', finalUserId);
            } else if (finalSupabaseUserId) {
              // Update Supabase user profile
              await sql`
                UPDATE users SET
                  phone = COALESCE(NULLIF(${addressComponents.phone}, ''), phone),
                  address = COALESCE(NULLIF(${addressComponents.address}, ''), address),
                  city = COALESCE(NULLIF(${addressComponents.city}, ''), city),
                  state = COALESCE(NULLIF(${addressComponents.state}, ''), state),
                  zip_code = COALESCE(NULLIF(${addressComponents.zip_code}, ''), zip_code),
                  updated_at = NOW()
                WHERE supabase_user_id = ${finalSupabaseUserId}
              `;
              console.log('✅ Updated user profile with contact info for Supabase ID:', finalSupabaseUserId);
            }

          } catch (contactInfoError) {
            console.error('❌ Orders API: Error saving contact info to profile:', contactInfoError);
            // Don't fail the order if contact info save fails
          }
        } else {
          console.log('⚠️ Orders API: Contact info NOT saved because:', {
            noUserId: !finalUserId && !finalSupabaseUserId,
            noContactData: !orderData.phone && !orderData.address && !orderData.addressData,
            finalUserId,
            finalSupabaseUserId
          });
        }

        // Begin atomic transaction for order creation + payment
        const transactionResult = await sql.begin(async (sql) => {
          console.log('🔒 Orders API: Starting atomic transaction for order creation');

          // Create the order - store both address data and order breakdown metadata in address_data
          const combinedAddressData = {
            ...orderData.addressData,
            orderBreakdown: orderData.orderMetadata
          };

          console.log('🔍 Orders API: Creating order with FINAL user IDs:', {
            finalUserId,
            finalSupabaseUserId
          });

          const newOrders = await sql`
            INSERT INTO orders (
              user_id, supabase_user_id, status, total, tax, delivery_fee, tip, order_type, payment_status,
              special_instructions, address, address_data, fulfillment_time, scheduled_time,
              phone, created_at
            ) VALUES (
              ${finalUserId},
              ${finalSupabaseUserId},
              ${orderData.status || 'pending'},
              ${serverCalculatedOrder.total},
              ${serverCalculatedOrder.tax},
              ${deliveryFee.toFixed(2)},
              ${tip.toFixed(2)},
              ${orderData.orderType},
              ${orderData.paymentStatus || 'pending'},
              ${orderData.specialInstructions || ''},
              ${orderData.address || ''},
              ${combinedAddressData ? JSON.stringify(combinedAddressData) : null},
              ${orderData.fulfillmentTime || 'asap'},
              ${formattedScheduledTime},
              ${orderData.phone},
              NOW()
            ) RETURNING *
          `;

          const newOrder = newOrders[0];
          if (!newOrder) {
            throw new Error('Failed to create order');
          }

          console.log('✅ Orders API: Order created with ID:', newOrder.id);

          // Insert order items using validated items within the same transaction
          const orderItemsInserts = [];
          if (validItems && validItems.length > 0) {
            console.log('🛒 Orders API: Creating order items in transaction:', validItems.length);
            for (const item of validItems) {
              const insertResult = await sql`
                INSERT INTO order_items (
                  order_id, menu_item_id, quantity, price, options, special_instructions, created_at
                ) VALUES (
                  ${newOrder.id},
                  ${item.menuItemId},
                  ${item.quantity},
                  ${item.price},
                  ${item.options ? JSON.stringify(item.options) : null},
                  ${item.specialInstructions || ''},
                  NOW()
                ) RETURNING *
              `;
              orderItemsInserts.push(insertResult[0]);
            }
            console.log('✅ Orders API: Order items created in transaction:', orderItemsInserts.length);
          }

          return { newOrder, orderItemsInserts };
        });

        const { newOrder, orderItemsInserts } = transactionResult;
        console.log('✅ Orders API: Atomic transaction completed successfully');

        // Fetch the complete order with items and menu item details
        const orderItems = await sql`
          SELECT
            oi.*,
            mi.name as menu_item_name,
            mi.description as menu_item_description,
            mi.base_price as menu_item_price,
            mi.image_url as menu_item_image_url,
            mi.category as menu_item_category
          FROM order_items oi
          LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
          WHERE oi.order_id = ${newOrder.id}
        `;

        // Transform the data to match expected frontend structure
        const transformedItems = orderItems.map(item => ({
          ...item,
          name: item.menu_item_name || 'Unknown Item',
          menuItem: item.menu_item_name ? {
            name: item.menu_item_name,
            description: item.menu_item_description,
            price: item.menu_item_price,
            imageUrl: item.menu_item_image_url,
            category: item.menu_item_category
          } : null
        }));

        // Fetch user contact information to include in order confirmation
        let userContactInfo = null;
        console.log('📞 Orders API: Attempting to fetch user contact info for order confirmation:', {
          finalUserId,
          finalSupabaseUserId
        });

        if (finalUserId || finalSupabaseUserId) {
          try {
            let userQuery;
            if (finalUserId) {
              console.log('📞 Orders API: Querying contact info for user ID:', finalUserId);
              userQuery = await sql`
                SELECT phone, address, city, state, zip_code
                FROM users
                WHERE id = ${finalUserId}
              `;
            } else {
              console.log('📞 Orders API: Querying contact info for Supabase user:', finalSupabaseUserId);
              userQuery = await sql`
                SELECT phone, address, city, state, zip_code
                FROM users
                WHERE supabase_user_id = ${finalSupabaseUserId}
              `;
            }

            if (userQuery.length > 0) {
              userContactInfo = userQuery[0];
              console.log('📞 Orders API: Retrieved user contact info for order confirmation');
            }
          } catch (contactInfoError) {
            console.error('❌ Orders API: Error retrieving user contact info:', contactInfoError);
          }
        }

        // Track points awarded for this order
        let pointsAwarded = 0;

        // Enhance order object with user contact information and transform field names
        const enhancedOrder = {
          ...newOrder,
          orderType: newOrder.order_type, // Transform snake_case to camelCase
          createdAt: newOrder.created_at, // Transform snake_case to camelCase
          processedAt: newOrder.processed_at,
          completedAt: newOrder.completed_at,
          items: transformedItems,
          userContactInfo: userContactInfo,
          pointsEarned: 0 // Will be updated below if points are awarded
        };

        // Process voucher if provided - Fixed to use user_points_redemptions table
        if (orderData.voucherCode && (finalUserId || finalSupabaseUserId)) {
          try {
            console.log('🎫 Orders API: Processing voucher from redemptions:', orderData.voucherCode);

            // The voucher code format is like "DISC0001" where the last 4 digits are the redemption ID
            const voucherCodeMatch = orderData.voucherCode.match(/([A-Z]+)(\d+)$/);
            if (!voucherCodeMatch) {
              console.warn('⚠️ Orders API: Invalid voucher code format:', orderData.voucherCode);
              return enhancedOrder;
            }

            const redemptionId = parseInt(voucherCodeMatch[2]);
            console.log('🔍 Orders API: Extracted redemption ID:', redemptionId);

            // UNIFIED: Check vouchers in user_points_redemptions table with unified authentication
            let voucherQuery;

            if (finalUserId) {
              // Use user_id for unified lookup (works for both legacy and unified Supabase users)
              voucherQuery = await sql`
                SELECT upr.*, r.name as reward_name, r.description as reward_description,
                       r.reward_type, r.discount, r.free_item, r.free_item_menu_id,
                       r.free_item_category, r.free_item_all_from_category, r.min_order_amount
                FROM user_points_redemptions upr
                LEFT JOIN rewards r ON upr.reward_id = r.id
                WHERE upr.id = ${redemptionId}
                AND upr.user_id = ${finalUserId}
                AND upr.is_used = false
                AND (upr.expires_at IS NULL OR upr.expires_at > NOW())
              `;
            } else if (finalSupabaseUserId) {
              // Fallback for pure Supabase users
              voucherQuery = await sql`
                SELECT upr.*, r.name as reward_name, r.description as reward_description,
                       r.reward_type, r.discount, r.free_item, r.free_item_menu_id,
                       r.free_item_category, r.free_item_all_from_category, r.min_order_amount
                FROM user_points_redemptions upr
                LEFT JOIN rewards r ON upr.reward_id = r.id
                WHERE upr.id = ${redemptionId}
                AND upr.supabase_user_id = ${finalSupabaseUserId}
                AND upr.is_used = false
                AND (upr.expires_at IS NULL OR upr.expires_at > NOW())
              `;
            }

            if (voucherQuery && voucherQuery.length > 0) {
              const voucher = voucherQuery[0];
              console.log('✅ Orders API: Found valid voucher redemption:', voucher);

              // Mark voucher as used in user_points_redemptions table
              await sql`
                UPDATE user_points_redemptions
                SET is_used = true, used_at = NOW()
                WHERE id = ${voucher.id}
              `;

              // If this is a free_item reward, add the free item to the order
              if (voucher.reward_type === 'free_item' && voucher.free_item_menu_id) {
                console.log('🎁 Orders API: Adding free item to order:', {
                  menuItemId: voucher.free_item_menu_id,
                  freeItem: voucher.free_item
                });

                try {
                  // Get menu item details
                  const freeMenuItem = await sql`
                    SELECT * FROM menu_items WHERE id = ${voucher.free_item_menu_id}
                  `;

                  if (freeMenuItem.length > 0) {
                    // Add the free item to order_items with quantity 1 and price 0
                    await sql`
                      INSERT INTO order_items (
                        order_id, menu_item_id, quantity, price, options, special_instructions, created_at
                      ) VALUES (
                        ${newOrder.id},
                        ${voucher.free_item_menu_id},
                        1,
                        '0.00',
                        NULL,
                        'Free item from reward: ${voucher.reward_name}',
                        NOW()
                      )
                    `;
                    console.log('✅ Orders API: Free item added to order successfully');
                  } else {
                    console.warn('⚠️ Orders API: Free item menu item not found:', voucher.free_item_menu_id);
                  }
                } catch (freeItemError) {
                  console.error('❌ Orders API: Error adding free item to order:', freeItemError);
                  // Don't fail the order, just log the error
                }
              }

              // Store voucher details in order for confirmation display
              enhancedOrder.voucherUsed = {
                code: orderData.voucherCode,
                discountAmount: voucher.reward_type === 'free_item' ? 0 : discountAmount, // No discount for free items
                originalDiscountAmount: voucher.discount || 0, // Original reward discount
                discountType: voucher.reward_type || 'discount',
                rewardName: voucher.reward_name || 'Reward',
                redemptionId: voucher.id,
                pointsSpent: voucher.points_spent,
                freeItem: voucher.reward_type === 'free_item' ? voucher.free_item : null
              };

              console.log('✅ Orders API: Voucher marked as used in redemptions table:', {
                redemptionId: voucher.id,
                voucherCode: orderData.voucherCode,
                discountAmount,
                rewardName: voucher.reward_name
              });
            } else {
              console.warn('⚠️ Orders API: Voucher redemption not found or invalid:', {
                voucherCode: orderData.voucherCode,
                redemptionId,
                finalUserId,
                finalSupabaseUserId
              });
            }
          } catch (voucherError) {
            console.error('❌ Orders API: Voucher processing failed:', voucherError);
            // Don't fail the order creation, just log the error
          }
        }

        // CRITICAL POINTS AWARDING: Fixed to use proper user IDs
        console.log('🎁 Orders API: POINTS ELIGIBILITY CHECK:', {
          hasFinalUserId: !!finalUserId,
          hasFinalSupabaseUserId: !!finalSupabaseUserId,
          shouldAwardPoints: !!(finalUserId || finalSupabaseUserId),
          orderTotal: newOrder.total,
          orderId: newOrder.id,
          orderUserId: newOrder.user_id,
          orderSupabaseUserId: newOrder.supabase_user_id
        });

        console.log('🎁 Orders API: POINTS AWARDING CHECK:', {
          hasAuthPayload: !!authPayload,
          finalUserId,
          finalSupabaseUserId,
          authPayloadDebug: authPayload
        });

        // ENHANCED POINTS AWARDING: Now using the correct final user IDs
        console.log('🎯 Orders API: POINTS AWARDING CHECK - Final values before awarding:', {
          finalUserId,
          finalSupabaseUserId,
          authPayload,
          orderTotal: newOrder.total,
          willAwardPoints: !!(finalUserId || finalSupabaseUserId)
        });

        // Award points for ALL orders (not just paid ones) - restaurant wants points for every order
        // Payment will be collected at pickup/delivery, so we trust all orders are valid
        if ((finalUserId || finalSupabaseUserId)) {
          try {
            const pointsToAward = Math.floor(parseFloat(newOrder.total));
            const userType = finalUserId ? 'legacy' : 'supabase';

            console.log('========================================');
            console.log('🎁 POINTS AWARD PROCESS STARTING');
            console.log('========================================');
            console.log('📊 Points award details:', {
              userType,
              finalUserId,
              finalSupabaseUserId,
              pointsToAward,
              orderTotal: newOrder.total,
              orderId: newOrder.id,
              orderUserId: newOrder.user_id,
              orderSupabaseUserId: newOrder.supabase_user_id
            });

            // VERIFICATION: Ensure order was created with correct user IDs
            if (finalUserId && newOrder.user_id !== finalUserId) {
              console.error('❌ Orders API: CRITICAL MISMATCH - Order user_id does not match finalUserId');
              console.error('❌ Orders API: Expected:', finalUserId, 'Actual:', newOrder.user_id);
            }

            if (finalSupabaseUserId && newOrder.supabase_user_id !== finalSupabaseUserId) {
              console.error('❌ Orders API: CRITICAL MISMATCH - Order supabase_user_id does not match finalSupabaseUserId');
              console.error('❌ Orders API: Expected:', finalSupabaseUserId, 'Actual:', newOrder.supabase_user_id);
            }

            // Use atomic transaction for points operations
            const pointsResult = await sql.begin(async (sql) => {
              console.log('🔒 Orders API: Starting atomic transaction for points award');

              // Prioritize Supabase user ID over legacy user ID
              if (finalSupabaseUserId) {
                // Award points to Supabase user using final Supabase ID
                console.log('🎯 Orders API: Awarding points to SUPABASE user:', finalSupabaseUserId);
                return await awardPointsToSupabaseUser(sql, finalSupabaseUserId, newOrder, pointsToAward, authPayload);
              } else if (finalUserId) {
                // Award points to legacy user using final user ID
                console.log('🎯 Orders API: Awarding points to LEGACY user:', finalUserId);
                return await awardPointsToLegacyUser(sql, finalUserId, newOrder, pointsToAward);
              } else {
                throw new Error('No valid user identifier for points award');
              }
            });

            console.log('🎁 Orders API: Points transaction completed:', pointsResult);

            if (pointsResult && pointsResult.success) {
              console.log('✅ Orders API: POINTS AWARDED SUCCESSFULLY:', pointsResult.pointsAwarded, 'points to', pointsResult.userType, 'user');
              pointsAwarded = pointsResult.pointsAwarded;
              enhancedOrder.pointsEarned = pointsAwarded; // Add points to order response
            } else {
              console.error('❌ Orders API: Points transaction failed:', pointsResult);
            }

          } catch (pointsError) {
            console.error('❌ Orders API: CRITICAL - Points awarding failed:', pointsError);
            console.error('❌ Orders API: Points error details:', {
              name: pointsError.name,
              message: pointsError.message,
              stack: pointsError.stack
            });
            // Don't fail the order if points fail, but log extensively
          }
        } else {
          console.log('⚠️ Orders API: Points not awarded - No user authenticated');
          console.log('⚠️ Orders API: POINTS DEBUGGING INFO:', {
            hasUser: !!(finalUserId || finalSupabaseUserId),
            finalUserId: finalUserId,
            finalSupabaseUserId: finalSupabaseUserId,
            reason: 'Guest order - no user ID',
            authPayload: authPayload,
            orderUserInfo: {
              user_id: newOrder.user_id,
              supabase_user_id: newOrder.supabase_user_id
            }
          });
        }

        // ASYNC: Send email confirmation and print receipt (don't block order response)
        // NOTE: ShipDay integration moved to status update (when kitchen clicks "Start Cooking")
        setTimeout(async () => {
          try {
            // Auto-print order receipt to thermal printer
            try {
              console.log('🖨️  Orders API: Auto-printing order receipt for order #', newOrder.id);
              const printResponse = await fetch(`${process.env.URL || 'http://localhost:8888'}/.netlify/functions/printer-print-order`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  orderId: newOrder.id
                })
              });

              if (printResponse.ok) {
                const printResult = await printResponse.json();
                console.log('✅ Orders API: Order auto-printed successfully:', printResult);
              } else {
                console.warn('⚠️  Orders API: Auto-print failed (printer may not be configured):', await printResponse.text());
              }
            } catch (printError) {
              console.warn('⚠️  Orders API: Auto-print error (continuing without printing):', printError);
              // Don't fail order creation if printing fails
            }

            // Send order confirmation email
            const customerEmail = orderData.email || authPayload?.email;
            const customerName = authPayload?.firstName ?
                               `${authPayload.firstName} ${authPayload.lastName || ''}`.trim() :
                               authPayload?.username || 'Valued Customer';

            if (customerEmail) {
              try {
                const emailOrderData = {
                  orderId: newOrder.id.toString(),
                  customerEmail: customerEmail,
                  customerName: customerName,
                  customerPhone: orderData.phone || '',
                  orderTotal: finalOrderData.total,
                  orderDate: new Date().toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }),
                  orderType: orderData.type || 'pickup',
                  orderStatus: 'Confirmed',
                  estimatedTime: orderData.fulfillmentTime === 'asap' ? '30-40 minutes' :
                               orderData.scheduledTime ? new Date(orderData.scheduledTime).toLocaleTimeString('en-US', {
                                 hour: 'numeric',
                                 minute: '2-digit',
                                 hour12: true
                               }) : '30-40 minutes',
                  deliveryAddress: orderData.type === 'delivery' ? orderData.address : undefined,
                  deliveryInstructions: orderData.deliveryInstructions || undefined,
                  paymentMethod: orderData.paymentMethod === 'stripe' ? 'Credit Card' :
                               orderData.paymentMethod === 'cash' ? 'Cash' : 'Credit Card',
                  items: transformedItems.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: parseFloat(item.basePrice || item.price || '0').toFixed(2),
                    modifications: item.notes || (item.options ?
                      Object.entries(item.options)
                        .filter(([key, value]) => value && value !== 'none')
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(', ') : undefined)
                  })),
                  pointsEarned: pointsAwarded || undefined,
                  totalPoints: userPoints ? (userPoints.points + (pointsAwarded || 0)) : undefined,
                  voucherUsed: enhancedOrder.voucherUsed ? true : false,
                  voucherDiscount: enhancedOrder.voucherUsed ?
                    enhancedOrder.voucherUsed.discountAmount?.toString() : undefined,
                  voucherCode: enhancedOrder.voucherUsed ?
                    enhancedOrder.voucherUsed.code : undefined
                };

                const emailResponse = await fetch('/api/send-order-confirmation', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(emailOrderData)
                });

                if (emailResponse.ok) {
                  console.log('✅ Orders API: Order confirmation email sent successfully');
                } else {
                  console.error('❌ Orders API: Failed to send order confirmation email:', await emailResponse.text());
                }
              } catch (emailError) {
                console.error('❌ Orders API: Order confirmation email error:', emailError);
                // Don't fail the order if email fails
              }
            }
          } catch (asyncError) {
            console.error('❌ Orders API: Async operation failed:', asyncError);
          }
        }, 100); // 100ms delay to ensure order response is sent first

        console.log('✅ Orders API: Order creation completed successfully');

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(enhancedOrder)
        };
      } catch (orderError) {
        console.error('❌ Orders API: Error creating order:', orderError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ 
            error: 'Failed to create order',
            details: orderError instanceof Error ? orderError.message : 'Unknown error'
          })
        };
      }

    } else if (event.httpMethod === 'PATCH') {
      console.log('📝 PATCH request received for orders endpoint');

      // PATCH requests require staff authentication
      if (!authPayload || !isStaff(authPayload)) {
        console.log('❌ PATCH authentication failed');
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized' })
        };
      }

      const requestData = JSON.parse(event.body || '{}');
      console.log('📝 PATCH request data:', requestData);

      // Extract order ID from URL path (e.g., /api/orders/14)
      let orderId = requestData.orderId;
      if (!orderId) {
        const pathParts = event.path.split('/');
        const ordersIndex = pathParts.findIndex(part => part === 'orders');
        if (ordersIndex !== -1 && pathParts[ordersIndex + 1]) {
          orderId = parseInt(pathParts[ordersIndex + 1]);
        }
      }

      if (!orderId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Order ID is required' })
        };
      }

      console.log('🔄 Updating order:', orderId, 'with data:', requestData);

      try {
        // Get current order to check if it exists
        const currentOrder = await sql`
          SELECT * FROM orders WHERE id = ${orderId}
        `;

        if (currentOrder.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Order not found' })
          };
        }

        // Build update query dynamically based on provided fields
        const updateFields: string[] = [];
        const updateValues: any[] = [];
        let valueIndex = 1;

        if (requestData.status !== undefined) {
          updateFields.push(`status = $${valueIndex}`);
          updateValues.push(requestData.status);
          valueIndex++;
        }

        if (requestData.kitchen_status !== undefined) {
          updateFields.push(`kitchen_status = $${valueIndex}`);
          updateValues.push(requestData.kitchen_status);
          valueIndex++;
        }

        if (requestData.delivery_status !== undefined) {
          updateFields.push(`delivery_status = $${valueIndex}`);
          updateValues.push(requestData.delivery_status);
          valueIndex++;
        }

        if (requestData.notes !== undefined) {
          updateFields.push(`notes = $${valueIndex}`);
          updateValues.push(requestData.notes);
          valueIndex++;
        }

        if (updateFields.length === 0) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'No valid fields to update' })
          };
        }

        // Add updated_at timestamp
        updateFields.push(`updated_at = NOW()`);

        // Execute update
        const updateQuery = `
          UPDATE orders
          SET ${updateFields.join(', ')}
          WHERE id = $${valueIndex}
          RETURNING *
        `;
        updateValues.push(orderId);

        const updatedOrder = await sql.unsafe(updateQuery, updateValues);

        console.log('✅ Order updated successfully:', updatedOrder[0]);

        // SHIPDAY INTEGRATION: Dispatch to ShipDay when status changes to "cooking" for delivery orders
        console.log('🔍 ShipDay check:', {
          requestStatus: requestData.status,
          orderType: currentOrder[0].order_type,
          hasShipdayKey: !!process.env.SHIPDAY_API_KEY,
          willDispatch: requestData.status === 'cooking' && currentOrder[0].order_type === 'delivery' && !!process.env.SHIPDAY_API_KEY
        });

        let shipdayDebugData = null;

        if (requestData.status === 'cooking' && currentOrder[0].order_type === 'delivery' && process.env.SHIPDAY_API_KEY) {
          console.log('📦 Orders API: Status changed to cooking - dispatching to ShipDay for order', orderId);

          // Parse address data
          let addressData;
          try {
            addressData = typeof currentOrder[0].address_data === 'string'
              ? JSON.parse(currentOrder[0].address_data)
              : currentOrder[0].address_data;
          } catch (e) {
            console.error('❌ Failed to parse address_data:', e);
            addressData = null;
          }

          if (addressData) {
            // Get order items with menu item names
            const orderItems = await sql`
              SELECT
                oi.*,
                mi.name as menu_item_name
              FROM order_items oi
              LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
              WHERE oi.order_id = ${orderId}
            `;

            console.log('📦 ShipDay: Fetched order items for order', orderId, ':', {
              itemCount: orderItems.length,
              items: orderItems.map(i => ({
                id: i.id,
                name: i.name,
                menu_item_name: i.menu_item_name,
                quantity: i.quantity,
                price: i.price,
                options: i.options
              }))
            });

            // CRITICAL CHECK: If no items found, log error and skip ShipDay
            if (orderItems.length === 0) {
              console.error('❌ ShipDay: NO ORDER ITEMS FOUND FOR ORDER', orderId, '- CANNOT DISPATCH TO SHIPDAY');
              console.error('❌ ShipDay: This order has no items in the order_items table!');
            }

            // Get user contact info
            let userContactInfo;
            if (currentOrder[0].user_id) {
              const userResult = await sql`SELECT first_name, last_name, email, phone FROM users WHERE id = ${currentOrder[0].user_id}`;
              userContactInfo = userResult[0];
            } else if (currentOrder[0].supabase_user_id) {
              const userResult = await sql`SELECT first_name, last_name, email, phone FROM users WHERE supabase_user_id = ${currentOrder[0].supabase_user_id}`;
              userContactInfo = userResult[0];
            }

            const customerName = userContactInfo?.first_name && userContactInfo?.last_name
              ? `${userContactInfo.first_name} ${userContactInfo.last_name}`.trim()
              : (userContactInfo?.username || "Customer");

            const customerEmail = userContactInfo?.email || currentOrder[0].email || "";
            const customerPhone = currentOrder[0].phone || userContactInfo?.phone || "";

            // Format items for ShipDay
            const formattedItems = orderItems.map(item => {
              const itemName = item.name || item.menu_item_name || "Menu Item";
              const itemQuantity = parseInt(item.quantity || "1");
              const itemPrice = parseFloat(item.price || "0") / itemQuantity; // Unit price

              // Parse options/customizations if they exist
              let optionsText = '';
              try {
                const options = typeof item.options === 'string' ? JSON.parse(item.options) : item.options;
                if (Array.isArray(options) && options.length > 0) {
                  optionsText = ' (' + options.map(opt => opt.itemName || opt.name).join(', ') + ')';
                }
              } catch (e) {
                // Ignore parsing errors
              }

              return {
                name: itemName + optionsText,
                quantity: itemQuantity,
                unitPrice: itemPrice
              };
            });

            console.log('📦 ShipDay: Formatted items for payload:', formattedItems);

            // Parse order breakdown for costing
            const orderBreakdown = addressData.orderBreakdown || {};
            const subtotal = orderBreakdown.subtotal || parseFloat(currentOrder[0].total) - parseFloat(currentOrder[0].tax || 0) - parseFloat(currentOrder[0].delivery_fee || 0) - parseFloat(currentOrder[0].tip || 0);
            const tax = parseFloat(currentOrder[0].tax || 0);
            const deliveryFee = parseFloat(currentOrder[0].delivery_fee || 0);
            const tip = parseFloat(currentOrder[0].tip || 0);
            const discount = (orderBreakdown.discount || 0) + (orderBreakdown.voucherDiscount || 0);

            // Store debug info before timeout
            const debugInfo = {
              rawOrderData: {
                total: currentOrder[0].total,
                tax: currentOrder[0].tax,
                delivery_fee: currentOrder[0].delivery_fee,
                tip: currentOrder[0].tip,
                allFields: Object.keys(currentOrder[0])
              },
              calculatedCosting: {
                subtotal,
                tax,
                deliveryFee,
                tip,
                discount
              },
              formattedItems
            };

            console.log('📦 ShipDay Debug Info:', debugInfo);

            // Format scheduled delivery time if present
            let scheduledTimeFields = {};
            if (currentOrder[0].fulfillment_time === 'scheduled' && currentOrder[0].scheduled_time) {
              try {
                const scheduledDate = new Date(currentOrder[0].scheduled_time);

                // Format expectedDeliveryDate as "yyyy-mm-dd"
                const year = scheduledDate.getFullYear();
                const month = String(scheduledDate.getMonth() + 1).padStart(2, '0');
                const day = String(scheduledDate.getDate()).padStart(2, '0');
                const expectedDeliveryDate = `${year}-${month}-${day}`;

                // Format expectedDeliveryTime as "hh:mm"
                const deliveryHours = String(scheduledDate.getHours()).padStart(2, '0');
                const deliveryMinutes = String(scheduledDate.getMinutes()).padStart(2, '0');
                const expectedDeliveryTime = `${deliveryHours}:${deliveryMinutes}`;

                // Set pickup time to 15 minutes before delivery time
                const pickupDate = new Date(scheduledDate.getTime() - 15 * 60 * 1000);
                const pickupHours = String(pickupDate.getHours()).padStart(2, '0');
                const pickupMinutes = String(pickupDate.getMinutes()).padStart(2, '0');
                const expectedPickupTime = `${pickupHours}:${pickupMinutes}`;

                scheduledTimeFields = {
                  expectedDeliveryDate,
                  expectedPickupTime,
                  expectedDeliveryTime
                };

                console.log('📦 ShipDay: Scheduled delivery time fields:', scheduledTimeFields);
              } catch (timeParseError) {
                console.error('❌ ShipDay: Error parsing scheduled time:', timeParseError);
              }
            }

            const shipdayPayload = {
              orderItems: formattedItems,
              pickup: {
                address: {
                  street: "123 Main St",
                  city: "Asheville",
                  state: "NC",
                  zip: "28801",
                  country: "United States"
                },
                contactPerson: {
                  name: "Favillas NY Pizza",
                  phone: "5551234567"
                }
              },
              dropoff: {
                address: {
                  street: addressData.street || addressData.fullAddress,
                  city: addressData.city,
                  state: addressData.state,
                  zip: addressData.zipCode,
                  country: "United States"
                },
                contactPerson: {
                  name: customerName && customerName.trim() !== "" ? customerName.trim() : "Customer",
                  phone: customerPhone.replace(/[^\d]/g, ''),
                  ...(customerEmail && { email: customerEmail })
                }
              },
              orderNumber: `FAV-${orderId}`,
              totalOrderCost: parseFloat(currentOrder[0].total),
              deliveryFee: deliveryFee,
              tip: tip,
              tax: tax,
              paymentMethod: 'credit_card',
              customerName: customerName && customerName.trim() !== "" ? customerName.trim() : "Customer",
              customerPhoneNumber: customerPhone.replace(/[^\d]/g, ''),
              customerAddress: `${addressData.street || addressData.fullAddress}, ${addressData.city}, ${addressData.state} ${addressData.zipCode}`,
              ...(customerEmail && { customerEmail: customerEmail }),
              ...scheduledTimeFields // Add scheduled delivery time fields if present
            };

            // Store debug data for response (will be updated with ShipDay response)
            shipdayDebugData = {
              rawOrderData: debugInfo.rawOrderData,
              calculatedCosting: debugInfo.calculatedCosting,
              formattedItems: debugInfo.formattedItems,
              shipdayPayload,
              shipdayResponse: null // Will be filled after API call
            };

            // Dispatch to ShipDay synchronously for debugging (normally async)
            (async () => {
              try {
                console.log('📦 ========================================');
                console.log('📦 ShipDay: SENDING ORDER TO SHIPDAY');
                console.log('📦 ========================================');
                console.log('📦 ShipDay: Order ID:', orderId);
                console.log('📦 ShipDay: Order Items Count:', shipdayPayload.orderItems?.length || 0);
                console.log('📦 ShipDay: Order Items:', JSON.stringify(shipdayPayload.orderItems, null, 2));
                console.log('📦 ShipDay: Full Payload:', JSON.stringify(shipdayPayload, null, 2));

                const shipdayResponse = await fetch('https://api.shipday.com/orders', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Basic ${process.env.SHIPDAY_API_KEY}`,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(shipdayPayload)
                });

                const shipdayResult = await shipdayResponse.text();
                console.log('📦 ShipDay: Response Status:', shipdayResponse.status);
                console.log('📦 ShipDay: Response Body:', shipdayResult);

                // Store response for debugging
                const responseDebug = {
                  status: shipdayResponse.status,
                  statusText: shipdayResponse.statusText,
                  body: shipdayResult,
                  timestamp: new Date().toISOString()
                };

                if (shipdayResponse.ok) {
                  const parsedResult = JSON.parse(shipdayResult);
                  console.log('📦 ShipDay: Parsed Response:', JSON.stringify(parsedResult, null, 2));
                  responseDebug.parsed = parsedResult;

                  if (parsedResult.success) {
                    await sql`
                      UPDATE orders
                      SET shipday_order_id = ${parsedResult.orderId}, shipday_status = 'pending'
                      WHERE id = ${orderId}
                    `;
                    console.log(`✅ Orders API: ShipDay order created successfully for order #${orderId}`);
                    console.log(`✅ ShipDay Order ID: ${parsedResult.orderId}`);
                    responseDebug.success = true;
                    responseDebug.shipdayOrderId = parsedResult.orderId;
                  } else {
                    console.error('❌ ShipDay API returned unsuccessful response:', parsedResult);
                    console.error('❌ Error details:', parsedResult.error || parsedResult.message || 'No error details provided');
                    responseDebug.success = false;
                    responseDebug.error = parsedResult.error || parsedResult.message || 'Unknown error';
                  }
                } else {
                  console.error('❌ ShipDay API request failed with status:', shipdayResponse.status);
                  console.error('❌ Response body:', shipdayResult);
                  responseDebug.success = false;
                  responseDebug.error = `HTTP ${shipdayResponse.status}: ${shipdayResult}`;
                }

                // Log the response to file for later retrieval
                console.log('📦 SHIPDAY_RESPONSE_DEBUG:', JSON.stringify(responseDebug));
              } catch (shipdayError) {
                console.error('❌ ShipDay integration error:', shipdayError);
                console.log('📦 SHIPDAY_ERROR_DEBUG:', JSON.stringify({
                  error: shipdayError.message,
                  stack: shipdayError.stack,
                  timestamp: new Date().toISOString()
                }));
              }
            })();
          } else {
            console.warn('⚠️ No address data available for ShipDay dispatch');
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: 'Order updated successfully',
            order: updatedOrder[0],
            // Include debug info for preview testing
            ...(shipdayDebugData ? { shipdayDebug: shipdayDebugData } : {})
          })
        };

      } catch (updateError) {
        console.error('❌ Order update error:', updateError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Failed to update order',
            details: updateError instanceof Error ? updateError.message : 'Unknown error'
          })
        };
      }

    } else if (event.httpMethod === 'DELETE') {
      // DELETE requests require staff authentication
      if (!authPayload || !isStaff(authPayload)) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Unauthorized' })
        };
      }

      const requestData = JSON.parse(event.body || '{}');

      // Support both single ID and bulk deletion
      const orderIds = requestData.orderIds || (requestData.orderId ? [requestData.orderId] : []);

      if (orderIds.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Order ID(s) required' })
        };
      }

      console.log('🗑️ Deleting orders:', orderIds);

      try {
        let deletedCount = 0;

        for (const orderId of orderIds) {
          // Delete related records first to avoid foreign key constraints
          await sql`DELETE FROM order_items WHERE order_id = ${orderId}`;

          // Delete the order
          const deletedOrder = await sql`DELETE FROM orders WHERE id = ${orderId} RETURNING id`;
          if (deletedOrder.length > 0) {
            deletedCount++;
          }
        }

        console.log(`✅ Successfully deleted ${deletedCount} orders`);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            message: `Successfully deleted ${deletedCount} order(s)`,
            deletedCount
          })
        };

      } catch (deleteError) {
        console.error('❌ Order deletion error:', deleteError);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({
            error: 'Failed to delete orders',
            details: deleteError instanceof Error ? deleteError.message : 'Unknown error'
          })
        };
      }

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }
  } catch (error) {
    console.error('Orders API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};