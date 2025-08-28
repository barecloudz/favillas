// Preview what the receipts will look like
const mockOrderData = {
  orderNumber: 'DEMO-123',
  items: [
    { 
      name: 'Margherita Pizza 12"', 
      quantity: 1, 
      price: 14.99,
      modifications: ['Extra cheese', 'Thin crust'],
      specialInstructions: 'Well done'
    },
    { 
      name: 'Garlic Bread', 
      quantity: 2, 
      price: 4.50,
      modifications: [],
      specialInstructions: ''
    },
    { 
      name: 'Soda', 
      quantity: 1, 
      price: 2.50,
      modifications: ['Coke'],
      specialInstructions: ''
    }
  ],
  total: 26.49,
  customerName: 'Jane Smith',
  customerPhone: '(828) 555-9876',
  customerEmail: 'jane@example.com',
  orderTime: new Date().toISOString(),
  orderType: 'pickup',
  deliveryAddress: '',
  paymentMethod: 'card',
  staffMember: 'iPad Kiosk',
  estimatedReadyTime: new Date(Date.now() + 20 * 60000).toLocaleTimeString()
};

// Generate Customer Receipt
function generateCustomerReceipt(data) {
  let receiptText = '';
  
  receiptText += "FAVILLA'S NY PIZZA\\n";
  receiptText += '123 Main St, Asheville, NC\\n';
  receiptText += '(828) 555-0123\\n';
  receiptText += '======================\\n\\n';
  
  receiptText += `Order #: ${data.orderNumber}\\n`;
  receiptText += `Time: ${new Date(data.orderTime).toLocaleString()}\\n`;
  if (data.customerName) receiptText += `Customer: ${data.customerName}\\n`;
  if (data.estimatedReadyTime) receiptText += `Ready: ${data.estimatedReadyTime}\\n`;
  receiptText += `Type: ${data.orderType?.toUpperCase() || 'PICKUP'}\\n\\n`;
  
  receiptText += 'ITEMS:\\n';
  receiptText += '----------------------\\n';
  data.items.forEach(item => {
    receiptText += `${item.quantity}x ${item.name}\\n`;
    if (item.modifications?.length) {
      item.modifications.forEach(mod => {
        receiptText += `  + ${mod}\\n`;
      });
    }
    receiptText += `    $${(item.price * item.quantity).toFixed(2)}\\n`;
  });
  
  receiptText += '======================\\n';
  receiptText += `TOTAL: $${data.total.toFixed(2)}\\n`;
  if (data.paymentMethod) receiptText += `Payment: ${data.paymentMethod.toUpperCase()}\\n`;
  receiptText += '\\n';
  
  receiptText += 'Thank you for your order!\\n';
  if (data.orderType === 'pickup') {
    receiptText += 'Please wait for pickup call\\n';
  } else {
    receiptText += 'Your order is being prepared\\n';
    receiptText += 'for delivery\\n';
  }
  receiptText += '\\nVisit us again soon!\\n';
  
  return receiptText.replace(/\\n/g, '\\n');
}

// Generate Kitchen Ticket
function generateKitchenTicket(data) {
  let ticketText = '';
  
  ticketText += '*** KITCHEN COPY ***\\n';
  ticketText += '===================\\n\\n';
  
  ticketText += `ORDER #${data.orderNumber}\\n`;
  ticketText += `${new Date(data.orderTime).toLocaleString()}\\n`;
  if (data.customerName) ticketText += `Customer: ${data.customerName}\\n`;
  ticketText += `Type: ${data.orderType?.toUpperCase() || 'PICKUP'}\\n\\n`;
  
  ticketText += 'ITEMS TO PREPARE:\\n';
  ticketText += '-----------------\\n';
  data.items.forEach(item => {
    ticketText += `[${item.quantity}] ${item.name.toUpperCase()}\\n`;
    
    if (item.modifications?.length) {
      item.modifications.forEach(mod => {
        ticketText += `  >> ${mod.toUpperCase()}\\n`;
      });
    }
    
    if (item.specialInstructions) {
      ticketText += `  ** ${item.specialInstructions.toUpperCase()}\\n`;
    }
    ticketText += '\\n';
  });
  
  ticketText += '===================\\n';
  if (data.orderType === 'delivery') {
    ticketText += '   DELIVERY ORDER   \\n';
  } else {
    ticketText += '   PICKUP ORDER     \\n';
  }
  if (data.estimatedReadyTime) {
    ticketText += `Ready by: ${data.estimatedReadyTime}\\n`;
  }
  
  return ticketText.replace(/\\n/g, '\\n');
}

// Generate Records Copy
function generateRecordsCopy(data) {
  let recordText = '';
  
  recordText += '*** RECORDS COPY ***\\n';
  recordText += "FAVILLA'S NY PIZZA\\n";
  recordText += '===================\\n\\n';
  
  recordText += `Order #: ${data.orderNumber}\\n`;
  recordText += `Date/Time: ${new Date(data.orderTime).toLocaleString()}\\n`;
  recordText += `Order Type: ${data.orderType?.toUpperCase() || 'PICKUP'}\\n`;
  if (data.staffMember) recordText += `Staff: ${data.staffMember}\\n`;
  recordText += '\\n';
  
  recordText += 'CUSTOMER INFO:\\n';
  recordText += '--------------\\n';
  if (data.customerName) recordText += `Name: ${data.customerName}\\n`;
  if (data.customerPhone) recordText += `Phone: ${data.customerPhone}\\n`;
  if (data.customerEmail) recordText += `Email: ${data.customerEmail}\\n`;
  recordText += '\\n';
  
  recordText += 'ORDER DETAILS:\\n';
  recordText += '--------------\\n';
  data.items.forEach(item => {
    recordText += `${item.quantity}x ${item.name} @ $${item.price.toFixed(2)}\\n`;
    if (item.modifications?.length) {
      item.modifications.forEach(mod => {
        recordText += `  + ${mod}\\n`;
      });
    }
    if (item.specialInstructions) {
      recordText += `  Note: ${item.specialInstructions}\\n`;
    }
    recordText += `  Subtotal: $${(item.price * item.quantity).toFixed(2)}\\n\\n`;
  });
  
  recordText += '===================\\n';
  recordText += `TOTAL: $${data.total.toFixed(2)}\\n`;
  if (data.paymentMethod) recordText += `Payment: ${data.paymentMethod.toUpperCase()}\\n`;
  recordText += '\\n';
  
  recordText += 'Record kept for business\\n';
  recordText += 'accounting purposes\\n';
  
  return recordText.replace(/\\n/g, '\\n');
}

console.log('📋 RECEIPT PREVIEW TOOL');
console.log('========================\\n');

console.log('🧾 CUSTOMER RECEIPT:');
console.log('--------------------');
console.log(generateCustomerReceipt(mockOrderData));

console.log('\\n\\n👨‍🍳 KITCHEN TICKET:');
console.log('-------------------');
console.log(generateKitchenTicket(mockOrderData));

console.log('\\n\\n📁 RECORDS COPY:');
console.log('----------------');
console.log(generateRecordsCopy(mockOrderData));

console.log('\\n\\n✨ This is what will print when you place an order!');
console.log('🖨️ To test with mock printer: place an order through your website');