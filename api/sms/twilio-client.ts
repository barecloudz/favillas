import twilio from 'twilio';

// Initialize Twilio client
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export { client as twilioClient };

// SMS configuration
export const SMS_CONFIG = {
  from: process.env.TWILIO_PHONE_NUMBER, // Your Twilio phone number
};

// SMS types for tracking
export enum SMSType {
  MARKETING_CAMPAIGN = 'marketing_campaign',
  ORDER_READY = 'order_ready',
  FLASH_SALE = 'flash_sale',
  NEW_MENU = 'new_menu',
  LOYALTY_REWARD = 'loyalty_reward'
}