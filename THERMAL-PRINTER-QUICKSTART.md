# Thermal Printer Quick Start Guide

## ✅ Setup Complete!

Your thermal printer integration is now ready to use. The printer server is running and successfully connected to your Epson TM-M30II at 192.168.1.208.

## How to Use

### Starting the Printer Server

The thermal printer server must be running on a computer on the same network as your printer and iPad.

```bash
cd C:\Users\Blake\OneDrive\PizzaSpinRewards
node thermal-printer-server.cjs
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

### Testing the Printer

**From Command Line:**
```bash
curl -X POST http://localhost:3001/test-print
```

**From iPad (same network):**
1. Go to Kitchen Display: https://preview--pizzaspin.netlify.app/kitchen
2. Click the 🖨️ Print button on any order
3. The receipt will print automatically!

### How It Works

```
iPad (Safari Browser)
    ↓
Your Website (HTTPS)
    ↓
thermal-printer.ts calls http://localhost:3001/print
    ↓
thermal-printer-server.cjs (Node.js)
    ↓
Raw TCP socket to 192.168.1.208:80
    ↓
Epson TM-M30II Thermal Printer 🎫
```

## Configuration

### Printer Server Location

By default, the iPad will try to connect to `http://localhost:3001`. This works if:
- The printer server is running on the same iPad (not common)
- The printer server is running on a computer and the iPad is connected via that computer's hotspot

**If the printer server is on a different computer:**

1. Find the computer's IP address (e.g., 192.168.1.100)
2. On your iPad, open Safari Console and run:
   ```javascript
   localStorage.setItem('printerServerUrl', 'http://192.168.1.100:3001')
   ```
3. Reload the page

### Printer Settings

The printer is configured in Admin Dashboard → Printer Configuration:
- **IP Address**: 192.168.1.208
- **Port**: 80
- **Name**: Epson TM-M30II Kitchen
- **Status**: Active ✅

## Troubleshooting

### Printer Not Printing

**Check printer server is running:**
```bash
curl http://localhost:3001/health
```

Should return: `{"status":"ok","printer":"192.168.1.208:80"}`

**Test printer connection:**
```bash
curl -X POST http://localhost:3001/test-print
```

**Common Issues:**

1. **Connection timeout**
   - Check printer is powered on
   - Verify printer IP is still 192.168.1.208 (print network status page from printer)
   - Make sure printer and computer are on same WiFi

2. **Server not reachable from iPad**
   - Check firewall settings on computer running server
   - Verify iPad and computer are on same network
   - Try accessing http://[COMPUTER_IP]:3001/health from iPad Safari

3. **Print button opens browser dialog**
   - This means the printer server isn't reachable
   - Check localStorage printerServerUrl is correct
   - Verify server is running

## Receipt Format

Receipts automatically include:
- Restaurant name (FAVILLA'S NY PIZZA)
- Order number and type (Delivery/Pickup)
- Customer info (name, phone, address for delivery)
- All items with quantities, options, and special instructions
- Pricing breakdown (subtotal, delivery fee, tax, tip)
- Order-level special instructions
- Thank you message

## Production Deployment

The current setup works with:
- **Production site**: https://preview--pizzaspin.netlify.app
- **Local server**: Must run thermal-printer-server.cjs on local computer
- **Printer**: Epson TM-M30II at 192.168.1.208

**Important**: The printer server must always be running for printing to work. This is a limitation of web apps accessing local printers from HTTPS sites.

## Auto-Start Printer Server (Optional)

To make the printer server start automatically when your computer boots:

**Windows (Task Scheduler):**
1. Open Task Scheduler
2. Create Basic Task → "Thermal Printer Server"
3. Trigger: At startup
4. Action: Start a program
5. Program: `C:\Program Files\nodejs\node.exe`
6. Arguments: `thermal-printer-server.cjs`
7. Start in: `C:\Users\Blake\OneDrive\PizzaSpinRewards`

**Mac/Linux (systemd or launchd):**
See PRINTER-SETUP.md for detailed instructions.

## Raspberry Pi Printer Server

The printer is now connected to a Raspberry Pi (192.168.1.18:3001) running a Node.js printer server.

### Points Display Issue Fix

**Problem:** Receipt shows "Sign up to earn points" for ALL users, even those with accounts.

**Location:** Raspberry Pi at `~/printer-server/server.js`

**Required Fix:** Update the points section to check the `isGuest` flag:

```javascript
// Points section - check if user is guest or has account
if (receipt.pointsEarned && receipt.pointsEarned > 0) {
  builder.addFeedLine(1);
  builder.addTextAlign(builder.ALIGN_CENTER);

  if (receipt.isGuest) {
    // Guest user - encourage sign up
    builder.addTextStyle(false, false, true, builder.COLOR_1);
    builder.addText('REWARDS AVAILABLE!\n');
    builder.addTextStyle(false, false, false, builder.COLOR_1);
    builder.addText('Sign up to earn ' + receipt.pointsEarned + ' points\n');
    builder.addText('with this order!\n');
  } else {
    // Logged in user - show points earned
    builder.addTextStyle(false, false, true, builder.COLOR_1);
    builder.addText('POINTS EARNED!\n');
    builder.addTextStyle(false, false, false, builder.COLOR_1);
    builder.addText('You earned ' + receipt.pointsEarned + ' points\n');
    builder.addText('with this order!\n');
  }

  builder.addTextAlign(builder.ALIGN_LEFT);
}
```

### Data Sent from Client

The client sends the following fields to help determine points display:

```javascript
{
  // ... other fields
  pointsEarned: 26,  // 1 point per dollar spent
  isGuest: false     // true if user not logged in, false if user has account
}
```

### How to Apply Fix

SSH into the Raspberry Pi and edit the server:

```bash
ssh blake@192.168.1.18
cd ~/printer-server
nano server.js
# Add the points section code above
# Press Ctrl+X, Y, Enter to save
pkill node  # Stop current server
node server.js  # Restart server
```

## Support

- Printer status: Check https://192.168.1.18:3001/health
- Raspberry Pi: SSH to blake@192.168.1.18
- Server logs: Check terminal on Raspberry Pi running server.js
- Client logs: Open iPad Safari → Develop → iPad → Console
