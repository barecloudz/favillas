import { Handler } from '@netlify/functions';

export const handler: Handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Import dependencies dynamically
    const postgres = (await import('postgres')).default;

    // Create database connection
    const sql = postgres(process.env.DATABASE_URL!, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      keep_alive: false,
    });

    console.log('Adding custom_notification_sound_url field to users table...');

    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS custom_notification_sound_url TEXT
    `;

    await sql.end();

    console.log('✅ Migration completed successfully!');

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Migration completed successfully'
      })
    };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};
