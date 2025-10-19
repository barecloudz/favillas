/**
 * Client-side thermal printer utility for iPad
 * Uses Epson ePOS SDK to print directly from browser to printer on same network
 * Works with HTTPS sites by using ePOS-Print URL scheme supported by iOS Safari
 */

// Declare Epson SDK types
declare global {
  interface Window {
    epson?: {
      ePOSDevice: new () => ePOSDevice;
      ePOSBuilder: new () => ePOSBuilder;
    };
  }
}

interface ePOSDevice {
  connect(ipAddress: string, port: number | string, callback: (data: string) => void): void;
  createDevice(
    deviceId: string,
    deviceType: number,
    options: any,
    callback: (device: ePOSPrint, code: string) => void
  ): void;
  disconnect(): void;
}

interface ePOSPrint {
  send(message: string): void;
  onreceive: ((response: any) => void) | null;
  onerror: ((error: any) => void) | null;
}

interface ePOSBuilder {
  addTextAlign(align: number): ePOSBuilder;
  addTextSize(width: number, height: number): ePOSBuilder;
  addText(text: string): ePOSBuilder;
  addTextStyle(reverse: boolean, underline: boolean, bold: boolean, color: number): ePOSBuilder;
  addFeedLine(lines: number): ePOSBuilder;
  addCut(type: number): ePOSBuilder;
  toString(): string;
}

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
  userId?: number;
  pointsEarned?: number;
}

/**
 * Format customer receipt for thermal printer (ESC/POS commands)
 */
function formatCustomerReceipt(order: OrderPrintData): string {
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
 * Format kitchen ticket for thermal printer (ESC/POS commands)
 * Clear, easy-to-read format for kitchen staff
 */
function formatKitchenReceipt(order: OrderPrintData): string {
  const ESC = '\x1B';
  const GS = '\x1D';

  let receipt = '';

  // Initialize printer
  receipt += `${ESC}@`; // Initialize

  // Header - Center aligned, bold
  receipt += `${ESC}a\x01`; // Center align
  receipt += `${ESC}E\x01`; // Bold on
  receipt += `${GS}!\x11`; // Double height and width
  receipt += `KITCHEN TICKET\n`;
  receipt += `${GS}!\x00`; // Normal size
  receipt += `${ESC}E\x00`; // Bold off
  receipt += `================================\n`;

  // Order info - Left align, large text
  receipt += `${ESC}a\x00`; // Left align
  receipt += `${ESC}E\x01`; // Bold on
  receipt += `${GS}!\x01`; // Double height
  receipt += `ORDER #${order.id}\n`;
  receipt += `${GS}!\x00`; // Normal size
  receipt += `${ESC}E\x00`; // Bold off

  receipt += `Name: ${order.customerName || 'Guest'}\n`;
  receipt += `Time: ${new Date(order.createdAt).toLocaleTimeString()}\n`;
  receipt += `\n`;

  // Order type badge
  receipt += `${ESC}E\x01`; // Bold on
  if (order.orderType === 'delivery') {
    receipt += `*** DELIVERY ***\n`;
  } else {
    receipt += `*** PICKUP ***\n`;
  }
  receipt += `${ESC}E\x00`; // Bold off
  receipt += `\n`;

  // What to make section
  receipt += `${ESC}E\x01`; // Bold on
  receipt += `WHAT YOU NEED TO MAKE:\n`;
  receipt += `${ESC}E\x00`; // Bold off
  receipt += `================================\n`;
  receipt += `\n`;

  // Items - Clear formatting for kitchen
  order.items.forEach((item: any) => {
    const itemName = item.menuItem?.name || item.name || 'Item';
    const qty = item.quantity;

    // Item with quantity - Bold, larger text
    receipt += `${ESC}E\x01${GS}!\x01`; // Bold and double height
    receipt += `${qty}x ${itemName}\n`;
    receipt += `${GS}!\x00${ESC}E\x00`; // Normal size and weight

    // Customizations/options - indented with checkmarks
    if (item.options && Array.isArray(item.options)) {
      item.options.forEach((opt: any) => {
        const optionName = opt.itemName || opt.name || '';
        const groupName = opt.groupName || '';
        if (groupName && optionName) {
          receipt += `  >> ${groupName}: ${optionName}\n`;
        } else if (optionName) {
          receipt += `  >> ${optionName}\n`;
        }
      });
    }

    // Special instructions - highlighted
    if (item.specialInstructions) {
      receipt += `${ESC}E\x01`; // Bold
      receipt += `  !! NOTE: ${item.specialInstructions}\n`;
      receipt += `${ESC}E\x00`; // Bold off
    }

    receipt += `--------------------------------\n`;
  });

  // Order-wide special instructions
  if (order.specialInstructions) {
    receipt += `\n`;
    receipt += `${ESC}E\x01`; // Bold on
    receipt += `ORDER NOTES:\n`;
    receipt += `${order.specialInstructions}\n`;
    receipt += `${ESC}E\x00`; // Bold off
    receipt += `================================\n`;
  }

  // Delivery address if applicable
  if (order.orderType === 'delivery' && order.address) {
    receipt += `\n`;
    receipt += `DELIVERY TO:\n`;
    receipt += `${order.address}\n`;
    receipt += `Phone: ${order.phone || 'N/A'}\n`;
  }

  receipt += `\n\n\n`;

  // Cut paper
  receipt += `${GS}V\x41\x03`; // Partial cut

  return receipt;
}

/**
 * Send print job to thermal printer via local printer server
 * Prints TWO receipts: 1) Customer receipt 2) Kitchen ticket
 * The printer server must be running on local network (localhost:3001 or computer IP:3001)
 */
export async function printToThermalPrinter(
  order: OrderPrintData,
  printer: PrinterConfig
): Promise<{ success: boolean; message: string }> {

  try {
    console.log(`🖨️  Preparing DUAL receipts (customer + kitchen) for order #${order.id}`);

    const printerServerUrl = await getPrinterServerUrl();
    console.log(`📡 Sending to printer server: ${printerServerUrl}`);

    // Generate both receipt formats
    const customerReceipt = formatCustomerReceipt(order);
    const kitchenReceipt = formatKitchenReceipt(order);

    console.log(`📄 Customer receipt: ${customerReceipt.length} bytes`);
    console.log(`📄 Kitchen receipt: ${kitchenReceipt.length} bytes`);

    try {
      // Send CUSTOMER receipt first
      console.log('📨 Sending customer receipt...');
      const customerResponse = await fetch(`${printerServerUrl}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiptData: customerReceipt,
          orderId: order.id,
          receiptType: 'customer'
        })
      });

      if (!customerResponse.ok) {
        throw new Error('Customer receipt print failed');
      }
      console.log('✅ Customer receipt printed');

      // Wait a moment between prints
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Send KITCHEN receipt second
      console.log('📨 Sending kitchen receipt...');
      const kitchenResponse = await fetch(`${printerServerUrl}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiptData: kitchenReceipt,
          orderId: order.id,
          receiptType: 'kitchen'
        })
      });

      if (!kitchenResponse.ok) {
        throw new Error('Kitchen receipt print failed');
      }
      console.log('✅ Kitchen receipt printed');

      return {
        success: true,
        message: `Order #${order.id} - Both receipts printed (customer + kitchen)`
      };

    } catch (serverError: any) {
      console.error('❌ Raspberry Pi printer server error:', serverError);

      // Check if it's a network/CORS error
      if (serverError.message?.includes('fetch') || serverError.name === 'TypeError') {
        return {
          success: false,
          message: `Cannot reach printer at ${printerServerUrl}. Make sure: 1) Raspberry Pi is on and printer-server is running, 2) You're on the same network (WiFi), 3) CORS is enabled on the printer server.`
        };
      }

      return {
        success: false,
        message: `Print failed: ${serverError.message}. Make sure Raspberry Pi at ${printerServerUrl} is on and printer-server is running.`
      };
    }

  } catch (error: any) {
    console.error('❌ Print failed:', error);

    return {
      success: false,
      message: `Print failed: ${error.message || 'Unknown error'}. Check that the Raspberry Pi printer server is accessible.`
    };
  }
}

/**
 * Get printer server URL
 * Checks localStorage for custom server, otherwise uses Raspberry Pi default
 */
async function getPrinterServerUrl(): Promise<string> {
  // Check if custom printer server URL is configured in localStorage first
  const customUrl = localStorage.getItem('printerServerUrl');
  if (customUrl) {
    return customUrl;
  }

  // Try to fetch from system settings
  try {
    const response = await fetch('/api/admin/system-settings', {
      credentials: 'include'
    });
    if (response.ok) {
      const settingsData = await response.json();
      const printerSettings = settingsData.printer || [];
      const serverUrlSetting = printerSettings.find((s: any) => s.setting_key === 'PRINTER_SERVER_URL');
      if (serverUrlSetting && serverUrlSetting.setting_value) {
        return serverUrlSetting.setting_value;
      }
    }
  } catch (error) {
    console.warn('Could not fetch printer server URL from settings, using default');
  }

  // Default: Raspberry Pi printer server on store network (HTTP)
  // This can be changed in Admin > System Settings > Printer Settings
  return 'http://192.168.1.18:3001';
}

/**
 * Fallback: Try HTTP printing (will show mixed content warning on iPad)
 */
async function printViaHTTP(
  order: OrderPrintData,
  printer: PrinterConfig
): Promise<{ success: boolean; message: string }> {

  try {
    console.log('🔄 Attempting HTTP print (may require accepting insecure content)...');

    const receiptData = formatCustomerReceipt(order);
    const printerUrl = `http://${printer.ipAddress}:${printer.port}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000`;

    const eposXml = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
      <text>${receiptData.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '&#10;')}</text>
      <cut type="partial"/>
    </epos-print>
  </s:Body>
</s:Envelope>`;

    await fetch(printerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '""'
      },
      body: eposXml,
      mode: 'no-cors'
    });

    return {
      success: true,
      message: `Order #${order.id} sent to ${printer.name}`
    };

  } catch (error: any) {
    console.error('❌ HTTP print failed:', error);

    // Last resort: Open browser print dialog
    return openPrintDialog(order, '');
  }
}

/**
 * Build receipt using Epson ePOS Builder API
 */
function buildEposReceipt(builder: ePOSBuilder, order: OrderPrintData): string {
  // Constants for alignment and styling
  const ALIGN_CENTER = 1;
  const ALIGN_LEFT = 0;
  const CUT_FEED = 0;

  // Header - Center aligned, bold, double height
  builder
    .addTextAlign(ALIGN_CENTER)
    .addTextStyle(false, false, true, 0)
    .addTextSize(2, 2)
    .addText("FAVILLA'S NY PIZZA\n")
    .addTextSize(1, 1)
    .addTextStyle(false, false, false, 0)
    .addFeedLine(1);

  // Order details - Left aligned
  builder
    .addTextAlign(ALIGN_LEFT)
    .addText(`Order #${order.id}\n`)
    .addText(`${order.orderType === 'delivery' ? 'DELIVERY' : 'PICKUP'}\n`)
    .addText(`${new Date(order.createdAt).toLocaleString()}\n`)
    .addText('--------------------------------\n');

  // Customer info for delivery
  if (order.orderType === 'delivery') {
    builder
      .addText(`Customer: ${order.customerName || 'Guest'}\n`)
      .addText(`Phone: ${order.phone || 'N/A'}\n`);
    if (order.address) {
      builder.addText(`Address: ${order.address}\n`);
    }
    builder.addText('--------------------------------\n');
  }

  // Items
  builder
    .addTextStyle(false, false, true, 0)
    .addText('ITEMS:\n')
    .addTextStyle(false, false, false, 0);

  order.items.forEach((item: any) => {
    const itemName = item.menuItem?.name || item.name || 'Item';
    const qty = item.quantity;
    const price = parseFloat(item.price || 0);

    builder.addText(`${qty}x ${itemName}\n`);

    // Add options
    if (item.options && Array.isArray(item.options)) {
      item.options.forEach((opt: any) => {
        builder.addText(`   + ${opt.itemName || opt.name}\n`);
      });
    }

    // Special instructions
    if (item.specialInstructions) {
      builder.addText(`   NOTE: ${item.specialInstructions}\n`);
    }

    builder.addText(`   $${price.toFixed(2)}\n`);
  });

  builder.addText('--------------------------------\n');

  // Totals
  const subtotal = order.total - (order.tax || 0) - (order.deliveryFee || 0);
  builder.addText(`Subtotal:        $${subtotal.toFixed(2)}\n`);

  if (order.deliveryFee && order.deliveryFee > 0) {
    builder.addText(`Delivery Fee:    $${order.deliveryFee.toFixed(2)}\n`);
  }

  if (order.tax && order.tax > 0) {
    builder.addText(`Tax:             $${order.tax.toFixed(2)}\n`);
  }

  if (order.tip && order.tip > 0) {
    builder.addText(`Tip:             $${order.tip.toFixed(2)}\n`);
  }

  builder
    .addTextStyle(false, false, true, 0)
    .addText(`TOTAL:           $${order.total.toFixed(2)}\n`)
    .addTextStyle(false, false, false, 0)
    .addText('--------------------------------\n');

  // Special instructions
  if (order.specialInstructions) {
    builder
      .addFeedLine(1)
      .addTextStyle(false, false, true, 0)
      .addText('SPECIAL INSTRUCTIONS:')
      .addTextStyle(false, false, false, 0)
      .addText('\n')
      .addText(`${order.specialInstructions}\n`)
      .addText('--------------------------------\n');
  }

  // Footer
  builder
    .addFeedLine(1)
    .addTextAlign(ALIGN_CENTER)
    .addText('Thank you!\n')
    .addFeedLine(3)
    .addCut(CUT_FEED);

  return builder.toString();
}

/**
 * Fallback: Open browser print dialog with formatted receipt
 */
function openPrintDialog(order: OrderPrintData, receiptData: string): { success: boolean; message: string } {
  console.log('📄 Opening browser print dialog as fallback');

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Order #${order.id} Receipt</title>
          <style>
            body {
              font-family: 'Courier New', monospace;
              margin: 0;
              padding: 20px;
              width: 80mm;
            }
            pre {
              white-space: pre-wrap;
              font-size: 12px;
              line-height: 1.4;
            }
            .page-break {
              page-break-after: always;
              margin: 20px 0;
            }
            @media print {
              body { margin: 0; padding: 10px; }
            }
          </style>
        </head>
        <body>
          <h3>Customer Receipt</h3>
          <pre>${formatCustomerReceipt(order).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
          <div class="page-break"></div>
          <h3>Kitchen Ticket</h3>
          <pre>${formatKitchenReceipt(order).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 1000);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return {
    success: true,
    message: `Order #${order.id} - Print dialog opened. Both receipts ready.`
  };
}
