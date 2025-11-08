#!/usr/bin/env node

const postgres = require('postgres');
const dotenv = require('dotenv');

dotenv.config();

const sql = postgres(process.env.DATABASE_URL, {
  ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
});

async function addDiscountTypeColumn() {
  try {
    console.log('🔧 Adding discount_type column to rewards table...');

    // Add discount_type column (defaults to 'percentage' for existing rewards)
    await sql`
      ALTER TABLE rewards
      ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'percentage'
    `;

    console.log('✅ Successfully added discount_type column');

    // Update existing rewards to have correct discount_type
    // Any reward with discount field that looks like a small number (< 100) is percentage
    // Larger numbers would be fixed amounts
    await sql`
      UPDATE rewards
      SET discount_type = CASE
        WHEN reward_type = 'discount' AND discount IS NOT NULL AND discount <= 100 THEN 'percentage'
        WHEN reward_type = 'discount' AND discount IS NOT NULL AND discount > 100 THEN 'fixed'
        ELSE 'percentage'
      END
      WHERE reward_type = 'discount'
    `;

    console.log('✅ Updated existing rewards with discount_type');

    // Show current rewards
    const rewards = await sql`
      SELECT id, name, reward_type, discount, discount_type
      FROM rewards
      WHERE reward_type = 'discount'
      ORDER BY id
    `;

    console.log('\n📋 Current discount rewards:');
    rewards.forEach(reward => {
      console.log(`  ${reward.id}. ${reward.name}: ${reward.discount}${reward.discount_type === 'percentage' ? '%' : '$'} off (type: ${reward.discount_type})`);
    });

  } catch (error) {
    console.error('❌ Error adding discount_type column:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

addDiscountTypeColumn();
