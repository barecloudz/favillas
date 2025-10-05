/**
 * Local Thermal Printer Server
 *
 * This server receives formatted ESC/POS print jobs from your Netlify functions
 * and sends them directly to your thermal printer at 192.168.1.208:80
 *
 * Run this on your local machine with: node thermal-printer-server.js
 */

const express = require('express');
const net = require('net');
const cors = require('cors');

const app = express();
const PORT = 3001; // Local printer server port

// Printer configuration
const PRINTER_IP = '192.168.1.208';
const PRINTER_PORT = 80;

app.use(cors());
app.use(express.json());
app.use(express.text({ type: 'text/plain' }));

/**
 * Send ESC/POS data to thermal printer via raw TCP socket
 */
function sendToPrinter(escPosData) {
  return new Promise((resolve, reject) => {
    console.log(`🖨️  Connecting to printer at ${PRINTER_IP}:${PRINTER_PORT}...`);

    const client = new net.Socket();
    let timeout;

    // Set connection timeout
    timeout = setTimeout(() => {
      client.destroy();
      reject(new Error('Connection timeout'));
    }, 5000);

    client.connect(PRINTER_PORT, PRINTER_IP, () => {
      clearTimeout(timeout);
      console.log('✅ Connected to printer');

      // Send ESC/POS data
      client.write(escPosData, 'binary');
      console.log(`📄 Sent ${escPosData.length} bytes to printer`);

      // Wait a bit for printer to process, then close
      setTimeout(() => {
        client.end();
      }, 1000);
    });

    client.on('data', (data) => {
      console.log('📨 Printer response:', data.toString());
    });

    client.on('close', () => {
      console.log('🔌 Connection closed');
      resolve({ success: true });
    });

    client.on('error', (err) => {
      clearTimeout(timeout);
      console.error('❌ Printer error:', err.message);
      reject(err);
    });
  });
}

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'running',
    printer: {
      ip: PRINTER_IP,
      port: PRINTER_PORT
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Print endpoint - receives ESC/POS formatted receipt data
 */
app.post('/print', async (req, res) => {
  try {
    console.log('\n🎫 New print job received');

    const { receiptData, orderId } = req.body;

    if (!receiptData) {
      return res.status(400).json({
        success: false,
        error: 'Missing receiptData in request body'
      });
    }

    console.log(`📋 Order #${orderId || 'unknown'}`);
    console.log(`📏 Receipt length: ${receiptData.length} characters`);

    // Send to printer
    await sendToPrinter(receiptData);

    res.json({
      success: true,
      message: `Order #${orderId || 'unknown'} printed successfully`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Print error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to print'
    });
  }
});

/**
 * Test print endpoint - prints a simple test receipt
 */
app.post('/test-print', async (req, res) => {
  try {
    console.log('\n🧪 Test print requested');

    // Simple test receipt with ESC/POS commands
    const ESC = '\x1B';
    const GS = '\x1D';

    const testReceipt =
      `${ESC}@` + // Initialize
      `${ESC}a\x01` + // Center align
      `${ESC}E\x01` + // Bold on
      `FAVILLAS NY PIZZA\n` +
      `${ESC}E\x00` + // Bold off
      `Test Print\n` +
      `${new Date().toLocaleString()}\n` +
      `\n` +
      `${ESC}a\x00` + // Left align
      `If you can read this,\n` +
      `your thermal printer\n` +
      `is working correctly!\n` +
      `\n\n\n` +
      `${GS}V\x41\x03`; // Partial cut

    await sendToPrinter(testReceipt);

    res.json({
      success: true,
      message: 'Test receipt sent to printer',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test print error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to print test receipt'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   Thermal Printer Server Running          ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`\n🌐 Server: http://localhost:${PORT}`);
  console.log(`🖨️  Printer: ${PRINTER_IP}:${PRINTER_PORT}`);
  console.log('\nEndpoints:');
  console.log(`  POST /print       - Send print job`);
  console.log(`  POST /test-print  - Send test receipt`);
  console.log(`  GET  /health      - Check server status`);
  console.log('\nWaiting for print jobs...\n');
});
