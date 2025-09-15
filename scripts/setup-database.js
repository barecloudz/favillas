#!/usr/bin/env node

/**
 * Database Setup Script for Favilla's Pizza
 *
 * This script sets up the complete choice groups system and populates sample data
 * Run with: node scripts/setup-database.js
 */

import postgres from 'postgres';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

async function setupDatabase() {
  console.log('🍕 Setting up Favilla\'s Pizza Database...\n');

  try {
    // Step 1: Create choice groups
    console.log('1️⃣  Creating choice groups...');

    const choiceGroups = [
      {
        name: 'Pizza Size',
        description: 'Choose your pizza size',
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        order: 1
      },
      {
        name: 'Toppings',
        description: 'Add your favorite toppings',
        isRequired: false,
        minSelections: 0,
        maxSelections: 10,
        order: 2
      },
      {
        name: 'Crust Type',
        description: 'Choose your crust preference',
        isRequired: false,
        minSelections: 0,
        maxSelections: 1,
        order: 3
      },
      {
        name: 'Drink Size',
        description: 'Choose your drink size',
        isRequired: true,
        minSelections: 1,
        maxSelections: 1,
        order: 4
      },
      {
        name: 'Side Options',
        description: 'Choose your side options',
        isRequired: false,
        minSelections: 0,
        maxSelections: 3,
        order: 5
      }
    ];

    const createdGroups = {};
    for (const group of choiceGroups) {
      // First try to find existing group
      const existing = await sql`
        SELECT * FROM choice_groups WHERE name = ${group.name}
      `;

      let result;
      if (existing.length > 0) {
        // Update existing
        result = await sql`
          UPDATE choice_groups
          SET description = ${group.description}, is_required = ${group.isRequired},
              min_selections = ${group.minSelections}, max_selections = ${group.maxSelections},
              "order" = ${group.order}, updated_at = NOW()
          WHERE name = ${group.name}
          RETURNING *
        `;
      } else {
        // Insert new
        result = await sql`
          INSERT INTO choice_groups (name, description, is_required, min_selections, max_selections, "order", is_active, created_at, updated_at)
          VALUES (${group.name}, ${group.description}, ${group.isRequired}, ${group.minSelections}, ${group.maxSelections}, ${group.order}, true, NOW(), NOW())
          RETURNING *
        `;
      }
      createdGroups[group.name] = result[0];
      console.log(`   ✅ Created/Updated: ${group.name}`);
    }

    // Step 2: Create choice items
    console.log('\n2️⃣  Creating choice items...');

    const choiceItems = [
      // Pizza Sizes
      { groupName: 'Pizza Size', name: 'Small (10")', price: 0.00, order: 1, isDefault: false },
      { groupName: 'Pizza Size', name: 'Medium (12")', price: 3.00, order: 2, isDefault: true },
      { groupName: 'Pizza Size', name: 'Large (14")', price: 6.00, order: 3, isDefault: false },
      { groupName: 'Pizza Size', name: 'Extra Large (16")', price: 9.00, order: 4, isDefault: false },

      // Toppings
      { groupName: 'Toppings', name: 'Pepperoni', price: 2.50, order: 1 },
      { groupName: 'Toppings', name: 'Italian Sausage', price: 2.50, order: 2 },
      { groupName: 'Toppings', name: 'Mushrooms', price: 2.00, order: 3 },
      { groupName: 'Toppings', name: 'Bell Peppers', price: 2.00, order: 4 },
      { groupName: 'Toppings', name: 'Red Onions', price: 2.00, order: 5 },
      { groupName: 'Toppings', name: 'Black Olives', price: 2.00, order: 6 },
      { groupName: 'Toppings', name: 'Extra Cheese', price: 3.00, order: 7 },
      { groupName: 'Toppings', name: 'Fresh Basil', price: 1.50, order: 8 },
      { groupName: 'Toppings', name: 'Anchovies', price: 2.50, order: 9 },
      { groupName: 'Toppings', name: 'Jalapeños', price: 1.50, order: 10 },

      // Crust Types
      { groupName: 'Crust Type', name: 'Regular Crust', price: 0.00, order: 1, isDefault: true },
      { groupName: 'Crust Type', name: 'Thin Crust', price: 0.00, order: 2 },
      { groupName: 'Crust Type', name: 'Thick Crust', price: 1.50, order: 3 },
      { groupName: 'Crust Type', name: 'Garlic Crust', price: 2.00, order: 4 },

      // Drink Sizes
      { groupName: 'Drink Size', name: 'Small (12oz)', price: 0.00, order: 1, isDefault: true },
      { groupName: 'Drink Size', name: 'Medium (16oz)', price: 1.00, order: 2 },
      { groupName: 'Drink Size', name: 'Large (20oz)', price: 2.00, order: 3 },

      // Side Options
      { groupName: 'Side Options', name: 'Extra Sauce', price: 0.75, order: 1 },
      { groupName: 'Side Options', name: 'Parmesan Cheese', price: 0.50, order: 2 },
      { groupName: 'Side Options', name: 'Red Pepper Flakes', price: 0.00, order: 3 },
    ];

    for (const item of choiceItems) {
      const group = createdGroups[item.groupName];
      if (group) {
        // Check if choice item exists
        const existingItem = await sql`
          SELECT * FROM choice_items WHERE choice_group_id = ${group.id} AND name = ${item.name}
        `;

        if (existingItem.length > 0) {
          await sql`
            UPDATE choice_items
            SET price = ${item.price}, "order" = ${item.order}, is_default = ${item.isDefault || false}, updated_at = NOW()
            WHERE choice_group_id = ${group.id} AND name = ${item.name}
          `;
        } else {
          await sql`
            INSERT INTO choice_items (choice_group_id, name, price, "order", is_active, is_default, created_at, updated_at)
            VALUES (${group.id}, ${item.name}, ${item.price}, ${item.order}, true, ${item.isDefault || false}, NOW(), NOW())
          `;
        }
        console.log(`   ✅ Created/Updated: ${item.name} (${item.groupName})`);
      }
    }

    // Step 3: Create categories if they don't exist
    console.log('\n3️⃣  Creating menu categories...');

    const categories = [
      { name: 'Traditional Pizza', order: 1 },
      { name: 'Specialty Pizza', order: 2 },
      { name: 'Appetizers', order: 3 },
      { name: 'Salads', order: 4 },
      { name: 'Pasta', order: 5 },
      { name: 'Sandwiches', order: 6 },
      { name: 'Beverages', order: 7 },
      { name: 'Desserts', order: 8 }
    ];

    for (const category of categories) {
      const existingCategory = await sql`
        SELECT * FROM categories WHERE name = ${category.name}
      `;

      if (existingCategory.length > 0) {
        await sql`
          UPDATE categories SET "order" = ${category.order}, updated_at = NOW()
          WHERE name = ${category.name}
        `;
      } else {
        await sql`
          INSERT INTO categories (name, "order", is_active, created_at)
          VALUES (${category.name}, ${category.order}, true, NOW())
        `;
      }
      console.log(`   ✅ Created/Updated category: ${category.name}`);
    }

    // Step 4: Set up category-choice group relationships
    console.log('\n4️⃣  Setting up category-choice group relationships...');

    const categoryChoiceGroups = [
      { categoryName: 'Traditional Pizza', choiceGroupName: 'Pizza Size', order: 1, isRequired: true },
      { categoryName: 'Traditional Pizza', choiceGroupName: 'Toppings', order: 2, isRequired: false },
      { categoryName: 'Traditional Pizza', choiceGroupName: 'Crust Type', order: 3, isRequired: false },

      { categoryName: 'Specialty Pizza', choiceGroupName: 'Pizza Size', order: 1, isRequired: true },
      { categoryName: 'Specialty Pizza', choiceGroupName: 'Crust Type', order: 2, isRequired: false },

      { categoryName: 'Beverages', choiceGroupName: 'Drink Size', order: 1, isRequired: true },

      { categoryName: 'Appetizers', choiceGroupName: 'Side Options', order: 1, isRequired: false },
      { categoryName: 'Pasta', choiceGroupName: 'Side Options', order: 1, isRequired: false },
      { categoryName: 'Sandwiches', choiceGroupName: 'Side Options', order: 1, isRequired: false },
    ];

    for (const relation of categoryChoiceGroups) {
      const group = createdGroups[relation.choiceGroupName];
      if (group) {
        const existingRelation = await sql`
          SELECT * FROM category_choice_groups
          WHERE category_name = ${relation.categoryName} AND choice_group_id = ${group.id}
        `;

        if (existingRelation.length > 0) {
          await sql`
            UPDATE category_choice_groups
            SET "order" = ${relation.order}, is_required = ${relation.isRequired}
            WHERE category_name = ${relation.categoryName} AND choice_group_id = ${group.id}
          `;
        } else {
          await sql`
            INSERT INTO category_choice_groups (category_name, choice_group_id, "order", is_required, created_at)
            VALUES (${relation.categoryName}, ${group.id}, ${relation.order}, ${relation.isRequired}, NOW())
          `;
        }
        console.log(`   ✅ Linked: ${relation.categoryName} -> ${relation.choiceGroupName}`);
      }
    }

    // Step 5: Create sample menu items with proper choice groups
    console.log('\n5️⃣  Creating sample menu items...');

    const menuItems = [
      {
        name: 'Margherita Pizza',
        description: 'Fresh mozzarella, tomato sauce, and basil',
        basePrice: 12.99,
        category: 'Traditional Pizza',
        imageUrl: '/images/f1.png',
        isPopular: true,
        choiceGroups: ['Pizza Size', 'Crust Type', 'Toppings']
      },
      {
        name: 'Pepperoni Pizza',
        description: 'Classic pepperoni with mozzarella and tomato sauce',
        basePrice: 14.99,
        category: 'Traditional Pizza',
        imageUrl: '/images/f2.jpg',
        isPopular: true,
        isBestSeller: true,
        choiceGroups: ['Pizza Size', 'Crust Type', 'Toppings']
      },
      {
        name: 'Supreme Pizza',
        description: 'Pepperoni, sausage, mushrooms, bell peppers, and onions',
        basePrice: 18.99,
        category: 'Specialty Pizza',
        imageUrl: '/images/f3.jpg',
        isNew: true,
        choiceGroups: ['Pizza Size', 'Crust Type']
      },
      {
        name: 'Garlic Knots',
        description: 'Fresh-baked garlic knots with marinara sauce',
        basePrice: 6.99,
        category: 'Appetizers',
        imageUrl: '/images/f4.jpg',
        choiceGroups: ['Side Options']
      },
      {
        name: 'Coca-Cola',
        description: 'Classic Coca-Cola soft drink',
        basePrice: 2.99,
        category: 'Beverages',
        imageUrl: '/images/f5.jpg',
        choiceGroups: ['Drink Size']
      }
    ];

    for (const item of menuItems) {
      // Check if menu item exists
      const existingMenuItem = await sql`
        SELECT * FROM menu_items WHERE name = ${item.name}
      `;

      let menuItemResult;
      if (existingMenuItem.length > 0) {
        menuItemResult = await sql`
          UPDATE menu_items
          SET description = ${item.description}, base_price = ${item.basePrice}, category = ${item.category},
              image_url = ${item.imageUrl}, is_popular = ${item.isPopular || false},
              is_new = ${item.isNew || false}, is_best_seller = ${item.isBestSeller || false},
              updated_at = NOW()
          WHERE name = ${item.name}
          RETURNING *
        `;
      } else {
        menuItemResult = await sql`
          INSERT INTO menu_items (name, description, base_price, category, image_url, is_popular, is_new, is_best_seller, is_available, created_at)
          VALUES (${item.name}, ${item.description}, ${item.basePrice}, ${item.category}, ${item.imageUrl}, ${item.isPopular || false}, ${item.isNew || false}, ${item.isBestSeller || false}, true, NOW())
          RETURNING *
        `;
      }

      const menuItem = menuItemResult[0];
      console.log(`   ✅ Created/Updated menu item: ${item.name}`);

      // Link choice groups to menu item
      for (let i = 0; i < item.choiceGroups.length; i++) {
        const choiceGroupName = item.choiceGroups[i];
        const group = createdGroups[choiceGroupName];
        if (group) {
          const existingMenuItemGroup = await sql`
            SELECT * FROM menu_item_choice_groups
            WHERE menu_item_id = ${menuItem.id} AND choice_group_id = ${group.id}
          `;

          if (existingMenuItemGroup.length > 0) {
            await sql`
              UPDATE menu_item_choice_groups
              SET "order" = ${i + 1}, is_required = ${group.is_required}
              WHERE menu_item_id = ${menuItem.id} AND choice_group_id = ${group.id}
            `;
          } else {
            await sql`
              INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, "order", is_required, created_at)
              VALUES (${menuItem.id}, ${group.id}, ${i + 1}, ${group.is_required}, NOW())
            `;
          }
          console.log(`     🔗 Linked to choice group: ${choiceGroupName}`);
        }
      }
    }

    // Step 6: Set up basic restaurant settings
    console.log('\n6️⃣  Setting up restaurant settings...');

    const existingSettings = await sql`
      SELECT * FROM restaurant_settings LIMIT 1
    `;

    if (existingSettings.length > 0) {
      await sql`
        UPDATE restaurant_settings
        SET restaurant_name = 'Favilla''s NY Pizza', address = '123 Main Street, New York, NY 10001',
            phone = '(555) 123-4567', email = 'info@favillas.com',
            website = 'https://favillas.com', updated_at = NOW()
        WHERE id = ${existingSettings[0].id}
      `;
    } else {
      await sql`
        INSERT INTO restaurant_settings (
          restaurant_name, address, phone, email, website, delivery_fee, minimum_order,
          auto_accept_orders, delivery_enabled, pickup_enabled, created_at, updated_at
        )
        VALUES (
          'Favilla''s NY Pizza', '123 Main Street, New York, NY 10001', '(555) 123-4567',
          'info@favillas.com', 'https://favillas.com', 3.99, 15.00,
          true, true, true, NOW(), NOW()
        )
      `;
    }
    console.log('   ✅ Restaurant settings configured');

    console.log('\n🎉 Database setup completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Deploy your Netlify functions');
    console.log('2. Test the menu page to see choice groups working');
    console.log('3. Try adding items to cart with size/topping selections');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the setup
setupDatabase().catch(console.error);