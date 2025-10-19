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

// Format order for thermal printer (ESC/POS commands)
function formatReceiptForThermalPrinter(order: any, items: any[], customerName: string, pointsEarned: number) {
  const ESC = '\x1B';
  const GS = '\x1D';
  
  let receipt = '';
  
  // Initialize printer
  receipt += `${ESC}@`; // Initialize
  
  // Header - Center aligned, bold, double height
  receipt += `${ESC}a\x01`; // Center align
  receipt += `${ESC}E\x01`; // Bold on
  receipt += `${GS}!\x11`; // Double height and width
  receipt += `FAVILLAS NY PIZZA\n`;
  receipt += `${GS}!\x00`; // Normal size
  receipt += `${ESC}E\x00`; // Bold off
  receipt += `\n`;
  
  // Order details
  receipt += `${ESC}a\x00`; // Left align
  receipt += `Order #${order.id}\n`;
  receipt += `${order.order_type === 'delivery' ? 'DELIVERY' : 'PICKUP'}\n`;
  receipt += `${new Date(order.created_at).toLocaleString()}\n`;
  receipt += `--------------------------------\n`;

  // Customer info (show for all orders, not just delivery)
  receipt += `Customer: ${customerName}\n`;
  receipt += `Phone: ${order.phone || order.user_phone || 'N/A'}\n`;

  // Address only for delivery
  if (order.order_type === 'delivery' && order.address) {
    receipt += `Address: ${order.address}\n`;
  }

  receipt += `--------------------------------\n`;
  
  // Items
  receipt += `${ESC}E\x01`; // Bold on
  receipt += `ITEMS:\n`;
  receipt += `${ESC}E\x00`; // Bold off
  
  items.forEach(item => {
    const itemName = item.menu_item_name || item.name || 'Item';
    const qty = item.quantity;
    const price = parseFloat(item.price || 0);
    
    receipt += `${qty}x ${itemName}\n`;
    
    // Add customizations/options
    if (item.options) {
      try {
        const options = typeof item.options === 'string' ? JSON.parse(item.options) : item.options;
        if (Array.isArray(options) && options.length > 0) {
          options.forEach(opt => {
            receipt += `   + ${opt.itemName || opt.name}\n`;
          });
        }
      } catch (e) {}
    }
    
    // Special instructions
    if (item.special_instructions) {
      receipt += `   NOTE: ${item.special_instructions}\n`;
    }
    
    receipt += `   $${price.toFixed(2)}\n`;
  });
  
  receipt += `--------------------------------\n`;
  
  // Totals
  const subtotal = parseFloat(order.total) - parseFloat(order.tax || 0) - parseFloat(order.delivery_fee || 0);
  receipt += `Subtotal:        $${subtotal.toFixed(2)}\n`;
  
  if (order.delivery_fee && parseFloat(order.delivery_fee) > 0) {
    receipt += `Delivery Fee:    $${parseFloat(order.delivery_fee).toFixed(2)}\n`;
  }
  
  if (order.tax && parseFloat(order.tax) > 0) {
    receipt += `Tax:             $${parseFloat(order.tax).toFixed(2)}\n`;
  }
  
  if (order.tip && parseFloat(order.tip) > 0) {
    receipt += `Tip:             $${parseFloat(order.tip).toFixed(2)}\n`;
  }
  
  receipt += `${ESC}E\x01`; // Bold on
  receipt += `TOTAL:           $${parseFloat(order.total).toFixed(2)}\n`;
  receipt += `${ESC}E\x00`; // Bold off
  receipt += `--------------------------------\n`;

  // Points earned (if any)
  if (pointsEarned && pointsEarned > 0) {
    receipt += `\n`;
    receipt += `${ESC}a\x01`; // Center align
    receipt += `${ESC}E\x01`; // Bold on
    receipt += `🎁 POINTS EARNED: ${pointsEarned} 🎁\n`;
    receipt += `${ESC}E\x00`; // Bold off
    receipt += `${ESC}a\x00`; // Left align
    receipt += `You earned ${pointsEarned} reward points!\n`;
    receipt += `Use your points for free food!\n`;
    receipt += `--------------------------------\n`;
  }

  // Special instructions
  if (order.special_instructions) {
    receipt += `\n${ESC}E\x01SPECIAL INSTRUCTIONS:${ESC}E\x00\n`;
    receipt += `${order.special_instructions}\n`;
    receipt += `--------------------------------\n`;
  }
  
  // Footer
  receipt += `\n`;
  receipt += `${ESC}a\x01`; // Center align
  receipt += `Thank you!\n`;
  receipt += `\n\n\n`;
  
  // Cut paper
  receipt += `${GS}V\x41\x03`; // Partial cut
  
  return receipt;
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    const sql = getDB();
    const { orderId, printerId } = JSON.parse(event.body || '{}');

    if (!orderId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          message: 'Order ID is required' 
        })
      };
    }

    // Get order details with customer name and points earned
    const orders = await sql`
      SELECT
        o.*,
        u.first_name,
        u.last_name,
        u.email,
        u.phone as user_phone
      FROM orders o
      LEFT JOIN users u ON (o.user_id = u.id OR o.supabase_user_id = u.supabase_user_id)
      WHERE o.id = ${orderId}
    `;

    if (orders.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Order not found'
        })
      };
    }

    const order = orders[0];

    // Get points earned for this order
    let pointsEarned = 0;
    if (order.user_id || order.supabase_user_id) {
      const pointsQuery = order.user_id
        ? await sql`SELECT points FROM points_transactions WHERE order_id = ${orderId} AND user_id = ${order.user_id} AND type = 'earned'`
        : await sql`SELECT points FROM points_transactions WHERE order_id = ${orderId} AND supabase_user_id = ${order.supabase_user_id} AND type = 'earned'`;

      if (pointsQuery.length > 0) {
        pointsEarned = parseInt(pointsQuery[0].points);
      }
    }

    // Format customer name
    const customerName = order.first_name && order.last_name
      ? `${order.first_name} ${order.last_name}`.trim()
      : (order.email || 'Guest');

    // Get order items with menu item names
    const items = await sql`
      SELECT
        oi.*,
        mi.name as menu_item_name
      FROM order_items oi
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      WHERE oi.order_id = ${orderId}
    `;

    // Get active printer or specific printer
    let printer;
    if (printerId) {
      const printers = await sql`
        SELECT * FROM printer_config WHERE id = ${printerId}
      `;
      printer = printers[0];
    } else {
      const printers = await sql`
        SELECT * FROM printer_config WHERE is_active = true ORDER BY id LIMIT 1
      `;
      printer = printers[0];
    }

    if (!printer) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          success: false,
          message: 'No active printer found. Please configure a printer first.' 
        })
      };
    }

    // Format receipt
    const receiptData = formatReceiptForThermalPrinter(order, items, customerName, pointsEarned);

    // Try to send directly to printer via HTTP POST (if printer supports it)
    // Many modern thermal printers like Epson TM-M30II support HTTP printing
    try {
      const printerUrl = `http://${printer.ip_address}:${printer.port}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000`;
      console.log('🖨️  Attempting direct HTTP print to:', printerUrl);

      // Epson ePOS XML format for direct printing
      const eposXml = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
      <text>${receiptData.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>
      <cut type="partial"/>
    </epos-print>
  </s:Body>
</s:Envelope>`;

      const printResponse = await fetch(printerUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '""'
        },
        body: eposXml
      });

      if (printResponse.ok) {
        console.log('✅ Direct print successful');
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: `Order #${orderId} sent to printer`,
            printer: {
              id: printer.id,
              name: printer.name,
              ip: printer.ip_address,
              port: printer.port
            },
            printed: true
          })
        };
      } else {
        console.warn('⚠️  Printer HTTP endpoint responded with error:', await printResponse.text());
        throw new Error('Direct print failed');
      }
    } catch (printerError) {
      console.warn('⚠️  Direct print not supported, returning formatted receipt:', printerError);

      // Return formatted receipt - the frontend can handle printing via browser
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: `Order #${orderId} formatted for printing`,
          printer: {
            id: printer.id,
            name: printer.name,
            ip: printer.ip_address,
            port: printer.port
          },
          receiptData,
          printed: false,
          note: 'Network printing from Netlify functions is not possible. Printing must be done from client device on same network.'
        })
      };
    }

  } catch (error) {
    console.error('Print order error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
}
