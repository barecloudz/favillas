# iPad Production Printing Setup

## Overview
This guide configures the automated 3-receipt printing system for the iPad production environment.

## Receipt Types
When an order is placed, the system automatically prints:

1. **Customer Receipt** - Given to customer with order details and pickup info
2. **Kitchen Ticket** - For kitchen staff with prep instructions (no prices)
3. **Records Copy** - For business records with complete transaction details

## Production Configuration

### 1. Printer Network Setup
- Connect Epson TM-M32 to restaurant Wi-Fi
- Assign static IP address (recommended: `192.168.1.100`)
- Configure ePOS-Print service on printer web interface

### 2. Environment Variables
Update `.env` file with production printer IP:
```env
PRINTER_IP=192.168.1.100  # Your actual printer IP
```

### 3. iPad Browser Settings
- Use full-screen mode for kiosk operation
- Disable browser zoom/pinch gestures
- Set up auto-refresh if needed

### 4. Network Requirements
- Stable Wi-Fi connection between iPad and printer
- Printer and server on same network
- Firewall allows port 80 access to printer

## Testing the System

### Manual Test (Before Going Live)
```bash
# Test all receipt types
curl -X POST "http://localhost:5000/api/print/all" \
  -H "Content-Type: application/json" \
  -d '{
    "printerIp": "192.168.1.100",
    "orderData": {
      "orderNumber": "TEST-001",
      "items": [
        {
          "name": "Test Pizza",
          "quantity": 1,
          "price": 12.99,
          "modifications": ["Extra cheese"],
          "specialInstructions": "Well done"
        }
      ],
      "total": 12.99,
      "customerName": "Test Customer",
      "customerPhone": "555-1234",
      "customerEmail": "test@example.com",
      "orderTime": "2025-01-20T12:00:00Z",
      "orderType": "pickup",
      "paymentMethod": "card",
      "staffMember": "iPad",
      "estimatedReadyTime": "12:20 PM"
    }
  }'
```

### Production Order Flow
1. Customer places order on iPad
2. Order saves to database
3. System automatically prints all 3 receipts:
   - Customer receipt (hand to customer)
   - Kitchen ticket (send to kitchen)
   - Records copy (keep for files)
4. Kitchen sees order on kitchen display
5. Staff processes order

## Receipt Templates

### Customer Receipt Format
```
FAVILLA'S NY PIZZA
123 Main St, Asheville, NC
(828) 555-0123
======================

Order #: 28
Time: 1/20/2025, 12:00:00 PM
Customer: John Doe
Ready: 12:20 PM
Type: PICKUP

ITEMS:
----------------------
1x Traditional Pizza 10"
  + Extra cheese
    $17.99

======================
TOTAL: $17.99
Payment: CARD

Thank you for your order!
Please wait for pickup call

Visit us again soon!
```

### Kitchen Ticket Format
```
*** KITCHEN COPY ***
===================

ORDER #28
1/20/2025, 12:00:00 PM
Customer: John Doe
Type: PICKUP

ITEMS TO PREPARE:
-----------------
[1] TRADITIONAL PIZZA 10"
  >> EXTRA CHEESE

===================
   PICKUP ORDER     
Ready by: 12:20 PM
```

### Records Copy Format
```
*** RECORDS COPY ***
FAVILLA'S NY PIZZA
===================

Order #: 28
Date/Time: 1/20/2025, 12:00:00 PM
Order Type: PICKUP
Staff: iPad

CUSTOMER INFO:
--------------
Name: John Doe
Phone: 555-1234
Email: john@example.com

ORDER DETAILS:
--------------
1x Traditional Pizza 10" @ $17.99
  + Extra cheese
  Subtotal: $17.99

===================
TOTAL: $17.99
Payment: CARD

Record kept for business
accounting purposes
```

## Troubleshooting

### Printer Not Responding
1. Check printer power and Wi-Fi connection
2. Verify printer IP address in `.env`
3. Test printer web interface: `http://[printer-ip]`
4. Restart printer if needed

### Receipts Not Printing
1. Check server logs for printer errors
2. Verify ePOS-Print service enabled on printer
3. Test with manual API call (see above)
4. Check network connectivity

### Print Quality Issues
1. Check printer paper and ribbons
2. Clean printer head if needed
3. Verify printer settings in web interface

### Order Not Triggering Prints
1. Check server console for errors
2. Verify order creation process
3. Check if `PRINTER_IP` environment variable is set

## Production Monitoring

### Daily Checks
- [ ] Test print functionality at opening
- [ ] Check printer paper levels
- [ ] Verify receipt quality
- [ ] Confirm all 3 receipt types printing

### Weekly Maintenance
- [ ] Clean printer
- [ ] Check network connectivity
- [ ] Review error logs
- [ ] Test backup procedures

### Error Recovery
If printing fails during operation:
1. Orders still save to database
2. Manually reprint from admin dashboard
3. Use manual receipt if needed for customer
4. Kitchen can view orders on display system

## Support Contacts
- Printer Issues: Epson Support
- Network Issues: IT Support
- Software Issues: Development Team