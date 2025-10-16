import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export { resend };

// Email configuration
export const EMAIL_CONFIG = {
  from: 'Favillas NY Pizza <noreply@favillasnypizza.com>', // Change to your verified domain
  replyTo: 'info@favillasnypizza.com' // Change to your support email
};

// Email types for tracking
export enum EmailType {
  EMAIL_CONFIRMATION = 'email_confirmation',
  ORDER_CONFIRMATION = 'order_confirmation',
  MARKETING_CAMPAIGN = 'marketing_campaign',
  PASSWORD_RESET = 'password_reset'
}