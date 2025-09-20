import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';

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

function authenticateToken(event: any): { userId: number | null; supabaseUserId: string | null; username: string; role: string; isSupabase: boolean } | null {
  // Check for JWT token in Authorization header first
  const authHeader = event.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  // If no Authorization header, check for auth-token cookie
  if (!token) {
    const cookies = event.headers.cookie;
    if (cookies) {
      const authCookie = cookies.split(';').find((c: string) => c.trim().startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }
  }

  if (!token) {
    return null;
  }

  try {
    // First try to decode as Supabase JWT token
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      console.log('🔍 Supabase token payload:', payload);

      if (payload.iss && payload.iss.includes('supabase')) {
        // This is a Supabase token, extract user ID
        const supabaseUserId = payload.sub;
        console.log('✅ Supabase user ID:', supabaseUserId);

        // For Supabase users, return the UUID directly
        return {
          userId: null, // No integer user ID for Supabase users
          supabaseUserId: supabaseUserId,
          username: payload.email || 'supabase_user',
          role: 'customer',
          isSupabase: true
        };
      }
    } catch (supabaseError) {
      console.log('Not a Supabase token, trying JWT verification');
    }

    // Fallback to our JWT verification
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    return {
      userId: decoded.userId,
      supabaseUserId: null,
      username: decoded.username,
      role: decoded.role || 'customer',
      isSupabase: false
    };
  } catch (error) {
    console.error('Token authentication failed:', error);
    return null;
  }
}

export const handler: Handler = async (event, context) => {
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  const authPayload = authenticateToken(event);

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
        if (authPayload.role === 'admin' || authPayload.role === 'kitchen' || authPayload.role === 'manager') {
          // Staff can see any order
          orderQuery = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
        } else {
          // Customers can only see their own orders
          if (authPayload.isSupabase) {
            // Use supabase_user_id for Supabase users
            orderQuery = await sql`SELECT * FROM orders WHERE id = ${orderId} AND supabase_user_id = ${authPayload.supabaseUserId}`;
          } else {
            // Use user_id for legacy users
            orderQuery = await sql`SELECT * FROM orders WHERE id = ${orderId} AND user_id = ${authPayload.userId}`;
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
        const transformedItems = items.map(item => ({
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
          total: parseFloat(order.total || '0'),
          tax: parseFloat(order.tax || '0'),
          delivery_fee: parseFloat(order.delivery_fee || '0'),
          tip: parseFloat(order.tip || '0'),
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
      
      if (authPayload.role === 'admin' || authPayload.role === 'kitchen' || authPayload.role === 'manager') {
        // Staff can see all orders
        console.log('📋 Orders API: Getting all orders (staff access)');
        allOrders = await sql`SELECT * FROM orders ORDER BY created_at DESC`;
      } else {
        // Customers can only see their own orders
        if (authPayload.isSupabase) {
          console.log('📋 Orders API: Getting orders for Supabase user:', authPayload.supabaseUserId);
          allOrders = await sql`SELECT * FROM orders WHERE supabase_user_id = ${authPayload.supabaseUserId} ORDER BY created_at DESC`;
        } else {
          console.log('📋 Orders API: Getting orders for legacy user:', authPayload.userId);
          allOrders = await sql`SELECT * FROM orders WHERE user_id = ${authPayload.userId} ORDER BY created_at DESC`;
        }
      }
      
      console.log('📋 Orders API: Found', allOrders.length, 'orders');
      
      // Get order items for each order with menu item details
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
            const transformedItems = items.map(item => ({
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
            
            // Ensure numeric values are properly converted for frontend
            const transformedOrder = {
              ...order,
              total: parseFloat(order.total || '0'),
              tax: parseFloat(order.tax || '0'),
              delivery_fee: parseFloat(order.delivery_fee || '0'),
              tip: parseFloat(order.tip || '0'),
              items: transformedItems
            };

            return transformedOrder;
          } catch (itemError) {
            console.error('❌ Error getting items for order', order.id, ':', itemError);
            // Still ensure numeric conversion even on error
            return {
              ...order,
              total: parseFloat(order.total || '0'),
              tax: parseFloat(order.tax || '0'),
              delivery_fee: parseFloat(order.delivery_fee || '0'),
              tip: parseFloat(order.tip || '0'),
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
      
        // Set the userId and supabaseUserId appropriately
        let userId = null;
        let supabaseUserId = null;

        if (authPayload) {
          if (authPayload.isSupabase) {
            // Supabase user - use supabase_user_id only
            supabaseUserId = authPayload.supabaseUserId;
            userId = null; // Don't use integer user_id for Supabase users
            console.log('🔑 Orders API: Using Supabase user ID:', supabaseUserId);
          } else {
            // Legacy JWT user - use integer user_id
            userId = authPayload.userId;
            console.log('🔑 Orders API: Using legacy user ID:', userId);

            // Ensure user record exists for legacy users
            try {
              const existingUser = await sql`SELECT id FROM users WHERE id = ${userId}`;

              if (existingUser.length === 0) {
                console.log('⚠️ Orders API: Creating user record for legacy authenticated user');

                // Extract address components for new user creation
                const addressComponents = {
                  phone: orderData.phone || '',
                  address: orderData.address || '',
                  city: orderData.addressData?.city || '',
                  state: orderData.addressData?.state || '',
                  zip_code: orderData.addressData?.zipCode || orderData.addressData?.zip || ''
                };

                // Create user record with contact information
                await sql`
                  INSERT INTO users (
                    id, username, email, role, phone, address, city, state, zip_code,
                    password, first_name, last_name, created_at, updated_at
                  ) VALUES (
                    ${userId},
                    ${authPayload.username || 'user'},
                    ${authPayload.username || 'user@example.com'},
                    'customer',
                    ${addressComponents.phone},
                    ${addressComponents.address},
                    ${addressComponents.city},
                    ${addressComponents.state},
                    ${addressComponents.zip_code},
                    'AUTH_USER',
                    ${authPayload.username?.split('@')[0] || 'User'},
                    'Customer',
                    NOW(),
                    NOW()
                  )
                  ON CONFLICT (id) DO NOTHING
                `;

                // Initialize user points record
                await sql`
                  INSERT INTO user_points (user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
                  VALUES (${userId}, 0, 0, 0, NOW(), NOW(), NOW())
                  ON CONFLICT (user_id) DO NOTHING
                `;

                console.log('✅ Orders API: Created user records for legacy user:', userId);
              }
            } catch (createUserError) {
              console.error('❌ Orders API: Error with legacy user record:', createUserError);
              // Continue with the user ID anyway
            }
          }
        } else {
          // Guest order
          userId = orderData.userId || null;
        }

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
        
        console.log('🛒 Orders API: Creating order with userId:', userId, 'scheduledTime:', formattedScheduledTime);

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

        // Use server-calculated values instead of frontend values
        const serverCalculatedOrder = {
          ...orderData,
          total: finalTotal.toFixed(2),
          tax: tax.toFixed(2),
          subtotal: discountedSubtotal.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
          deliveryFee: adjustedDeliveryFee.toFixed(2),
          items: validItems // Use only valid items
        };

        // Save contact information to user profile for authenticated users
        console.log('🔍 Orders API: Contact info saving check:', {
          hasUserId: !!userId,
          hasSupabaseUserId: !!supabaseUserId,
          hasPhone: !!orderData.phone,
          hasAddress: !!orderData.address,
          hasAddressData: !!orderData.addressData,
          orderDataKeys: Object.keys(orderData),
          phoneValue: orderData.phone,
          addressValue: orderData.address,
          addressDataValue: orderData.addressData
        });

        if ((userId || supabaseUserId) && (orderData.phone || orderData.address || orderData.addressData)) {
          try {
            console.log('💾 Orders API: Saving contact info to user profile for user:', userId || supabaseUserId);

            // Extract address components from orderData
            const addressComponents = {
              phone: orderData.phone || '',
              address: orderData.address || '',
              city: orderData.addressData?.city || '',
              state: orderData.addressData?.state || '',
              zip_code: orderData.addressData?.zipCode || orderData.addressData?.zip || ''
            };

            console.log('📍 Address components to save:', addressComponents);
            console.log('📍 User identification:', { userId, supabaseUserId, authPayload: authPayload?.username });

            if (supabaseUserId) {
              // Supabase user - create or update profile
              const existingSupabaseUser = await sql`
                SELECT id FROM users WHERE supabase_user_id = ${supabaseUserId}
              `;

              if (existingSupabaseUser.length === 0) {
                // Create new Supabase user record
                await sql`
                  INSERT INTO users (
                    supabase_user_id, username, email, role, phone, address, city, state, zip_code,
                    first_name, last_name, password, created_at, updated_at
                  ) VALUES (
                    ${supabaseUserId},
                    ${authPayload?.username || 'google_user'},
                    ${authPayload?.username || 'user@example.com'},
                    'customer',
                    ${addressComponents.phone},
                    ${addressComponents.address},
                    ${addressComponents.city},
                    ${addressComponents.state},
                    ${addressComponents.zip_code},
                    ${authPayload?.username?.split('@')[0] || 'User'},
                    'Customer',
                    'GOOGLE_USER',
                    NOW(),
                    NOW()
                  )
                  ON CONFLICT (supabase_user_id) DO UPDATE SET
                    phone = COALESCE(NULLIF(${addressComponents.phone}, ''), users.phone),
                    address = COALESCE(NULLIF(${addressComponents.address}, ''), users.address),
                    city = COALESCE(NULLIF(${addressComponents.city}, ''), users.city),
                    state = COALESCE(NULLIF(${addressComponents.state}, ''), users.state),
                    zip_code = COALESCE(NULLIF(${addressComponents.zip_code}, ''), users.zip_code),
                    updated_at = NOW()
                `;
                console.log('✅ Created/updated Supabase user profile with contact info');
              } else {
                // Update existing Supabase user
                await sql`
                  UPDATE users SET
                    phone = COALESCE(NULLIF(${addressComponents.phone}, ''), phone),
                    address = COALESCE(NULLIF(${addressComponents.address}, ''), address),
                    city = COALESCE(NULLIF(${addressComponents.city}, ''), city),
                    state = COALESCE(NULLIF(${addressComponents.state}, ''), state),
                    zip_code = COALESCE(NULLIF(${addressComponents.zip_code}, ''), zip_code),
                    updated_at = NOW()
                  WHERE supabase_user_id = ${supabaseUserId}
                `;
                console.log('✅ Updated existing Supabase user profile with contact info');
              }

              // Initialize user points record for Supabase user if needed
              await sql`
                INSERT INTO user_points (supabase_user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
                VALUES (${supabaseUserId}, 0, 0, 0, NOW(), NOW(), NOW())
                ON CONFLICT DO NOTHING
              `;

            } else if (userId) {
              // Legacy user - update profile
              await sql`
                UPDATE users SET
                  phone = COALESCE(NULLIF(${addressComponents.phone}, ''), phone),
                  address = COALESCE(NULLIF(${addressComponents.address}, ''), address),
                  city = COALESCE(NULLIF(${addressComponents.city}, ''), city),
                  state = COALESCE(NULLIF(${addressComponents.state}, ''), state),
                  zip_code = COALESCE(NULLIF(${addressComponents.zip_code}, ''), zip_code),
                  updated_at = NOW()
                WHERE id = ${userId}
              `;
              console.log('✅ Updated legacy user profile with contact info');
            }

          } catch (contactInfoError) {
            console.error('❌ Orders API: Error saving contact info to profile:', contactInfoError);
            // Don't fail the order if contact info save fails
          }
        } else {
          console.log('⚠️ Orders API: Contact info NOT saved because:', {
            noUserId: !userId && !supabaseUserId,
            noContactData: !orderData.phone && !orderData.address && !orderData.addressData,
            userId,
            supabaseUserId,
            phone: orderData.phone,
            address: orderData.address,
            addressData: orderData.addressData
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

          const newOrders = await sql`
            INSERT INTO orders (
              user_id, supabase_user_id, status, total, tax, delivery_fee, tip, order_type, payment_status,
              special_instructions, address, address_data, fulfillment_time, scheduled_time,
              phone, created_at
            ) VALUES (
              ${userId},
              ${supabaseUserId},
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
        console.log('📞 Orders API: Attempting to fetch user contact info for order confirmation:', { userId, supabaseUserId });

        if (userId || supabaseUserId) {
          try {
            let userQuery;
            if (supabaseUserId) {
              console.log('📞 Orders API: Querying contact info for Supabase user:', supabaseUserId);
              userQuery = await sql`
                SELECT phone, address, city, state, zip_code
                FROM users
                WHERE supabase_user_id = ${supabaseUserId}
              `;
            } else {
              console.log('📞 Orders API: Querying contact info for legacy user:', userId);
              userQuery = await sql`
                SELECT phone, address, city, state, zip_code
                FROM users
                WHERE id = ${userId}
              `;
            }

            console.log('📞 Orders API: User query result:', userQuery);

            if (userQuery.length > 0) {
              userContactInfo = userQuery[0];
              console.log('📞 Orders API: Retrieved user contact info for order confirmation:', userContactInfo);
            } else {
              console.log('⚠️ Orders API: No user record found for contact info retrieval');
            }
          } catch (contactInfoError) {
            console.error('❌ Orders API: Error retrieving user contact info:', contactInfoError);
          }
        } else {
          console.log('⚠️ Orders API: No user ID available for contact info retrieval');
        }

        // Enhance order object with user contact information
        const enhancedOrder = {
          ...newOrder,
          items: transformedItems,
          userContactInfo: userContactInfo
        };

        // Process voucher if provided
        if (orderData.voucherCode && (userId || supabaseUserId)) {
          try {
            console.log('🎫 Orders API: Processing voucher:', orderData.voucherCode);

            // Get voucher details from user_vouchers table (correct table for vouchers)
            let voucherQuery;

            if (supabaseUserId) {
              voucherQuery = await sql`
                SELECT uv.*, r.name as reward_name
                FROM user_vouchers uv
                LEFT JOIN rewards r ON uv.reward_id = r.id
                WHERE uv.voucher_code = ${orderData.voucherCode}
                AND uv.user_id IN (
                  SELECT id FROM users WHERE supabase_user_id = ${supabaseUserId}
                )
                AND uv.status = 'active'
                AND (uv.expires_at IS NULL OR uv.expires_at > NOW())
              `;
            } else {
              voucherQuery = await sql`
                SELECT uv.*, r.name as reward_name
                FROM user_vouchers uv
                LEFT JOIN rewards r ON uv.reward_id = r.id
                WHERE uv.voucher_code = ${orderData.voucherCode}
                AND uv.user_id = ${userId}
                AND uv.status = 'active'
                AND (uv.expires_at IS NULL OR uv.expires_at > NOW())
              `;
            }

            if (voucherQuery.length > 0) {
              const voucher = voucherQuery[0];

              // Mark voucher as used in user_vouchers table
              await sql`
                UPDATE user_vouchers
                SET status = 'used', used_at = NOW()
                WHERE id = ${voucher.id}
              `;

              // Store voucher details in order for confirmation display
              enhancedOrder.voucherUsed = {
                code: voucher.voucher_code,
                discountAmount: discountAmount, // Use actual calculated discount
                originalDiscountAmount: voucher.discount_amount, // Original voucher value
                discountType: voucher.discount_type,
                rewardName: voucher.reward_name || voucher.title
              };

              console.log('✅ Orders API: Voucher marked as used:', orderData.voucherCode, 'Discount:', voucher.discount_amount, voucher.discount_type);
            } else {
              console.warn('⚠️ Orders API: Voucher not found or invalid:', orderData.voucherCode);
            }
          } catch (voucherError) {
            console.error('❌ Orders API: Voucher processing failed:', voucherError);
            // Don't fail the order creation, just log the error
          }
        }

        // Award points for authenticated users (1 point per $1 spent) with race condition protection
        if (userId || supabaseUserId) {
          try {
            const pointsToAward = Math.floor(parseFloat(newOrder.total));
            const userIdentifier = userId || supabaseUserId;
            console.log('🎁 Orders API: Awarding points to user:', userIdentifier, 'Points:', pointsToAward, 'Total:', newOrder.total);

            // Use atomic transaction for points operations to prevent race conditions
            await sql.begin(async (sql) => {
              console.log('🔒 Orders API: Starting atomic transaction for points award');

              if (userId) {
                // Legacy user - check if they exist in users table
                const userExists = await sql`SELECT id FROM users WHERE id = ${userId}`;
                console.log('🎁 Orders API: Legacy user exists check:', userExists.length > 0, 'for user:', userId);

                if (userExists.length > 0) {
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
                }
              } else if (supabaseUserId) {
                // Supabase user - award points using supabase_user_id
                console.log('🎁 Orders API: Awarding points to Supabase user:', supabaseUserId);

                // Record points transaction in audit table
                const pointsTransaction = await sql`
                  INSERT INTO points_transactions (user_id, supabase_user_id, order_id, type, points, description, order_amount, created_at)
                  VALUES (NULL, ${supabaseUserId}, ${newOrder.id}, 'earned', ${pointsToAward}, ${'Order #' + newOrder.id}, ${newOrder.total}, NOW())
                  RETURNING id
                `;
                console.log('✅ Orders API: Supabase points transaction created:', pointsTransaction[0]?.id);

                // Use UPSERT with optimistic locking for Supabase user points
                const userPointsUpdate = await sql`
                  INSERT INTO user_points (user_id, supabase_user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
                  VALUES (NULL, ${supabaseUserId}, ${pointsToAward}, ${pointsToAward}, 0, NOW(), NOW(), NOW())
                  ON CONFLICT (supabase_user_id) DO UPDATE SET
                    points = user_points.points + ${pointsToAward},
                    total_earned = user_points.total_earned + ${pointsToAward},
                    last_earned_at = NOW(),
                    updated_at = NOW()
                  RETURNING supabase_user_id, points, total_earned
                `;
                console.log('✅ Orders API: Supabase user points updated with UPSERT:', userPointsUpdate[0]);

                console.log('✅ Orders API: Points awarded successfully to Supabase user - Total:', pointsToAward, 'points');
              }
            });
          } catch (pointsError) {
            console.error('❌ Orders API: Error awarding points:', pointsError);
            // Don't fail the order if points fail
          }
        }

        // ShipDay integration for delivery orders
        if (orderData.orderType === "delivery" && orderData.addressData && process.env.SHIPDAY_API_KEY) {
          try {
            console.log('📦 Orders API: Starting ShipDay integration for delivery order');

            const customerName = userContactInfo?.first_name && userContactInfo?.last_name
              ? `${userContactInfo.first_name} ${userContactInfo.last_name}`.trim()
              : (userContactInfo?.username || "Customer");

            const customerEmail = userContactInfo?.email || "";
            const customerPhone = orderData.phone || userContactInfo?.phone || "";

            // Create ShipDay order payload with correct format
            const shipdayPayload = {
              orderItems: transformedItems.map(item => ({
                name: item.name || item.menu_item_name || "Menu Item",
                unitPrice: parseFloat(item.price || item.menu_item_price || "0"),
                quantity: parseInt(item.quantity || "1")
              })),
              pickup: {
                address: {
                  street: "123 Main St", // Update with actual restaurant address
                  city: "Asheville",
                  state: "NC",
                  zip: "28801",
                  country: "United States"
                },
                contactPerson: {
                  name: "Favillas NY Pizza",
                  phone: "5551234567" // Update with actual restaurant phone
                }
              },
              dropoff: {
                address: {
                  street: orderData.addressData.street || orderData.addressData.fullAddress,
                  city: orderData.addressData.city,
                  state: orderData.addressData.state,
                  zip: orderData.addressData.zipCode,
                  country: "United States"
                },
                contactPerson: {
                  name: customerName && customerName.trim() !== "" ? customerName.trim() : "Customer",
                  phone: customerPhone.replace(/[^\d]/g, ''),
                  ...(customerEmail && { email: customerEmail })
                }
              },
              orderNumber: `FAV-${newOrder.id}`,
              totalOrderCost: parseFloat(newOrder.total),
              paymentMethod: 'credit_card',
              // Required customer fields at root level
              customerName: customerName && customerName.trim() !== "" ? customerName.trim() : "Customer",
              customerPhoneNumber: customerPhone.replace(/[^\d]/g, ''),
              customerAddress: `${orderData.addressData.street || orderData.addressData.fullAddress}, ${orderData.addressData.city}, ${orderData.addressData.state} ${orderData.addressData.zipCode}`,
              ...(customerEmail && { customerEmail: customerEmail })
            };

            console.log('📦 Orders API: Sending ShipDay payload:', JSON.stringify(shipdayPayload, null, 2));

            // Call ShipDay API
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
            console.log(`📦 Orders API: ShipDay response status: ${shipdayResponse.status}`);
            console.log(`📦 Orders API: ShipDay response body: ${shipdayResult}`);

            if (shipdayResponse.ok) {
              const parsedResult = JSON.parse(shipdayResult);
              if (parsedResult.success) {
                console.log(`✅ Orders API: ShipDay order created successfully for order #${newOrder.id}: ${parsedResult.orderId}`);

                // Update order with ShipDay info
                await sql`
                  UPDATE orders
                  SET shipday_order_id = ${parsedResult.orderId}, shipday_status = 'pending'
                  WHERE id = ${newOrder.id}
                `;

                enhancedOrder.shipdayOrderId = parsedResult.orderId;
                enhancedOrder.shipdayStatus = 'pending';
              } else {
                console.error(`❌ Orders API: ShipDay order creation failed for order #${newOrder.id}: ${parsedResult.response || 'Unknown error'}`);
              }
            } else {
              console.error(`❌ Orders API: ShipDay API error for order #${newOrder.id}: ${shipdayResponse.status} - ${shipdayResult}`);
            }
          } catch (shipdayError: any) {
            console.error(`❌ Orders API: ShipDay integration error for order #${newOrder.id}:`, shipdayError.message);
            // Don't fail the order if ShipDay fails
          }
        }

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