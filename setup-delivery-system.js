// Quick setup script for delivery system
import postgres from 'postgres';

async function setupDeliverySystem() {
  const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pizza_rewards';
  const sql = postgres(databaseUrl);

  try {
    console.log('Setting up delivery system...');

    // Insert delivery settings if they don't exist
    const existingSettings = await sql`
      SELECT * FROM delivery_settings LIMIT 1;
    `;

    if (existingSettings.length === 0) {
      console.log('Creating delivery settings...');
      await sql`
        INSERT INTO delivery_settings (
          restaurant_address,
          max_delivery_radius,
          distance_unit,
          is_google_maps_enabled,
          fallback_delivery_fee
        ) VALUES (
          'Favilla''s NY Pizza, 123 Main St, New York, NY',
          10.0,
          'miles',
          true,
          5.00
        );
      `;
      console.log('✅ Delivery settings created');
    } else {
      console.log('Updating existing delivery settings to enable Google Maps...');
      await sql`
        UPDATE delivery_settings
        SET is_google_maps_enabled = true,
            restaurant_address = COALESCE(NULLIF(restaurant_address, ''), 'Favilla''s NY Pizza, 123 Main St, New York, NY')
        WHERE id = ${existingSettings[0].id};
      `;
      console.log('✅ Delivery settings updated');
    }

    // Check for existing delivery zones
    const existingZones = await sql`
      SELECT * FROM delivery_zones ORDER BY sort_order;
    `;

    if (existingZones.length === 0) {
      console.log('Creating default delivery zones...');
      await sql`
        INSERT INTO delivery_zones (name, max_radius, delivery_fee, is_active, sort_order) VALUES
        ('Close Range', 3.0, 3.99, true, 1),
        ('Standard Range', 6.0, 5.99, true, 2),
        ('Extended Range', 10.0, 7.99, true, 3);
      `;
      console.log('✅ Default delivery zones created');
    } else {
      console.log(`✅ Found ${existingZones.length} existing delivery zones`);
      existingZones.forEach(zone => {
        console.log(`  - ${zone.name}: ${zone.max_radius} miles, $${zone.delivery_fee}`);
      });
    }

    // Test the setup
    const finalSettings = await sql`SELECT * FROM delivery_settings LIMIT 1;`;
    const finalZones = await sql`SELECT * FROM delivery_zones WHERE is_active = true ORDER BY sort_order;`;

    console.log('\n📋 Current Configuration:');
    console.log(`Restaurant Address: ${finalSettings[0].restaurant_address}`);
    console.log(`Google Maps Enabled: ${finalSettings[0].is_google_maps_enabled}`);
    console.log(`Max Delivery Radius: ${finalSettings[0].max_delivery_radius} ${finalSettings[0].distance_unit}`);
    console.log(`Active Delivery Zones: ${finalZones.length}`);

    console.log('\n🎉 Delivery system setup complete!');

  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await sql.end();
  }
}

setupDeliverySystem();