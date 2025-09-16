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

async function addRewardsColumns() {
  try {
    console.log('🔄 Adding missing columns to rewards table...');

    await sql.begin(async sql => {
      console.log('📝 Adding points_required column...');
      await sql`ALTER TABLE rewards ADD COLUMN IF NOT EXISTS points_required INTEGER DEFAULT 100`;

      console.log('📝 Adding reward_type column...');
      await sql`ALTER TABLE rewards ADD COLUMN IF NOT EXISTS reward_type VARCHAR(50) DEFAULT 'discount'`;

      console.log('📝 Adding free_item column...');
      await sql`ALTER TABLE rewards ADD COLUMN IF NOT EXISTS free_item VARCHAR(255)`;

      console.log('📝 Adding is_active column...');
      await sql`ALTER TABLE rewards ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true`;

      console.log('📝 Adding updated_at column...');
      await sql`ALTER TABLE rewards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()`;

      console.log('📝 Updating existing rewards with calculated points...');
      await sql`
        UPDATE rewards
        SET points_required = CASE
          WHEN discount IS NOT NULL AND discount > 0 THEN (discount * 10)::INTEGER
          ELSE 100
        END,
        reward_type = 'discount',
        is_active = true,
        updated_at = NOW()
        WHERE points_required IS NULL OR points_required = 0
      `;
    });

    // Verify the migration worked
    const rewards = await sql`SELECT * FROM rewards LIMIT 1`;
    console.log('✅ Sample reward after migration:', rewards[0]);

    // Check final structure
    const columns = await sql`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'rewards'
      ORDER BY ordinal_position
    `;
    console.log('\n📋 Final rewards table structure:');
    columns.forEach(col => console.log(`  - ${col.column_name} (${col.data_type})`));

    console.log('\n🎉 Rewards table migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    await sql.end();
    process.exit(0);
  }
}

addRewardsColumns().catch(console.error);