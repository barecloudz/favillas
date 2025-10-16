import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export { resend };

// Email configuration
// Using subdomain for email sending to protect main domain reputation
export const EMAIL_CONFIG = {
  from: 'Favillas Pizzeria <noreply@updates.favillaspizzeria.com>',
  replyTo: 'info@favillaspizzeria.com' // Reply-to uses main domain
};

// Email types for tracking
export enum EmailType {
  EMAIL_CONFIRMATION = 'email_confirmation',
  ORDER_CONFIRMATION = 'order_confirmation',
  MARKETING_CAMPAIGN = 'marketing_campaign',
  PASSWORD_RESET = 'password_reset'
}