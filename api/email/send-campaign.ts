import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resend, getEmailConfig, EmailType } from './resend-client';
import { getMarketingCampaignTemplate } from './templates/marketing-campaign';
import { sql } from '@neondatabase/serverless';
import { db } from '@/server/storage';

// Helper function to sanitize tag values for Resend
// Tags can only contain ASCII letters, numbers, underscores, or dashes
function sanitizeTagValue(value: string): string {
  return value
    .replace(/\s+/g, '_')  // Replace spaces with underscores
    .replace(/[^a-zA-Z0-9_-]/g, '')  // Remove any other invalid characters
    .substring(0, 256);  // Resend has a 256 character limit for tag values
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      campaignName,
      subject,
      content,
      ctaText,
      ctaUrl,
      recipientType = 'all',
      template = 'default',
      accentColor = '#d73a31'
    } = req.body;

    if (!campaignName || !subject || !content) {
      return res.status(400).json({
        error: 'Missing required fields: campaignName, subject, content'
      });
    }

    // Get subscribers based on recipient type
    let subscribers = [];

    if (recipientType === 'all') {
      const result = await sql`
        SELECT id, email, first_name, last_name
        FROM users
        WHERE marketing_opt_in = true
        AND role = 'customer'
        AND is_active = true
      `;
      subscribers = result.rows;
    } else {
      // Add other recipient types as needed (high spenders, recent customers, etc.)
      return res.status(400).json({ error: 'Invalid recipient type' });
    }

    if (subscribers.length === 0) {
      return res.status(400).json({ error: 'No subscribers found for this campaign' });
    }

    console.log(`Sending campaign "${campaignName}" to ${subscribers.length} subscribers`);

    const emailPromises = subscribers.map(async (subscriber) => {
      const unsubscribeUrl = `${process.env.SITE_URL || 'https://pizzaspinrewards.com'}/unsubscribe?token=${Buffer.from(subscriber.email).toString('base64')}`;

      const htmlTemplate = getMarketingCampaignTemplate({
        customerName: subscriber.first_name || 'Valued Customer',
        subject,
        content,
        ctaText,
        ctaUrl,
        unsubscribeUrl,
        template,
        accentColor
      });

      try {
        const emailConfig = getEmailConfig(EmailType.MARKETING_CAMPAIGN);

        const { data, error } = await resend.emails.send({
          from: emailConfig.from,
          to: [subscriber.email],
          subject: subject,
          html: htmlTemplate,
          replyTo: emailConfig.replyTo,
          tags: [
            { name: 'type', value: EmailType.MARKETING_CAMPAIGN },
            { name: 'campaign', value: sanitizeTagValue(campaignName) },
            { name: 'user_id', value: subscriber.id.toString() }
          ]
        });

        if (error) {
          console.error(`Failed to send to ${subscriber.email}:`, error);
          return { email: subscriber.email, success: false, error };
        }

        return { email: subscriber.email, success: true, emailId: data?.id };
      } catch (err) {
        console.error(`Error sending to ${subscriber.email}:`, err);
        return { email: subscriber.email, success: false, error: err };
      }
    });

    // Send all emails
    const results = await Promise.allSettled(emailPromises);

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

    console.log(`Campaign results: ${successful.length} sent, ${failed.length} failed`);

    return res.status(200).json({
      success: true,
      campaignName,
      totalRecipients: subscribers.length,
      sentSuccessfully: successful.length,
      failed: failed.length,
      results: {
        successful: successful.slice(0, 10), // Limit response size
        failed: failed.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('Campaign email error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}