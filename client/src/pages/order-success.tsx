import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import Footer from "@/components/layout/footer";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  Clock, 
  MapPin, 
  Phone, 
  Pizza, 
  Receipt, 
  Share2, 
  Download,
  Star,
  Gift,
  Truck,
  Store
} from "lucide-react";

const OrderSuccessPage = () => {
  const { user } = useAuth();
  const { clearCart } = useCart();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [orderId, setOrderId] = useState<number | null>(null);
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cartCleared, setCartCleared] = useState(false);
  
  // Initialize WebSocket for real-time updates
  useWebSocket();

  // Get order ID from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('orderId');
    if (id) {
      setOrderId(parseInt(id));
    } else {
      // If no order ID, redirect to home
      navigate("/");
    }
  }, [navigate]);

  // Fetch order details
  const { data: orderData, isLoading: orderLoading } = useQuery({
    queryKey: [`/api/orders/${orderId}`],
    enabled: !!orderId && !!user,
  });

  useEffect(() => {
    if (orderData) {
      setOrder(orderData);
      setIsLoading(false);
      
      // Only clear cart if the order is confirmed and we have order data and haven't cleared it yet
      // This ensures the cart is only cleared once after a successful order
      if (!cartCleared && orderData && typeof orderData === 'object' && 'status' in orderData && 'id' in orderData) {
        clearCart();
        setCartCleared(true);
      }
    }
  }, [orderData, cartCleared]); // Include cartCleared to prevent multiple clears

  // Listen for real-time order status updates
  useEffect(() => {
    const handleOrderStatusChange = (event: CustomEvent) => {
      const { orderId: updatedOrderId, status, order: updatedOrder } = event.detail;
      
      // Only update if this is the order we're currently viewing
      if (updatedOrderId === orderId) {
        setOrder(updatedOrder);
        
        // Invalidate the specific order query
        queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId] });
      }
    };

    window.addEventListener('orderStatusChanged', handleOrderStatusChange as EventListener);
    
    return () => {
      window.removeEventListener('orderStatusChanged', handleOrderStatusChange as EventListener);
    };
  }, [orderId, queryClient]);

  // Calculate estimated pickup/delivery time
  const getEstimatedTime = () => {
    if (!order) return null;
    
    // If it's a scheduled order, show the scheduled time
    if (order.fulfillmentTime === "scheduled" && order.scheduledTime) {
      const scheduledDate = new Date(order.scheduledTime);
      return scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // For ASAP orders, calculate based on order time
    const now = new Date();
    const orderTime = new Date(order.createdAt);
    
    if (order.orderType === 'pickup') {
      // Pickup: 15-25 minutes
      const pickupTime = new Date(orderTime.getTime() + (20 * 60 * 1000)); // 20 minutes
      return pickupTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      // Delivery: 30-45 minutes
      const deliveryTime = new Date(orderTime.getTime() + (37 * 60 * 1000)); // 37 minutes
      return deliveryTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return "$0.00";
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "processing": return "bg-blue-100 text-blue-800";
      case "ready": return "bg-green-100 text-green-800";
      case "completed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Calculate points earned (1 point per dollar spent)
  const getPointsEarned = () => {
    if (!order) return 0;
    const total = parseFloat(order.total || 0);
    return isNaN(total) ? 0 : Math.floor(total);
  };

  const handleDownloadReceipt = () => {
    // Create a simple receipt for download
    const receipt = `
Favilla's NY Pizza - Receipt
Order #${order?.id}
Date: ${new Date(order?.createdAt).toLocaleDateString()}
Time: ${new Date(order?.createdAt).toLocaleTimeString()}

Customer: ${user?.firstName} ${user?.lastName}
${order?.orderType === 'delivery' ? `Address: ${order?.address || user?.address}` : 'Pickup Order'}
${user?.phone ? `Phone: ${user.phone}` : ''}

Items:
${order?.items?.map((item: any) => 
  `${item.name} x${item.quantity} - ${formatCurrency(parseFloat(item.price || 0) * item.quantity)}`
).join('\n')}

Subtotal: ${formatCurrency(parseFloat(order?.total || 0))}
Tax: ${formatCurrency(parseFloat(order?.tax || 0))}
${parseFloat(order?.deliveryFee || 0) > 0 ? `Delivery Fee: ${formatCurrency(parseFloat(order?.deliveryFee || 0))}` : ''}
${parseFloat(order?.tip || 0) > 0 ? `Tip: ${formatCurrency(parseFloat(order?.tip || 0))}` : ''}

Total: ${formatCurrency(parseFloat(order?.total || 0) + parseFloat(order?.tax || 0) + parseFloat(order?.deliveryFee || 0) + parseFloat(order?.tip || 0))}

Payment Status: ${order?.paymentStatus}
Order Status: ${order?.status}

Thank you for choosing Favilla's NY Pizza!
    `.trim();

    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-${order?.id}-receipt.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Receipt Downloaded",
      description: "Your receipt has been downloaded successfully.",
    });
  };

  const handleShareOrder = () => {
    if (navigator.share) {
      navigator.share({
        title: `My Order from Favilla's NY Pizza`,
        text: `I just ordered from Favilla's NY Pizza! Order #${order?.id}`,
        url: window.location.href,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`I just ordered from Favilla's NY Pizza! Order #${order?.id}`);
      toast({
        title: "Order Shared",
        description: "Order details copied to clipboard!",
      });
    }
  };

  if (isLoading || orderLoading) {
    return (
      <>
        <Helmet>
          <title>Order Confirmation | Favilla's NY Pizza</title>
        </Helmet>
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your order details...</p>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Helmet>
          <title>Order Not Found | Favilla's NY Pizza</title>
        </Helmet>
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-6">We couldn't find the order you're looking for.</p>
            <Button onClick={() => navigate("/")}>Return to Home</Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Order Confirmation | Favilla's NY Pizza</title>
      </Helmet>
      
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
            <p className="text-gray-600">Thank you for your order. We're preparing it now.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Details */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Order #{order.id}</span>
                    <Badge className={getStatusColor(order.status)}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Placed on {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Order Items */}
                    <div>
                      <h3 className="font-semibold mb-3">Your Order</h3>
                      <div className="space-y-3">
                        {order.items?.map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium">{item.name}</p>
                              {item.specialInstructions && (
                                <p className="text-sm text-gray-500">Note: {item.specialInstructions}</p>
                              )}
                              {item.options && Object.keys(item.options).length > 0 && (
                                <p className="text-sm text-gray-500">
                                  {Object.entries(item.options).map(([key, value]) => `${key}: ${value}`).join(', ')}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-medium">x{item.quantity}</p>
                              <p className="text-gray-600">{formatCurrency(parseFloat(item.price || 0) * item.quantity)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Order Totals */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{formatCurrency(parseFloat(order.total || 0))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax</span>
                        <span>{formatCurrency(parseFloat(order.tax || 0))}</span>
                      </div>
                      {parseFloat(order.deliveryFee || 0) > 0 && (
                        <div className="flex justify-between">
                          <span>Delivery Fee</span>
                          <span>{formatCurrency(parseFloat(order.deliveryFee || 0))}</span>
                        </div>
                      )}
                      {parseFloat(order.tip || 0) > 0 && (
                        <div className="flex justify-between">
                          <span>Tip</span>
                          <span>{formatCurrency(parseFloat(order.tip || 0))}</span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{formatCurrency(parseFloat(order.total || 0) + parseFloat(order.tax || 0) + parseFloat(order.deliveryFee || 0) + parseFloat(order.tip || 0))}</span>
                      </div>
                      
                      {/* Points Earned */}
                      <Separator />
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Star className="h-5 w-5 text-green-600" />
                            <span className="font-semibold text-green-800">Points Earned</span>
                          </div>
                          <span className="text-lg font-bold text-green-600">+{getPointsEarned()} points</span>
                        </div>
                        <p className="text-sm text-green-700 mt-1">
                          You earned 1 point for every dollar spent! Use your points to redeem rewards.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Status Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Order Confirmed</p>
                        <p className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleTimeString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        ['processing', 'ready', 'completed'].includes(order.status) 
                          ? 'bg-blue-100' 
                          : 'bg-gray-100'
                      }`}>
                        <Pizza className={`h-4 w-4 ${
                          ['processing', 'ready', 'completed'].includes(order.status) 
                            ? 'text-blue-600' 
                            : 'text-gray-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Preparing Your Order</p>
                        <p className="text-sm text-gray-500">
                          {['processing', 'ready', 'completed'].includes(order.status) 
                            ? 'Your pizza is being prepared' 
                            : 'Will start soon'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        ['ready', 'completed'].includes(order.status) 
                          ? 'bg-green-100' 
                          : 'bg-gray-100'
                      }`}>
                        {order.orderType === 'pickup' ? (
                          <Store className={`h-4 w-4 ${
                            ['ready', 'completed'].includes(order.status) 
                              ? 'text-green-600' 
                              : 'text-gray-400'
                          }`} />
                        ) : (
                          <Truck className={`h-4 w-4 ${
                            ['ready', 'completed'].includes(order.status) 
                              ? 'text-green-600' 
                              : 'text-gray-400'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {order.orderType === 'pickup' ? 'Ready for Pickup' : 'Out for Delivery'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {['ready', 'completed'].includes(order.status) 
                            ? 'Your order is ready!' 
                            : 'Will be ready soon'}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Estimated Time */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    {order.fulfillmentTime === "scheduled" ? "Scheduled" : "Estimated"} {order.orderType === 'pickup' ? 'Pickup' : 'Delivery'} Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-gray-900">{getEstimatedTime()}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {order.fulfillmentTime === "scheduled" 
                      ? `Scheduled for ${new Date(order.scheduledTime).toLocaleDateString()}`
                      : order.orderType === 'pickup' 
                        ? 'Your order will be ready for pickup' 
                        : 'Your order will be delivered to your door'
                    }
                  </p>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{user?.phone || 'Not provided'}</span>
                  </div>
                  {order.orderType === 'delivery' && (
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <span className="text-sm">{order.address || user?.address || 'Address not provided'}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Order Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleDownloadReceipt}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Receipt
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleShareOrder}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Share Order
                  </Button>
                  
                  <Button 
                    className="w-full bg-[#d73a31] hover:bg-[#c73128]"
                    onClick={() => navigate("/menu")}
                  >
                    <Pizza className="h-4 w-4 mr-2" />
                    Order Again
                  </Button>
                </CardContent>
              </Card>

              {/* Rewards Reminder */}
              <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
                <CardHeader>
                  <CardTitle className="flex items-center text-yellow-800">
                    <Gift className="h-5 w-5 mr-2" />
                    Earn Rewards
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-yellow-700 mb-3">
                    Don't forget to spin the wheel for rewards after your order is completed!
                  </p>
                  <Button 
                    variant="outline" 
                    className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                    onClick={() => navigate("/rewards")}
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Go to Rewards
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </>
  );
};

export default OrderSuccessPage;


