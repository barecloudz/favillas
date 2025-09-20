import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';

// Database connection - serverless optimized
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

function authenticateToken(event: any): { userId: string; username: string; role: string; isSupabaseUser: boolean } | null {
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
      if (token && token.includes('.')) {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          // Add proper base64 padding if missing
          let payloadB64 = tokenParts[1];
          while (payloadB64.length % 4) {
            payloadB64 += '=';
          }

          const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString());
          console.log('🔍 Supabase token payload:', payload);

          if (payload.iss && payload.iss.includes('supabase')) {
            const supabaseUserId = payload.sub;
            console.log('✅ Supabase user ID:', supabaseUserId);

            return {
              userId: supabaseUserId, // Use the full UUID instead of converting to integer
              username: payload.email || 'supabase_user',
              role: 'customer',
              isSupabaseUser: true
            };
          }
        }
      }
    } catch (supabaseError) {
      console.log('Not a Supabase token, trying JWT verification:', supabaseError);
    }

    // Fallback to our JWT verification
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    return {
      userId: decoded.userId.toString(), // Ensure string for consistency
      username: decoded.username,
      role: decoded.role || 'customer',
      isSupabaseUser: false
    };
  } catch (error) {
    console.error('Token authentication failed:', error);
    return null;
  }
}

export const handler: Handler = async (event, context) => {
  // CORS headers
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PUT, PATCH, DELETE, OPTIONS',
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
  if (!authPayload) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized' })
    };
  }

  const pathParts = event.path.split('/');
  const id = pathParts[pathParts.length - 1];
  const orderId = parseInt(id, 10);

  if (isNaN(orderId)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Invalid order ID' })
    };
  }

  try {
    const sql = getDB();

    switch (event.httpMethod) {
      case 'GET':
        // Get single order
        const orderResult = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
        if (orderResult.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Order not found' })
          };
        }

        const order = orderResult[0];

        // Check if user can access this order
        let canAccessOrder = false;
        if (authPayload.role === 'admin' || authPayload.role === 'superadmin' || authPayload.role === 'kitchen' || authPayload.role === 'manager') {
          canAccessOrder = true;
        } else {
          // Check both user_id and supabase_user_id for access
          if (authPayload.isSupabaseUser) {
            // For Supabase users, check the supabase_user_id column (both are UUIDs)
            canAccessOrder = order.supabase_user_id === authPayload.userId;
          } else {
            // For legacy users, compare integer user IDs
            canAccessOrder = order.user_id === parseInt(authPayload.userId);
          }
        }

        if (!canAccessOrder) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Forbidden' })
          };
        }

        // Get order items with menu item details
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

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ ...order, items: transformedItems })
        };

      case 'PATCH':
        // Update order (typically status changes)
        // Only staff can update orders
        if (authPayload.role !== 'admin' && authPayload.role !== 'superadmin' && authPayload.role !== 'kitchen' && authPayload.role !== 'manager' && authPayload.role !== 'employee') {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Forbidden - Staff access required' })
          };
        }

        const patchData = JSON.parse(event.body || '{}');

        // Build the UPDATE query dynamically
        const updateFields = [];
        const updateValues = [];

        if (patchData.status !== undefined) {
          updateFields.push('status = $' + (updateValues.length + 1));
          updateValues.push(patchData.status);
        }
        if (patchData.paymentStatus !== undefined) {
          updateFields.push('payment_status = $' + (updateValues.length + 1));
          updateValues.push(patchData.paymentStatus);
        }

        // Always update the processed_at timestamp for status updates
        updateFields.push('processed_at = NOW()');

        if (updateFields.length === 1) { // Only the timestamp update
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'No valid fields to update' })
          };
        }

        const updateQuery = `
          UPDATE orders
          SET ${updateFields.join(', ')}
          WHERE id = $${updateValues.length + 1}
          RETURNING *
        `;
        updateValues.push(orderId);

        const updatedOrders = await sql.unsafe(updateQuery, updateValues);

        if (updatedOrders.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Order not found' })
          };
        }

        const updatedOrder = updatedOrders[0];

        // ShipDay integration - trigger when payment is confirmed
        if (patchData.paymentStatus === 'completed' || patchData.paymentStatus === 'succeeded') {
          if (updatedOrder.order_type === 'delivery' && updatedOrder.address_data && process.env.SHIPDAY_API_KEY) {
            try {
              console.log('📦 Order Update API: Triggering ShipDay integration after payment confirmation');

              let addressData;
              try {
                addressData = JSON.parse(updatedOrder.address_data);
              } catch (parseError) {
                console.error('📦 Order Update API: Failed to parse address_data:', parseError);
                addressData = null;
              }

              if (addressData) {
                // Get order items for ShipDay
                const orderItems = await sql`
                  SELECT oi.*, mi.name as menu_item_name, mi.base_price as menu_item_price
                  FROM order_items oi
                  LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
                  WHERE oi.order_id = ${orderId}
                `;

                // Get user info for contact details
                let userContactInfo = null;
                if (updatedOrder.supabase_user_id) {
                  const userQuery = await sql`SELECT * FROM users WHERE supabase_user_id = ${updatedOrder.supabase_user_id}`;
                  if (userQuery.length > 0) userContactInfo = userQuery[0];
                } else if (updatedOrder.user_id) {
                  const userQuery = await sql`SELECT * FROM users WHERE id = ${updatedOrder.user_id}`;
                  if (userQuery.length > 0) userContactInfo = userQuery[0];
                }

                const customerName = userContactInfo?.first_name && userContactInfo?.last_name
                  ? `${userContactInfo.first_name} ${userContactInfo.last_name}`.trim()
                  : (userContactInfo?.username || "Customer");

                const customerEmail = userContactInfo?.email || "";
                const customerPhone = updatedOrder.phone || userContactInfo?.phone || "";

                // Create ShipDay order payload - format according to ShipDay API docs
                const orderItemsFormatted = orderItems.map(item => ({
                  name: item.name || item.menu_item_name || "Menu Item",
                  unitPrice: parseFloat(item.price || item.menu_item_price || "0"),
                  quantity: parseInt(item.quantity || "1")
                }));

                const shipdayPayload = {
                  orderItem: JSON.stringify(orderItemsFormatted), // ShipDay expects stringified JSON array
                  tip: parseFloat(updatedOrder.delivery_tip || "0"), // Add delivery tip
                  orderTotal: parseFloat(updatedOrder.subtotal || updatedOrder.total),
                  deliveryFee: parseFloat(updatedOrder.delivery_fee || "0"),
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
                  orderNumber: `FAV-${updatedOrder.id}`,
                  totalOrderCost: parseFloat(updatedOrder.total),
                  paymentMethod: 'credit_card',
                  // Required customer fields at root level
                  customerName: customerName && customerName.trim() !== "" ? customerName.trim() : "Customer",
                  customerPhoneNumber: customerPhone.replace(/[^\d]/g, ''),
                  customerAddress: `${addressData.street || addressData.fullAddress}, ${addressData.city}, ${addressData.state} ${addressData.zipCode}`,
                  ...(customerEmail && { customerEmail: customerEmail })
                };

                console.log('📦 Order Update API: Sending ShipDay payload after payment confirmation');

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
                console.log(`📦 Order Update API: ShipDay response status: ${shipdayResponse.status}`);
                console.log(`📦 Order Update API: ShipDay response body: ${shipdayResult}`);

                if (shipdayResponse.ok) {
                  const parsedResult = JSON.parse(shipdayResult);
                  if (parsedResult.success) {
                    console.log(`✅ Order Update API: ShipDay order created successfully for order #${updatedOrder.id}: ${parsedResult.orderId}`);

                    // Update order with ShipDay info
                    await sql`
                      UPDATE orders
                      SET shipday_order_id = ${parsedResult.orderId}, shipday_status = 'pending'
                      WHERE id = ${updatedOrder.id}
                    `;

                    updatedOrder.shipday_order_id = parsedResult.orderId;
                    updatedOrder.shipday_status = 'pending';
                  } else {
                    console.error(`❌ Order Update API: ShipDay order creation failed for order #${updatedOrder.id}: ${parsedResult.response || 'Unknown error'}`);
                  }
                } else {
                  console.error(`❌ Order Update API: ShipDay API error for order #${updatedOrder.id}: ${shipdayResponse.status} - ${shipdayResult}`);
                }
              }
            } catch (shipdayError: any) {
              console.error(`❌ Order Update API: ShipDay integration error for order #${updatedOrder.id}:`, shipdayError.message);
              // Don't fail the order update if ShipDay fails
            }
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updatedOrder)
        };

      case 'DELETE':
        // Delete order (admin only)
        if (authPayload.role !== 'admin') {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Forbidden - Admin access required' })
          };
        }

        const deletedOrders = await sql`
          DELETE FROM orders
          WHERE id = ${orderId}
          RETURNING *
        `;

        if (deletedOrders.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Order not found' })
          };
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ message: 'Order deleted', id: orderId })
        };

      default:
        return {
          statusCode: 405,
          headers: { ...headers, 'Allow': 'GET, PATCH, DELETE' },
          body: JSON.stringify({ error: `Method ${event.httpMethod} not allowed` })
        };
    }
  } catch (error) {
    console.error('Order API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}