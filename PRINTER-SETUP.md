# Thermal Printer Setup Guide

## Overview

Your thermal printer integration has two parts:
1. **Netlify Functions** - Format receipts with ESC/POS commands (already deployed)
2. **Local Printer Server** - Sends formatted receipts to your physical thermal printer

## Quick Start

### 1. Start the Printer Server

Open a terminal in your project folder and run:

```bash
node thermal-printer-server.js
```

You should see:

```
╔════════════════════════════════════════════╗
║   Thermal Printer Server Running          ║
╚════════════════════════════════════════════╝

🌐 Server: http://localhost:3001
🖨️  Printer: 192.168.1.208:80

Endpoints:
  POST /print       - Send print job
  POST /test-print  - Send test receipt
  GET  /health      - Check server status

Waiting for print jobs...
```

### 2. Test the Printer

Send a test print job:

```bash
curl -X POST http://localhost:3001/test-print
```

If successful, your thermal printer should print a test receipt!

### 3. Configure Your Printer

1. Go to **Admin Dashboard** → **Settings** → **Printer Configuration**
2. Add your printer:
   - **Name**: Epson TM-M30II (or your printer model)
   - **IP Address**: 192.168.1.208
   - **Port**: 80
   - **Printer Type**: Epson TM-M30II
3. Click **Set as Primary** to make it the active printer

## How It Works

```
Order Placed
    ↓
Netlify Function formats receipt (ESC/POS commands)
    ↓
Sends to http://localhost:3001/print
    ↓
Local Printer Server receives receipt data
    ↓
Sends raw TCP to 192.168.1.208:80
    ↓
Thermal Printer prints receipt 🎫
```

## Features

### Automatic Printing
- **On Order Confirmation**: Automatically prints when payment is completed
- **Kitchen Display**: Click the printer icon on any order to reprint

### Manual Printing
- Go to Kitchen Display
- Click the 🖨️ printer icon on any order
- Receipt will print to your active thermal printer

## Troubleshooting

### Printer Not Printing

**Problem**: Click print but nothing happens
**Solution**:
1. Make sure `thermal-printer-server.js` is running
2. Check printer is turned on and connected to network
3. Verify printer IP address is correct (192.168.1.208)

**Problem**: "Printer server offline" message
**Solution**:
```bash
node thermal-printer-server.js
```

### Test Connection

Test if printer is reachable:

```bash
ping 192.168.1.208
```

Send a test print:

```bash
curl -X POST http://localhost:3001/test-print
```

### Set Primary Not Working

If you can't set a printer as primary:
1. Refresh the page
2. The active printer will have a green "Active" badge
3. Only one printer can be active at a time

## Running in Production

### Option 1: Run on Local Computer (Recommended)
Keep `thermal-printer-server.js` running on a computer in your kitchen that's on the same network as the printer.

### Option 2: Run as Windows Service
Use a tool like `node-windows` to run the printer server as a background service that starts automatically.

Install node-windows:
```bash
npm install -g node-windows
```

Create service:
```bash
node install-printer-service.js
```

### Option 3: Run on Raspberry Pi
Deploy the printer server to a Raspberry Pi in your kitchen for a dedicated printer solution.

## Advanced Configuration

### Change Printer Server Port

Edit `thermal-printer-server.js`:
```javascript
const PORT = 3001; // Change this to your desired port
```

### Change Printer IP

Edit `thermal-printer-server.js`:
```javascript
const PRINTER_IP = '192.168.1.208'; // Your printer's IP
const PRINTER_PORT = 80; // Your printer's port
```

### Add Multiple Printers

You can configure multiple printers in the admin dashboard. The system will use whichever printer is set as "Primary" (active).

## Support

If you encounter any issues:
1. Check the printer server logs in the terminal
2. Check Netlify function logs in the Netlify dashboard
3. Verify your printer is ESC/POS compatible (most thermal receipt printers are)

## Printer Compatibility

This system works with ESC/POS compatible thermal printers including:
- Epson TM series (TM-M30II, TM-T20, TM-T88, etc.)
- Star Micronics
- Bixolon
- Most thermal receipt printers with ESC/POS support
