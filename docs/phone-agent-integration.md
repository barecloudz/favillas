# Phone Agent Integration Guide

This guide shows how to integrate an AI phone agent (Twilio + LiveKit) with the Pizza Spin Rewards application.

## API Endpoints

### Preview/Testing
```
https://[your-preview-site].netlify.app/.netlify/functions/orders
https://[your-preview-site].netlify.app/.netlify/functions/menu-items
```

### Production
```
https://[your-production-site].netlify.app/.netlify/functions/orders
https://[your-production-site].netlify.app/.netlify/functions/menu-items
```

## 1. Get Menu Items (Public - No Auth Required)

**GET** `/.netlify/functions/menu-items`

Returns all available menu items with IDs needed for creating orders.

**Response Example:**
```json
[
  {
    "id": 1,
    "name": "Traditional Pizza",
    "description": "Classic pizza",
    "base_price": "10.99",
    "category": "Pizza",
    "is_available": true
  }
]
```

## 2. Create Order (Public - No Auth Required)

**POST** `/.netlify/functions/orders`

**Headers:**
```
Content-Type: application/json
```

**Request Body - Pickup Order:**
```json
{
  "items": [
    {
      "menuItemId": 1,
      "quantity": 1,
      "price": 16.99,
      "options": [
        {
          "groupName": "Traditional Pizza Size",
          "itemName": "16\"",
          "price": 16.99
        },
        {
          "groupName": "16\" Toppings",
          "itemName": "Pepperoni",
          "price": 2.00
        }
      ],
      "specialInstructions": "Extra crispy"
    }
  ],
  "phone": "5551234567",
  "customerName": "John Smith",
  "orderType": "pickup",
  "fulfillmentTime": "asap",
  "total": 18.99,
  "tax": 0,
  "deliveryFee": 0,
  "tip": 0,
  "paymentStatus": "pending",
  "specialInstructions": ""
}
```

**Request Body - Delivery Order:**
```json
{
  "items": [
    {
      "menuItemId": 1,
      "quantity": 2,
      "price": 16.99,
      "options": [
        {
          "groupName": "Traditional Pizza Size",
          "itemName": "16\"",
          "price": 16.99
        }
      ],
      "specialInstructions": ""
    }
  ],
  "phone": "5551234567",
  "customerName": "Jane Doe",
  "orderType": "delivery",
  "fulfillmentTime": "asap",
  "address": "123 Main St, Anytown, ST 12345",
  "addressData": {
    "street": "123 Main St",
    "city": "Anytown",
    "state": "ST",
    "zipCode": "12345"
  },
  "total": 36.98,
  "tax": 0,
  "deliveryFee": 3.00,
  "tip": 5.00,
  "paymentStatus": "pending",
  "specialInstructions": "Ring doorbell twice"
}
```

**Success Response (201):**
```json
{
  "id": 123,
  "status": "pending",
  "total": "18.99",
  "created_at": "2025-10-22T12:00:00Z",
  "items": [...],
  "customer_name": "John Smith"
}
```

## Field Descriptions

### Required Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `items` | Array | Array of order items | See items structure below |
| `phone` | String | Customer phone number | "5551234567" |
| `customerName` | String | Customer's name | "John Smith" |
| `orderType` | String | "pickup" or "delivery" | "pickup" |
| `total` | Number | Total order amount | 18.99 |
| `paymentStatus` | String | Always "pending" for phone orders | "pending" |

### Required for Delivery Orders

| Field | Type | Description |
|-------|------|-------------|
| `address` | String | Full formatted address |
| `addressData` | Object | Structured address data |
| `addressData.street` | String | Street address |
| `addressData.city` | String | City name |
| `addressData.state` | String | State code |
| `addressData.zipCode` | String | ZIP code |

### Optional Fields

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `fulfillmentTime` | String | "asap" or "scheduled" | "asap" |
| `scheduledTime` | String | ISO 8601 datetime | null |
| `specialInstructions` | String | Order notes | "" |
| `tax` | Number | Tax amount | 0 |
| `deliveryFee` | Number | Delivery fee | 0 |
| `tip` | Number | Tip amount | 0 |

### Item Structure

Each item in the `items` array:

```json
{
  "menuItemId": 1,          // ID from menu-items endpoint
  "quantity": 1,            // Number of this item
  "price": 16.99,          // Total price for this item (base + options)
  "options": [             // Selected customizations
    {
      "groupName": "Size",    // Option category
      "itemName": "16\"",     // Selected option
      "price": 16.99          // Price of this option
    }
  ],
  "specialInstructions": "" // Item-specific notes
}
```

## Common Scenarios

### Scenario 1: Simple Pickup Order
Customer: "I'd like a large pepperoni pizza for pickup"

```json
{
  "items": [{
    "menuItemId": 1,
    "quantity": 1,
    "price": 18.99,
    "options": [
      {"groupName": "Traditional Pizza Size", "itemName": "16\"", "price": 16.99},
      {"groupName": "16\" Toppings", "itemName": "Pepperoni", "price": 2.00}
    ],
    "specialInstructions": ""
  }],
  "phone": "5551234567",
  "customerName": "John Smith",
  "orderType": "pickup",
  "fulfillmentTime": "asap",
  "total": 18.99,
  "tax": 0,
  "deliveryFee": 0,
  "tip": 0,
  "paymentStatus": "pending"
}
```

### Scenario 2: Delivery with Multiple Items
Customer: "I want 2 large pizzas and an order of wings delivered"

```json
{
  "items": [
    {
      "menuItemId": 1,
      "quantity": 2,
      "price": 16.99,
      "options": [
        {"groupName": "Traditional Pizza Size", "itemName": "16\"", "price": 16.99}
      ],
      "specialInstructions": ""
    },
    {
      "menuItemId": 15,
      "quantity": 1,
      "price": 11.99,
      "options": [
        {"groupName": "Wing Flavors", "itemName": "Hot", "price": 0.00}
      ],
      "specialInstructions": "Extra sauce on the side"
    }
  ],
  "phone": "5551234567",
  "customerName": "Jane Doe",
  "orderType": "delivery",
  "address": "123 Main St, Anytown, ST 12345",
  "addressData": {
    "street": "123 Main St",
    "city": "Anytown",
    "state": "ST",
    "zipCode": "12345"
  },
  "fulfillmentTime": "asap",
  "total": 48.97,
  "tax": 0,
  "deliveryFee": 3.00,
  "tip": 5.00,
  "paymentStatus": "pending",
  "specialInstructions": "Ring doorbell"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error",
  "message": "Missing required fields: phone, customerName"
}
```

### 500 Server Error
```json
{
  "error": "Internal server error",
  "message": "Failed to create order"
}
```

## Testing

See `docs/phone-order-example.js` for a working test script you can run with Node.js, or `docs/test-phone-order.sh` for a quick bash/cURL test.

## Notes

- **No authentication required** - Orders are created as guest orders
- **Payment is handled separately** - Phone orders are marked as "pending"
- Orders appear in the **Kitchen Display** immediately after creation
- The API handles order number assignment automatically
- All times should be in ISO 8601 format for `scheduledTime`
