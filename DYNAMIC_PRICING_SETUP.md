# Dynamic Choice Item Pricing Setup Guide

## Overview

This system allows choice items (like toppings) to have different prices based on other selected choices (like pizza size).

**Example:** Pepperoni topping costs:
- $2.00 on Small pizza
- $3.00 on Medium pizza
- $4.00 on Large pizza

## Step 1: Set Up Database

Run the SQL scripts in this order:

### 1. Create the conditional pricing table:
```sql
-- Run create-conditional-pricing.sql
-- This creates the choice_item_pricing table
```

### 2. Create the price calculation function:
```sql
-- Run calculate-choice-price.sql
-- This creates the get_choice_item_price() function
```

## Step 2: Find Your Choice Item IDs

Run this query to see your available sizes and toppings:

```sql
-- Find size choice items
SELECT ci.id, ci.name as choice_name, ci.price as base_price, cg.name as group_name
FROM choice_items ci
JOIN choice_groups cg ON ci.choice_group_id = cg.id
WHERE cg.name ILIKE '%size%'
ORDER BY ci.price;

-- Find topping choice items
SELECT ci.id, ci.name as choice_name, ci.price as base_price, cg.name as group_name
FROM choice_items ci
JOIN choice_groups cg ON ci.choice_group_id = cg.id
WHERE cg.name ILIKE '%topping%' OR cg.name ILIKE '%extra%'
ORDER BY ci.name;
```

## Step 3: Create Pricing Rules

Example: Set up pepperoni pricing based on size

```sql
-- Assuming from Step 2 you found:
-- Pepperoni topping ID = 5
-- Small size ID = 1, Medium size ID = 2, Large size ID = 3

INSERT INTO choice_item_pricing (choice_item_id, condition_choice_item_id, price)
VALUES
  (5, 1, 2.00),  -- Pepperoni costs $2.00 on Small
  (5, 2, 3.00),  -- Pepperoni costs $3.00 on Medium
  (5, 3, 4.00);  -- Pepperoni costs $4.00 on Large
```

Repeat for other toppings:

```sql
-- Example: Extra Cheese pricing (assuming Extra Cheese ID = 6)
INSERT INTO choice_item_pricing (choice_item_id, condition_choice_item_id, price)
VALUES
  (6, 1, 1.50),  -- Extra Cheese costs $1.50 on Small
  (6, 2, 2.00),  -- Extra Cheese costs $2.00 on Medium
  (6, 3, 2.50);  -- Extra Cheese costs $2.50 on Large
```

## Step 4: API Usage

### Calculate Dynamic Prices

The frontend can call the API to get current prices:

```javascript
// POST /api/choice-pricing
{
  "choiceItemIds": [5, 6], // IDs of toppings to price
  "selectedChoiceItems": [2] // IDs of currently selected items (medium size)
}

// Response:
{
  "prices": {
    "5": 3.00, // Pepperoni costs $3.00 (medium size pricing)
    "6": 2.00  // Extra Cheese costs $2.00 (medium size pricing)
  }
}
```

### View All Pricing Rules

```javascript
// GET /api/choice-pricing
// Returns all conditional pricing rules with friendly names
```

### Create/Update Pricing Rule

```javascript
// PUT /api/choice-pricing
{
  "choiceItemId": 5,        // Pepperoni
  "conditionChoiceItemId": 1, // Small size
  "price": 2.00
}
```

## Step 5: Frontend Integration

The frontend needs to:

1. **Track selected choices** as user makes selections
2. **Call pricing API** when selections change
3. **Update displayed prices** dynamically
4. **Recalculate totals** with new prices

Example flow:
1. User selects "Medium" size → selectedChoiceItems = [2]
2. Frontend calls `/api/choice-pricing` with topping IDs and selected size
3. API returns updated prices for all toppings
4. Frontend updates topping prices in the UI
5. User sees "Pepperoni +$3.00" instead of base price

## Step 6: How It Works

1. **Conditional Pricing**: If a pricing rule exists for the selected conditions, use that price
2. **Base Price Fallback**: If no conditional rule exists, use the base price from choice_items table
3. **Multiple Conditions**: If multiple conditions match, the highest price is used
4. **No Performance Impact**: Only calculates prices when selections change

## Benefits

✅ **Flexible Pricing** - Any choice can affect any other choice's price
✅ **Restaurant-Standard** - Matches how real pizzerias price toppings
✅ **Automatic Calculation** - No manual price updates needed
✅ **Backward Compatible** - Existing items without rules use base prices
✅ **Admin Friendly** - Easy to set up new pricing rules

## Common Pricing Patterns

### Size-Based Topping Pricing
- Small: Base price
- Medium: Base price + 50%
- Large: Base price + 100%

### Specialty vs Regular Toppings
- Regular toppings: Standard size-based pricing
- Premium toppings: Higher multipliers for each size

### Combo Discounts
- Multiple toppings selected: Reduced prices for additional toppings

Your dynamic pricing system is now ready! 🍕