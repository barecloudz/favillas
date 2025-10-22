#!/bin/bash

# Phone Agent Integration - Quick Test with cURL
#
# Usage:
#   1. Update API_URL below to your Netlify site
#   2. Run: bash docs/test-phone-order.sh
#   3. Check Kitchen Display for test orders

# CONFIGURATION
API_URL="http://localhost:5000"  # Change to https://your-site.netlify.app

echo "🧪 Phone Agent Integration Test"
echo "API URL: $API_URL"
echo "===================================="
echo ""

# Test 1: Get Menu Items
echo "📋 Test 1: Getting menu items..."
curl -s -X GET \
  "$API_URL/.netlify/functions/menu-items" \
  -H "Content-Type: application/json" | jq '.[0:3] | .[] | {id, name, base_price}'

echo ""
echo "✅ Menu items retrieved"
echo ""

# Test 2: Create Pickup Order
echo "🍕 Test 2: Creating pickup order..."
PICKUP_RESPONSE=$(curl -s -X POST \
  "$API_URL/.netlify/functions/orders" \
  -H "Content-Type: application/json" \
  -d '{
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
          }
        ],
        "specialInstructions": ""
      }
    ],
    "phone": "5551234567",
    "customerName": "cURL Test Order",
    "orderType": "pickup",
    "fulfillmentTime": "asap",
    "total": 16.99,
    "tax": 0,
    "deliveryFee": 0,
    "tip": 0,
    "paymentStatus": "pending",
    "specialInstructions": "TEST ORDER - cURL"
  }')

echo "$PICKUP_RESPONSE" | jq '{id, status, customer_name, total, order_type}'
echo ""
echo "✅ Pickup order created"
echo ""

# Test 3: Create Delivery Order
echo "🚚 Test 3: Creating delivery order..."
DELIVERY_RESPONSE=$(curl -s -X POST \
  "$API_URL/.netlify/functions/orders" \
  -H "Content-Type: application/json" \
  -d '{
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
    "phone": "5559876543",
    "customerName": "cURL Test Delivery",
    "orderType": "delivery",
    "address": "123 Test St, Testville, TS 12345",
    "addressData": {
      "street": "123 Test St",
      "city": "Testville",
      "state": "TS",
      "zipCode": "12345"
    },
    "fulfillmentTime": "asap",
    "total": 36.98,
    "tax": 0,
    "deliveryFee": 3.00,
    "tip": 5.00,
    "paymentStatus": "pending",
    "specialInstructions": "TEST ORDER - cURL - Ring doorbell"
  }')

echo "$DELIVERY_RESPONSE" | jq '{id, status, customer_name, address, total}'
echo ""
echo "✅ Delivery order created"
echo ""

echo "===================================="
echo "✅ All tests completed!"
echo "📱 Check your Kitchen Display to see the test orders"
