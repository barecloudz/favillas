import { Handler } from '@netlify/functions';
import postgres from 'postgres';
import { authenticateToken, isStaff } from './_shared/auth';

let dbConnection: any = null;

function getDB() {
  if (dbConnection) return dbConnection;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  dbConnection = postgres(databaseUrl, {
    max: 1,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    keep_alive: false,
  });

  return dbConnection;
}

export const handler: Handler = async (event, context) => {
  const origin = event.headers.origin || 'http://localhost:3000';
  const headers = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET' && event.httpMethod !== 'PUT') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  // For GET requests (checking fees), allow public access
  // For PUT requests (updating settings), require admin authentication
  if (event.httpMethod === 'PUT') {
    const authPayload = await authenticateToken(event);
    if (!authPayload || !isStaff(authPayload)) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized - Admin access required' })
      };
    }
  }

  try {
    const sql = getDB();

    if (event.httpMethod === 'GET') {
      // Get service fees settings
      const settings = await sql`
        SELECT setting_key as key, setting_value as value FROM system_settings
        WHERE setting_key LIKE 'service_fee_%' OR setting_key LIKE 'card_fee_%'
        ORDER BY setting_key
      `;

      // Default service fee settings
      const serviceFees = {
        // Service Fee Settings
        serviceFeesEnabled: false,
        serviceFeeType: 'percentage', // 'percentage' or 'fixed'
        serviceFeeAmount: 0, // percentage (0-100) or fixed amount in cents
        serviceFeeLabel: 'Service Fee',
        serviceFeeDescription: 'Processing and service fee',

        // Card Processing Fee Settings
        cardFeesEnabled: false,
        cardFeeType: 'percentage', // 'percentage' or 'fixed'
        cardFeeAmount: 2.9, // typical card processing fee percentage
        cardFeeLabel: 'Card Processing Fee',
        cardFeeDescription: 'Credit card processing fee',

        // Application Rules
        applyToDelivery: true,
        applyToPickup: true,
        applyToTaxableTotal: false, // apply to subtotal or total including tax
        minimumOrderAmount: 0, // minimum order amount to apply fees (in cents)
        maximumFeeAmount: 0, // maximum fee cap (0 = no cap)

        // Display Settings
        showOnMenuPage: true,
        showInOrderSummary: true,
        includeInEmailReceipts: true
      };

      settings.forEach(setting => {
        if (setting.key === 'service_fee_enabled') serviceFees.serviceFeesEnabled = setting.value === 'true';
        if (setting.key === 'service_fee_type') serviceFees.serviceFeeType = setting.value || 'percentage';
        if (setting.key === 'service_fee_amount') serviceFees.serviceFeeAmount = parseFloat(setting.value || '0');
        if (setting.key === 'service_fee_label') serviceFees.serviceFeeLabel = setting.value || 'Service Fee';
        if (setting.key === 'service_fee_description') serviceFees.serviceFeeDescription = setting.value || 'Processing and service fee';

        if (setting.key === 'card_fee_enabled') serviceFees.cardFeesEnabled = setting.value === 'true';
        if (setting.key === 'card_fee_type') serviceFees.cardFeeType = setting.value || 'percentage';
        if (setting.key === 'card_fee_amount') serviceFees.cardFeeAmount = parseFloat(setting.value || '2.9');
        if (setting.key === 'card_fee_label') serviceFees.cardFeeLabel = setting.value || 'Card Processing Fee';
        if (setting.key === 'card_fee_description') serviceFees.cardFeeDescription = setting.value || 'Credit card processing fee';

        if (setting.key === 'service_fee_apply_delivery') serviceFees.applyToDelivery = setting.value === 'true';
        if (setting.key === 'service_fee_apply_pickup') serviceFees.applyToPickup = setting.value === 'true';
        if (setting.key === 'service_fee_apply_taxable') serviceFees.applyToTaxableTotal = setting.value === 'true';
        if (setting.key === 'service_fee_minimum_order') serviceFees.minimumOrderAmount = parseFloat(setting.value || '0');
        if (setting.key === 'service_fee_maximum_amount') serviceFees.maximumFeeAmount = parseFloat(setting.value || '0');

        if (setting.key === 'service_fee_show_menu') serviceFees.showOnMenuPage = setting.value === 'true';
        if (setting.key === 'service_fee_show_summary') serviceFees.showInOrderSummary = setting.value === 'true';
        if (setting.key === 'service_fee_show_email') serviceFees.includeInEmailReceipts = setting.value === 'true';
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(serviceFees)
      };
    }

    if (event.httpMethod === 'PUT') {
      // Update service fees settings
      const data = JSON.parse(event.body || '{}');

      await sql.begin(async (sql) => {
        // Service Fee Settings
        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('service_fee_enabled', ${data.serviceFeesEnabled ? 'true' : 'false'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('service_fee_type', ${data.serviceFeeType || 'percentage'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('service_fee_amount', ${data.serviceFeeAmount?.toString() || '0'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('service_fee_label', ${data.serviceFeeLabel || 'Service Fee'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('service_fee_description', ${data.serviceFeeDescription || 'Processing and service fee'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        // Card Processing Fee Settings
        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('card_fee_enabled', ${data.cardFeesEnabled ? 'true' : 'false'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('card_fee_type', ${data.cardFeeType || 'percentage'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('card_fee_amount', ${data.cardFeeAmount?.toString() || '2.9'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('card_fee_label', ${data.cardFeeLabel || 'Card Processing Fee'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('card_fee_description', ${data.cardFeeDescription || 'Credit card processing fee'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        // Application Rules
        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('service_fee_apply_delivery', ${data.applyToDelivery ? 'true' : 'false'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('service_fee_apply_pickup', ${data.applyToPickup ? 'true' : 'false'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('service_fee_apply_taxable', ${data.applyToTaxableTotal ? 'true' : 'false'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('service_fee_minimum_order', ${data.minimumOrderAmount?.toString() || '0'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('service_fee_maximum_amount', ${data.maximumFeeAmount?.toString() || '0'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        // Display Settings
        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('service_fee_show_menu', ${data.showOnMenuPage ? 'true' : 'false'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('service_fee_show_summary', ${data.showInOrderSummary ? 'true' : 'false'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;

        await sql`
          INSERT INTO system_settings (setting_key, setting_value)
          VALUES ('service_fee_show_email', ${data.includeInEmailReceipts ? 'true' : 'false'})
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value
        `;
      });

      console.log(`✅ Service fees settings updated: Service=${data.serviceFeesEnabled}, Card=${data.cardFeesEnabled}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Service fees settings updated' })
      };
    }

  } catch (error) {
    console.error('Service Fees API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        message: 'Failed to process service fees settings',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};