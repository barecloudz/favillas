import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

export { resend };

// Email types for tracking
export enum EmailType {
  EMAIL_CONFIRMATION = 'email_confirmation',
  ORDER_CONFIRMATION = 'order_confirmation',
  MARKETING_CAMPAIGN = 'marketing_campaign',
  PASSWORD_RESET = 'password_reset'
}

// Email configuration by type
// Strategy: Use main domain for critical transactional emails, subdomain for marketing
export const EMAIL_CONFIG = {
  // Transactional emails - use main domain for maximum deliverability
  transactional: {
    from: 'Favillas Pizzeria <orders@favillaspizzeria.com>',
    replyTo: 'info@favillaspizzeria.com'
  },
  // Marketing emails - use subdomain to protect main domain reputation
  marketing: {
    from: 'Favillas Pizzeria <noreply@updates.favillaspizzeria.com>',
    replyTo: 'info@favillaspizzeria.com'
  },
  // Default fallback
  from: 'Favillas Pizzeria <noreply@favillaspizzeria.com>',
  replyTo: 'info@favillaspizzeria.com'
};

/**
 * Get the appropriate email configuration based on email type
 * @param type - The type of email being sent
 * @returns Email configuration object with from and replyTo addresses
 */
export function getEmailConfig(type: EmailType) {
  switch (type) {
    case EmailType.ORDER_CONFIRMATION:
    case EmailType.EMAIL_CONFIRMATION:
    case EmailType.PASSWORD_RESET:
      return EMAIL_CONFIG.transactional;

    case EmailType.MARKETING_CAMPAIGN:
      return EMAIL_CONFIG.marketing;

    default:
      return {
        from: EMAIL_CONFIG.from,
        replyTo: EMAIL_CONFIG.replyTo
      };
  }
}