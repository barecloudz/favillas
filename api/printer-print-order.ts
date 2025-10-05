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
function formatReceiptForThermalPrinter(order: any, items: any[]) {
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
  
  // Customer info
  if (order.order_type === 'delivery') {
    receipt += `Customer: ${order.customer_name || 'Guest'}\n`;
    receipt += `Phone: ${order.phone || 'N/A'}\n`;
    if (order.address) {
      receipt += `Address: ${order.address}\n`;
    }
    receipt += `--------------------------------\n`;
  }
  
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

    // Get order details
    const orders = await sql`
      SELECT * FROM orders WHERE id = ${orderId}
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
    const receiptData = formatReceiptForThermalPrinter(order, items);

    // TODO: Send to actual printer when printer server is available
    // For now, just return the formatted receipt
    console.log('📄 Formatted receipt for order', orderId, ':', receiptData);

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
        note: 'Printer integration requires local printer server to send actual print jobs'
      })
    };

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
