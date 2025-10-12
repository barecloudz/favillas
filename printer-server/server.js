const express = require('express');
const cors = require('cors');
const escpos = require('escpos');
escpos.Network = require('escpos-network');

const app = express();
const PORT = 3001;

// Printer configuration
const PRINTER_IP = '192.168.1.208';
const PRINTER_PORT = 9100; // Standard ESC/POS port

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    printer: PRINTER_IP,
    timestamp: new Date().toISOString()
  });
});

// Print receipt endpoint
app.post('/print', async (req, res) => {
  try {
    const { receipt } = req.body;

    if (!receipt) {
      return res.status(400).json({ error: 'No receipt data provided' });
    }

    console.log('📄 Received print request');
    console.log('Connecting to printer at', PRINTER_IP);

    // Connect to network printer
    const device = new escpos.Network(PRINTER_IP, PRINTER_PORT);
    const printer = new escpos.Printer(device);

    await new Promise((resolve, reject) => {
      device.open(async (error) => {
        if (error) {
          console.error('❌ Failed to connect to printer:', error);
          reject(error);
          return;
        }

        try {
          console.log('✅ Connected to printer');

          // Print the receipt
          await printReceipt(printer, receipt);

          // Cut paper and close
          printer
            .cut()
            .close(() => {
              console.log('✅ Print job completed');
              resolve();
            });
        } catch (err) {
          console.error('❌ Error during printing:', err);
          reject(err);
        }
      });
    });

    res.json({
      success: true,
      message: 'Receipt printed successfully'
    });

  } catch (error) {
    console.error('❌ Print error:', error);
    res.status(500).json({
      error: 'Failed to print receipt',
      message: error.message
    });
  }
});

// Format and print receipt
async function printReceipt(printer, receipt) {
  // Store name/header
  printer
    .font('a')
    .align('ct')
    .style('bu')
    .size(2, 2)
    .text(receipt.storeName || "Favilla's NY Pizza")
    .size(1, 1)
    .style('normal');

  // Store address
  if (receipt.storeAddress) {
    printer.text(receipt.storeAddress);
  }
  if (receipt.storePhone) {
    printer.text(`Tel: ${receipt.storePhone}`);
  }

  printer.drawLine();

  // Order info
  printer
    .align('lt')
    .style('b')
    .size(1, 1)
    .text(`Order #${receipt.orderId}`)
    .style('normal')
    .text(`Date: ${new Date(receipt.orderDate).toLocaleString()}`);

  if (receipt.orderType) {
    printer.text(`Type: ${receipt.orderType.toUpperCase()}`);
  }

  if (receipt.scheduledTime) {
    printer.text(`Scheduled: ${new Date(receipt.scheduledTime).toLocaleString()}`);
  }

  printer.drawLine();

  // Customer info
  if (receipt.customerName) {
    printer.text(`Customer: ${receipt.customerName}`);
  }
  if (receipt.customerPhone) {
    printer.text(`Phone: ${receipt.customerPhone}`);
  }
  if (receipt.customerAddress && receipt.orderType === 'delivery') {
    printer.text(`Address: ${receipt.customerAddress}`);
  }

  printer.drawLine();

  // Items
  printer
    .style('b')
    .text('ITEMS')
    .style('normal');

  receipt.items.forEach(item => {
    // Item name and quantity
    const itemLine = `${item.quantity}x ${item.name}`;
    const price = `$${parseFloat(item.price).toFixed(2)}`;
    const total = `$${(parseFloat(item.price) * item.quantity).toFixed(2)}`;

    printer.text(itemLine);

    // Options/add-ons
    if (item.options && Array.isArray(item.options) && item.options.length > 0) {
      item.options.forEach(opt => {
        const optName = opt.itemName || opt.name || 'Add-on';
        const optPrice = opt.price ? ` (+$${parseFloat(opt.price).toFixed(2)})` : '';
        printer.text(`  + ${optName}${optPrice}`);
      });
    }

    // Special instructions
    if (item.specialInstructions) {
      printer.text(`  Note: ${item.specialInstructions}`);
    }

    // Price aligned right
    printer
      .align('rt')
      .text(total)
      .align('lt');
  });

  printer.drawLine();

  // Totals
  printer.align('rt');

  if (receipt.subtotal) {
    printer.text(`Subtotal: $${parseFloat(receipt.subtotal).toFixed(2)}`);
  }

  if (receipt.discount && parseFloat(receipt.discount) > 0) {
    printer.text(`Discount: -$${parseFloat(receipt.discount).toFixed(2)}`);
  }

  if (receipt.tax) {
    printer.text(`Tax: $${parseFloat(receipt.tax).toFixed(2)}`);
  }

  if (receipt.deliveryFee && parseFloat(receipt.deliveryFee) > 0) {
    printer.text(`Delivery Fee: $${parseFloat(receipt.deliveryFee).toFixed(2)}`);
  }

  if (receipt.tip && parseFloat(receipt.tip) > 0) {
    printer.text(`Tip: $${parseFloat(receipt.tip).toFixed(2)}`);
  }

  printer
    .drawLine()
    .style('b')
    .size(1, 1)
    .text(`TOTAL: $${parseFloat(receipt.total).toFixed(2)}`)
    .style('normal')
    .size(1, 1);

  printer.drawLine();

  // Footer
  printer
    .align('ct')
    .text('Thank you for your order!')
    .text('')
    .text('Visit us again soon!')
    .feed(2);
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🖨️  Thermal Printer Server Started');
  console.log(`📡 Server running on port ${PORT}`);
  console.log(`🖨️  Printer IP: ${PRINTER_IP}:${PRINTER_PORT}`);
  console.log(`🌐 Access from network: http://<raspberry-pi-ip>:${PORT}`);
  console.log('');
  console.log('Ready to receive print jobs...');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 Shutting down printer server...');
  process.exit(0);
});
