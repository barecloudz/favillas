# Email Marketing Setup

## Database Tables Required

The Email Marketing feature requires two tables in your Supabase database:

### 1. email_campaigns Table

```sql
CREATE TABLE IF NOT EXISTS email_campaigns (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  html_content TEXT NOT NULL,
  customer_segment VARCHAR(100) NOT NULL,
  scheduled_time TIMESTAMP,
  sent_time TIMESTAMP,
  total_sent INTEGER DEFAULT 0,
  total_delivered INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_clicked INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_email_campaigns_status ON email_campaigns(status);
CREATE INDEX idx_email_campaigns_created_at ON email_campaigns(created_at DESC);
CREATE INDEX idx_email_campaigns_customer_segment ON email_campaigns(customer_segment);
```

### 2. email_logs Table

```sql
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  campaign_id INTEGER REFERENCES email_campaigns(id) ON DELETE CASCADE,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_name VARCHAR(255),
  email_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  resend_id VARCHAR(255),
  error_message TEXT,
  sent_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  opened_at TIMESTAMP,
  clicked_at TIMESTAMP
);

CREATE INDEX idx_email_logs_campaign_id ON email_logs(campaign_id);
CREATE INDEX idx_email_logs_recipient_email ON email_logs(recipient_email);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_sent_at ON email_logs(sent_at DESC);
```

### 3. Add marketing_opt_in to users Table (if not exists)

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_users_marketing_opt_in ON users(marketing_opt_in);
```

## Setup Instructions

1. Open your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy and paste the SQL commands above
4. Run the SQL to create the tables and indexes

## Environment Variables Required

Make sure these environment variables are set in your Netlify deployment:

- `RESEND_API_KEY` - Your Resend API key for sending emails
- `RESEND_FROM_EMAIL` - The email address to send from (e.g., noreply@favillaspizza.com)
- `DATABASE_URL` - Your Supabase/PostgreSQL connection string
- `JWT_SECRET` or `SESSION_SECRET` - For admin authentication
- `SITE_URL` - Your site URL (e.g., https://favillasnypizza.netlify.app)
- `RESTAURANT_ADDRESS` - Your restaurant address for email footer
- `RESTAURANT_PHONE` - Your restaurant phone for email footer

## Features

The Email Marketing tab provides:

- **Pre-built Templates**: 5 professional email templates (Weekly Special, Birthday Offer, Loyalty Reward, New Menu, Win-Back)
- **Customer Segmentation**: Target specific customer groups
  - All Customers (with marketing opt-in)
  - Loyalty Members (users with points)
  - New Customers (joined in last 30 days)
  - Recent Orders (ordered in last 30 days)
  - Birthday This Month
- **Test Mode**: Send test emails before launching to all customers
- **Campaign Scheduling**: Schedule emails for future delivery
- **Campaign Analytics**: Track sent, delivered, opened, and clicked metrics
- **Campaign History**: View all past campaigns and their performance

## API Endpoints

- `GET /api/admin/email-marketing` - Get campaigns, templates, and segment counts
- `GET /api/admin/email-marketing/templates` - Get email templates only
- `POST /api/admin/email-marketing` - Create and send a campaign

## Security

- Only admin and manager roles can access email marketing features
- Campaigns are logged with the admin who created them
- All email sends are logged for tracking and compliance
- Respects customer marketing opt-in preferences
