import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-supabase-auth";
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
  Store,
  AlertCircle,
  UserPlus,
  RefreshCw
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
  const isCreatingOrder = useRef(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Initialize WebSocket for real-time updates
  useWebSocket();

  // Get order ID from URL params or payment intent
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orderIdParam = params.get('orderId');
    const paymentIntentParam = params.get('payment_intent');
    const paymentIntentClientSecretParam = params.get('payment_intent_client_secret');


    if (orderIdParam) {
      // Old flow: direct order ID
      setOrderId(parseInt(orderIdParam));

      // Clear pending order data from sessionStorage since payment was successful
      sessionStorage.removeItem('pendingOrderData');

      // Clear cart immediately for guest users when we have an order ID
      if (!user && !cartCleared) {
        clearCart();
        setCartCleared(true);
        toast({
          title: "Order Placed Successfully!",
          description: "Your order has been placed. Check your phone for updates.",
        });
      }
    } else if (paymentIntentParam) {
      // CRITICAL: Check if this payment intent has already been processed FIRST
      // This prevents duplicate orders even when useEffect re-runs due to auth state changes
      const processedKey = `processed_${paymentIntentParam}`;
      const alreadyProcessed = sessionStorage.getItem(processedKey);

      if (alreadyProcessed) {
        setIsLoading(false);
        return;
      }

      // Mark this payment intent as being processed immediately to prevent race conditions
      sessionStorage.setItem(processedKey, 'processing');

      // Get the pending order data from sessionStorage
      const pendingOrderDataStr = sessionStorage.getItem('pendingOrderData');
      if (pendingOrderDataStr) {
        try {
          const pendingOrderData = JSON.parse(pendingOrderDataStr);

          // Create the order now that payment has succeeded (only once)
          const createOrderAsync = async () => {
            try {
              // SIMPLIFIED: Quick auth check without blocking
              let fetchedUserData = user || null;

              // Only do one quick attempt to get auth info if not already available
              if (!fetchedUserData) {
                try {
                  const userResponse = await apiRequest('GET', '/api/user-profile');
                  const userData = await userResponse.json();
                  if (userData && userData.email) {
                    fetchedUserData = userData;
                  }
                } catch (userError) {
                  console.warn('Quick auth check failed, proceeding anyway:', userError);
                }
              }

              // Use customer name from pendingOrderData (already includes guest name or user name)
              // No need to fetch payment intent - speeds up page load significantly!
              const customerName = pendingOrderData.customerName || fetchedUserData?.firstName || 'Guest';
              console.log('📝 Using customer name from order data:', customerName);

              // Update order data to reflect successful payment (keep status as pending for kitchen display)
              const confirmedOrderData = {
                ...pendingOrderData,
                status: "pending",
                paymentStatus: "succeeded",
                customerName: customerName  // Already set from checkout form
              };

              const response = await apiRequest('POST', '/api/orders', confirmedOrderData);
              const createdOrder = await response.json();
              console.log('📦 ORDER CREATED - ShipDay Debug Info:', createdOrder.shipdayDebug);
              console.log('📦 FULL ORDER OBJECT:', createdOrder);
              setOrderId(createdOrder.id);
              setOrder(createdOrder);

              // Store order for guest users
              if (!user) {
                const guestOrderKey = `guestOrder_${createdOrder.id}`;
                localStorage.setItem(guestOrderKey, JSON.stringify(createdOrder));
              }

              // Clear pending order data only after successful creation
              sessionStorage.removeItem('pendingOrderData');
              // Mark payment intent as successfully processed (was marked as 'processing' earlier)
              sessionStorage.setItem(processedKey, 'true');

              // Clear cart immediately after successful order creation
              if (!cartCleared) {
                clearCart();
                setCartCleared(true);
              }

              // OPTIMIZED: Show UI immediately, don't wait for background operations
              setIsLoading(false);
              isCreatingOrder.current = false;

              toast({
                title: "Order Created Successfully!",
                description: `Order #${createdOrder.id} has been placed.`,
              });

              // OPTIMIZED: All background operations happen without blocking UI
              // Invalidate orders queries to trigger refresh in admin dashboard (background)
              queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
              queryClient.invalidateQueries({ queryKey: ['/api/kitchen/orders'] });

              // Award points in background without blocking UI
              if (user && createdOrder?.id) {
                apiRequest('POST', '/api/award-points-for-order', {
                  orderId: createdOrder.id
                }).then(response => response.json())
                  .then(pointsResult => {
                    if (pointsResult.success && !pointsResult.alreadyAwarded) {
                      toast({
                        title: "Points Earned!",
                        description: `You earned ${pointsResult.pointsAwarded} points for this order!`,
                      });
                      queryClient.invalidateQueries({ queryKey: ['/api/user-rewards'] });
                    }
                  })
                  .catch(pointsError => {
                    console.warn('Points award failed:', pointsError);
                  });
              }
            } catch (error) {
              console.error('💥 Error creating order:', error);
              // Reset the processing flag on error so user can retry
              sessionStorage.setItem(processedKey, 'error');
              setIsLoading(false);
              isCreatingOrder.current = false;
              toast({
                title: "Payment Successful",
                description: "Your payment was processed, but there was an issue creating your order. Please contact us.",
                variant: "destructive",
              });
            }
          };

          // Create the order - the sessionStorage check at the top of this effect prevents duplicates
          createOrderAsync();
        } catch (error) {
          console.error('❌ Error parsing pending order data:', error);
          setIsLoading(false);
        }
      } else {
        console.warn('⚠️ No pending order data found in sessionStorage');
        setIsLoading(false);
      }

      // Clear cart for successful payment
      if (!cartCleared) {
        clearCart();
        setCartCleared(true);
      }
    } else {
      // No order ID or payment intent, redirect to home
      console.warn('⚠️ No order ID or payment intent found, redirecting to home');
      navigate("/");
    }
  }, [navigate, user, cartCleared, clearCart, toast]);

  // Add timeout to prevent infinite loading and handle guest users
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading && orderId) {
        console.warn('Order details fetch timeout or guest user - showing success page');
        setIsLoading(false);

        if (!cartCleared) {
          clearCart();
          setCartCleared(true);
          toast({
            title: "Order Placed Successfully!",
            description: user
              ? "Your order has been placed. We couldn't load order details, but your order is being processed."
              : "Your order has been placed successfully! Check your phone for updates.",
          });
        }
      }
    }, user ? 3000 : 1500); // OPTIMIZED: Reduced timeout from 5s/2s to 3s/1.5s

    return () => clearTimeout(timeout);
  }, [isLoading, user, orderId, cartCleared, clearCart, toast]);

  // Fetch order details (only for authenticated users)
  const { data: orderData, isLoading: orderLoading, error: orderError } = useQuery({
    queryKey: [`/api/orders/${orderId}`],
    enabled: !!orderId && !!user,
    retry: 2, // Only retry twice
    retryDelay: 500, // OPTIMIZED: Reduced from 1000ms to 500ms between retries
    staleTime: 0, // Always fetch fresh data
  });

  // For guest users, try to get order details from localStorage
  useEffect(() => {
    if (!user && orderId && !order) {
      const guestOrderKey = `guestOrder_${orderId}`;
      const storedOrder = localStorage.getItem(guestOrderKey);
      if (storedOrder) {
        try {
          const parsedOrder = JSON.parse(storedOrder);
          setOrder(parsedOrder);
          setIsLoading(false);

          // Clean up old guest orders from localStorage (keep only last 5)
          const allKeys = Object.keys(localStorage);
          const guestOrderKeys = allKeys.filter(key => key.startsWith('guestOrder_'));
          if (guestOrderKeys.length > 5) {
            // Remove oldest guest orders
            guestOrderKeys.sort().slice(0, -5).forEach(key => {
              localStorage.removeItem(key);
            });
          }
        } catch (error) {
          console.error('Error parsing guest order from localStorage:', error);
        }
      }
    }
  }, [user, orderId, order]);

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

      // OPTIMIZED: Points already awarded during order creation flow
      // No need to duplicate here - removed to prevent double-awarding and improve performance
    } else if (orderError) {
      // If there's an error fetching order details, stop loading and show success page anyway
      console.warn('Failed to fetch order details:', orderError);
      setIsLoading(false);

      // Clear cart for authenticated users even if we can't fetch order details
      if (user && !cartCleared) {
        clearCart();
        setCartCleared(true);
        toast({
          title: "Order Placed Successfully!",
          description: "Your order has been placed. We couldn't load order details, but your order is being processed.",
        });
      }
    }
  }, [orderData, orderError, cartCleared, user, clearCart, toast]);

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

    // If we have ShipDay estimated delivery time, use that
    if (order.estimated_delivery_time) {
      const estimatedTime = new Date(order.estimated_delivery_time);
      return estimatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // If it's a scheduled order, show the scheduled time
    if (order.fulfillmentTime === "scheduled" && order.scheduledTime) {
      const scheduledDate = new Date(order.scheduledTime);
      return scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // For ASAP orders, calculate based on order time
    const now = new Date();
    if (!order.createdAt) return null;
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
      case "cooking": return "bg-orange-100 text-orange-800";
      case "processing": return "bg-blue-100 text-blue-800";
      case "ready": return "bg-green-100 text-green-800";
      case "completed": return "bg-green-100 text-green-800";
      case "picked_up": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getDisplayStatus = (status: string, shipdayStatus?: string) => {
    // Show "We hope you enjoy!" for picked up orders
    if (status === 'picked_up' || shipdayStatus === 'picked_up') {
      return 'We hope you enjoy!';
    }
    // Show "Delivered!" for delivered orders
    if (shipdayStatus === 'delivered') {
      return 'Delivered!';
    }

    // Map statuses to customer-friendly messages
    switch (status) {
      case 'pending': return 'Preparing';
      case 'cooking': return 'In the Oven';
      case 'completed': return "It's Ready!";
      case 'cancelled': return 'Cancelled';
      default: return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
    }
  };

  // Calculate points earned (1 point per dollar spent on final total)
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
Date: ${order?.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
Time: ${order?.createdAt ? new Date(order.createdAt).toLocaleTimeString() : 'N/A'}

Customer: ${user?.firstName} ${user?.lastName}
${order?.orderType === 'delivery' ? `Address: ${order?.address || user?.address}` : 'Pickup Order'}
${order?.phone || order?.userContactInfo?.phone || user?.phone ? `Phone: ${order?.phone || order?.userContactInfo?.phone || user.phone}` : 'Phone: Contact information not provided'}

Items:
${order?.items?.map((item: any) => 
  `${item.name} x${item.quantity} - ${formatCurrency(parseFloat(item.price || 0) * item.quantity)}`
).join('\n')}

Subtotal: ${(() => {
  let orderBreakdown = null;
  try {
    if (order?.addressData && typeof order.addressData === 'object') {
      orderBreakdown = order.addressData.orderBreakdown;
    } else if (order?.address_data && typeof order.address_data === 'object') {
      orderBreakdown = order.address_data.orderBreakdown;
    }
  } catch (e) {}
  const subtotal = orderBreakdown?.subtotal || parseFloat(order?.total || 0) - parseFloat(order?.tax || 0) - parseFloat(order?.tip || 0) - parseFloat(order?.deliveryFee || 0);
  return formatCurrency(subtotal);
})()}
${(() => {
  let orderBreakdown = null;
  try {
    if (order?.addressData && typeof order.addressData === 'object') {
      orderBreakdown = order.addressData.orderBreakdown;
    } else if (order?.address_data && typeof order.address_data === 'object') {
      orderBreakdown = order.address_data.orderBreakdown;
    }
  } catch (e) {}
  const promoDiscount = orderBreakdown?.discount || 0;
  const voucherDiscount = orderBreakdown?.voucherDiscount || 0;
  let discountLines = [];
  if (promoDiscount > 0) discountLines.push(`Promo Discount: -${formatCurrency(promoDiscount)}`);
  if (voucherDiscount > 0) discountLines.push(`Voucher Discount: -${formatCurrency(voucherDiscount)}`);
  return discountLines.join('\n');
})()}
Tax: ${formatCurrency(parseFloat(order?.tax || 0))}
${parseFloat(order?.deliveryFee || 0) > 0 ? `Delivery Fee: ${formatCurrency(parseFloat(order?.deliveryFee || 0))}` : ''}
${parseFloat(order?.tip || 0) > 0 ? `Tip: ${formatCurrency(parseFloat(order?.tip || 0))}` : ''}

Total: ${formatCurrency(parseFloat(order?.total || 0))}

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

  const handleRefreshOrder = async () => {
    setIsRefreshing(true);
    try {
      // Invalidate and refetch order data
      await queryClient.invalidateQueries({ queryKey: [`/api/orders/${orderId}`] });
      await queryClient.refetchQueries({ queryKey: [`/api/orders/${orderId}`] });

      toast({
        title: "Order Updated",
        description: "Your order status has been refreshed.",
      });
    } catch (error) {
      console.error("Error refreshing order:", error);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh order status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Show loading if main loading is true, order query is loading, or if we have a user and orderId but no order data yet (and no error)
  if (isLoading || orderLoading || (user && orderId && !order && !orderError)) {
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

  // Show order not found only if we're done loading and still have no order data for authenticated users
  // Guest users should see the success page even without order details
  // Also check if we actually have an orderId - if we don't have one yet, don't show not found
  if (!order && user && !isLoading && !orderLoading && orderId && orderError) {
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

      <main className="min-h-screen bg-gray-50 py-8 md:pt-[72px] pt-14">
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
                    <span>Order #{orderId}</span>
                    {order && order.status && (
                      <Badge className={getStatusColor(order.status)}>
                        {getDisplayStatus(order.status, order.shipday_status)}
                      </Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {order && order.createdAt ? (
                      `Placed on ${new Date(order.createdAt).toLocaleDateString()} at ${new Date(order.createdAt).toLocaleTimeString()}`
                    ) : (
                      "Your order has been placed successfully"
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {order ? (
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
                              {item.options && (
                                <p className="text-sm text-gray-500">
                                  {(() => {
                                    let options = item.options;

                                    // If options is a string, try to parse it as JSON
                                    if (typeof options === 'string') {
                                      try {
                                        // Handle potential double-encoding or character index issues
                                        if (options.startsWith('[') || options.startsWith('{')) {
                                          options = JSON.parse(options);
                                        } else {
                                          return null; // Don't display corrupted options
                                        }
                                      } catch (e) {
                                        console.warn('Failed to parse item options:', e.message);
                                        return null; // Don't display unparseable options
                                      }
                                    }

                                    // Handle array format (new system)
                                    if (Array.isArray(options)) {
                                      const validOptions = options.filter(opt => opt && (opt.itemName || opt.name));
                                      if (validOptions.length === 0) return null;

                                      return 'Add-ons: ' + validOptions.map(opt => {
                                        const name = opt.itemName || opt.name || 'Unknown';
                                        const price = opt.price ? ` (+$${parseFloat(opt.price).toFixed(2)})` : '';
                                        return `${name}${price}`;
                                      }).join(', ');
                                    }

                                    // Handle object format (fallback)
                                    if (options && typeof options === 'object') {
                                      const entries = Object.entries(options).filter(([key, value]) =>
                                        value !== null && value !== undefined && value !== ''
                                      );
                                      if (entries.length === 0) return null;

                                      return 'Add-ons: ' + entries.map(([key, value]) => `${key}: ${value}`).join(', ');
                                    }

                                    // If we get here, options is not in a recognizable format
                                    return null;
                                  })()}
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
                      {(() => {
                        // Parse order breakdown from address_data if available
                        let orderBreakdown = null;
                        try {
                          if (order.addressData && typeof order.addressData === 'object') {
                            orderBreakdown = order.addressData.orderBreakdown;
                          } else if (order.address_data) {
                            // Handle both object and string formats
                            let addressDataObj = order.address_data;
                            if (typeof order.address_data === 'string') {
                              addressDataObj = JSON.parse(order.address_data);
                            }
                            orderBreakdown = addressDataObj.orderBreakdown;
                          }
                        } catch (e) {
                          console.warn('Could not parse order breakdown:', e);
                        }

                        const subtotal = orderBreakdown?.subtotal || parseFloat(order.total || 0) - parseFloat(order.tax || 0) - parseFloat(order.tip || 0) - parseFloat(order.deliveryFee || 0);
                        const promoDiscount = orderBreakdown?.discount || 0;
                        const voucherDiscount = orderBreakdown?.voucherDiscount || 0;
                        const totalDiscount = promoDiscount + voucherDiscount;

                        return (
                          <>
                            <div className="flex justify-between">
                              <span>Subtotal</span>
                              <span>{formatCurrency(subtotal)}</span>
                            </div>
                            {promoDiscount > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>Promo Code Discount</span>
                                <span>-{formatCurrency(promoDiscount)}</span>
                              </div>
                            )}
                            {voucherDiscount > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>Voucher Discount</span>
                                <span>-{formatCurrency(voucherDiscount)}</span>
                              </div>
                            )}
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
                          </>
                        );
                      })()}
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>{formatCurrency(parseFloat(order.total || 0))}</span>
                      </div>
                      
                      {/* Points Earned - Only show for authenticated users */}
                      {user && (
                        <>
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
                        </>
                      )}
                    </div>
                  </div>
                  ) : (
                    // Guest user content
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Order Placed Successfully!</h3>
                      <p className="text-gray-600 mb-4">
                        Your order has been received and is being prepared.
                      </p>
                      <p className="text-sm text-gray-500">
                        You should receive updates via phone call or SMS at the number you provided.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Order Status Timeline - only for authenticated users */}
              {order && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle>Order Status</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefreshOrder}
                      disabled={isRefreshing}
                      className="h-8"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                      {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </Button>
                  </CardHeader>
                  <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">Order Confirmed</p>
                        <p className="text-sm text-gray-500">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString() : 'Order confirmed'}</p>
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
                        ['ready', 'completed'].includes(order.status) || ['picked_up', 'out_for_delivery', 'delivered'].includes(order.shipday_status)
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
                            ['ready', 'completed'].includes(order.status) || ['picked_up', 'out_for_delivery', 'delivered'].includes(order.shipday_status)
                              ? 'text-green-600'
                              : 'text-gray-400'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {order.orderType === 'pickup' ? 'Ready for Pickup' :
                           order.shipday_status === 'delivered' ? 'Delivered' :
                           order.shipday_status === 'out_for_delivery' ? 'Out for Delivery' :
                           order.shipday_status === 'picked_up' ? 'Picked Up by Driver' :
                           'Out for Delivery'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.shipday_status === 'delivered' ? 'Your order has been delivered!' :
                           order.shipday_status === 'out_for_delivery' ? 'Driver is on the way to you' :
                           order.shipday_status === 'picked_up' ? 'Driver has picked up your order' :
                           ['ready', 'completed'].includes(order.status)
                             ? 'Your order is ready!'
                             : 'Will be ready soon'}
                        </p>
                      </div>
                    </div>

                    {/* Additional delivery status if we have ShipDay info */}
                    {order.orderType === 'delivery' && order.shipday_status === 'delivered' && (
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-green-600">Order Delivered!</p>
                          <p className="text-sm text-gray-500">Your order has been successfully delivered</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            {user && order ? (
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
                    {order.estimated_delivery_time
                      ? "Live estimate from delivery service"
                      : order.fulfillmentTime === "scheduled"
                        ? `Scheduled for ${order.scheduledTime ? new Date(order.scheduledTime).toLocaleDateString() : 'scheduled time'}`
                        : order.orderType === 'pickup'
                          ? 'Your order will be ready for pickup'
                          : 'Your order will be delivered to your door'
                    }
                  </p>
                </CardContent>
              </Card>

              {/* ShipDay Delivery Tracking - only show for delivery orders with tracking */}
              {order.orderType === 'delivery' && (order.tracking_url || order.shipday_status) && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <CardTitle className="flex items-center text-blue-800">
                      <Truck className="h-5 w-5 mr-2" />
                      Live Delivery Tracking
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {order.shipday_status && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Delivery Status:</span>
                        <Badge className={`${
                          order.shipday_status === 'delivered' ? 'bg-green-100 text-green-800' :
                          order.shipday_status === 'out_for_delivery' ? 'bg-blue-100 text-blue-800' :
                          order.shipday_status === 'picked_up' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.shipday_status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Badge>
                      </div>
                    )}

                    {order.driver_location && (
                      <div className="text-sm text-blue-700">
                        <p className="font-medium">Driver Location Updated</p>
                        <p className="text-xs">{new Date().toLocaleTimeString()}</p>
                      </div>
                    )}

                    {order.tracking_url && (
                      <Button
                        variant="outline"
                        className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                        onClick={() => window.open(order.tracking_url, '_blank')}
                      >
                        <MapPin className="h-4 w-4 mr-2" />
                        Track Your Delivery Live
                      </Button>
                    )}

                    <p className="text-xs text-blue-600">
                      🚚 Your order is being handled by our delivery partner for real-time tracking
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      {order.phone || order.userContactInfo?.phone || user?.phone || 'Contact information not provided'}
                    </span>
                  </div>
                  {order.orderType === 'delivery' && (
                    <div className="flex items-start space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <span className="text-sm">
                        {order.address ||
                         (order.userContactInfo &&
                          `${order.userContactInfo.address}${order.userContactInfo.city ? `, ${order.userContactInfo.city}` : ''}${order.userContactInfo.state ? `, ${order.userContactInfo.state}` : ''}${order.userContactInfo.zip_code ? ` ${order.userContactInfo.zip_code}` : ''}`) ||
                         user?.address ||
                         'Address not provided'}
                      </span>
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
                    You earned points on this order! Use them to redeem rewards and get discounts on future orders.
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
            ) : user && !order ? (
              // Authenticated user but order loading
              <div className="space-y-6">
                <Card>
                  <CardContent className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading your points and order details...</p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Guest user sidebar
              <div className="space-y-6">
                {/* Missed Points Promotional Card */}
                <Card className="border-red-200 bg-red-50">
                  <CardHeader>
                    <CardTitle className="flex items-center text-red-800">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      You Could Have Earned Points!
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-red-600">
                        {(() => {
                          // Calculate points from order total
                          let orderTotal = 0;

                          if (order?.total) {
                            // If we have the order object, use its total
                            orderTotal = parseFloat(order.total);
                          } else {
                            // Try to get total from pending order data in sessionStorage
                            try {
                              const pendingOrderDataStr = sessionStorage.getItem('pendingOrderData');
                              if (pendingOrderDataStr) {
                                const pendingOrderData = JSON.parse(pendingOrderDataStr);
                                orderTotal = parseFloat(pendingOrderData.total || '0');
                              }
                            } catch (e) {
                              console.warn('Failed to parse pending order data for points calculation:', e);
                            }
                          }

                          return Math.floor(orderTotal || 0);
                        })()} Points
                      </p>
                      <p className="text-sm text-red-700 mb-3">
                        Sign up for an account and earn 1 point for every dollar spent!
                      </p>
                    </div>

                    <div className="space-y-2 text-sm text-red-700">
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4" />
                        <span>Earn points on every order</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Gift className="h-4 w-4" />
                        <span>Redeem for free food & discounts</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Pizza className="h-4 w-4" />
                        <span>Exclusive member-only deals</span>
                      </div>
                    </div>

                    <Button
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                      onClick={() => navigate("/auth?tab=register")}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Create Account & Start Earning
                    </Button>

                    <p className="text-xs text-red-600 text-center">
                      Join thousands of happy customers earning rewards!
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Phone className="h-5 w-5 mr-2" />
                      Need Help?
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-3">
                      If you have questions about your order, please call us:
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      (828) 225-2885
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Order ID: {orderId}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Continue Shopping</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full" 
                      onClick={() => navigate("/menu")}
                    >
                      Order Again
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </>
  );
};

export default OrderSuccessPage;


