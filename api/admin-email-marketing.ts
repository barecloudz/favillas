import { Handler } from '@netlify/functions';
import { Resend } from 'resend';
import postgres from 'postgres';
import jwt from 'jsonwebtoken';

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

function authenticateAdmin(event: any): { userId: number; username: string; role: string } | null {
  const authHeader = event.headers.authorization;
  let token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    const cookies = event.headers.cookie;
    if (cookies) {
      const authCookie = cookies.split(';').find((c: string) => c.trim().startsWith('auth-token='));
      if (authCookie) {
        token = authCookie.split('=')[1];
      }
    }
  }

  if (!token) return null;

  try {
    const jwtSecret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET or SESSION_SECRET environment variable is required');
    }

    const decoded = jwt.verify(token, jwtSecret) as any;

    // Check if user has admin privileges
    if (!['admin', 'manager'].includes(decoded.role)) {
      return null;
    }

    return {
      userId: decoded.userId,
      username: decoded.username,
      role: decoded.role
    };
  } catch (error) {
    console.error('Admin token authentication failed:', error);
    return null;
  }
}

const resend = new Resend(process.env.RESEND_API_KEY);

interface EmailCampaign {
  name: string;
  subject: string;
  htmlContent: string;
  customerSegment: 'all' | 'loyalty_members' | 'new_customers' | 'recent_orders' | 'birthday_this_month';
  scheduledTime?: string;
  testEmails?: string[];
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  description: string;
}

const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'weekly-special',
    name: 'Weekly Special',
    subject: '🍕 This Week\'s Special: Buy Large Pizza, Get FREE 2-Liter Soda!',
    description: 'Promote weekly specials and limited-time offers',
    htmlContent: `<h2 style="color: #d73a31; text-align: center; margin-bottom: 20px;">🍕 This Week's Special Offer!</h2>

<div style="background: linear-gradient(135deg, #d73a31 0%, #c73128 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
  <h3 style="margin: 0; font-size: 24px;">Buy Any Large Pizza</h3>
  <p style="margin: 10px 0 0 0; font-size: 18px;">Get a FREE 2-Liter Soda!</p>
</div>

<p>Hey there, pizza lover! 👋</p>

<p>We're excited to share our <strong>weekly special</strong> with you. This week only, when you order any large pizza, we'll throw in a free 2-liter soda - that's a $3.99 value!</p>

<div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <p style="margin: 0; font-weight: bold;">🕒 Offer Details:</p>
  <ul style="margin: 10px 0;">
    <li>Valid Monday through Sunday this week</li>
    <li>Must order any large pizza (pickup or delivery)</li>
    <li>Free 2-liter soda automatically added</li>
    <li>No coupon code needed - discount applied at checkout</li>
  </ul>
</div>

<div style="text-align: center; margin: 30px 0;">
  <a href="${process.env.SITE_URL || 'https://favillasnypizza.netlify.app'}" style="background: linear-gradient(135deg, #d73a31 0%, #c73128 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 25px; font-weight: bold; display: inline-block;">
    🍕 Order Now
  </a>
</div>

<p>Don't miss out on this delicious deal! Our hand-tossed dough and premium ingredients make every bite worth it.</p>

<p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
  Offer valid through Sunday. Cannot be combined with other offers.
</p>`
  },
  {
    id: 'birthday-offer',
    name: 'Birthday Offer',
    subject: '🎉 Happy Birthday! Enjoy Your FREE Personal Pizza + Dessert',
    description: 'Special birthday rewards for customers celebrating this month',
    htmlContent: `<h2 style="color: #d73a31; text-align: center; margin-bottom: 20px;">🎉 Happy Birthday from Favilla's!</h2>

<div style="background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
  <h3 style="margin: 0; font-size: 24px;">🎂 Your Birthday Gift</h3>
  <p style="margin: 10px 0 0 0; font-size: 18px;">FREE Personal Pizza + Dessert!</p>
</div>

<p>Happy Birthday! 🎈</p>

<p>It's your special day, and we want to help you celebrate! As our way of saying "Happy Birthday," we're treating you to a <strong>FREE personal pizza and dessert</strong> - no purchase necessary!</p>

<div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <p style="margin: 0; font-weight: bold; color: #856404;">🎁 Your Birthday Treats Include:</p>
  <ul style="margin: 10px 0; color: #856404;">
    <li>Any personal pizza (cheese, pepperoni, or veggie)</li>
    <li>Choice of dessert: chocolate brownie or cinnamon sticks</li>
    <li>Valid for pickup or dine-in</li>
    <li>Just show this email when you visit!</li>
  </ul>
</div>

<div style="text-align: center; margin: 30px 0;">
  <a href="${process.env.SITE_URL || 'https://favillasnypizza.netlify.app'}" style="background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 25px; font-weight: bold; display: inline-block;">
    🎉 Claim Your Birthday Treat
  </a>
</div>

<p>We're grateful to have you as part of the Favilla's family, and we hope your birthday is as special as you are!</p>

<p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
  Valid for 30 days from your birthday. One per customer. Cannot be combined with other offers.
</p>`
  },
  {
    id: 'loyalty-reward',
    name: 'Loyalty Reward',
    subject: '⭐ Thank You! Here\'s 25% Off Your Next Order',
    description: 'Reward loyal customers with exclusive discounts',
    htmlContent: `<h2 style="color: #d73a31; text-align: center; margin-bottom: 20px;">⭐ Thank You, Loyal Customer!</h2>

<div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
  <h3 style="margin: 0; font-size: 24px;">🏆 Loyalty Reward</h3>
  <p style="margin: 10px 0 0 0; font-size: 18px;">25% Off Your Next Order!</p>
</div>

<p>You're amazing! 🌟</p>

<p>We've noticed you're one of our most valued customers, and we want to show our appreciation. We're giving you an exclusive 25% discount on your next order!</p>

<div style="background-color: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <p style="margin: 0; font-weight: bold; color: #0c5460;">💎 VIP Loyalty Benefits:</p>
  <ul style="margin: 10px 0; color: #0c5460;">
    <li>25% off your next order (up to $20 savings)</li>
    <li>Free delivery on all future orders</li>
    <li>Early access to new menu items</li>
    <li>Double points on your birthday month</li>
  </ul>
</div>

<div style="text-align: center; margin: 30px 0;">
  <div style="background-color: #fff; border: 2px dashed #0c5460; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <p style="margin: 0; font-weight: bold; color: #0c5460;">Use Code:</p>
    <p style="margin: 5px 0; font-size: 24px; font-weight: bold; color: #0c5460; letter-spacing: 3px;">LOYAL25</p>
  </div>

  <a href="${process.env.SITE_URL || 'https://favillasnypizza.netlify.app'}" style="background: linear-gradient(135deg, #d73a31 0%, #c73128 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 25px; font-weight: bold; display: inline-block;">
    ⭐ Order Now & Save
  </a>
</div>

<p>Thank you for choosing Favilla's time and time again. Customers like you make our pizza family complete!</p>

<p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
  Code expires in 14 days. Cannot be combined with other offers. Maximum discount $20.
</p>`
  },
  {
    id: 'new-menu',
    name: 'New Menu Items',
    subject: '🍕 NEW Menu Alert: Try Our Latest Specialty Pizzas!',
    description: 'Announce new menu items and limited-time additions',
    htmlContent: `<h2 style="color: #d73a31; text-align: center; margin-bottom: 20px;">🍕 NEW Menu Items Have Arrived!</h2>

<div style="background: linear-gradient(135deg, #fd7e14 0%, #e55a4e 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
  <h3 style="margin: 0; font-size: 24px;">🎊 Limited Time Launch</h3>
  <p style="margin: 10px 0 0 0; font-size: 18px;">Try Our Latest Creations!</p>
</div>

<p>Exciting news, pizza lovers! 🚀</p>

<p>We've been working hard in our kitchen to bring you some incredible new flavors. Our chef has crafted <strong>three brand new specialty pizzas</strong> that we know you're going to love!</p>

<div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
  <h4 style="color: #d73a31; margin-top: 0;">🆕 New Menu Items:</h4>

  <div style="margin-bottom: 15px;">
    <strong>🌶️ The Fire Fighter</strong><br>
    <span style="color: #666;">Spicy pepperoni, jalapeños, sriracha drizzle, and pepper jack cheese</span>
  </div>

  <div style="margin-bottom: 15px;">
    <strong>🍄 Truffle Garden</strong><br>
    <span style="color: #666;">Wild mushrooms, truffle oil, arugula, and fresh mozzarella</span>
  </div>

  <div style="margin-bottom: 0;">
    <strong>🥓 Breakfast All Day</strong><br>
    <span style="color: #666;">Bacon, scrambled eggs, hash browns, and cheddar cheese</span>
  </div>
</div>

<div style="background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <p style="margin: 0; font-weight: bold; color: #155724;">🎯 Launch Week Special:</p>
  <p style="margin: 10px 0 0 0; color: #155724;">Get 20% off any of our new pizzas when you order this week!</p>
</div>

<div style="text-align: center; margin: 30px 0;">
  <a href="${process.env.SITE_URL || 'https://favillasnypizza.netlify.app'}" style="background: linear-gradient(135deg, #fd7e14 0%, #e55a4e 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 25px; font-weight: bold; display: inline-block;">
    🍕 Try Them Now
  </a>
</div>

<p>Be among the first to taste these amazing new creations. We can't wait to hear what you think!</p>

<p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
  Launch week special valid for 7 days. New items available for both pickup and delivery.
</p>`
  },
  {
    id: 'win-back',
    name: 'Win-Back Campaign',
    subject: '😢 We Miss You! Come Back for 30% Off',
    description: 'Re-engage customers who haven\'t ordered recently',
    htmlContent: `<h2 style="color: #d73a31; text-align: center; margin-bottom: 20px;">😢 We Miss You!</h2>

<div style="background: linear-gradient(135deg, #6f42c1 0%, #e83e8c 100%); color: white; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
  <h3 style="margin: 0; font-size: 24px;">💝 Come Back Special</h3>
  <p style="margin: 10px 0 0 0; font-size: 18px;">30% Off Your Return Order!</p>
</div>

<p>Hey there! 👋</p>

<p>It's been a while since we've seen you at Favilla's, and frankly, we miss you! We've been thinking about our amazing customers, and you came to mind.</p>

<p>We know life gets busy, but we'd love to welcome you back with something special. How does <strong>30% off your next order</strong> sound?</p>

<div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
  <p style="margin: 0; font-weight: bold; color: #856404;">🎁 Here's What's New Since You've Been Away:</p>
  <ul style="margin: 10px 0; color: #856404;">
    <li>New specialty pizzas you haven't tried yet</li>
    <li>Improved online ordering experience</li>
    <li>Faster delivery times in your area</li>
    <li>Enhanced rewards program with better perks</li>
  </ul>
</div>

<div style="text-align: center; margin: 30px 0;">
  <div style="background-color: #fff; border: 2px dashed #856404; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <p style="margin: 0; font-weight: bold; color: #856404;">Welcome Back Code:</p>
    <p style="margin: 5px 0; font-size: 24px; font-weight: bold; color: #856404; letter-spacing: 3px;">WELCOME30</p>
  </div>

  <a href="${process.env.SITE_URL || 'https://favillasnypizza.netlify.app'}" style="background: linear-gradient(135deg, #d73a31 0%, #c73128 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 25px; font-weight: bold; display: inline-block;">
    🏠 Welcome Me Back
  </a>
</div>

<p>We promise the same great taste you remember, and we're excited to show you all the improvements we've made. Your table is always ready!</p>

<p style="font-size: 14px; color: #666; text-align: center; margin-top: 30px;">
  Code expires in 30 days. Valid for pickup and delivery. Cannot be combined with other offers.
</p>`
  }
];

interface CustomerSegment {
  email: string;
  first_name?: string;
  last_name?: string;
  id: number;
}

const getCustomersBySegment = async (sql: any, segment: string): Promise<CustomerSegment[]> => {
  switch (segment) {
    case 'all':
      return await sql`
        SELECT DISTINCT u.id, u.email, u.first_name, u.last_name
        FROM users u
        WHERE u.email IS NOT NULL
        AND u.email != ''
        AND u.marketing_opt_in = true
        ORDER BY u.id
      `;

    case 'loyalty_members':
      return await sql`
        SELECT DISTINCT u.id, u.email, u.first_name, u.last_name
        FROM users u
        INNER JOIN user_points up ON u.id = up.user_id
        WHERE u.email IS NOT NULL
        AND u.email != ''
        AND u.marketing_opt_in = true
        AND up.points > 0
        ORDER BY up.points DESC
      `;

    case 'new_customers':
      return await sql`
        SELECT DISTINCT u.id, u.email, u.first_name, u.last_name
        FROM users u
        WHERE u.email IS NOT NULL
        AND u.email != ''
        AND u.marketing_opt_in = true
        AND u.created_at >= NOW() - INTERVAL '30 days'
        ORDER BY u.created_at DESC
      `;

    case 'recent_orders':
      return await sql`
        SELECT DISTINCT u.id, u.email, u.first_name, u.last_name
        FROM users u
        INNER JOIN orders o ON (u.id = o.user_id OR u.supabase_user_id = o.supabase_user_id)
        WHERE u.email IS NOT NULL
        AND u.email != ''
        AND u.marketing_opt_in = true
        AND o.created_at >= NOW() - INTERVAL '30 days'
        ORDER BY o.created_at DESC
      `;

    case 'birthday_this_month':
      return await sql`
        SELECT DISTINCT u.id, u.email, u.first_name, u.last_name
        FROM users u
        WHERE u.email IS NOT NULL
        AND u.email != ''
        AND u.marketing_opt_in = true
        AND EXTRACT(MONTH FROM u.birthday) = EXTRACT(MONTH FROM NOW())
        ORDER BY u.first_name
      `;

    default:
      return [];
  }
};

const generatePromotionalEmailHTML = (customerName: string, htmlContent: string): string => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Special Offer from Favilla's NY Pizza</title>
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
        .content {
            padding: 30px;
        }
        .greeting {
            font-size: 18px;
            color: #333;
            margin-bottom: 20px;
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
        .unsubscribe {
            margin-top: 20px;
            font-size: 12px;
        }
        .unsubscribe a {
            color: #adb5bd;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍕 Favilla's NY Pizza</h1>
            <p>Authentic New York Style Pizza</p>
        </div>

        <div class="content">
            <div class="greeting">
                Hello ${customerName}! 👋
            </div>

            ${htmlContent}
        </div>

        <div class="footer">
            <h3 style="margin-top: 0;">Favilla's NY Pizza</h3>
            <p>Authentic New York Style Pizza</p>
            <p>📍 ${process.env.RESTAURANT_ADDRESS || 'Your Restaurant Address'}</p>
            <p>📞 ${process.env.RESTAURANT_PHONE || '(555) 123-4567'}</p>

            <div class="unsubscribe">
                <p>You're receiving this email because you opted in to marketing communications.</p>
                <p><a href="${process.env.SITE_URL || 'https://favillasnypizza.netlify.app'}/unsubscribe">Unsubscribe from promotional emails</a></p>
            </div>
        </div>
    </div>
</body>
</html>
  `;
};

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': event.headers.origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

  const authPayload = authenticateAdmin(event);
  if (!authPayload) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Unauthorized - Admin access required' })
    };
  }

  try {
    const sql = getDB();

    if (event.httpMethod === 'GET') {
      const path = event.path || event.rawUrl || '';

      // Get email templates endpoint
      if (path.includes('/templates')) {
        console.log('📧 Admin: Fetching email templates');

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            templates: EMAIL_TEMPLATES
          })
        };
      }

      // Get email marketing dashboard data
      console.log('📧 Admin: Fetching email marketing data');

      // Get campaign history
      const campaigns = await sql`
        SELECT
          id,
          name,
          subject,
          customer_segment,
          scheduled_time,
          sent_time,
          total_sent,
          total_delivered,
          total_opened,
          total_clicked,
          status,
          created_at
        FROM email_campaigns
        ORDER BY created_at DESC
        LIMIT 50
      `;

      // Get customer segment counts
      const allCustomers = await getCustomersBySegment(sql, 'all');
      const loyaltyMembers = await getCustomersBySegment(sql, 'loyalty_members');
      const newCustomers = await getCustomersBySegment(sql, 'new_customers');
      const recentOrders = await getCustomersBySegment(sql, 'recent_orders');
      const birthdayCustomers = await getCustomersBySegment(sql, 'birthday_this_month');

      const segmentCounts = {
        all: allCustomers.length,
        loyalty_members: loyaltyMembers.length,
        new_customers: newCustomers.length,
        recent_orders: recentOrders.length,
        birthday_this_month: birthdayCustomers.length
      };

      console.log('✅ Admin: Email marketing data retrieved:', {
        campaigns: campaigns.length,
        segmentCounts
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          campaigns,
          segmentCounts,
          totalCustomers: allCustomers.length,
          templates: EMAIL_TEMPLATES
        })
      };

    } else if (event.httpMethod === 'POST') {
      // Send email campaign
      const campaignData: EmailCampaign = JSON.parse(event.body || '{}');

      console.log('📧 Admin: Creating email campaign:', {
        name: campaignData.name,
        segment: campaignData.customerSegment,
        admin: authPayload.username
      });

      // Validate required fields
      if (!campaignData.name || !campaignData.subject || !campaignData.htmlContent) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Missing required fields: name, subject, htmlContent' })
        };
      }

      if (!process.env.RESEND_API_KEY) {
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: 'Email service not configured' })
        };
      }

      // Handle test emails
      if (campaignData.testEmails && campaignData.testEmails.length > 0) {
        console.log('📧 Sending test emails to:', campaignData.testEmails);

        const testResults = [];
        for (const testEmail of campaignData.testEmails) {
          try {
            const htmlContent = generatePromotionalEmailHTML('Test User', campaignData.htmlContent);

            const emailResult = await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || 'noreply@favillaspizza.com',
              to: [testEmail],
              subject: `[TEST] ${campaignData.subject}`,
              html: htmlContent,
              tags: [
                { name: 'category', value: 'test_campaign' },
                { name: 'campaign_name', value: campaignData.name }
              ]
            });

            testResults.push({ email: testEmail, success: true, id: emailResult.data?.id });
          } catch (error) {
            console.error(`❌ Test email failed for ${testEmail}:`, error);
            testResults.push({ email: testEmail, success: false, error: error });
          }
        }

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            message: 'Test emails sent',
            results: testResults
          })
        };
      }

      // Get customers for the selected segment
      const customers = await getCustomersBySegment(sql, campaignData.customerSegment);

      if (customers.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No customers found for selected segment' })
        };
      }

      // Create campaign record
      const campaign = await sql`
        INSERT INTO email_campaigns (
          name,
          subject,
          html_content,
          customer_segment,
          scheduled_time,
          status,
          created_by,
          created_at
        ) VALUES (
          ${campaignData.name},
          ${campaignData.subject},
          ${campaignData.htmlContent},
          ${campaignData.customerSegment},
          ${campaignData.scheduledTime || null},
          ${campaignData.scheduledTime ? 'scheduled' : 'sending'},
          ${authPayload.userId},
          NOW()
        )
        RETURNING id
      `;

      const campaignId = campaign[0].id;

      // If scheduled for later, just save and return
      if (campaignData.scheduledTime) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            campaignId,
            message: `Campaign scheduled for ${campaignData.scheduledTime}`,
            totalRecipients: customers.length
          })
        };
      }

      // Send emails immediately
      console.log(`📧 Sending campaign to ${customers.length} customers`);

      let totalSent = 0;
      let totalFailed = 0;

      // Send in batches to avoid rate limits
      const batchSize = 50;
      for (let i = 0; i < customers.length; i += batchSize) {
        const batch = customers.slice(i, i + batchSize);

        const emailPromises = batch.map(async (customer) => {
          try {
            const customerName = customer.first_name ?
              `${customer.first_name} ${customer.last_name || ''}`.trim() :
              'Valued Customer';

            const htmlContent = generatePromotionalEmailHTML(customerName, campaignData.htmlContent);

            const emailResult = await resend.emails.send({
              from: process.env.RESEND_FROM_EMAIL || 'noreply@favillaspizza.com',
              to: [customer.email],
              subject: campaignData.subject,
              html: htmlContent,
              tags: [
                { name: 'category', value: 'promotional_campaign' },
                { name: 'campaign_id', value: campaignId.toString() },
                { name: 'customer_segment', value: campaignData.customerSegment }
              ]
            });

            // Log successful send
            await sql`
              INSERT INTO email_logs (
                campaign_id,
                recipient_email,
                recipient_name,
                email_type,
                status,
                resend_id,
                sent_at
              ) VALUES (
                ${campaignId},
                ${customer.email},
                ${customerName},
                'promotional',
                'sent',
                ${emailResult.data?.id || null},
                NOW()
              )
            `;

            totalSent++;
            return { success: true, email: customer.email };
          } catch (error) {
            console.error(`❌ Email failed for ${customer.email}:`, error);

            // Log failed send
            await sql`
              INSERT INTO email_logs (
                campaign_id,
                recipient_email,
                recipient_name,
                email_type,
                status,
                error_message,
                sent_at
              ) VALUES (
                ${campaignId},
                ${customer.email},
                ${customer.first_name || 'Customer'},
                'promotional',
                'failed',
                ${error instanceof Error ? error.message : 'Unknown error'},
                NOW()
              )
            `;

            totalFailed++;
            return { success: false, email: customer.email, error };
          }
        });

        await Promise.all(emailPromises);

        // Small delay between batches
        if (i + batchSize < customers.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Update campaign with results
      await sql`
        UPDATE email_campaigns
        SET
          total_sent = ${totalSent},
          total_failed = ${totalFailed},
          sent_time = NOW(),
          status = 'sent'
        WHERE id = ${campaignId}
      `;

      console.log('✅ Email campaign completed:', {
        campaignId,
        totalSent,
        totalFailed,
        successRate: totalSent / (totalSent + totalFailed) * 100
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          campaignId,
          totalSent,
          totalFailed,
          successRate: Math.round(totalSent / (totalSent + totalFailed) * 100),
          message: `Campaign sent successfully to ${totalSent} customers`
        })
      };

    } else {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
      };
    }

  } catch (error: any) {
    console.error('❌ Email marketing API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};