import { Handler } from '@netlify/functions';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    console.log('🔍 Testing Resend email configuration...');
    console.log('📧 RESEND_API_KEY exists:', !!process.env.RESEND_API_KEY);
    console.log('📧 RESEND_FROM_EMAIL:', process.env.RESEND_FROM_EMAIL);
    console.log('📧 API Key length:', process.env.RESEND_API_KEY?.length);
    console.log('📧 API Key prefix:', process.env.RESEND_API_KEY?.substring(0, 10));

    const testEmail = 'barecloudz@gmail.com';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #d73a31 0%, #c73128 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: white; padding: 30px; border: 1px solid #ddd; }
        .footer { background: #343a40; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍕 Favilla's NY Pizza</h1>
            <p>Email System Test</p>
        </div>
        <div class="content">
            <h2>✅ Email Configuration Test</h2>
            <p>Hello! This is a test email from your Favilla's NY Pizza email marketing system.</p>
            <p><strong>Test Details:</strong></p>
            <ul>
                <li>Sent via: Resend API</li>
                <li>From: ${process.env.RESEND_FROM_EMAIL || 'noreply@favillaspizza.com'}</li>
                <li>Time: ${new Date().toLocaleString()}</li>
            </ul>
            <p>If you're seeing this email, your Resend configuration is working correctly! 🎉</p>
        </div>
        <div class="footer">
            <p>Favilla's NY Pizza Email System</p>
            <p>🍕 Authentic New York Style</p>
        </div>
    </div>
</body>
</html>
    `;

    console.log(`📧 Attempting to send test email to: ${testEmail}`);

    const result = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@favillaspizza.com',
      to: [testEmail],
      subject: '🍕 Test Email - Favilla\'s NY Pizza Email System',
      html: htmlContent,
      tags: [
        { name: 'category', value: 'test' },
        { name: 'test_type', value: 'configuration_check' }
      ]
    });

    console.log('✅ Email sent successfully!');
    console.log('📊 Resend response:', JSON.stringify(result, null, 2));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Test email sent successfully',
        recipient: testEmail,
        resendResponse: result,
        config: {
          apiKeyConfigured: !!process.env.RESEND_API_KEY,
          fromEmail: process.env.RESEND_FROM_EMAIL,
          timestamp: new Date().toISOString()
        }
      })
    };

  } catch (error: any) {
    console.error('❌ Email send failed:', error);
    console.error('❌ Error details:', JSON.stringify(error, null, 2));

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Failed to send email',
        errorDetails: error,
        config: {
          apiKeyConfigured: !!process.env.RESEND_API_KEY,
          fromEmail: process.env.RESEND_FROM_EMAIL
        }
      })
    };
  }
};
