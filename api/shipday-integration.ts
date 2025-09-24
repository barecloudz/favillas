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

// Enhanced function to format order items with detailed addons/choices for Ship Day
function formatOrderItemsForShipDay(orderItems: any[]): any[] {
  return orderItems.map(item => {
    let itemName = item.name || item.menu_item_name || "Menu Item";
    const basePrice = parseFloat(item.price || item.menu_item_price || "0");
    let totalPrice = basePrice;

    // Parse and include detailed options/choices/addons
    let optionsText = [];

    if (item.options) {
      try {
        const options = typeof item.options === 'string' ? JSON.parse(item.options) : item.options;

        // Handle different option formats
        if (Array.isArray(options)) {
          // New choice system format: [{ groupName: "Size", itemName: "Large", price: 2.00 }]
          options.forEach(option => {
            if (option.itemName && option.groupName) {
              optionsText.push(`${option.groupName}: ${option.itemName}`);
              if (option.price && option.price > 0) {
                totalPrice += parseFloat(option.price);
              }
            }
          });
        } else if (typeof options === 'object') {
          // Legacy selectedOptions format
          if (options.size) optionsText.push(`Size: ${options.size}`);
          if (options.toppings && Array.isArray(options.toppings)) {
            optionsText.push(`Toppings: ${options.toppings.join(', ')}`);
          }
          if (options.extras && Array.isArray(options.extras)) {
            optionsText.push(`Extras: ${options.extras.join(', ')}`);
          }
          if (options.addOns && Array.isArray(options.addOns)) {
            optionsText.push(`Add-ons: ${options.addOns.join(', ')}`);
          }
          if (options.customizations && Array.isArray(options.customizations)) {
            optionsText.push(`Customizations: ${options.customizations.join(', ')}`);
          }

          // Handle half & half pizzas
          if (options.halfAndHalf) {
            if (options.leftToppings && Array.isArray(options.leftToppings)) {
              optionsText.push(`Left Half: ${options.leftToppings.map(t => t.name || t).join(', ')}`);
            }
            if (options.rightToppings && Array.isArray(options.rightToppings)) {
              optionsText.push(`Right Half: ${options.rightToppings.map(t => t.name || t).join(', ')}`);
            }
          }
        }
      } catch (parseError) {
        console.warn('Failed to parse item options:', parseError);
      }
    }

    // Include special instructions
    if (item.special_instructions) {
      optionsText.push(`Special: ${item.special_instructions}`);
    }

    // Format the complete item name with all details
    if (optionsText.length > 0) {
      itemName += ` (${optionsText.join(' | ')})`;
    }

    return {
      name: itemName,
      unitPrice: totalPrice > 0 ? totalPrice : basePrice,
      quantity: parseInt(item.quantity || "1")
    };
  });
}

// Create Ship Day order when order status changes to cooking/preparing
export async function createShipDayOrder(orderId: number): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!process.env.SHIPDAY_API_KEY) {
    return { success: false, error: 'ShipDay API key not configured' };
  }

  try {
    const sql = getDB();
    console.log(`📦 Creating Ship Day order for order #${orderId}`);

    // Get order details
    const orders = await sql`
      SELECT * FROM orders
      WHERE id = ${orderId}
      AND order_type = 'delivery'
      AND payment_status = 'completed'
      LIMIT 1
    `;

    if (orders.length === 0) {
      return { success: false, error: 'Order not found or not eligible for delivery' };
    }

    const order = orders[0];

    // Skip if already sent to Ship Day
    if (order.shipday_order_id) {
      return { success: false, error: 'Order already sent to Ship Day' };
    }

    // Get order items with detailed options
    const orderItems = await sql`
      SELECT oi.*, mi.name as menu_item_name, mi.base_price as menu_item_price
      FROM order_items oi
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = ${orderId}
    `;

    // Get user info
    let userContactInfo = null;
    if (order.supabase_user_id) {
      const userQuery = await sql`SELECT * FROM users WHERE supabase_user_id = ${order.supabase_user_id}`;
      if (userQuery.length > 0) userContactInfo = userQuery[0];
    } else if (order.user_id) {
      const userQuery = await sql`SELECT * FROM users WHERE id = ${order.user_id}`;
      if (userQuery.length > 0) userContactInfo = userQuery[0];
    }

    // Parse address data
    let addressData;
    try {
      addressData = JSON.parse(order.address_data || '{}');
    } catch (parseError) {
      console.error('Failed to parse address data:', parseError);
      return { success: false, error: 'Invalid address data' };
    }

    if (!addressData || !addressData.street || !addressData.city) {
      return { success: false, error: 'Incomplete delivery address' };
    }

    const customerName = userContactInfo?.first_name && userContactInfo?.last_name
      ? `${userContactInfo.first_name} ${userContactInfo.last_name}`.trim()
      : (userContactInfo?.username || "Customer");

    const customerEmail = userContactInfo?.email || "";
    const customerPhone = order.phone || userContactInfo?.phone || "";

    // Format order items with detailed addons/choices
    const formattedItems = formatOrderItemsForShipDay(orderItems);

    // Handle scheduled delivery
    let scheduledFields = {};
    if (order.fulfillment_time === 'scheduled' && order.scheduled_time) {
      const scheduledDate = new Date(order.scheduled_time);
      scheduledFields = {
        requestedDeliveryTime: scheduledDate.toISOString(),
        expectedDeliveryDate: scheduledDate.toISOString().split('T')[0],
        expectedDeliveryTime: scheduledDate.toTimeString().split(' ')[0].slice(0, 5)
      };
    }

    // Create Ship Day payload
    const shipdayPayload = {
      orderItems: formattedItems,
      tip: parseFloat(order.delivery_tip || order.tip || "0"),
      orderTotal: parseFloat(order.subtotal || order.total),
      deliveryFee: parseFloat(order.delivery_fee || "0"),
      pickup: {
        address: {
          street: "123 Main St", // TODO: Get from restaurant settings
          city: "Asheville",
          state: "NC",
          zip: "28801",
          country: "United States"
        },
        contactPerson: {
          name: "Favillas NY Pizza", // TODO: Get from restaurant settings
          phone: "5551234567" // TODO: Get from restaurant settings
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
          name: customerName.trim() || "Customer",
          phone: customerPhone.replace(/[^\d]/g, ''),
          ...(customerEmail && { email: customerEmail })
        }
      },
      orderNumber: `FAV-${orderId}`,
      totalOrderCost: parseFloat(order.total),
      paymentMethod: 'credit_card',
      customerName: customerName.trim() || "Customer",
      customerPhoneNumber: customerPhone.replace(/[^\d]/g, ''),
      customerAddress: `${addressData.street || addressData.fullAddress}, ${addressData.city}, ${addressData.state} ${addressData.zipCode}`,
      ...(customerEmail && { customerEmail: customerEmail }),
      ...scheduledFields
    };

    console.log('📦 Sending detailed Ship Day payload with addons/choices:', JSON.stringify(shipdayPayload, null, 2));

    // Call Ship Day API
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
    console.log(`📦 Ship Day API response: ${shipdayResponse.status} - ${shipdayResult}`);

    if (shipdayResponse.ok) {
      const parsedResult = JSON.parse(shipdayResult);
      if (parsedResult.success) {
        // Update order with Ship Day info
        await sql`
          UPDATE orders
          SET shipday_order_id = ${parsedResult.orderId},
              shipday_status = 'pending'
          WHERE id = ${orderId}
        `;

        console.log(`✅ Ship Day order created successfully for order #${orderId}: ${parsedResult.orderId}`);
        return { success: true, message: `Ship Day order created: ${parsedResult.orderId}` };
      } else {
        console.error(`❌ Ship Day order creation failed: ${parsedResult.response || 'Unknown error'}`);
        return { success: false, error: parsedResult.response || 'Ship Day API error' };
      }
    } else {
      console.error(`❌ Ship Day API error: ${shipdayResponse.status} - ${shipdayResult}`);
      return { success: false, error: `Ship Day API error: ${shipdayResponse.status}` };
    }

  } catch (error: any) {
    console.error(`❌ Ship Day integration error:`, error);
    return { success: false, error: error.message };
  }
}

// API handler for manual Ship Day order creation (admin use)
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

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { orderId } = JSON.parse(event.body || '{}');

    if (!orderId || isNaN(parseInt(orderId))) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid order ID required' })
      };
    }

    const result = await createShipDayOrder(parseInt(orderId));

    return {
      statusCode: result.success ? 200 : 400,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error: any) {
    console.error('Ship Day integration API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    };
  }
};