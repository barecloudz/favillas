# Vapi Tool Setup Guide for Favillas Assistant

## Step 1: Go to Vapi Dashboard

1. Open: https://dashboard.vapi.ai/assistants
2. Find and click on your **"Favillas"** assistant (ID: `82d5bb7f-7154-4ff4-b918-bde5a16de088`)

## Step 2: Add the Custom Tool

1. Scroll to the **"Tools"** or **"Functions"** section
2. Click **"Add Tool"** or **"Create Tool"**
3. Select **"Custom"** or **"Server Function"**

## Step 3: Configure the Tool

**Basic Info:**
- **Name**: `submit_order`
- **Description**: `Submit a pizza order to Favilla's ordering system. Call this function when you have collected all required order information from the customer.`

**Server Configuration:**
- **URL**: `https://favillaspizzeria.com/.netlify/functions/vapi-submit-order`
- **Method**: `POST`
- **Timeout**: `20` seconds

**Function Parameters (JSON Schema):**

```json
{
  "type": "object",
  "properties": {
    "items": {
      "type": "array",
      "description": "List of order items. Each item should have: menuItemId (string), quantity (number), price (number), name (string), and optionally options (array of strings for toppings/modifications)",
      "items": {
        "type": "object",
        "properties": {
          "menuItemId": {
            "type": "string",
            "description": "Menu item identifier (use generic IDs like 'pizza-12', 'pizza-16', 'pizza-18' for different pizza sizes)"
          },
          "name": {
            "type": "string",
            "description": "Name of the item (e.g., 'Large Pepperoni Pizza')"
          },
          "quantity": {
            "type": "number",
            "description": "Quantity of this item"
          },
          "price": {
            "type": "number",
            "description": "Price per item in dollars"
          },
          "options": {
            "type": "array",
            "description": "Toppings or modifications for this item",
            "items": {
              "type": "string"
            }
          }
        },
        "required": ["menuItemId", "name", "quantity", "price"]
      }
    },
    "customer_name": {
      "type": "string",
      "description": "Customer's full name"
    },
    "phone": {
      "type": "string",
      "description": "Customer's 10-digit phone number (accept any format, will be normalized)"
    },
    "order_type": {
      "type": "string",
      "description": "Type of order: either 'pickup' or 'delivery'",
      "enum": ["pickup", "delivery"]
    },
    "total": {
      "type": "number",
      "description": "Total order amount in dollars (including delivery fee if applicable)"
    },
    "address": {
      "type": "string",
      "description": "Full delivery address in format: street, city, state, zipcode (REQUIRED if order_type is 'delivery')"
    },
    "special_instructions": {
      "type": "string",
      "description": "Any special instructions or notes for the order (optional)"
    }
  },
  "required": ["items", "customer_name", "phone", "order_type", "total"]
}
```

## Step 4: Update Assistant System Prompt

Update your **Favillas** assistant's system prompt to this:

```
You are a friendly phone agent for Favilla's New York Pizza that takes pizza orders over the phone.

GREETING (say this EXACTLY first):
"Thank you for calling Favilla's New York Pizza. If you'd like to speak to the front counter, you may have to hold. I can get your order through much quicker. What can I do for you?"

Then WAIT for the customer to respond.

Conversation Flow:
1. Ask if this is for pickup or delivery
2. Take their order:
   - Ask what pizza or items they'd like
   - Confirm sizes and toppings
   - Ask about quantities
   - Check if they want anything else
3. If delivery, collect their full address (street, city, state, zip code)
4. Get their name and phone number (10 digits, no formatting needed)
5. Repeat the order back to confirm
6. Calculate the total price (estimate based on typical prices if needed)
7. Use the submit_order function to place the order
8. Thank them and provide the order number

Important Guidelines:
- Be conversational and friendly
- Speak naturally, not like a robot
- If you don't understand, politely ask them to repeat
- For delivery addresses, make sure to get: street, city, state, and zip code
- Phone numbers should be 10 digits (you can accept it however they say it)
- Always confirm the order before submitting
- Payment will be handled when they pick up or upon delivery
- If they insist on speaking to front counter, say "No problem, let me transfer you" then end the call

Menu Knowledge:
- We have pizzas, wings, salads, and sides
- Pizzas come in 12", 16", and 18" sizes
- Common toppings include pepperoni, sausage, mushrooms, onions, peppers, olives, etc.
- Traditional pizzas start around $10-17 depending on size
- Wings are available in various flavors
- Delivery fee is $3.00

When you have all the information (items, customer name, phone, order type, total, and address if delivery), use the submit_order function to place the order.
```

## Step 5: Update First Message

Set the **First Message** to:
```
Thank you for calling Favilla's New York Pizza. If you'd like to speak to the front counter, you may have to hold. I can get your order through much quicker. What can I do for you?
```

## Step 6: Save the Assistant

Click **Save** or **Update Assistant**

## Step 7: Test the Tool

You can test the tool is working by making a test call or using the Vapi playground to simulate a conversation.

---

## Next Steps After Tool Setup

1. Get a phone number (free US number or import Twilio)
2. Assign the Favillas assistant to the phone number
3. Make a test call!
