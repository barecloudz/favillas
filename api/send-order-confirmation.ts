import { Handler } from '@netlify/functions';
import { Resend } from 'resend';
import postgres from 'postgres';

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

interface OrderItem {
  name: string;
  quantity: number;
  price: string;
  modifications?: string;
}

interface OrderEmailData {
  orderId: string;
  customerEmail: string;
  customerName: string;
  customerPhone?: string;
  orderTotal: string;
  orderDate: string;
  orderType: 'pickup' | 'delivery';
  orderStatus: string;
  estimatedTime: string;
  deliveryAddress?: string;
  deliveryInstructions?: string;
  paymentMethod: string;
  items: OrderItem[];
  pointsEarned?: number;
  totalPoints?: number;
  voucherUsed?: boolean;
  voucherDiscount?: string;
  voucherCode?: string;
}

const resend = new Resend(process.env.RESEND_API_KEY);

const generateOrderConfirmationHTML = (data: OrderEmailData): string => {
  const itemsHTML = data.items.map(item => `
    <div class="order-item">
      <div class="item-details">
        <div class="item-name">${item.name}</div>
        ${item.modifications ? `<div class="item-modifications">${item.modifications}</div>` : ''}
        <div class="item-quantity">Quantity: ${item.quantity}</div>
      </div>
      <div class="item-price">$${item.price}</div>
    </div>
  `).join('');

  // For authenticated users: show points earned
  // For guests: show marketing section encouraging account creation
  const pointsSection = data.pointsEarned ? `
    <div class="points-section">
      <h3>🎁 Reward Points Earned!</h3>
      <div class="points-earned">+${data.pointsEarned} Points</div>
      <p>You now have ${data.totalPoints || data.pointsEarned} total points</p>
      <p style="font-size: 14px; opacity: 0.9;">
        Use your points for free items and exclusive rewards!
      </p>
    </div>
  ` : `
    <div class="guest-marketing-section">
      <h3>🎁 You Could Have Earned ${Math.floor(parseFloat(data.orderTotal))} Points!</h3>
      <p>If you had an account, you could have:</p>
      <ul style="text-align: left; margin: 15px auto; max-width: 400px;">
        <li>✅ Tracked your order status in real-time</li>
        <li>✅ Earned <strong>${Math.floor(parseFloat(data.orderTotal))} reward points</strong> from this order</li>
        <li>✅ Redeemed points for free food and exclusive discounts</li>
        <li>✅ Saved your favorite orders for quick reordering</li>
        <li>✅ Received exclusive member-only offers</li>
      </ul>
      <a href="${process.env.SITE_URL || 'https://favillasnypizza.netlify.app'}/auth?signup=true" class="track-button">
        🚀 Create Your Free Account
      </a>
      <p style="font-size: 12px; opacity: 0.8; margin-top: 10px;">
        Start earning points on your next order!
      </p>
    </div>
  `;

  const voucherRow = data.voucherUsed ? `
    <div class="detail-row">
      <span class="detail-label">Voucher Applied:</span>
      <span class="detail-value" style="color: #28a745;">-$${data.voucherDiscount}</span>
    </div>
  ` : '';

  const deliverySection = data.orderType === 'delivery' ? `
    <div class="delivery-info">
      <h4>🚚 Delivery Information</h4>
      <p><strong>Address:</strong> ${data.deliveryAddress}</p>
      <p><strong>Phone:</strong> ${data.customerPhone}</p>
      ${data.deliveryInstructions ? `<p><strong>Instructions:</strong> ${data.deliveryInstructions}</p>` : ''}
    </div>
  ` : '';

  const siteURL = process.env.SITE_URL || 'https://favillasnypizza.netlify.app';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation #${data.orderId} | Favilla's NY Pizza</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #d73a31 0%, #c73128 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: bold;
        }
        .order-number {
            background-color: rgba(255, 255, 255, 0.2);
            padding: 10px 20px;
            border-radius: 25px;
            margin-top: 15px;
            display: inline-block;
            font-size: 18px;
            font-weight: bold;
        }
        .content {
            padding: 30px;
        }
        .order-status {
            text-align: center;
            margin-bottom: 30px;
        }
        .status-badge {
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white;
            padding: 15px 30px;
            border-radius: 50px;
            font-weight: bold;
            font-size: 16px;
            display: inline-block;
            margin-bottom: 15px;
        }
        .order-details {
            background-color: #f8f9fa;
            border-radius: 10px;
            padding: 25px;
            margin: 25px 0;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 8px 0;
            border-bottom: 1px solid #dee2e6;
        }
        .detail-row:last-child {
            border-bottom: none;
            font-weight: bold;
            font-size: 18px;
            margin-top: 10px;
            padding-top: 15px;
            border-top: 2px solid #d73a31;
        }
        .detail-label {
            color: #6c757d;
            font-weight: 500;
        }
        .detail-value {
            color: #333;
            font-weight: 600;
        }
        .items-section {
            margin: 30px 0;
        }
        .items-section h3 {
            color: #d73a31;
            margin-bottom: 20px;
            font-size: 20px;
        }
        .order-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 0;
            border-bottom: 1px solid #eee;
        }
        .order-item:last-child {
            border-bottom: none;
        }
        .item-details {
            flex: 1;
        }
        .item-name {
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        .item-modifications {
            font-size: 14px;
            color: #666;
            margin-bottom: 3px;
        }
        .item-quantity {
            font-size: 14px;
            color: #888;
        }
        .item-price {
            font-weight: bold;
            color: #d73a31;
            font-size: 16px;
        }
        .delivery-info {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
        }
        .delivery-info h4 {
            color: #856404;
            margin-top: 0;
            margin-bottom: 15px;
        }
        .delivery-info p {
            margin: 5px 0;
            color: #856404;
        }
        .points-section {
            background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%);
            color: white;
            border-radius: 10px;
            padding: 25px;
            text-align: center;
            margin: 25px 0;
        }
        .points-earned {
            font-size: 36px;
            font-weight: bold;
            margin: 10px 0;
        }
        .guest-marketing-section {
            background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
            color: white;
            border-radius: 10px;
            padding: 25px;
            text-align: center;
            margin: 25px 0;
        }
        .guest-marketing-section h3 {
            margin: 0 0 15px 0;
            font-size: 22px;
        }
        .guest-marketing-section ul {
            list-style: none;
            padding: 0;
        }
        .guest-marketing-section li {
            padding: 8px 0;
            font-size: 15px;
        }
        .track-button {
            background: linear-gradient(135deg, #d73a31 0%, #c73128 100%);
            color: white;
            text-decoration: none;
            padding: 15px 35px;
            border-radius: 50px;
            font-weight: bold;
            font-size: 16px;
            display: inline-block;
            margin: 20px 0;
            transition: transform 0.2s ease;
            box-shadow: 0 4px 15px rgba(215, 58, 49, 0.3);
        }
        .contact-section {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
            margin: 25px 0;
            text-align: center;
        }
        .contact-section h4 {
            color: #333;
            margin-top: 0;
        }
        .contact-links {
            margin: 15px 0;
        }
        .contact-links a {
            color: #d73a31;
            text-decoration: none;
            margin: 0 15px;
            font-weight: 500;
        }
        .footer {
            background-color: #343a40;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .footer p {
            margin: 5px 0;
            opacity: 0.8;
        }
        .social-links {
            margin: 20px 0;
        }
        .social-links a {
            color: #fff;
            text-decoration: none;
            margin: 0 10px;
            opacity: 0.8;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍕 Order Confirmed!</h1>
            <div class="order-number">Order #${data.orderId}</div>
        </div>

        <div class="content">
            <div class="order-status">
                <div class="status-badge">✅ ${data.orderStatus}</div>
                <p style="color: #666; margin: 0;">
                    Estimated ${data.orderType}: ${data.estimatedTime}
                </p>
            </div>

            <div class="order-details">
                <div class="detail-row">
                    <span class="detail-label">Order Date:</span>
                    <span class="detail-value">${data.orderDate}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Order Type:</span>
                    <span class="detail-value">${data.orderType.charAt(0).toUpperCase() + data.orderType.slice(1)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Payment Method:</span>
                    <span class="detail-value">${data.paymentMethod}</span>
                </div>
                ${voucherRow}
                <div class="detail-row">
                    <span class="detail-label">Total:</span>
                    <span class="detail-value" style="color: #d73a31;">$${data.orderTotal}</span>
                </div>
            </div>

            ${deliverySection}

            <div class="items-section">
                <h3>📋 Order Items</h3>
                ${itemsHTML}
            </div>

            ${pointsSection}

            ${data.pointsEarned ? `
            <div style="text-align: center;">
                <a href="${siteURL}/orders" class="track-button">
                    📱 Track Your Order
                </a>
            </div>
            ` : ''}

            <div class="contact-section">
                <h4>📞 Need Help?</h4>
                <p>Contact us if you have any questions about your order</p>
                <div class="contact-links">
                    <a href="tel:${process.env.RESTAURANT_PHONE || '(555) 123-4567'}">📞 Call Us</a>
                    <a href="mailto:${process.env.RESTAURANT_EMAIL || 'info@favillaspizza.com'}">📧 Email Us</a>
                    <a href="${siteURL}">🌐 Visit Website</a>
                </div>
            </div>
        </div>

        <div class="footer">
            <h3 style="margin-top: 0;">Favilla's NY Pizza</h3>
            <p>Authentic New York Style Pizza</p>
            <p>📍 ${process.env.RESTAURANT_ADDRESS || 'Your Restaurant Address'}</p>
            <p>📞 ${process.env.RESTAURANT_PHONE || '(555) 123-4567'} | 🌐 ${siteURL}</p>

            <div class="social-links">
                <a href="https://www.facebook.com/favillaspizzeria/">Facebook</a> |
                <a href="https://www.instagram.com/favillaspizza/">Instagram</a>
            </div>

            <p style="margin-top: 30px; font-size: 12px;">
                This email was sent to ${data.customerEmail} regarding Order #${data.orderId}<br>
                <a href="${siteURL}/unsubscribe" style="color: #adb5bd;">Unsubscribe from promotional emails</a>
            </p>
        </div>
    </div>
</body>
</html>
  `;
};

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
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
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }

    const orderData: OrderEmailData = JSON.parse(event.body || '{}');

    console.log('📧 Sending order confirmation email:', {
      orderId: orderData.orderId,
      customerEmail: orderData.customerEmail,
      customerName: orderData.customerName
    });

    // Validate required fields
    const requiredFields = ['orderId', 'customerEmail', 'customerName', 'orderTotal', 'items'];
    for (const field of requiredFields) {
      if (!orderData[field as keyof OrderEmailData]) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Missing required field: ${field}` })
        };
      }
    }

    // Generate the HTML content
    const htmlContent = generateOrderConfirmationHTML(orderData);

    // Send email via Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@favillaspizza.com',
      to: [orderData.customerEmail],
      subject: `Order Confirmation #${orderData.orderId} - Favilla's NY Pizza`,
      html: htmlContent,
      tags: [
        { name: 'category', value: 'order_confirmation' },
        { name: 'order_id', value: orderData.orderId }
      ]
    });

    if (error) {
      console.error('❌ Resend API error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Failed to send email via Resend',
          details: error
        })
      };
    }

    console.log('✅ Order confirmation email sent successfully:', data);

    // Log email send to database for tracking
    try {
      const sql = getDB();
      await sql`
        INSERT INTO email_logs (
          order_id,
          recipient_email,
          email_type,
          status,
          resend_id,
          sent_at
        ) VALUES (
          ${orderData.orderId},
          ${orderData.customerEmail},
          'order_confirmation',
          'sent',
          ${data?.id || null},
          NOW()
        )
      `;
      console.log('✅ Email log recorded in database');
    } catch (dbError) {
      console.warn('⚠️ Failed to log email to database:', dbError);
      // Don't fail the entire operation if logging fails
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        emailId: data?.id,
        message: 'Order confirmation email sent successfully'
      })
    };

  } catch (error: any) {
    console.error('❌ Order confirmation email error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to send order confirmation email',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};