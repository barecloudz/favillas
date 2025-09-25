import type { VercelRequest, VercelResponse } from '@vercel/node';
import { twilioClient, SMS_CONFIG, SMSType } from './twilio-client';
import { sql } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      campaignName,
      message,
      recipientType = 'all',
      smsType = SMSType.MARKETING_CAMPAIGN
    } = req.body;

    if (!campaignName || !message) {
      return res.status(400).json({
        error: 'Missing required fields: campaignName, message'
      });
    }

    // Validate message length (SMS limit is 160 characters)
    if (message.length > 160) {
      return res.status(400).json({
        error: 'Message too long. SMS messages must be 160 characters or less.'
      });
    }

    // Get subscribers with phone numbers based on recipient type
    let subscribers = [];

    if (recipientType === 'all') {
      const result = await sql`
        SELECT id, phone, first_name, last_name
        FROM users
        WHERE phone IS NOT NULL
        AND phone != ''
        AND marketing_opt_in = true
        AND role = 'customer'
        AND is_active = true
      `;
      subscribers = result.rows;
    } else {
      return res.status(400).json({ error: 'Invalid recipient type' });
    }

    if (subscribers.length === 0) {
      return res.status(400).json({ error: 'No subscribers with phone numbers found for this campaign' });
    }

    console.log(`Sending SMS campaign "${campaignName}" to ${subscribers.length} subscribers`);

    const smsPromises = subscribers.map(async (subscriber) => {
      // Clean phone number (remove any formatting)
      const cleanPhone = subscriber.phone.replace(/[^\d+]/g, '');

      // Ensure phone number starts with +1 for US numbers
      const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+1${cleanPhone}`;

      try {
        const result = await twilioClient.messages.create({
          body: message,
          from: SMS_CONFIG.from,
          to: formattedPhone
        });

        console.log(`SMS sent to ${subscriber.phone}: ${result.sid}`);
        return {
          phone: subscriber.phone,
          success: true,
          messageSid: result.sid,
          firstName: subscriber.first_name
        };
      } catch (err: any) {
        console.error(`Failed to send SMS to ${subscriber.phone}:`, err.message);
        return {
          phone: subscriber.phone,
          success: false,
          error: err.message
        };
      }
    });

    // Send all SMS messages
    const results = await Promise.allSettled(smsPromises);

    const successful = results
      .filter(result => result.status === 'fulfilled' && result.value.success)
      .map(result => (result as PromiseFulfilledResult<any>).value);

    const failed = results
      .filter(result => result.status === 'rejected' || !result.value?.success)
      .map(result =>
        result.status === 'rejected'
          ? { error: result.reason }
          : (result as PromiseFulfilledResult<any>).value
      );

    console.log(`SMS Campaign results: ${successful.length} sent, ${failed.length} failed`);

    return res.status(200).json({
      success: true,
      campaignName,
      totalRecipients: subscribers.length,
      sentSuccessfully: successful.length,
      failed: failed.length,
      messageLength: message.length,
      results: {
        successful: successful.slice(0, 10), // Limit response size
        failed: failed.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('SMS campaign error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}