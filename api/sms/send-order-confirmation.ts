import { Handler } from '@netlify/functions';
import { twilioClient, SMS_CONFIG } from './twilio-client';
import postgres from 'postgres';

// Database connection
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
  });

  return dbConnection;
}

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': 'true',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ message: 'Method not allowed' })
    };
  }

  try {
    const sql = getDB();

    // Check if SMS is enabled
    const smsEnabled = process.env.SMS_ENABLED === 'true';
    if (!smsEnabled) {
      console.log('📱 SMS is disabled in environment variables');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'SMS disabled',
          skipped: true
        })
      };
    }

    // Validate Twilio configuration
    if (!SMS_CONFIG.from || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.error('❌ Twilio configuration missing');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Twilio not configured',
          skipped: true
        })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const {
      orderId,
      customerPhone,
      customerName,
      orderTotal,
      orderType,
      estimatedTime,
      userId,
      supabaseUserId
    } = body;

    // Validate required fields
    if (!orderId || !customerPhone) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Missing required fields: orderId and customerPhone'
        })
      };
    }

    // Check if user has SMS enabled (if they have a user ID)
    if (userId || supabaseUserId) {
      try {
        const prefsQuery = userId
          ? await sql`SELECT order_updates_enabled FROM sms_preferences WHERE user_id = ${userId}`
          : await sql`SELECT order_updates_enabled FROM sms_preferences WHERE phone_number = ${customerPhone}`;

        // If preferences exist and SMS is disabled, skip
        if (prefsQuery.length > 0 && !prefsQuery[0].order_updates_enabled) {
          console.log(`📱 User has opted out of SMS order updates for ${customerPhone}`);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: 'User opted out',
              skipped: true
            })
          };
        }
      } catch (prefsError) {
        // If no preferences table exists, continue - they haven't opted out
        console.log('⚠️ SMS preferences check failed (table may not exist):', prefsError);
      }
    }

    // Format phone number (remove all non-digits, ensure E.164 format)
    let formattedPhone = customerPhone.replace(/[^\d]/g, '');

    // Add country code if not present (assume US)
    if (formattedPhone.length === 10) {
      formattedPhone = `+1${formattedPhone}`;
    } else if (formattedPhone.length === 11 && formattedPhone.startsWith('1')) {
      formattedPhone = `+${formattedPhone}`;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+${formattedPhone}`;
    }

    // Construct message
    const orderTypeText = orderType === 'delivery' ? 'delivery' : 'pickup';
    const timeText = estimatedTime ? ` Ready in ${estimatedTime}.` : '';

    let message = `Favilla's Pizza: Order #${orderId} confirmed!${timeText} Total: $${parseFloat(orderTotal).toFixed(2)} (${orderTypeText}). Track your order at favillaspizzeria.com/orders`;

    // Keep message under 160 characters if possible
    if (message.length > 160) {
      message = `Favilla's: Order #${orderId} confirmed! $${parseFloat(orderTotal).toFixed(2)} (${orderTypeText}). Track at favillaspizzeria.com`;
    }

    console.log(`📱 Sending order confirmation SMS to ${formattedPhone}`);
    console.log(`📝 Message: ${message} (${message.length} chars)`);

    // Send SMS via Twilio
    const smsResult = await twilioClient.messages.create({
      body: message,
      from: SMS_CONFIG.from,
      to: formattedPhone
    });

    console.log(`✅ SMS sent successfully. SID: ${smsResult.sid}`);

    // Log SMS to database
    try {
      await sql`
        INSERT INTO sms_logs (
          phone_number,
          message,
          message_type,
          twilio_sid,
          status,
          order_id,
          sent_at
        ) VALUES (
          ${formattedPhone},
          ${message},
          'order_confirmation',
          ${smsResult.sid},
          'sent',
          ${orderId},
          NOW()
        )
      `;
      console.log('✅ SMS logged to database');
    } catch (logError) {
      console.error('⚠️ Failed to log SMS (table may not exist):', logError);
      // Don't fail the request if logging fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'SMS sent successfully',
        sid: smsResult.sid
      })
    };

  } catch (error: any) {
    console.error('❌ SMS send error:', error);

    // Log failed SMS attempt
    try {
      const sql = getDB();
      const body = JSON.parse(event.body || '{}');

      await sql`
        INSERT INTO sms_logs (
          phone_number,
          message,
          message_type,
          status,
          order_id,
          error_message,
          sent_at
        ) VALUES (
          ${body.customerPhone || 'unknown'},
          ${error.message || 'Failed to send'},
          'order_confirmation',
          'failed',
          ${body.orderId || null},
          ${error.message},
          NOW()
        )
      `;
    } catch (logError) {
      console.error('⚠️ Failed to log error to database:', logError);
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Failed to send SMS',
        error: error.message
      })
    };
  }
};
