# ShipDay Integration Issues & Fixes

## Issues Found:

### 1. Missing Delivery Instructions ❌
**Current**: `order.special_instructions` exists but not sent to ShipDay
**Fix**: Add `deliveryInstruction` field to payload

### 2. Item Special Instructions Not Using `detail` Field ❌
**Current**: Item instructions added to `addOns` array (line 80-82)
```javascript
if (item.special_instructions) {
  addOns.push(`Special: ${item.special_instructions}`);
}
```
**Fix**: Use ShipDay's `detail` field per documentation

### 3. Order Total Confusion ⚠️
**Current**: Multiple total fields with unclear purpose
- `orderTotal`: uses `subtotal || total`
- `totalOrderCost`: uses `total`

**Need to verify**: What should each field contain?
- Items subtotal only?
- Items + delivery fee?
- Grand total including tip?

### 4. Tip Field Name ⚠️
**Current**: `tip` (singular)
**Verify**: Should it be `tips` (plural)?

## Recommended ShipDay Payload Structure:

```javascript
{
  // Order Items - with choices as strings (NO PRICES)
  "orderItems": [
    {
      "name": "Large Pizza",
      "unitPrice": 18.99,  // Base price + addon prices combined
      "quantity": 1,
      "addOns": [         // Just strings, no prices
        "Size: Large",
        "Topping: Pepperoni",
        "Topping: Mushrooms"
      ],
      "detail": "Extra crispy please"  // Item-specific instructions
    }
  ],

  // Financial Fields
  "tip": 5.00,                    // or "tips"?
  "orderTotal": 18.99,            // Just items subtotal?
  "deliveryFee": 3.99,
  "totalOrderCost": 27.98,        // Grand total?

  // Delivery Instructions
  "deliveryInstruction": "Ring doorbell twice",  // ORDER-LEVEL instructions

  // ... rest of payload
}
```

## Questions to Answer:

1. ✅ Are addon choices sent as JSON? **NO - array of strings**
2. ✅ Are prices in addon strings? **NO - prices go in unitPrice**
3. ❌ Is `deliveryInstruction` being sent? **NO - MISSING**
4. ⚠️ Is `tip` vs `tips` correct?
5. ⚠️ What should `orderTotal` vs `totalOrderCost` contain?

## Next Steps:

1. Test current payload on preview to see what ShipDay receives
2. Check if orders are failing/succeeding
3. Apply fixes based on results
