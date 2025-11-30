const postgres = require('postgres');
require('dotenv').config();

const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

async function runMigration() {
  console.log('🎨 Running animations table migration...');

  try {
    // Create table
    await sql`
      CREATE TABLE IF NOT EXISTS animations_settings (
        id SERIAL PRIMARY KEY,
        animation_key TEXT UNIQUE NOT NULL,
        is_enabled BOOLEAN DEFAULT false,
        settings JSONB DEFAULT '{}'::jsonb,
        pages TEXT[] DEFAULT ARRAY[]::TEXT[],
        start_date DATE,
        end_date DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `;
    console.log('✅ Table created');

    // Insert default animations
    await sql`
      INSERT INTO animations_settings (animation_key, is_enabled, settings, pages, start_date, end_date)
      VALUES
        (
          'snow_fall',
          false,
          '{"density": 50, "speed": "medium", "color": "#ffffff"}'::jsonb,
          ARRAY['home', 'menu'],
          '2024-12-01',
          '2024-12-31'
        ),
        (
          'flying_santa',
          false,
          '{"speed": 30, "direction": "left-to-right"}'::jsonb,
          ARRAY['menu'],
          '2024-12-01',
          '2024-12-25'
        ),
        (
          'christmas_theme',
          false,
          '{"showLights": true, "showTree": false}'::jsonb,
          ARRAY['all'],
          '2024-12-01',
          '2024-12-31'
        )
      ON CONFLICT (animation_key) DO NOTHING
    `;
    console.log('✅ Default animations inserted');

    // Create index
    await sql`
      CREATE INDEX IF NOT EXISTS idx_animations_enabled ON animations_settings(is_enabled)
    `;
    console.log('✅ Index created');

    console.log('🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
