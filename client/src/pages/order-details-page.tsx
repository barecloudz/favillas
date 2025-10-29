import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-supabase-auth";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { useCart } from "@/hooks/use-cart";
import Footer from "@/components/layout/footer";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  CheckCircle,
  Clock,
  MapPin,
  Phone,
  Pizza,
  Truck,
  Store,
  Loader2,
  ArrowLeft,
  User,
  Calendar,
  DollarSign,
  Package,
  ChefHat,
  Star
} from "lucide-react";

const OrderDetailsPage = () => {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { addItem, toggleCart } = useCart();
  const [orderId, setOrderId] = useState<number | null>(null);

  // Initialize WebSocket for real-time updates
  useWebSocket();

  // Get order ID from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderIdParam = params.get('orderId');
    if (orderIdParam) {
      setOrderId(parseInt(orderIdParam));
    }
  }, []);

  // Fetch order details
  const { data: order, isLoading } = useQuery({
    queryKey: ["/api/orders", orderId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/orders/${orderId}`);
      return response.json();
    },
    enabled: !!orderId && !!user,
  });

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return "$0.00";
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getStatusColor = (status: string, shipdayStatus?: string) => {
    if (status === 'picked_up' || shipdayStatus === 'delivered' || shipdayStatus === 'picked_up') {
      return "bg-green-500";
    }
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "cooking": return "bg-orange-500";
      case "processing": return "bg-blue-500";
      case "ready": return "bg-green-500";
      case "completed": return "bg-green-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getDisplayStatus = (status: string, shipdayStatus?: string) => {
    if (status === 'picked_up' || shipdayStatus === 'picked_up') {
      return 'Picked Up - Enjoy!';
    }
    if (shipdayStatus === 'delivered') {
      return 'Delivered - Enjoy!';
    }
    switch (status) {
      case 'pending': return 'Order Received';
      case 'cooking': return 'In the Oven';
      case 'processing': return 'Being Prepared';
      case 'ready': return "Ready for Pickup!";
      case 'completed': return "Order Complete";
      case 'cancelled': return 'Cancelled';
      default: return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
    }
  };

  const handleReorder = () => {
    if (!order?.items) return;

    order.items.forEach((item: any) => {
      addItem({
        id: item.menuItemId || item.menu_item_id,
        name: item?.name || 'Unknown Item',
        price: item.price,
        quantity: item.quantity,
        options: item.options,
        specialInstructions: item.specialInstructions || item.special_instructions
      });
    });

    toast({
      title: "Order Added to Cart",
      description: `Added ${order.items.length} items to your cart.`,
    });

    toggleCart();
  };

  if (!user) {
    return (
      <>
        <Helmet>
          <title>Order Details | Favilla's NY Pizza</title>
        </Helmet>
        <main className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Log In</h1>
            <p className="text-gray-600 mb-6">You need to be logged in to view order details.</p>
            <Button onClick={() => navigate("/auth")} className="bg-[#d73a31] hover:bg-[#c73128]">
              Log In
            </Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>Order Details | Favilla's NY Pizza</title>
        </Helmet>
        <main className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[#d73a31] mx-auto mb-4" />
            <p className="text-gray-600">Loading order details...</p>
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
        <main className="min-h-screen bg-gray-50 flex items-center justify-center py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
            <p className="text-gray-600 mb-6">We couldn't find the order you're looking for.</p>
            <Button onClick={() => navigate("/orders")} className="bg-[#d73a31] hover:bg-[#c73128]">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const totalAmount = (order.total || 0) + (order.tax || 0) + (order.deliveryFee || 0) + (order.tip || 0);

  return (
    <>
      <Helmet>
        <title>Order #{orderId} Details | Favilla's NY Pizza</title>
      </Helmet>

      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 lg:pt-24 pt-16">
        <div className="max-w-5xl mx-auto px-4">
          {/* Back Button */}
          <Button
            variant="ghost"
            onClick={() => navigate("/orders")}
            className="mb-6 hover:bg-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to My Orders
          </Button>

          {/* Status Hero Card */}
          <Card className="mb-6 overflow-hidden border-none shadow-2xl">
            <div className={`${getStatusColor(order.status, order.shipday_status)} p-8 text-white`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                      {order.orderType === 'pickup' ? (
                        <Store className="h-6 w-6" />
                      ) : (
                        <Truck className="h-6 w-6" />
                      )}
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold">Order #{orderId}</h1>
                      <p className="text-white/90 text-lg">
                        {getDisplayStatus(order.status, order.shipday_status)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-6 mt-4 text-white/90">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>{new Date(order.createdAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{new Date(order.createdAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="bg-white/20 backdrop-blur-sm px-6 py-4 rounded-2xl">
                    <p className="text-white/80 text-sm mb-1">Total</p>
                    <p className="text-4xl font-bold">{formatCurrency(totalAmount)}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Items */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="border-none shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Your Items</h2>
                    <Badge variant="outline" className="text-sm">
                      {order.items?.length || 0} items
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {order.items?.map((item: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-start space-x-4 p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow"
                      >
                        <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-[#d73a31] to-[#ff6b35] rounded-lg flex items-center justify-center">
                          <Pizza className="h-8 w-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg">{item?.name || 'Unknown Item'}</h3>
                          {item.options && Array.isArray(item.options) && item.options.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {item.options.map((option: any, optIndex: number) => (
                                <p key={optIndex} className="text-sm text-gray-600">
                                  • {option.itemName || option.name}
                                  {option.price > 0 && ` (+${formatCurrency(option.price)})`}
                                </p>
                              ))}
                            </div>
                          )}
                          {item.specialInstructions && (
                            <p className="text-sm text-gray-500 mt-2 italic">
                              Note: {item.specialInstructions}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500 mb-1">Qty: {item.quantity}</p>
                          <p className="text-lg font-bold text-gray-900">
                            {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-6" />

                  {/* Order Summary */}
                  <div className="space-y-3">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span className="font-medium">{formatCurrency(order.total)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Tax</span>
                      <span className="font-medium">{formatCurrency(order.tax)}</span>
                    </div>
                    {order.deliveryFee > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Delivery Fee</span>
                        <span className="font-medium">{formatCurrency(order.deliveryFee)}</span>
                      </div>
                    )}
                    {order.tip > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Tip</span>
                        <span className="font-medium">{formatCurrency(order.tip)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between text-xl font-bold text-gray-900">
                      <span>Total</span>
                      <span>{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Reorder Button */}
              {(order.status === 'completed' ||
                order.status === 'picked_up' ||
                order.shipday_status === 'delivered' ||
                order.shipday_status === 'picked_up') && (
                <Button
                  onClick={handleReorder}
                  className="w-full bg-gradient-to-r from-[#d73a31] to-[#ff6b35] hover:from-[#c73128] hover:to-[#e55f2d] text-white py-6 text-lg font-bold shadow-xl"
                  size="lg"
                >
                  <Pizza className="h-5 w-5 mr-2" />
                  Order Again
                </Button>
              )}
            </div>

            {/* Order Info Sidebar */}
            <div className="space-y-6">
              {/* Delivery/Pickup Info */}
              <Card className="border-none shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    {order.orderType === 'pickup' ? (
                      <div className="p-3 bg-blue-100 rounded-full mr-3">
                        <Store className="h-6 w-6 text-blue-600" />
                      </div>
                    ) : (
                      <div className="p-3 bg-green-100 rounded-full mr-3">
                        <Truck className="h-6 w-6 text-green-600" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {order.orderType === 'pickup' ? 'Pickup' : 'Delivery'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {order.orderType === 'pickup' ? 'In-store pickup' : 'Delivered to you'}
                      </p>
                    </div>
                  </div>

                  {order.orderType === 'delivery' && order.deliveryAddress && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-gray-600 mr-2 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-700">
                          {order.deliveryAddress}
                        </div>
                      </div>
                    </div>
                  )}

                  {order.orderType === 'pickup' && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 text-gray-600 mr-2 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-gray-700">
                          5 Regent Park Blvd<br />
                          Asheville, NC 28806
                        </div>
                      </div>
                    </div>
                  )}

                  {order.customerPhone && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 text-gray-600 mr-2" />
                        <span className="text-sm text-gray-700">{order.customerPhone}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contact */}
              <Card className="border-none shadow-xl bg-gradient-to-br from-[#d73a31] to-[#ff6b35] text-white">
                <CardContent className="p-6">
                  <h3 className="font-bold text-lg mb-4">Need Help?</h3>
                  <p className="text-white/90 text-sm mb-4">
                    Questions about your order? We're here to help!
                  </p>
                  <Button
                    variant="secondary"
                    className="w-full bg-white text-[#d73a31] hover:bg-gray-100 font-bold"
                    onClick={() => window.location.href = 'tel:+18282252885'}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call (828) 225-2885
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

export default OrderDetailsPage;
