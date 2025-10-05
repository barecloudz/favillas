/**
 * Client-side thermal printer utility
 * Sends print jobs directly from browser to printer on local network
 */

export interface PrinterConfig {
  ipAddress: string;
  port: number;
  name: string;
}

export interface OrderPrintData {
  id: number;
  orderType: string;
  customerName?: string;
  phone?: string;
  address?: string;
  items: any[];
  total: number;
  tax: number;
  deliveryFee?: number;
  tip?: number;
  specialInstructions?: string;
  createdAt: string;
}

/**
 * Format order for thermal printer (ESC/POS commands)
 */
function formatReceipt(order: OrderPrintData): string {
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
  receipt += `${order.orderType === 'delivery' ? 'DELIVERY' : 'PICKUP'}\n`;
  receipt += `${new Date(order.createdAt).toLocaleString()}\n`;
  receipt += `--------------------------------\n`;

  // Customer info
  if (order.orderType === 'delivery') {
    receipt += `Customer: ${order.customerName || 'Guest'}\n`;
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

  order.items.forEach((item: any) => {
    const itemName = item.menuItem?.name || item.name || 'Item';
    const qty = item.quantity;
    const price = parseFloat(item.price || 0);

    receipt += `${qty}x ${itemName}\n`;

    // Add customizations/options
    if (item.options && Array.isArray(item.options)) {
      item.options.forEach((opt: any) => {
        receipt += `   + ${opt.itemName || opt.name}\n`;
      });
    }

    // Special instructions
    if (item.specialInstructions) {
      receipt += `   NOTE: ${item.specialInstructions}\n`;
    }

    receipt += `   $${price.toFixed(2)}\n`;
  });

  receipt += `--------------------------------\n`;

  // Totals
  const subtotal = order.total - (order.tax || 0) - (order.deliveryFee || 0);
  receipt += `Subtotal:        $${subtotal.toFixed(2)}\n`;

  if (order.deliveryFee && order.deliveryFee > 0) {
    receipt += `Delivery Fee:    $${order.deliveryFee.toFixed(2)}\n`;
  }

  if (order.tax && order.tax > 0) {
    receipt += `Tax:             $${order.tax.toFixed(2)}\n`;
  }

  if (order.tip && order.tip > 0) {
    receipt += `Tip:             $${order.tip.toFixed(2)}\n`;
  }

  receipt += `${ESC}E\x01`; // Bold on
  receipt += `TOTAL:           $${order.total.toFixed(2)}\n`;
  receipt += `${ESC}E\x00`; // Bold off
  receipt += `--------------------------------\n`;

  // Special instructions
  if (order.specialInstructions) {
    receipt += `\n${ESC}E\x01SPECIAL INSTRUCTIONS:${ESC}E\x00\n`;
    receipt += `${order.specialInstructions}\n`;
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

/**
 * Send print job directly to Epson thermal printer
 * Uses no-cors mode to bypass mixed content restrictions
 */
export async function printToThermalPrinter(
  order: OrderPrintData,
  printer: PrinterConfig
): Promise<{ success: boolean; message: string }> {
  const receiptData = formatReceipt(order);

  try {
    // Epson ePOS-Print API endpoint
    const printerUrl = `http://${printer.ipAddress}:${printer.port}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000`;

    console.log(`🖨️  Sending to printer: ${printerUrl}`);

    // Convert ESC/POS to ePOS XML format
    const eposXml = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
      <text>${receiptData.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '&#10;')}</text>
      <cut type="partial"/>
    </epos-print>
  </s:Body>
</s:Envelope>`;

    // Use no-cors mode - this allows HTTPS page to send to HTTP printer
    // Note: We won't be able to read the response, but the print will work
    const response = await fetch(printerUrl, {
      method: 'POST',
      mode: 'no-cors', // CRITICAL: Bypasses CORS/mixed content restrictions
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '""',
        'If-Modified-Since': 'Thu, 01 Jan 1970 00:00:00 GMT'
      },
      body: eposXml
    });

    console.log('✅ Print job sent (no-cors mode - cannot verify response)');

    // With no-cors, we can't check response status
    // Assume success if no error was thrown
    return {
      success: true,
      message: `Order #${order.id} sent to ${printer.name}`
    };

  } catch (error: any) {
    console.error('❌ Print failed:', error);

    return {
      success: false,
      message: `Cannot reach printer at ${printer.ipAddress}:${printer.port}. Please check:\n1. Printer is powered on\n2. Printer is on same WiFi network as iPad\n3. IP address is correct: ${printer.ipAddress}`
    };
  }
}
