interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  customizations?: string[];
}

interface OrderConfirmationData {
  customerName: string;
  orderNumber: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  deliveryAddress?: string;
  estimatedTime: string;
  paymentMethod: string;
}

export function getOrderConfirmationTemplate(data: OrderConfirmationData): string {
  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">
        ${item.name}
        ${item.customizations ? `<br><small style="color: #666;">${item.customizations.join(', ')}</small>` : ''}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${item.price.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - Pizza Spin Rewards</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #d73a31; margin-bottom: 10px;">🍕 Pizza Spin Rewards</h1>
    <h2 style="color: #333; margin: 0;">Order Confirmation</h2>
  </div>

  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <p>Hi <strong>${data.customerName}</strong>,</p>
    <p>Thank you for your order! We're preparing your delicious pizza order right now.</p>
    <p><strong>Order #${data.orderNumber}</strong></p>
    <p><strong>Estimated ready time:</strong> ${data.estimatedTime}</p>
  </div>

  <div style="margin-bottom: 20px;">
    <h3 style="color: #d73a31; border-bottom: 2px solid #d73a31; padding-bottom: 5px;">Order Details</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background: #f8f9fa;">
          <th style="padding: 10px; text-align: left; border-bottom: 1px solid #ddd;">Item</th>
          <th style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">Qty</th>
          <th style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="text-align: right; border-top: 2px solid #d73a31; padding-top: 10px;">
      <p><strong>Subtotal: $${data.subtotal.toFixed(2)}</strong></p>
      <p><strong>Tax: $${data.tax.toFixed(2)}</strong></p>
      <p style="font-size: 18px; color: #d73a31;"><strong>Total: $${data.total.toFixed(2)}</strong></p>
    </div>
  </div>

  ${data.deliveryAddress ? `
  <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <h4 style="color: #2d7c2d; margin-top: 0;">Delivery Address</h4>
    <p style="margin: 0;">${data.deliveryAddress}</p>
  </div>
  ` : ''}

  <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
    <h4 style="color: #856404; margin-top: 0;">Payment Method</h4>
    <p style="margin: 0;">${data.paymentMethod}</p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
    <p style="margin: 0; color: #666;">Questions about your order?</p>
    <p style="margin: 5px 0;"><strong>Call us:</strong> (555) 123-PIZZA</p>
    <p style="margin: 0;"><strong>Email:</strong> support@pizzaspinrewards.com</p>
  </div>

  <div style="text-align: center; margin-top: 20px; padding: 15px; color: #666; font-size: 12px;">
    <p>Thanks for choosing Pizza Spin Rewards!</p>
    <p>© 2025 Pizza Spin Rewards. All rights reserved.</p>
  </div>
</body>
</html>
  `;
}