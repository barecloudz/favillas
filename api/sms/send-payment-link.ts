import type { Handler } from '@netlify/functions';
import { twilioClient, SMS_CONFIG } from './twilio-client';

/**
 * Send payment link SMS to customer
 * POST /api/sms/send-payment-link
 *
 * Body: {
 *   phone: string (10 digits)
 *   orderId: number
 *   paymentToken: string
 *   customerName: string
 *   total: number
 * }
 */
export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { phone, orderId, paymentToken, customerName, total } = JSON.parse(event.body || '{}');

    if (!phone || !orderId || !paymentToken) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      };
    }

    // Format phone number (ensure it has country code)
    const formattedPhone = phone.startsWith('+1') ? phone : `+1${phone.replace(/\D/g, '')}`;

    // Get base URL
    const baseUrl = process.env.URL || 'https://preview--pizzaspin.netlify.app';
    const paymentUrl = `${baseUrl}/pay/${paymentToken}`;

    // Create SMS message
    const message = `Hi ${customerName || 'there'}!

Your Favilla's order #${orderId} is ready for payment.

Total: $${total.toFixed(2)}

Click here to pay securely:
${paymentUrl}

This link expires in 24 hours.

Questions? Call us at (803) 977-4285`;

    // Send SMS
    console.log(`📱 Sending payment link SMS to ${formattedPhone}`);

    const smsResult = await twilioClient.messages.create({
      body: message,
      from: SMS_CONFIG.from,
      to: formattedPhone
    });

    console.log(`✅ Payment link SMS sent! SID: ${smsResult.sid}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        messageSid: smsResult.sid,
        paymentUrl
      })
    };

  } catch (error: any) {
    console.error('❌ Error sending payment link SMS:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to send payment link',
        details: error.message
      })
    };
  }
};
