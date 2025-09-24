import axios from 'axios';
import { storage } from './storage';
import { log } from './vite';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Epson TM-M32 Printer Service using ePOS-Print API
 * 
 * SETUP INSTRUCTIONS:
 * 1. Connect your Epson TM-M32 printer to your network
 * 2. Find the printer's IP address (usually printed on a test page or in printer settings)
 * 3. Open a web browser and navigate to http://{printerIP}
 * 4. Go to "Printer Management" or "Configuration" section
 * 5. Look for "ePOS-Print" or "Web Service" settings
 * 6. Enable ePOS-Print service
 * 7. Set the service URL to: http://{printerIP}/cgi-bin/epos/service.cgi
 * 8. Save the configuration
 * 
 * The printer will now accept HTTP POST requests with XML payloads
 */

interface PrintRequest {
  printerIp: string;
  text: string;
  fontSize?: 'normal' | 'large' | 'small';
  alignment?: 'left' | 'center' | 'right';
  bold?: boolean;
  underline?: boolean;
  cut?: boolean;
}

interface OrderData {
  orderNumber: string;
  items: Array<{ 
    name: string; 
    quantity: number; 
    price: number;
    modifications?: string[];
    specialInstructions?: string;
    options?: any;
    halfAndHalf?: {
      leftToppings: Array<{ name: string; price: number }>;
      rightToppings: Array<{ name: string; price: number }>;
    };
  }>;
  total: number;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  orderTime?: string;
  orderType?: 'pickup' | 'delivery';
  deliveryAddress?: string;
  paymentMethod?: string;
  staffMember?: string;
  estimatedReadyTime?: string;
  // Rewards information
  pointsEarned?: number;
  currentPoints?: number;
  nextReward?: {
    name: string;
    pointsRequired: number;
    pointsNeeded: number;
  };
  availableRewards?: Array<{
    name: string;
    pointsRequired: number;
  }>;
}

interface PrintResponse {
  success: boolean;
  message: string;
  printerResponse?: any;
  error?: string;
}

/**
 * Get primary printer configuration from database
 * Falls back to environment variable for backward compatibility
 */
async function getPrimaryPrinterAddress(): Promise<string> {
  try {
    log('Attempting to fetch primary printer configuration from database...', 'server');
    const primaryPrinter = await storage.getPrimaryPrinterConfig();
    
    if (!primaryPrinter) {
      log('No primary printer found in database, falling back to environment variable', 'server');
    } else if (!primaryPrinter.isActive) {
      log(`Primary printer found but not active (ID: ${primaryPrinter.id}, Name: ${primaryPrinter.name}), falling back to environment variable`, 'server');
    } else {
      const address = primaryPrinter.port === 80 ? 
        primaryPrinter.ipAddress : 
        `${primaryPrinter.ipAddress}:${primaryPrinter.port}`;
      
      log(`Using database printer configuration: ${address} (ID: ${primaryPrinter.id}, Name: ${primaryPrinter.name})`, 'server');
      return address;
    }
  } catch (error) {
    log(`Error fetching printer configuration from database: ${error}`, 'server');
  }

  // Fallback to environment variable
  const envPrinterIp = process.env.PRINTER_IP || 'localhost:8080';
  log(`Using environment printer configuration: ${envPrinterIp}`, 'server');
  return envPrinterIp;
}

/**
 * Generate ePOS-Print XML payload for text printing
 */
function generateEposXml(data: PrintRequest): string {
  const {
    text,
    fontSize = 'normal',
    alignment = 'left',
    bold = false,
    underline = false,
    cut = true
  } = data;

  // Map font sizes to ePOS commands
  const fontSizeMap = {
    small: 'width="1" height="1"',
    normal: 'width="2" height="2"',
    large: 'width="3" height="3"'
  };

  // Map alignment to ePOS commands
  const alignmentMap = {
    left: 'align="left"',
    center: 'align="center"',
    right: 'align="right"'
  };

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
      <text>${text}</text>
      <feed line="3"/>
      ${cut ? '<cut type="feed" />' : ''}
    </epos-print>
  </s:Body>
</s:Envelope>`;

  return xml;
}

/**
 * Send print job to Epson TM-M32 printer
 */
export async function sendToPrinter(data: PrintRequest): Promise<PrintResponse> {
  try {
    const { printerIp } = data;
    
    // Validate printer IP (allow IPv4 with optional port, or localhost with port)
    if (!printerIp || (!printerIp.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/) && !printerIp.match(/^localhost:\d+$/))) {
      return {
        success: false,
        message: 'Invalid printer IP address',
        error: 'Printer IP must be a valid IPv4 address (with optional port) or localhost:port'
      };
    }

    // Generate XML payload
    const xmlPayload = generateEposXml(data);
    
    // Construct printer URL
    const printerUrl = `http://${printerIp}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=60000`;
    
    // Send print job
    const response = await axios.post(printerUrl, xmlPayload, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '""'
      },
      timeout: 30000, // 30 second timeout
      validateStatus: (status) => status < 500 // Accept any status < 500
    });

    return {
      success: response.status >= 200 && response.status < 300,
      message: response.status >= 200 && response.status < 300 
        ? 'Print job sent successfully' 
        : `Printer returned status ${response.status}`,
      printerResponse: {
        status: response.status,
        statusText: response.statusText,
        data: response.data
      }
    };

  } catch (error: any) {
    console.error('Printer error:', error);
    
    return {
      success: false,
      message: 'Failed to send print job',
      error: error.message || 'Unknown error occurred'
    };
  }
}

/**
 * Test printer connectivity
 */
export async function testPrinter(printerIp: string): Promise<PrintResponse> {
  try {
    const testData: PrintRequest = {
      printerIp,
      text: 'Printer Test\nConnection Successful!\n\n',
      fontSize: 'normal',
      alignment: 'center',
      cut: true
    };

    return await sendToPrinter(testData);
  } catch (error: any) {
    return {
      success: false,
      message: 'Printer test failed',
      error: error.message
    };
  }
}

/**
 * Generate customer receipt content
 */
function generateCustomerReceipt(data: OrderData): string {
  let receiptText = '';
  
  // Header with branding
  receiptText += "FAVILLA'S NY PIZZA\n";
  receiptText += '123 Main St, Asheville, NC\n';
  receiptText += '(828) 555-0123\n';
  receiptText += '======================\n\n';
  
  // Order info
  receiptText += `Order #: ${data.orderNumber}\n`;
  if (data.orderTime) receiptText += `Time: ${new Date(data.orderTime).toLocaleString()}\n`;
  if (data.customerName) receiptText += `Customer: ${data.customerName}\n`;
  if (data.estimatedReadyTime) receiptText += `Ready: ${data.estimatedReadyTime}\n`;
  receiptText += `Type: ${data.orderType?.toUpperCase() || 'PICKUP'}\n\n`;
  
  // Items with prices
  receiptText += 'ITEMS:\n';
  receiptText += '----------------------\n';
  data.items.forEach(item => {
    receiptText += `${item.quantity}x ${item.name}\n`;
    
    // Handle half & half pizza special formatting
    if (item.halfAndHalf) {
      receiptText += '  ** HALF & HALF PIZZA **\n';
      receiptText += '  Left side toppings:\n';
      if (item.halfAndHalf.leftToppings.length > 0) {
        item.halfAndHalf.leftToppings.forEach(topping => {
          receiptText += `    - ${topping.name}`;
          if (topping.price > 0) {
            receiptText += ` (+$${topping.price.toFixed(2)})`;
          }
          receiptText += '\n';
        });
      } else {
        receiptText += '    - Plain\n';
      }
      
      receiptText += '  Right side toppings:\n';
      if (item.halfAndHalf.rightToppings.length > 0) {
        item.halfAndHalf.rightToppings.forEach(topping => {
          receiptText += `    - ${topping.name}`;
          if (topping.price > 0) {
            receiptText += ` (+$${topping.price.toFixed(2)})`;
          }
          receiptText += '\n';
        });
      } else {
        receiptText += '    - Plain\n';
      }
    } else {
      // Handle regular modifications
      if (item.modifications?.length) {
        item.modifications.forEach(mod => {
          receiptText += `  + ${mod}\n`;
        });
      }
      
      // Handle new choice system format: [{ groupName: "Size", itemName: "Large", price: 2.00 }]
      if (item.options && Array.isArray(item.options)) {
        item.options.forEach((option: any) => {
          if (option.groupName && option.itemName) {
            receiptText += `  ${option.groupName.toUpperCase()}: ${option.itemName}`;
            if (option.price && option.price > 0) {
              receiptText += ` (+$${option.price.toFixed(2)})`;
            }
            receiptText += '\n';
          }
        });
      } else if (item.options && typeof item.options === 'object') {
        // Handle legacy selectedOptions format
        Object.entries(item.options).forEach(([key, value]) => {
          if (value && Array.isArray(value) && value.length > 0) {
            receiptText += `  ${key.toUpperCase()}: ${value.join(', ')}\n`;
          } else if (value && typeof value === 'string' && value.trim()) {
            receiptText += `  ${key.toUpperCase()}: ${value}\n`;
          } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            // Handle nested options
            Object.entries(value).forEach(([subKey, subValue]) => {
              if (subValue) {
                receiptText += `  ${key.toUpperCase()} ${subKey}: ${subValue}\n`;
              }
            });
          }
        });
      }
      
      // Handle special instructions
      if (item.specialInstructions && item.specialInstructions.trim()) {
        receiptText += `  ** SPECIAL: ${item.specialInstructions.toUpperCase()}\n`;
      }
    }
    
    receiptText += `    $${(item.price * item.quantity).toFixed(2)}\n`;
  });
  
  // Total
  receiptText += '======================\n';
  receiptText += `TOTAL: $${data.total.toFixed(2)}\n`;
  if (data.paymentMethod) receiptText += `Payment: ${data.paymentMethod.toUpperCase()}\n`;
  receiptText += '\n';
  
  // Rewards Section
  if (data.pointsEarned || data.currentPoints) {
    receiptText += '\n';
    receiptText += '════ REWARDS EARNED ════\n';
    
    if (data.pointsEarned) {
      receiptText += `🌟 Points Earned: +${data.pointsEarned}\n`;
    }
    
    if (data.currentPoints !== undefined) {
      receiptText += `💰 Total Points: ${data.currentPoints}\n`;
    }
    
    // Show available rewards they can claim now
    if (data.availableRewards && data.availableRewards.length > 0) {
      receiptText += '\n🎁 YOU CAN REDEEM:\n';
      data.availableRewards.forEach(reward => {
        receiptText += `   • ${reward.name}\n`;
      });
    }
    
    // Show next reward they're working towards
    if (data.nextReward) {
      receiptText += '\n🎯 NEXT REWARD:\n';
      receiptText += `   ${data.nextReward.name}\n`;
      receiptText += `   Only ${data.nextReward.pointsNeeded} more points!\n`;
    }
    
    receiptText += '\nRedeem at favillas.com/rewards\n';
    receiptText += '═══════════════════════\n';
  }

  // Footer
  receiptText += '\nThank you for your order!\n';
  if (data.orderType === 'pickup') {
    receiptText += 'Please wait for pickup call\n';
  } else {
    receiptText += 'Your order is being prepared\n';
    receiptText += 'for delivery\n';
  }
  receiptText += '\nVisit us again soon!\n';
  
  return receiptText;
}

/**
 * Generate kitchen ticket content
 */
function generateKitchenTicket(data: OrderData): string {
  let ticketText = '';
  
  // Header - larger text for kitchen
  ticketText += '*** KITCHEN COPY ***\n';
  ticketText += '===================\n\n';
  
  // Order info - no prices
  ticketText += `ORDER #${data.orderNumber}\n`;
  ticketText += `${new Date(data.orderTime || Date.now()).toLocaleString()}\n`;
  if (data.customerName) ticketText += `Customer: ${data.customerName}\n`;
  ticketText += `Type: ${data.orderType?.toUpperCase() || 'PICKUP'}\n`;
  
  if (data.orderType === 'delivery' && data.deliveryAddress) {
    ticketText += `Address: ${data.deliveryAddress}\n`;
  }
  ticketText += '\n';
  
  // Items with modifications and instructions
  ticketText += 'ITEMS TO PREPARE:\n';
  ticketText += '-----------------\n';
  data.items.forEach(item => {
    ticketText += `[${item.quantity}] ${item.name.toUpperCase()}\n`;
    
    // Handle half & half pizza special formatting for kitchen
    if (item.halfAndHalf) {
      ticketText += '  *** HALF & HALF PIZZA ***\n';
      ticketText += '  LEFT HALF:\n';
      if (item.halfAndHalf.leftToppings.length > 0) {
        item.halfAndHalf.leftToppings.forEach(topping => {
          ticketText += `    >> ${topping.name.toUpperCase()}\n`;
        });
      } else {
        ticketText += '    >> PLAIN\n';
      }
      
      ticketText += '  RIGHT HALF:\n';
      if (item.halfAndHalf.rightToppings.length > 0) {
        item.halfAndHalf.rightToppings.forEach(topping => {
          ticketText += `    >> ${topping.name.toUpperCase()}\n`;
        });
      } else {
        ticketText += '    >> PLAIN\n';
      }
    } else {
      // Handle regular modifications
      if (item.modifications?.length) {
        item.modifications.forEach(mod => {
          ticketText += `  >> ${mod.toUpperCase()}\n`;
        });
      }
      
      // Handle new choice system format for kitchen ticket
      if (item.options && Array.isArray(item.options)) {
        item.options.forEach((option: any) => {
          if (option.groupName && option.itemName) {
            ticketText += `  >> ${option.groupName.toUpperCase()}: ${option.itemName.toUpperCase()}`;
            if (option.price && option.price > 0) {
              ticketText += ` (+$${option.price.toFixed(2)})`;
            }
            ticketText += '\n';
          }
        });
      } else if (item.options && typeof item.options === 'object') {
        // Handle legacy selectedOptions format
        Object.entries(item.options).forEach(([key, value]) => {
          if (value && Array.isArray(value) && value.length > 0) {
            ticketText += `  >> ${key.toUpperCase()}: ${value.join(', ').toUpperCase()}\n`;
          } else if (value && typeof value === 'string' && value.trim()) {
            ticketText += `  >> ${key.toUpperCase()}: ${value.toUpperCase()}\n`;
          } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            // Handle nested options
            Object.entries(value).forEach(([subKey, subValue]) => {
              if (subValue) {
                ticketText += `  >> ${key.toUpperCase()} ${subKey.toUpperCase()}: ${subValue.toString().toUpperCase()}\n`;
              }
            });
          }
        });
      }
    }
    
    if (item.specialInstructions) {
      ticketText += `  ** ${item.specialInstructions.toUpperCase()}\n`;
    }
    ticketText += '\n';
  });
  
  // Special notes
  ticketText += '===================\n';
  if (data.orderType === 'delivery') {
    ticketText += '   DELIVERY ORDER   \n';
  } else {
    ticketText += '   PICKUP ORDER     \n';
  }
  if (data.estimatedReadyTime) {
    ticketText += `Ready by: ${data.estimatedReadyTime}\n`;
  }
  
  return ticketText;
}

/**
 * Generate records copy content
 */
function generateRecordsCopy(data: OrderData): string {
  let recordText = '';
  
  // Header
  recordText += '*** RECORDS COPY ***\n';
  recordText += "FAVILLA'S NY PIZZA\n";
  recordText += '===================\n\n';
  
  // Complete order details
  recordText += `Order #: ${data.orderNumber}\n`;
  recordText += `Date/Time: ${new Date(data.orderTime || Date.now()).toLocaleString()}\n`;
  recordText += `Order Type: ${data.orderType?.toUpperCase() || 'PICKUP'}\n`;
  if (data.staffMember) recordText += `Staff: ${data.staffMember}\n`;
  recordText += '\n';
  
  // Customer information
  recordText += 'CUSTOMER INFO:\n';
  recordText += '--------------\n';
  if (data.customerName) recordText += `Name: ${data.customerName}\n`;
  if (data.customerPhone) recordText += `Phone: ${data.customerPhone}\n`;
  if (data.customerEmail) recordText += `Email: ${data.customerEmail}\n`;
  if (data.deliveryAddress) recordText += `Address: ${data.deliveryAddress}\n`;
  recordText += '\n';
  
  // Items with full details
  recordText += 'ORDER DETAILS:\n';
  recordText += '--------------\n';
  data.items.forEach(item => {
    recordText += `${item.quantity}x ${item.name} @ $${item.price.toFixed(2)}\n`;
    
    // Handle half & half pizza special formatting for records
    if (item.halfAndHalf) {
      recordText += '  HALF & HALF PIZZA DETAILS:\n';
      recordText += '  Left side toppings:\n';
      if (item.halfAndHalf.leftToppings.length > 0) {
        item.halfAndHalf.leftToppings.forEach(topping => {
          recordText += `    - ${topping.name}`;
          if (topping.price > 0) {
            recordText += ` (+$${topping.price.toFixed(2)})`;
          }
          recordText += '\n';
        });
      } else {
        recordText += '    - Plain\n';
      }
      
      recordText += '  Right side toppings:\n';
      if (item.halfAndHalf.rightToppings.length > 0) {
        item.halfAndHalf.rightToppings.forEach(topping => {
          recordText += `    - ${topping.name}`;
          if (topping.price > 0) {
            recordText += ` (+$${topping.price.toFixed(2)})`;
          }
          recordText += '\n';
        });
      } else {
        recordText += '    - Plain\n';
      }
    } else if (item.modifications?.length) {
      item.modifications.forEach(mod => {
        recordText += `  + ${mod}\n`;
      });
    }
    
    if (item.specialInstructions) {
      recordText += `  Note: ${item.specialInstructions}\n`;
    }
    recordText += `  Subtotal: $${(item.price * item.quantity).toFixed(2)}\n\n`;
  });
  
  // Payment information
  recordText += '===================\n';
  recordText += `TOTAL: $${data.total.toFixed(2)}\n`;
  if (data.paymentMethod) recordText += `Payment: ${data.paymentMethod.toUpperCase()}\n`;
  recordText += '\n';
  
  // Footer
  recordText += 'Record kept for business\n';
  recordText += 'accounting purposes\n';
  
  return recordText;
}

/**
 * Print customer receipt
 */
export async function printCustomerReceipt(printerIp: string, orderData: OrderData): Promise<PrintResponse> {
  try {
    const receiptText = generateCustomerReceipt(orderData);
    
    const printData: PrintRequest = {
      printerIp,
      text: receiptText,
      fontSize: 'normal',
      alignment: 'left',
      cut: true
    };

    return await sendToPrinter(printData);
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to print customer receipt',
      error: error.message
    };
  }
}

/**
 * Print kitchen ticket
 */
export async function printKitchenTicket(printerIp: string, orderData: OrderData): Promise<PrintResponse> {
  try {
    const ticketText = generateKitchenTicket(orderData);
    
    const printData: PrintRequest = {
      printerIp,
      text: ticketText,
      fontSize: 'normal',
      alignment: 'left',
      cut: true
    };

    return await sendToPrinter(printData);
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to print kitchen ticket',
      error: error.message
    };
  }
}

/**
 * Print records copy
 */
export async function printRecordsCopy(printerIp: string, orderData: OrderData): Promise<PrintResponse> {
  try {
    const recordText = generateRecordsCopy(orderData);
    
    const printData: PrintRequest = {
      printerIp,
      text: recordText,
      fontSize: 'small',
      alignment: 'left',
      cut: true
    };

    return await sendToPrinter(printData);
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to print records copy',
      error: error.message
    };
  }
}

/**
 * Print all three receipts for an order
 */
export async function printAllReceipts(printerIp: string, orderData: OrderData): Promise<{
  customer: PrintResponse;
  kitchen: PrintResponse;
  records: PrintResponse;
}> {
  const results = {
    customer: await printCustomerReceipt(printerIp, orderData),
    kitchen: await printKitchenTicket(printerIp, orderData),
    records: await printRecordsCopy(printerIp, orderData)
  };
  
  return results;
}

// Export OrderData interface for use in other files
export type { OrderData };

/**
 * Auto-print functions using primary printer configuration
 * These functions automatically use the primary printer from database configuration
 */
export async function printCustomerReceiptAuto(orderData: OrderData): Promise<PrintResponse> {
  try {
    const printerAddress = await getPrimaryPrinterAddress();
    return await printCustomerReceipt(printerAddress, orderData);
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to print customer receipt (auto-printer)',
      error: error.message
    };
  }
}

export async function printKitchenTicketAuto(orderData: OrderData): Promise<PrintResponse> {
  try {
    const printerAddress = await getPrimaryPrinterAddress();
    return await printKitchenTicket(printerAddress, orderData);
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to print kitchen ticket (auto-printer)',
      error: error.message
    };
  }
}

export async function printRecordsCopyAuto(orderData: OrderData): Promise<PrintResponse> {
  try {
    const printerAddress = await getPrimaryPrinterAddress();
    return await printRecordsCopy(printerAddress, orderData);
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to print records copy (auto-printer)',
      error: error.message
    };
  }
}

export async function printAllReceiptsAuto(orderData: OrderData): Promise<{
  customer: PrintResponse;
  kitchen: PrintResponse;
  records: PrintResponse;
}> {
  try {
    const printerAddress = await getPrimaryPrinterAddress();
    return await printAllReceipts(printerAddress, orderData);
  } catch (error: any) {
    const errorResponse: PrintResponse = {
      success: false,
      message: 'Failed to print receipts (auto-printer)',
      error: error.message
    };
    return {
      customer: errorResponse,
      kitchen: errorResponse,
      records: errorResponse
    };
  }
}

/**
 * Test primary printer connection
 */
export async function testPrimaryPrinter(): Promise<PrintResponse> {
  try {
    const printerAddress = await getPrimaryPrinterAddress();
    return await testPrinter(printerAddress);
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to test primary printer',
      error: error.message
    };
  }
}

/**
 * Legacy function - kept for backward compatibility
 */
export async function printReceipt(data: {
  printerIp: string;
  orderNumber: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  customerName?: string;
  customerPhone?: string;
  orderTime?: string;
}): Promise<PrintResponse> {
  // Convert legacy format to new OrderData format
  const orderData: OrderData = {
    orderNumber: data.orderNumber,
    items: data.items,
    total: data.total,
    customerName: data.customerName,
    customerPhone: data.customerPhone,
    orderTime: data.orderTime
  };
  
  // Use customer receipt as default for backward compatibility
  return await printCustomerReceipt(data.printerIp, orderData);
}

/**
 * Discover network printers by scanning common ports
 */
export async function discoverNetworkPrinters(): Promise<Array<{ip: string, port: number, status: string}>> {
  const foundPrinters: Array<{ip: string, port: number, status: string}> = [];
  
  try {
    // Get network range
    const networkRange = await getLocalNetworkRange();
    const commonPorts = [80, 8008, 8080, 9100, 631]; // Common printer ports
    
    log(`Scanning network ${networkRange} for printers on ports ${commonPorts.join(', ')}...`, 'server');
    
    // Scan first 10 IPs of the network for testing (can be expanded)
    const baseIp = networkRange.split('.').slice(0, 3).join('.');
    const scanPromises = [];
    
    for (let i = 1; i <= 10; i++) {
      const ip = `${baseIp}.${i}`;
      for (const port of commonPorts) {
        scanPromises.push(checkPrinterPort(ip, port));
      }
    }
    
    const results = await Promise.allSettled(scanPromises);
    
    results.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        foundPrinters.push(result.value);
      }
    });
    
    log(`Found ${foundPrinters.length} potential printers`, 'server');
    return foundPrinters;
    
  } catch (error) {
    log(`Error during printer discovery: ${error}`, 'server');
    return [];
  }
}

/**
 * Get local network range
 */
async function getLocalNetworkRange(): Promise<string> {
  try {
    const { stdout } = await execAsync('ipconfig');
    const lines = stdout.split('\n');
    
    for (const line of lines) {
      if (line.includes('IPv4 Address') && line.includes('192.168.')) {
        const match = line.match(/(\d+\.\d+\.\d+\.\d+)/);
        if (match) {
          return match[1];
        }
      }
    }
    
    // Fallback to common ranges
    return '192.168.1.1';
  } catch (error) {
    log(`Error getting network range: ${error}`, 'server');
    return '192.168.1.1';
  }
}

/**
 * Check if a specific IP:port combination has a printer
 */
async function checkPrinterPort(ip: string, port: number): Promise<{ip: string, port: number, status: string} | null> {
  try {
    const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
      <text>Discovery Test</text>
    </epos-print>
  </s:Body>
</s:Envelope>`;

    const url = `http://${ip}:${port}/cgi-bin/epos/service.cgi?devid=local_printer&timeout=3000`;
    
    const response = await axios.post(url, testXml, {
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '""'
      },
      timeout: 3000 // Short timeout for discovery
    });
    
    if (response.data.includes('success="true"')) {
      return { ip, port, status: 'available' };
    } else {
      return { ip, port, status: 'error' };
    }
    
  } catch (error) {
    // Ignore timeout/connection errors during discovery
    return null;
  }
}
