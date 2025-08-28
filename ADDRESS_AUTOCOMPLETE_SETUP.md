# Address Form & ShipDay Integration Setup

This guide explains how to set up the address form and ShipDay delivery integration for Favilla's NY Pizza.

## Features Implemented

### 1. Address Form (Cost-Effective Alternative)
- Simple address form with required fields for ShipDay
- Manual address entry (street, city, state, zip code)
- No API costs - saves money on Google Places API
- Mobile-friendly interface
- Real-time address validation

### 2. ShipDay Integration
- Automatic delivery order creation when customers place delivery orders
- Real-time delivery status tracking
- Webhook support for status updates
- Delivery estimates and cost calculations

## Setup Instructions

### 1. Address Form Setup

**No API setup required!** The address form uses manual entry to save costs.

**Benefits of this approach:**
- ✅ No Google Places API costs
- ✅ No API key management
- ✅ No rate limiting concerns
- ✅ All required fields for ShipDay are collected
- ✅ Simple and reliable

**Required fields for ShipDay:**
- Street Address
- City
- State
- ZIP Code

### 2. ShipDay API Setup

1. **Create ShipDay Account**
   - Sign up at [ShipDay](https://www.shipday.com/)
   - Complete the onboarding process

2. **Get API Key**
   - Navigate to Settings > API Keys
   - Generate a new API key
   - Copy the API key

3. **Configure Webhook URL**
   - In ShipDay settings, set your webhook URL to:
   ```
   https://yourdomain.com/api/shipday-webhook
   ```
   - For development: `http://localhost:5000/api/shipday-webhook`

4. **Add to Environment Variables**
   ```bash
   SHIPDAY_API_KEY=your_shipday_api_key_here
   ```

### 3. Database Schema Updates

The following fields have been added to the orders table:

```sql
-- Add these columns to your orders table
ALTER TABLE orders ADD COLUMN address_data JSONB;
ALTER TABLE orders ADD COLUMN shipday_order_id TEXT;
ALTER TABLE orders ADD COLUMN shipday_status TEXT;
```

### 4. Environment Variables

Add these to your `.env` file:

```bash
# ShipDay API (for delivery fulfillment)
SHIPDAY_API_KEY=your_shipday_api_key_here

# Printer Configuration
PRINTER_IP=192.168.1.100
```

**Note:** Google Places API key is no longer required - address form uses manual entry to save costs.

## How It Works

### Address Form Flow

1. **User Fills Address**: Customer fills in street address, city, state, and ZIP code
2. **Real-time Validation**: Form validates all required fields are completed
3. **Address Assembly**: System combines fields into full address string
4. **Data Storage**: Address data is stored with the order for ShipDay integration

### ShipDay Integration Flow

1. **Order Creation**: When a delivery order is placed, the system checks if ShipDay is configured
2. **ShipDay Order**: If configured, creates a delivery order in ShipDay with:
   - Customer information
   - Delivery address with coordinates
   - Order items and total
   - Special instructions
3. **Status Tracking**: ShipDay order ID is stored for tracking
4. **Webhook Updates**: ShipDay sends status updates via webhook

## API Endpoints

### New Endpoints Added

- `POST /api/shipday-webhook` - Receives delivery status updates from ShipDay

### Modified Endpoints

- `POST /api/orders` - Now includes address data and ShipDay integration

## Components

### AddressForm Component

Location: `client/src/components/ui/address-autocomplete.tsx`

Features:
- Manual address entry (no API costs)
- Real-time validation
- Required field indicators
- Mobile responsive grid layout
- Full address preview

### ShipDay Service

Location: `server/shipday.ts`

Features:
- Order creation
- Status tracking
- Webhook handling
- Delivery estimates

## Testing

### Address Form Testing

1. Go to the checkout page
2. Select "Delivery" as order type
3. Fill in all required address fields:
   - Street Address
   - City
   - State
   - ZIP Code
4. Verify the full address appears in the preview
5. Verify all fields are required and validated

### ShipDay Integration Testing

1. Place a delivery order with a valid address
2. Check server logs for ShipDay API calls
3. Verify ShipDay order creation in ShipDay dashboard
4. Test webhook by updating order status in ShipDay

## Troubleshooting

### Address Form Issues

- **Fields not saving**: Check that all required fields are filled
- **Validation errors**: Ensure proper format for ZIP code and state
- **Mobile layout**: Verify responsive design on different screen sizes

### ShipDay Integration Issues

- **Orders not creating**: Check ShipDay API key and account status
- **Webhook not receiving**: Verify webhook URL and server accessibility
- **Status not updating**: Check webhook handler and database updates

## Cost Considerations

### Address Form (Manual Entry)
- ✅ **$0 cost** - No API fees
- ✅ **No rate limits** - Unlimited usage
- ✅ **No setup required** - Works immediately

### ShipDay
- Pricing varies by plan and volume
- Basic plan starts at $29/month
- Pay-per-delivery options available

## Security Notes

1. **No API Keys**: No external API keys required for address entry
2. **Webhook Security**: Implement webhook signature verification for ShipDay
3. **Input Validation**: Always validate address data before processing
4. **Data Privacy**: Address data is only used for delivery purposes

## Future Enhancements

1. **Address Validation**: Add server-side address validation using free USPS API
2. **Delivery Zones**: Implement delivery zone restrictions based on ZIP codes
3. **Real-time Tracking**: Add real-time delivery tracking for customers
4. **Multiple Carriers**: Support for multiple delivery providers
5. **Delivery Estimates**: Real-time delivery time estimates
6. **Address Autocomplete**: Re-enable Google Places API if budget allows
