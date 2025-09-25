import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export { resend };

// Email configuration
export const EMAIL_CONFIG = {
  from: 'Pizza Spin Rewards <noreply@pizzaspinrewards.com>', // You'll need to verify your domain
  replyTo: 'support@pizzaspinrewards.com'
};

// Email types for tracking
export enum EmailType {
  EMAIL_CONFIRMATION = 'email_confirmation',
  ORDER_CONFIRMATION = 'order_confirmation',
  MARKETING_CAMPAIGN = 'marketing_campaign',
  PASSWORD_RESET = 'password_reset'
}