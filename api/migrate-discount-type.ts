import { Handler } from '@netlify/functions';
import postgres from 'postgres';

export const handler: Handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    const sql = postgres(databaseUrl, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
    });

    console.log('🔧 Adding discount_type column to rewards table...');

    // Add discount_type column (defaults to 'percentage' for existing rewards)
    await sql`
      ALTER TABLE rewards
      ADD COLUMN IF NOT EXISTS discount_type VARCHAR(20) DEFAULT 'percentage'
    `;

    console.log('✅ Successfully added discount_type column');

    // Update existing rewards to have correct discount_type
    // Any reward with discount field that looks like a small number (<= 100) is percentage
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

    await sql.end();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        message: 'Migration completed successfully',
        rewards: rewards.map(r => ({
          id: r.id,
          name: r.name,
          discount: r.discount,
          discountType: r.discount_type
        }))
      })
    };

  } catch (error: any) {
    console.error('❌ Error running migration:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
