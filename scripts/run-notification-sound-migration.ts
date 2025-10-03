async function runMigration() {
  // Load .env file manually
  const fs = await import('fs');
  const path = await import('path');

  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=');
          process.env[key.trim()] = value.trim();
        }
      }
    }
  } catch (error) {
    console.warn('Warning: Could not load .env file:', error);
  }

  // Get database URL from environment
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('DATABASE_URL environment variable is not set');
    process.exit(1);
  }

  // Import postgres dynamically
  const postgres = (await import('postgres')).default;

  const sql = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });

  try {
    console.log('Adding custom_notification_sound_url field to users table...');

    await sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS custom_notification_sound_url TEXT
    `;

    console.log('✅ Migration completed successfully!');
    await sql.end();
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await sql.end();
    process.exit(1);
  }
}

runMigration();
