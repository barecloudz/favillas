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

function authenticateToken(event: any): { userId: number; username: string; role: string } | null {
  const authHeader = event.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    const cookies = event.headers.cookie;
    if (cookies) {
      const authCookie = cookies.split(';').find((c: string) => c.trim().startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }
  }

  if (!token) return null;

  try {
    // First try to decode as Supabase JWT token
    try {
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      console.log('🔍 Supabase token payload:', payload);

      if (payload.iss && payload.iss.includes('supabase')) {
        const supabaseUserId = payload.sub;
        console.log('✅ Supabase user ID:', supabaseUserId);

        return {
          userId: parseInt(supabaseUserId.replace(/-/g, '').substring(0, 8), 16) || 1,
          username: payload.email || 'supabase_user',
          role: 'customer'
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
      username: decoded.username,
      role: decoded.role || 'customer'
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
      
      console.log('🔍 Orders API: Getting orders for user:', authPayload.userId, 'role:', authPayload.role);
      
      let allOrders;
      
      if (authPayload.role === 'admin' || authPayload.role === 'kitchen' || authPayload.role === 'manager') {
        // Staff can see all orders
        console.log('📋 Orders API: Getting all orders (staff access)');
        allOrders = await sql`SELECT * FROM orders ORDER BY created_at DESC`;
      } else {
        // Customers can only see their own orders
        console.log('📋 Orders API: Getting orders for user:', authPayload.userId);
        allOrders = await sql`SELECT * FROM orders WHERE user_id = ${authPayload.userId} ORDER BY created_at DESC`;
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
            
            return { ...order, items: transformedItems };
          } catch (itemError) {
            console.error('❌ Error getting items for order', order.id, ':', itemError);
            return { ...order, items: [] };
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
        
        // Validate required fields
        if (!orderData.total || !orderData.tax || !orderData.orderType || !orderData.phone) {
          console.log('❌ Orders API: Missing required fields');
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ 
              error: 'Missing required fields: total, tax, orderType, phone' 
            })
          };
        }
      
        // Set the userId: use authenticated user ID or null for guests
        let userId = authPayload ? authPayload.userId : orderData.userId || null;

        // If we have a user ID from auth, verify the user exists in the database
        // If not, create the user record so they can earn points
        if (userId && authPayload) {
          try {
            const existingUser = await sql`SELECT id FROM users WHERE id = ${userId}`;
            if (existingUser.length === 0) {
              console.log('⚠️ Orders API: Authenticated user not found in database, creating user record');

              // Create user record so they can earn points
              try {
                const newUser = await sql`
                  INSERT INTO users (id, username, email, role, phone, created_at)
                  VALUES (${userId}, ${authPayload.username || 'google_user'}, ${authPayload.username || 'user@example.com'}, 'customer', ${orderData.phone || ''}, NOW())
                  ON CONFLICT (id) DO NOTHING
                  RETURNING id
                `;

                if (newUser.length > 0) {
                  console.log('✅ Orders API: Created new user record for Google login:', userId);

                  // Initialize user points record
                  await sql`
                    INSERT INTO user_points (user_id, points_earned, points_redeemed, transaction_type, description, created_at)
                    VALUES (${userId}, 0, 0, 'earned', 'Account created', NOW())
                    ON CONFLICT DO NOTHING
                  `;
                } else {
                  console.log('✅ Orders API: User record already exists (race condition)');
                }
              } catch (createUserError) {
                console.error('❌ Orders API: Error creating user record:', createUserError);
                // Still fall back to guest if user creation fails
                userId = null;
              }
            } else {
              console.log('✅ Orders API: User exists in database:', userId);
            }
          } catch (userCheckError) {
            console.error('❌ Orders API: Error checking user existence:', userCheckError);
            userId = null; // Fall back to guest order on error
          }
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
        
        // Create the order - store both address data and order breakdown metadata in address_data
        const combinedAddressData = {
          ...orderData.addressData,
          orderBreakdown: orderData.orderMetadata
        };

        const newOrders = await sql`
          INSERT INTO orders (
            user_id, status, total, tax, delivery_fee, tip, order_type, payment_status,
            special_instructions, address, address_data, fulfillment_time, scheduled_time,
            phone, created_at
          ) VALUES (
            ${userId},
            ${orderData.status || 'pending'},
            ${orderData.total},
            ${orderData.tax},
            ${orderData.deliveryFee || '0'},
            ${orderData.tip || '0'},
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

        // Insert order items if provided
        if (items && items.length > 0) {
          console.log('🛒 Orders API: Creating order items:', items.length);
          const orderItemsInserts = [];
          for (const item of items) {
            if (!item.menuItemId || !item.quantity || !item.price) {
              console.log('❌ Orders API: Invalid order item:', item);
              return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                  error: 'Invalid order item: missing menuItemId, quantity, or price' 
                })
              };
            }
            
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
          console.log('✅ Orders API: Order items created:', orderItemsInserts.length);
        }

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

        // Award points for authenticated users (1 point per $1 spent)
        if (userId) {
          try {
            const pointsToAward = Math.floor(parseFloat(newOrder.total));
            console.log('🎁 Orders API: Awarding points to user:', userId, 'Points:', pointsToAward);

            // Record points transaction in audit table
            await sql`
              INSERT INTO points_transactions (user_id, order_id, type, points, description, order_amount, created_at)
              VALUES (${userId}, ${newOrder.id}, 'earned', ${pointsToAward}, ${'Order #' + newOrder.id}, ${newOrder.total}, NOW())
            `;

            // Update user_points table with correct schema
            await sql`
              INSERT INTO user_points (user_id, points, total_earned, total_redeemed, last_earned_at, created_at, updated_at)
              VALUES (${userId}, ${pointsToAward}, ${pointsToAward}, 0, NOW(), NOW(), NOW())
              ON CONFLICT (user_id) DO UPDATE SET
                points = user_points.points + ${pointsToAward},
                total_earned = user_points.total_earned + ${pointsToAward},
                last_earned_at = NOW(),
                updated_at = NOW()
            `;

            // Also update legacy rewards column for backward compatibility
            await sql`
              UPDATE users
              SET rewards = (SELECT points FROM user_points WHERE user_id = ${userId}), updated_at = NOW()
              WHERE id = ${userId}
            `;

            console.log('✅ Orders API: Points awarded successfully');
          } catch (pointsError) {
            console.error('❌ Orders API: Error awarding points:', pointsError);
            // Don't fail the order if points fail
          }
        }

        console.log('✅ Orders API: Order creation completed successfully');

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify({ ...newOrder, items: transformedItems })
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