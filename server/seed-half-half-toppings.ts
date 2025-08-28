import 'dotenv/config';
import { storage } from './storage.js';

// Initial half & half toppings data
const regularToppings = [
  { name: 'Pepperoni', price: '1.50', order: 1 },
  { name: 'Ham', price: '1.50', order: 2 },
  { name: 'Sausage', price: '1.50', order: 3 },
  { name: 'Ground Beef', price: '1.50', order: 4 },
  { name: 'Anchovies', price: '1.50', order: 5 },
  { name: 'Bacon', price: '1.50', order: 6 },
  { name: 'Green Olives', price: '1.50', order: 7 },
  { name: 'Black Olives', price: '1.50', order: 8 },
  { name: 'Mushrooms', price: '1.50', order: 9 },
  { name: 'Tomato', price: '1.50', order: 10 },
  { name: 'Bell Peppers', price: '1.50', order: 11 },
  { name: 'Garlic', price: '1.50', order: 12 },
  { name: 'Roasted Red Peppers', price: '1.50', order: 13 },
  { name: 'Pineapple', price: '1.50', order: 14 },
  { name: 'Banana Peppers', price: '1.50', order: 15 },
  { name: 'Jalapeño Peppers', price: '1.50', order: 16 },
  { name: 'Red Onion', price: '1.50', order: 17 },
  { name: 'Extra Sauce', price: '1.50', order: 18 },
  { name: 'Extra Cheese', price: '1.50', order: 19 }
];

const specialtyToppings = [
  { name: 'Feta', price: '2.00', order: 1 },
  { name: 'Artichokes', price: '2.00', order: 2 },
  { name: 'Ricotta', price: '2.00', order: 3 },
  { name: 'Fresh Mozzarella', price: '2.00', order: 4 },
  { name: 'Chicken', price: '2.00', order: 5 },
  { name: 'Meatballs', price: '2.00', order: 6 },
  { name: 'Eggplant', price: '2.00', order: 7 },
  { name: 'Spinach', price: '2.00', order: 8, isSoldOut: true }
];

async function seedHalfHalfToppings() {
  console.log('🌱 Seeding half & half toppings...');
  
  try {
    // Check if toppings already exist
    const existingToppings = await storage.getAllHalfHalfToppings();
    
    if (existingToppings.length > 0) {
      console.log('ℹ️  Half & half toppings already exist, skipping seed...');
      return;
    }

    // Seed regular toppings
    console.log('➕ Adding regular toppings...');
    for (const topping of regularToppings) {
      await storage.createHalfHalfTopping({
        name: topping.name,
        description: null,
        price: topping.price,
        category: 'regular',
        order: topping.order,
        isActive: true,
        isSoldOut: false
      });
      console.log(`  ✓ Added ${topping.name} ($${topping.price})`);
    }

    // Seed specialty toppings
    console.log('➕ Adding specialty toppings...');
    for (const topping of specialtyToppings) {
      await storage.createHalfHalfTopping({
        name: topping.name,
        description: null,
        price: topping.price,
        category: 'specialty',
        order: topping.order,
        isActive: true,
        isSoldOut: topping.isSoldOut || false
      });
      const status = topping.isSoldOut ? ' (SOLD OUT)' : '';
      console.log(`  ✓ Added ${topping.name} ($${topping.price})${status}`);
    }

    // Create initial settings (disabled by default)
    const existingSettings = await storage.getHalfHalfSettings();
    if (!existingSettings) {
      console.log('➕ Creating half & half system settings...');
      await storage.createHalfHalfSettings({
        isEnabled: false,
        choiceGroupId: null
      });
      console.log('  ✓ Created system settings (disabled by default)');
    }

    console.log('🎉 Half & half toppings seeded successfully!');
    console.log(`📊 Added ${regularToppings.length} regular toppings and ${specialtyToppings.length} specialty toppings`);
    
  } catch (error) {
    console.error('❌ Error seeding half & half toppings:', error);
    throw error;
  }
}

// Run the seeding function
seedHalfHalfToppings()
  .then(() => {
    console.log('✅ Seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  });