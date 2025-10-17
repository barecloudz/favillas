import { Handler } from '@netlify/functions';
import postgres from 'postgres';

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const sql = postgres(process.env.DATABASE_URL!);

    // Run the migration SQL
    await sql.unsafe(`
      ALTER TABLE rewards
      ADD COLUMN IF NOT EXISTS free_item_menu_id INTEGER,
      ADD COLUMN IF NOT EXISTS free_item_category TEXT,
      ADD COLUMN IF NOT EXISTS free_item_all_from_category BOOLEAN DEFAULT false;
    `);

    // Try to add foreign key (will fail if already exists, but that's ok)
    try {
      await sql.unsafe(`
        ALTER TABLE rewards
        ADD CONSTRAINT fk_rewards_menu_item
        FOREIGN KEY (free_item_menu_id) REFERENCES menu_items(id) ON DELETE SET NULL;
      `);
    } catch (e) {
      console.log('Foreign key constraint already exists or failed:', e);
    }

    // Create indexes
    await sql.unsafe(`
      CREATE INDEX IF NOT EXISTS idx_rewards_free_item_menu_id ON rewards(free_item_menu_id);
      CREATE INDEX IF NOT EXISTS idx_rewards_free_item_category ON rewards(free_item_category);
    `);

    await sql.end();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Migration completed successfully' })
    };
  } catch (error: any) {
    console.error('Migration error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        details: error
      })
    };
  }
};
