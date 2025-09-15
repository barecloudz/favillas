// Simple database setup script that doesn't require ES modules
const { exec } = require('child_process');
const path = require('path');

console.log('🍕 Starting database setup...');

// Set environment variables if needed
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Import and run setup using dynamic import for postgres
async function setupDatabase() {
  try {
    console.log('📦 Loading postgres module...');
    const postgres = (await import('postgres')).default;
    const dotenv = await import('dotenv');

    // Load environment variables
    dotenv.config();

    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL environment variable not found');
      console.log('Please set DATABASE_URL in your .env file');
      process.exit(1);
    }

    console.log('🔌 Connecting to database...');
    const sql = postgres(process.env.DATABASE_URL, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    // Test connection
    const result = await sql`SELECT 1 as test`;
    console.log('✅ Database connection successful');

    // Step 1: Create choice groups
    console.log('\n1️⃣  Creating choice groups...');

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
      }
    ];

    const createdGroups = {};
    for (const group of choiceGroups) {
      // Check if group exists
      const existing = await sql`
        SELECT * FROM choice_groups WHERE name = ${group.name}
      `;

      let result;
      if (existing.length > 0) {
        console.log(`   ⚡ Choice group '${group.name}' already exists, updating...`);
        result = await sql`
          UPDATE choice_groups
          SET description = ${group.description}, is_required = ${group.isRequired},
              min_selections = ${group.minSelections}, max_selections = ${group.maxSelections},
              "order" = ${group.order}, updated_at = NOW()
          WHERE name = ${group.name}
          RETURNING *
        `;
      } else {
        console.log(`   ➕ Creating new choice group: ${group.name}`);
        result = await sql`
          INSERT INTO choice_groups (name, description, is_required, min_selections, max_selections, "order", is_active, created_at, updated_at)
          VALUES (${group.name}, ${group.description}, ${group.isRequired}, ${group.minSelections}, ${group.maxSelections}, ${group.order}, true, NOW(), NOW())
          RETURNING *
        `;
      }

      createdGroups[group.name] = result[0];
      console.log(`   ✅ ${group.name} configured`);
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
      { groupName: 'Toppings', name: 'Extra Cheese', price: 3.00, order: 5 },
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
          console.log(`   ⚡ Updated: ${item.name}`);
        } else {
          await sql`
            INSERT INTO choice_items (choice_group_id, name, price, "order", is_active, is_default, created_at, updated_at)
            VALUES (${group.id}, ${item.name}, ${item.price}, ${item.order}, true, ${item.isDefault || false}, NOW(), NOW())
          `;
          console.log(`   ➕ Added: ${item.name}`);
        }
      }
    }

    // Step 3: Update a sample menu item to use these choice groups
    console.log('\n3️⃣  Linking choice groups to menu items...');

    const menuItems = await sql`
      SELECT * FROM menu_items WHERE category = 'Traditional Pizza' LIMIT 2
    `;

    for (const menuItem of menuItems) {
      // Link Pizza Size to this menu item
      const sizeGroup = createdGroups['Pizza Size'];
      if (sizeGroup) {
        const existingLink = await sql`
          SELECT * FROM menu_item_choice_groups
          WHERE menu_item_id = ${menuItem.id} AND choice_group_id = ${sizeGroup.id}
        `;

        if (existingLink.length === 0) {
          await sql`
            INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, "order", is_required, created_at)
            VALUES (${menuItem.id}, ${sizeGroup.id}, 1, true, NOW())
          `;
          console.log(`   🔗 Linked ${menuItem.name} to Pizza Size`);
        }
      }

      // Link Toppings to this menu item
      const toppingsGroup = createdGroups['Toppings'];
      if (toppingsGroup) {
        const existingLink = await sql`
          SELECT * FROM menu_item_choice_groups
          WHERE menu_item_id = ${menuItem.id} AND choice_group_id = ${toppingsGroup.id}
        `;

        if (existingLink.length === 0) {
          await sql`
            INSERT INTO menu_item_choice_groups (menu_item_id, choice_group_id, "order", is_required, created_at)
            VALUES (${menuItem.id}, ${toppingsGroup.id}, 2, false, NOW())
          `;
          console.log(`   🔗 Linked ${menuItem.name} to Toppings`);
        }
      }
    }

    await sql.end();
    console.log('\n🎉 Basic database setup completed successfully!');
    console.log('\nNext: Test the choice groups on your menu page');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupDatabase();