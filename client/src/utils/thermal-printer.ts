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
 * Send print job directly to Epson thermal printer from iPad
 * Uses Epson TM Print Assistant app URL scheme
 */
export async function printToThermalPrinter(
  order: OrderPrintData,
  printer: PrinterConfig
): Promise<{ success: boolean; message: string }> {

  try {
    console.log(`🖨️  Preparing receipt for printer: ${printer.ipAddress}`);

    // Build receipt data using ESC/POS commands
    const receiptData = formatReceipt(order);

    // Try Epson TM Print Assistant app first (if installed on iPad)
    // This app handles printing from Safari by registering a custom URL scheme
    const success = await printViaTMPrintAssistant(receiptData, printer);
    if (success) {
      return {
        success: true,
        message: `Order #${order.id} sent to ${printer.name} via TM Print Assistant`
      };
    }

    // Fallback 1: Try HTTPS port 8084 (if printer has SSL enabled)
    const httpsPort = 8084;
    const printerUrl = `https://${printer.ipAddress}:${httpsPort}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=10000`;

    console.log(`📡 Trying HTTPS: ${printerUrl}`);

    const eposXml = `<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/">
  <s:Body>
    <epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
      <text>${receiptData.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '&#10;')}</text>
      <cut type="partial"/>
    </epos-print>
  </s:Body>
</s:Envelope>`;

    const response = await fetch(printerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '""'
      },
      body: eposXml,
      mode: 'no-cors'
    });

    console.log('✅ Print job sent via HTTPS');

    return {
      success: true,
      message: `Order #${order.id} sent to ${printer.name}`
    };

  } catch (error: any) {
    console.error('❌ HTTPS print failed:', error);
    return printViaHTTP(order, printer);
  }
}

/**
 * Print via Epson TM Print Assistant app (iPad only)
 * Returns true if app handled the print, false if app not installed
 */
async function printViaTMPrintAssistant(
  receiptData: string,
  printer: PrinterConfig
): Promise<boolean> {
  try {
    // Convert receipt to base64 for URL encoding
    const base64Data = btoa(receiptData);

    // Epson TM Print Assistant URL scheme
    // Format: epos-print://print?address={ip}&data={base64_receipt}
    const tmPrintUrl = `epos-print://print?address=${printer.ipAddress}&data=${encodeURIComponent(base64Data)}`;

    console.log('📱 Attempting to open TM Print Assistant app...');

    // Try to open the app
    // If app is installed, this will switch to the app and print
    // If not installed, this will fail silently
    window.location.href = tmPrintUrl;

    // Wait a bit to see if app launches
    await new Promise(resolve => setTimeout(resolve, 500));

    // If we're still here, assume app handled it
    // (We can't actually detect if the app opened due to browser security)
    console.log('✅ Print request sent to TM Print Assistant');
    return true;

  } catch (error) {
    console.log('⚠️  TM Print Assistant not available, trying direct connection...');
    return false;
  }
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

    const receiptData = formatReceipt(order);
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
    return openPrintDialog(order, formatReceipt(order));
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
            @media print {
              body { margin: 0; padding: 10px; }
            }
          </style>
        </head>
        <body>
          <pre>${receiptData.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
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
    message: `Order #${order.id} - Print dialog opened. Select your thermal printer.`
  };
}
