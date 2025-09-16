const postgres = require('postgres');

// Database connection
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const sql = postgres(databaseUrl, {
  max: 1,
  prepare: false,
});

async function setupRewardsDatabase() {
  try {
    console.log('Setting up rewards database tables...');

    // Create rewards table
    await sql`
      CREATE TABLE IF NOT EXISTS rewards (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        type VARCHAR(50) DEFAULT 'discount',
        points_required INTEGER NOT NULL DEFAULT 0,
        discount INTEGER,
        free_item VARCHAR(255),
        min_order_amount DECIMAL(10,2),
        max_uses INTEGER,
        times_used INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Created rewards table');

    // Create user_points table
    await sql`
      CREATE TABLE IF NOT EXISTS user_points (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        points_earned INTEGER DEFAULT 0,
        points_redeemed INTEGER DEFAULT 0,
        transaction_type VARCHAR(50) NOT NULL,
        reference_id INTEGER,
        description TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Created user_points table');

    // Create reward_redemptions table
    await sql`
      CREATE TABLE IF NOT EXISTS reward_redemptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reward_id INTEGER NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
        points_spent INTEGER NOT NULL,
        order_id INTEGER,
        is_used BOOLEAN DEFAULT false,
        redeemed_at TIMESTAMP DEFAULT NOW(),
        used_at TIMESTAMP,
        expires_at TIMESTAMP
      )
    `;
    console.log('✅ Created reward_redemptions table');

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_points_type ON user_points(transaction_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user_id ON reward_redemptions(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_id ON reward_redemptions(reward_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rewards_active ON rewards(is_active)`;
    console.log('✅ Created indexes');

    // Insert default rewards
    const existingRewards = await sql`SELECT COUNT(*) FROM rewards`;
    if (parseInt(existingRewards[0].count) === 0) {
      await sql`
        INSERT INTO rewards (name, description, type, points_required, discount, is_active) VALUES
        ('10% Off Your Order', 'Get 10% discount on your entire order', 'discount', 100, 10, true),
        ('Free Garlic Bread', 'Get a free order of garlic bread with any pizza', 'free_item', 150, null, true),
        ('Free Delivery', 'Get free delivery on your next order', 'free_delivery', 75, null, true),
        ('20% Off Large Pizza', 'Get 20% off any large pizza', 'discount', 200, 20, true),
        ('Free 2-Liter Soda', 'Get a free 2-liter soda with any order', 'free_item', 125, null, true)
      `;
      console.log('✅ Inserted default rewards');
    } else {
      console.log('⚠️  Rewards already exist, skipping default inserts');
    }

    console.log('🎉 Rewards system database setup complete!');
  } catch (error) {
    console.error('❌ Error setting up rewards database:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

// Run if called directly
if (require.main === module) {
  setupRewardsDatabase().catch(console.error);
}

module.exports = { setupRewardsDatabase };