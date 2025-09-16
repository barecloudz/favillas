import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = envContent.split('\n').reduce((acc, line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').replace(/^["']|["']$/g, '');
      acc[key.trim()] = value.trim();
    }
    return acc;
  }, {});
  Object.assign(process.env, envVars);
}

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  prepare: false,
});

async function runMigration() {
  try {
    console.log('🔄 Starting rewards migration...');

    // Read the SQL migration file
    const migrationSQL = fs.readFileSync(path.join(__dirname, 'add-points-to-rewards.sql'), 'utf8');

    // Execute the migration as a single transaction
    await sql.begin(async sql => {
      console.log('📝 Adding points_required column...');
      await sql`ALTER TABLE rewards ADD COLUMN IF NOT EXISTS points_required INTEGER DEFAULT 0`;

      console.log('📝 Adding reward_type column...');
      await sql`ALTER TABLE rewards ADD COLUMN IF NOT EXISTS reward_type VARCHAR(50) DEFAULT 'discount'`;

      console.log('📝 Adding free_item column...');
      await sql`ALTER TABLE rewards ADD COLUMN IF NOT EXISTS free_item VARCHAR(255)`;

      console.log('📝 Adding is_active column...');
      await sql`ALTER TABLE rewards ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`;

      console.log('📝 Adding times_used column...');
      await sql`ALTER TABLE rewards ADD COLUMN IF NOT EXISTS times_used INTEGER DEFAULT 0`;

      console.log('📝 Adding max_uses column...');
      await sql`ALTER TABLE rewards ADD COLUMN IF NOT EXISTS max_uses INTEGER`;

      console.log('📝 Adding updated_at column...');
      await sql`ALTER TABLE rewards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;

      console.log('📝 Creating user_points table...');
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

      console.log('📝 Creating reward_redemptions table...');
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

      console.log('📝 Creating indexes...');
      await sql`CREATE INDEX IF NOT EXISTS idx_user_points_user_id ON user_points(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_user_points_type ON user_points(transaction_type)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user_id ON reward_redemptions(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_reward_redemptions_reward_id ON reward_redemptions(reward_id)`;

      console.log('📝 Updating existing rewards with points...');
      await sql`
        UPDATE rewards
        SET points_required = CASE
          WHEN discount IS NOT NULL AND discount > 0 THEN (discount * 10)::INTEGER
          ELSE 100
        END
        WHERE points_required = 0 OR points_required IS NULL
      `;
    });

    // Verify the migration worked
    const rewards = await sql`SELECT * FROM rewards LIMIT 1`;
    console.log('✅ Sample reward after migration:', rewards[0]);

    console.log('🎉 Rewards migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await sql.end();
    process.exit(0);
  }
}

runMigration().catch(console.error);