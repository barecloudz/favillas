# Thermal Printer Setup Guide - iPad Edition

## Overview

Your thermal printer is configured to print directly from your iPad browser **without any server or computer running**. This uses the Epson ePOS SDK for JavaScript which works from HTTPS sites.

## Requirements

- **Epson TM-M30II** thermal printer (or compatible ePOS model)
- Printer connected to **same WiFi network** as your iPad
- Printer IP address: **192.168.1.208**
- **HTTPS enabled on printer** (port 8084) - Required for iPad printing from HTTPS sites
- ePOS-Print service enabled on printer

## How It Works

```
Order Placed on iPad
    ↓
iPad browser calls Epson ePOS SDK
    ↓
SDK connects directly to printer via WiFi (192.168.1.208:80)
    ↓
Thermal Printer prints receipt 🎫
```

No server needed! The iPad talks directly to the printer on your local network.

## Setup Instructions

### 1. Enable HTTPS on Printer (One-Time Setup)

The Epson TM-M30II must have HTTPS enabled to work from HTTPS websites (like your Netlify deployment).

**Method 1: Using Printer Web Interface**
1. On your iPad, open Safari
2. Go to `http://192.168.1.208`
3. You'll see the printer's web configuration page
4. Go to **SSL/TLS Settings**
5. Enable **SSL/TLS**
6. The printer will now accept HTTPS connections on port **8084**

**Method 2: Using Epson TM Utility App** (Recommended for iPad)
1. Download **Epson TM Utility** from the App Store
2. Open the app and connect to your printer (192.168.1.208)
3. Go to **Settings** → **SSL/TLS**
4. Enable SSL/TLS
5. Save changes

**Important**: After enabling HTTPS, you may need to accept the printer's self-signed certificate the first time you print.

### 2. Configure Printer in Admin Dashboard

1. Open your website on the iPad
2. Go to **Admin Dashboard** → **Settings** → **Printer Configuration**
3. Click **Add Printer**
4. Enter printer details:
   - **Name**: Epson TM-M30II Kitchen
   - **IP Address**: 192.168.1.208
   - **Port**: 80 (this will be auto-upgraded to 8084 for HTTPS)
   - **Printer Type**: Epson TM-M30II
5. Click **Save**
6. Click **Set Primary** to make it the active printer

You should see a green "Active" badge on your printer.

### 3. Accept Printer SSL Certificate (First Time Only)

The first time you print, Safari may show a security warning about the printer's self-signed SSL certificate:

1. Click the 🖨️ **Print** button on an order
2. Safari may show: "Cannot verify server identity"
3. Tap **Show Details**
4. Tap **Visit this website**
5. Confirm you want to continue

This only needs to be done once. Future prints will work automatically.

### 4. Test Printing from iPad

1. Go to **Kitchen Display** on your iPad
2. Find any order
3. Click the 🖨️ **Print** button
4. The receipt should print automatically!

If it works, you're all set! 🎉

### 5. Automatic Printing on Orders (Optional)

Receipts can automatically print when orders are confirmed. This is configured in your order processing code.

## Troubleshooting

### Printer Not Printing

**Problem**: Click print but nothing prints

**Solutions**:

1. **Check iPad and printer are on same WiFi**
   - iPad must be on the same network as the printer
   - Check WiFi settings on iPad
   - Verify printer is connected to WiFi (print network status from printer)

2. **Verify printer IP address**
   - Current IP: 192.168.1.208
   - Print a printer status page to confirm IP
   - Update in Admin Dashboard if changed

3. **Check printer is turned on**
   - Power on the Epson TM-M30II
   - Wait for it to finish startup (about 30 seconds)

4. **Test printer connection from iPad**
   - Open Safari on iPad
   - Go to http://192.168.1.208
   - You should see the Epson ePOS-Print configuration page
   - If this doesn't load, the printer isn't reachable

5. **HTTPS/SSL not enabled**
   - The printer must have SSL/TLS enabled for HTTPS printing
   - Follow "Enable HTTPS on Printer" instructions above
   - Without HTTPS, Safari will block the print request from your HTTPS website

**Problem**: "Epson ePOS SDK not loaded" error

**Solution**:
- Refresh the webpage on your iPad
- Make sure you're using Safari (Chrome on iOS doesn't fully support ePOS SDK)
- Clear browser cache and reload

**Problem**: "Connection timeout" error

**Solution**:
- The printer may be sleeping - send a test print to wake it
- Restart the printer
- Check firewall settings if printer has one

### Set Primary Not Working

This was a bug that has been fixed. The "Set Primary" button now correctly:
1. Sets the selected printer as active
2. Sets all other printers as inactive
3. Shows a green "Active" badge on the primary printer
4. Updates immediately without page refresh

If you still have issues:
1. Refresh the page
2. Only one printer can be active at a time
3. The active printer is used for all print jobs

## iPad-Specific Notes

### Safari Required
- Use **Safari browser** on iPad for best compatibility
- Chrome and Firefox on iOS have limited ePOS SDK support

### Network Connection
- Keep iPad connected to WiFi (same network as printer)
- Don't use cellular data
- If WiFi drops, reconnect and try printing again

### Multiple iPads
- You can use multiple iPads
- All iPads must be on same network as printer
- Configure printer once, works on all devices

## Advanced Configuration

### Change Printer IP Address

If your printer's IP address changes:

1. Find new IP address (print network status from printer)
2. Go to Admin Dashboard → Printer Configuration
3. Click Edit on your printer
4. Update IP address
5. Click Save
6. Test print to verify

### Add Multiple Printers

You can configure multiple printers:
1. Add each printer with unique IP address
2. Only one can be "Primary" (active) at a time
3. Click "Set Primary" to switch between printers
4. Useful for kitchen printer + customer receipt printer

## Technical Details

### HTTPS Printing Solution
The system prints directly from your HTTPS website to the printer using:
- **Port 8084**: Epson's HTTPS ePOS-Print port (bypasses mixed content restrictions)
- **Port 80 fallback**: HTTP printing (will be blocked by Safari unless insecure content is allowed)
- **ePOS-Print XML API**: Standard Epson thermal printer protocol
- **No server needed**: iPad browser talks directly to printer on WiFi

### How It Works
1. iPad browser sends HTTPS request to `https://192.168.1.208:8084/cgi-bin/epos/service.cgi`
2. Printer accepts HTTPS connection (using self-signed SSL certificate)
3. Browser sends ePOS-Print XML with receipt data
4. Printer parses XML and prints receipt
5. All communication stays on local WiFi network

### Receipt Format
Receipts include:
- **Header**: Restaurant name (FAVILLA'S NY PIZZA)
- **Order Info**: Order #, type (delivery/pickup), date/time
- **Customer Info**: Name, phone, address (for delivery)
- **Items**: Quantity, name, options, special instructions, price
- **Totals**: Subtotal, delivery fee, tax, tip, total
- **Special Instructions**: Order-level notes
- **Footer**: Thank you message

### Security
- All communication stays on your local network
- No data sent to external servers
- Printer must be on same WiFi as iPad (cannot print over internet)

## Printer Compatibility

**Supported Printers:**
- ✅ Epson TM-M30II (your current printer)
- ✅ Epson TM-M30III
- ✅ Epson TM-T88VI/VII
- ✅ Epson TM-T20III
- ✅ Any Epson printer with ePOS-Print support

**Not Supported:**
- ❌ Non-Epson printers (Star, Bixolon, etc.)
- ❌ USB-only printers
- ❌ Bluetooth printers
- ❌ Printers without ePOS-Print API

## Support

**Common Issues:**
1. Printer not printing → Check WiFi connection
2. Wrong IP address → Update in Admin Dashboard
3. SDK not loaded → Refresh page in Safari
4. Timeout errors → Restart printer

**Getting Help:**
- Check printer network status page
- Verify ePOS-Print is enabled on printer
- Make sure printer firmware is up to date
- Contact Epson support for printer issues
