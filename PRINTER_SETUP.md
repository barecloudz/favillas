# Epson TM-M32 Printer Integration Guide

This guide explains how to set up and use the Epson TM-M32 thermal printer with your Favilla's Pizza ordering system using the ePOS-Print API.

## 🖨️ Printer Requirements

- **Model**: Epson TM-M32 (or compatible TM series)
- **Connection**: Network/Ethernet connection
- **Features**: ePOS-Print API support

## 📋 Setup Instructions

### 1. Network Connection
1. Connect your Epson TM-M32 printer to your network via Ethernet cable
2. Ensure the printer is powered on and connected to the same network as your server
3. Note the printer's IP address (you'll need this later)

### 2. Find Printer IP Address
**Method 1: Test Page**
- Print a test page from the printer
- The IP address is usually displayed on the test page

**Method 2: Router DHCP List**
- Log into your router's admin panel
- Check the DHCP client list
- Look for a device named "EPSON" or similar

**Method 3: Network Scanner**
- Use a network scanner tool like Advanced IP Scanner
- Look for devices with "EPSON" in the name

### 3. Configure ePOS-Print Service

1. **Access Printer Web Interface**
   - Open a web browser
   - Navigate to `http://{PRINTER_IP}` (replace with your printer's IP)
   - You should see the Epson printer management interface

2. **Enable ePOS-Print**
   - Navigate to **"Printer Management"** or **"Configuration"**
   - Look for **"ePOS-Print"** or **"Web Service"** settings
   - **Enable** the ePOS-Print service
   - Set the service URL to: `http://{PRINTER_IP}/cgi-bin/epos/service.cgi`
   - **Save** the configuration

3. **Verify Configuration**
   - The printer should now accept HTTP POST requests
   - Test by visiting: `http://{PRINTER_IP}/cgi-bin/epos/service.cgi`

## 🚀 API Endpoints

### Basic Print
```http
POST /api/print
Content-Type: application/json

{
  "printerIp": "192.168.1.100",
  "text": "Hello World!\n\n",
  "fontSize": "normal",
  "alignment": "center",
  "bold": false,
  "underline": false,
  "cut": true
}
```

### Test Printer Connectivity
```http
POST /api/print/test
Content-Type: application/json

{
  "printerIp": "192.168.1.100"
}
```

### Print Receipt
```http
POST /api/print/receipt
Content-Type: application/json

{
  "printerIp": "192.168.1.100",
  "orderNumber": "ORD-001",
  "items": [
    {
      "name": "Margherita Pizza",
      "quantity": 1,
      "price": 12.99
    }
  ],
  "total": 12.99,
  "customerName": "John Doe",
  "customerPhone": "+1 555-123-4567",
  "orderTime": "2024-01-15 14:30:00"
}
```

## 📝 Parameters

### Print Options
- `printerIp` (required): Printer's IP address
- `text` (required): Text to print
- `fontSize`: `"small"` | `"normal"` | `"large"` (default: `"normal"`)
- `alignment`: `"left"` | `"center"` | `"right"` (default: `"left"`)
- `bold`: `true` | `false` (default: `false`)
- `underline`: `true` | `false` (default: `false`)
- `cut`: `true` | `false` (default: `true`)

### Receipt Options
- `orderNumber` (required): Order identifier
- `items` (required): Array of order items
- `total` (required): Order total amount
- `customerName`: Customer's name
- `customerPhone`: Customer's phone number
- `orderTime`: Order timestamp

## 🧪 Testing

### Run Test Script
```bash
# Update PRINTER_IP in test-printer.js
node test-printer.js
```

### Manual Testing with curl
```bash
# Test basic print
curl -X POST http://localhost:5000/api/print \
  -H "Content-Type: application/json" \
  -d '{
    "printerIp": "192.168.1.100",
    "text": "Test Print\n\n"
  }'

# Test connectivity
curl -X POST http://localhost:5000/api/print/test \
  -H "Content-Type: application/json" \
  -d '{"printerIp": "192.168.1.100"}'
```

## 🔧 Troubleshooting

### Common Issues

**1. "Connection refused" error**
- Check if printer is powered on and connected to network
- Verify printer IP address is correct
- Ensure server and printer are on same network

**2. "Invalid printer IP" error**
- Verify IP address format (e.g., 192.168.1.100)
- Check that IP address is valid

**3. "Printer returned status 404"**
- ePOS-Print service not enabled on printer
- Check printer web interface configuration
- Verify service URL is correct

**4. "Timeout" error**
- Network connectivity issues
- Printer may be busy or offline
- Check firewall settings

### Debug Steps

1. **Test Network Connectivity**
   ```bash
   ping 192.168.1.100  # Replace with your printer IP
   ```

2. **Test Printer Web Interface**
   - Open `http://{PRINTER_IP}` in browser
   - Should show Epson management interface

3. **Check Server Logs**
   - Look for error messages in server console
   - Check for network-related errors

4. **Verify ePOS-Print Configuration**
   - Access printer web interface
   - Confirm ePOS-Print is enabled
   - Verify service URL is correct

## 📄 Example XML Payload

The system generates ePOS-Print XML automatically, but here's an example:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <epos-print xmlns="http://www.epson-pos.com/schemas/2011/03/epos-print">
      <text>Hello World!</text>
      <text:font:width=2,height=2 />
      <text:align:position=center />
      <cut type="partial" />
    </epos-print>
  </s:Body>
</s:Envelope>
```

## 🔒 Security Considerations

- **Network Security**: Ensure printer is on a secure network
- **Access Control**: Consider implementing authentication for print endpoints
- **Input Validation**: All input is validated before sending to printer
- **Error Handling**: Comprehensive error handling prevents system crashes

## 📞 Support

If you encounter issues:
1. Check this troubleshooting guide
2. Verify printer configuration
3. Test network connectivity
4. Review server logs for detailed error messages

## 🎯 Integration with Ordering System

The printer integration is designed to work seamlessly with your restaurant ordering system:

- **Automatic Receipt Printing**: Orders automatically trigger receipt printing
- **Kitchen Tickets**: Separate print jobs for kitchen staff
- **Real-time Printing**: Immediate printing when orders are placed
- **Error Handling**: Graceful handling of printer errors

This integration provides a complete printing solution for your restaurant operations! 🍕


