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
  ORDER_CONFIRMATION = 'order_confirmation',
  ORDER_READY = 'order_ready',
  ORDER_PREPARING = 'order_preparing',
  ORDER_DELIVERED = 'order_delivered',
  MARKETING_CAMPAIGN = 'marketing_campaign',
  FLASH_SALE = 'flash_sale',
  NEW_MENU = 'new_menu',
  LOYALTY_REWARD = 'loyalty_reward'
}