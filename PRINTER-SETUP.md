# Thermal Printer Setup Guide - iPad Edition

## Overview

Your thermal printer is configured to print directly from your iPad browser **without any server or computer running**. This uses the Epson ePOS SDK for JavaScript which works from HTTPS sites.

## Requirements

- **Epson TM-M30II** thermal printer (or compatible ePOS model)
- Printer connected to **same WiFi network** as your iPad
- Printer IP address: **192.168.1.208**
- Printer port: **80** (default for ePOS-Print)

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

### 1. Configure Printer in Admin Dashboard

1. Open your website on the iPad
2. Go to **Admin Dashboard** → **Settings** → **Printer Configuration**
3. Click **Add Printer**
4. Enter printer details:
   - **Name**: Epson TM-M30II Kitchen
   - **IP Address**: 192.168.1.208
   - **Port**: 80
   - **Printer Type**: Epson TM-M30II
5. Click **Save**
6. Click **Set Primary** to make it the active printer

You should see a green "Active" badge on your printer.

### 2. Test Printing from iPad

1. Go to **Kitchen Display** on your iPad
2. Find any order
3. Click the 🖨️ **Print** button
4. The receipt should print automatically!

If it works, you're all set! 🎉

### 3. Automatic Printing on Orders (Optional)

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

### Epson ePOS SDK
The system uses the official Epson ePOS SDK for JavaScript which:
- Connects directly from browser to printer (no server needed)
- Works with HTTPS sites (secure)
- Supports iOS Safari, desktop browsers
- Uses ePOS-Print API on port 80

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
