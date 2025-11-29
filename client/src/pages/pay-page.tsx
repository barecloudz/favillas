import { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { apiRequest } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function PayPage() {
  const [, params] = useRoute('/pay/:token');
  const token = params?.token;
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrderAndPay = async () => {
      if (!token) {
        setError('Invalid payment link');
        setLoading(false);
        return;
      }

      try {
        // Fetch order details by token
        const response = await apiRequest('GET', `/api/get-order-by-token?token=${token}`);

        if (!response.ok) {
          const errorData = await response.json();

          if (errorData.expired) {
            setError('This payment link has expired. Please contact the restaurant.');
          } else if (errorData.alreadyPaid) {
            setError('This order has already been paid. Thank you!');
          } else {
            setError(errorData.error || 'Failed to load order');
          }
          setLoading(false);
          return;
        }

        const data = await response.json();
        const order = data.order;

        // Store order data in sessionStorage for checkout
        sessionStorage.setItem('phoneOrderPayment', JSON.stringify({
          orderId: order.id,
          items: order.items,
          total: parseFloat(order.total),
          tax: parseFloat(order.tax),
          deliveryFee: parseFloat(order.deliveryFee || 0),
          serviceFee: parseFloat(order.serviceFee || 0),
          phone: order.phone,
          customerName: order.customerName,
          address: order.address,
          addressData: order.addressData,
          orderType: order.orderType,
          specialInstructions: order.specialInstructions,
          paymentToken: token
        }));

        // Redirect to checkout page
        setLocation('/checkout?source=phone_order');

      } catch (err: any) {
        console.error('Error fetching order:', err);
        setError('Failed to load order. Please try again.');
        setLoading(false);
      }
    };

    fetchOrderAndPay();
  }, [token, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-orange-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading your order...</h2>
          <p className="text-gray-600">Please wait while we prepare your checkout</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Link Issue</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <div className="text-sm text-gray-600">
            <p className="mb-2">Need help?</p>
            <p className="font-semibold">Call us at (803) 977-4285</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
