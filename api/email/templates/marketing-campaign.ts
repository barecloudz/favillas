interface MarketingCampaignData {
  customerName: string;
  subject: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  unsubscribeUrl: string;
  template?: string;
  accentColor?: string;
}

export function getMarketingCampaignTemplate(data: MarketingCampaignData): string {
  const accentColor = data.accentColor || '#d73a31';
  const template = data.template || 'default';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.subject} - Favilla's Pizzeria</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
  <div style="background: white; padding: 0; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden;">

    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${accentColor}, ${accentColor}dd); color: white; text-align: center; padding: 30px 20px;">
      <h1 style="margin: 0; font-size: 28px;">🍕 Favilla's Pizzeria</h1>
      <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your favorite pizza just got better!</p>
    </div>

    <!-- Content -->
    <div style="padding: 30px 20px;">
      <p style="font-size: 18px; color: ${accentColor}; margin-top: 0;">Hi ${data.customerName}!</p>

      <div style="margin: 20px 0;">
        ${data.content.replace(/\n/g, '<br>')}
      </div>

      ${data.ctaText && data.ctaUrl ? `
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.ctaUrl}" style="
          background: linear-gradient(135deg, ${accentColor}, ${accentColor}dd);
          color: white;
          text-decoration: none;
          padding: 15px 30px;
          border-radius: 25px;
          font-weight: bold;
          font-size: 16px;
          display: inline-block;
          box-shadow: 0 4px 15px rgba(${accentColor.substring(1)}, 0.3);
          transition: all 0.3s ease;
        ">
          ${data.ctaText}
        </a>
      </div>
      ` : ''}
    </div>

    <!-- Footer -->
    <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
      <div style="margin-bottom: 15px;">
        <h4 style="color: #d73a31; margin: 0 0 10px 0;">Follow Us</h4>
        <div style="font-size: 24px;">
          <span style="margin: 0 10px;">📘</span>
          <span style="margin: 0 10px;">📷</span>
          <span style="margin: 0 10px;">🐦</span>
        </div>
      </div>

      <div style="color: #666; font-size: 12px; line-height: 1.4;">
        <p style="margin: 5px 0;"><strong>Favilla's Pizzeria</strong></p>
        <p style="margin: 5px 0;">123 Pizza Street, Food City, FC 12345</p>
        <p style="margin: 5px 0;">📞 (555) 123-PIZZA | 📧 support@favillaspizzeria.com</p>
      </div>

      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; color: #999; font-size: 11px;">
        <p style="margin: 0;">
          You're receiving this email because you subscribed to marketing emails from Pizza Spin Rewards.
          <br>
          <a href="${data.unsubscribeUrl}" style="color: #999; text-decoration: underline;">
            Unsubscribe from marketing emails
          </a>
        </p>
        <p style="margin: 10px 0 0 0;">© 2025 Favilla's Pizzeria. All rights reserved.</p>
      </div>
    </div>

  </div>
</body>
</html>
  `;
}