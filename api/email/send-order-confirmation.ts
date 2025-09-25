import type { VercelRequest, VercelResponse } from '@vercel/node';
import { resend, EMAIL_CONFIG, EmailType } from './resend-client';
import { getOrderConfirmationTemplate } from './templates/order-confirmation';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { customerEmail, customerName, orderData } = req.body;

    if (!customerEmail || !customerName || !orderData) {
      return res.status(400).json({
        error: 'Missing required fields: customerEmail, customerName, orderData'
      });
    }

    const htmlTemplate = getOrderConfirmationTemplate({
      customerName,
      orderNumber: orderData.orderNumber,
      items: orderData.items,
      subtotal: orderData.subtotal,
      tax: orderData.tax,
      total: orderData.total,
      deliveryAddress: orderData.deliveryAddress,
      estimatedTime: orderData.estimatedTime,
      paymentMethod: orderData.paymentMethod
    });

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [customerEmail],
      subject: `Order Confirmation - #${orderData.orderNumber} | Pizza Spin Rewards`,
      html: htmlTemplate,
      replyTo: EMAIL_CONFIG.replyTo,
      tags: [
        { name: 'type', value: EmailType.ORDER_CONFIRMATION },
        { name: 'order_id', value: orderData.orderNumber }
      ]
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email', details: error });
    }

    console.log('Order confirmation email sent:', data?.id);
    return res.status(200).json({
      success: true,
      emailId: data?.id,
      message: 'Order confirmation email sent successfully'
    });

  } catch (error) {
    console.error('Order confirmation email error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}