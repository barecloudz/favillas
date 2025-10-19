/**
 * Raspberry Pi Thermal Printer Server with HTTPS
 *
 * This server runs on the Raspberry Pi and receives print jobs from the kitchen iPad.
 * It uses HTTPS with a self-signed certificate to avoid mixed content errors.
 *
 * Setup Instructions:
 * 1. Copy this file to the Raspberry Pi: /home/pi/printer-server.js
 * 2. Install dependencies: npm install express cors https escpos escpos-usb
 * 3. Generate SSL certificate (see commands below)
 * 4. Set up as systemd service (see service file below)
 * 5. Start the service: sudo systemctl start printer-server
 */

const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

// Enable CORS for all origins (kitchen iPad needs access)
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Printer server is running',
    timestamp: new Date().toISOString()
  });
});

// Print endpoint
app.post('/print', async (req, res) => {
  try {
    const { receiptData, orderId, receiptType } = req.body;

    if (!receiptData) {
      return res.status(400).json({
        error: 'receiptData is required'
      });
    }

    console.log(`📄 Received print request for order #${orderId} (${receiptType || 'unknown'})`);
    console.log(`📊 Receipt data length: ${receiptData.length} bytes`);

    // Initialize USB printer
    const escpos = require('escpos');
    escpos.USB = require('escpos-usb');

    // Find the first available USB printer
    const device = new escpos.USB();

    // Check if printer is connected
    if (!device) {
      console.error('❌ No USB printer found');
      return res.status(500).json({
        error: 'No USB printer found. Make sure the printer is connected via USB.'
      });
    }

    // Create printer instance
    const printer = new escpos.Printer(device);

    // Open connection and print
    device.open(function(error) {
      if (error) {
        console.error('❌ Failed to open printer:', error);
        return res.status(500).json({
          error: 'Failed to open printer connection',
          details: error.message
        });
      }

      try {
        // Send raw ESC/POS commands
        printer.raw(Buffer.from(receiptData, 'utf-8'));

        // Close the connection
        device.close(function() {
          console.log(`✅ Successfully printed ${receiptType || 'receipt'} for order #${orderId}`);
          res.json({
            success: true,
            message: `Printed ${receiptType || 'receipt'} for order #${orderId}`,
            timestamp: new Date().toISOString()
          });
        });
      } catch (printError) {
        console.error('❌ Print error:', printError);
        device.close();
        res.status(500).json({
          error: 'Failed to print',
          details: printError.message
        });
      }
    });

  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// Load SSL certificate (must be generated first - see instructions below)
const certPath = '/home/pi/ssl';
let server;

if (fs.existsSync(path.join(certPath, 'cert.pem')) && fs.existsSync(path.join(certPath, 'key.pem'))) {
  const httpsOptions = {
    key: fs.readFileSync(path.join(certPath, 'key.pem')),
    cert: fs.readFileSync(path.join(certPath, 'cert.pem'))
  };

  server = https.createServer(httpsOptions, app);
  console.log('🔒 HTTPS server configured with SSL certificate');
} else {
  console.warn('⚠️  SSL certificates not found. Please generate them first.');
  console.warn('Run these commands on the Raspberry Pi:');
  console.warn('  mkdir -p /home/pi/ssl');
  console.warn('  cd /home/pi/ssl');
  console.warn('  openssl req -nodes -new -x509 -keyout key.pem -out cert.pem -days 3650 -subj "/CN=192.168.1.18"');
  process.exit(1);
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🖨️  Raspberry Pi Thermal Printer Server');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Server running on https://192.168.1.18:${PORT}`);
  console.log(`📡 Accepting requests from all origins (CORS enabled)`);
  console.log(`🔒 SSL/TLS enabled`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\nEndpoints:');
  console.log(`  GET  /health - Health check`);
  console.log(`  POST /print  - Print receipt`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down printer server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
