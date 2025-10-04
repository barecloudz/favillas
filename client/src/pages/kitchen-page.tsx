import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-supabase-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { setupWebSocket, sendMessage } from "@/lib/websocket";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, Printer, Volume2 } from "lucide-react";

const KitchenPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice) || numPrice === null || numPrice === undefined) {
      return "0.00";
    }
    return numPrice.toFixed(2);
  };

  // Query for active orders
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ["/api/kitchen/orders"],
    refetchInterval: 30000, // Refetch every 30 seconds
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Setup WebSocket for real-time order updates
  useEffect(() => {
    const socket = setupWebSocket();

    // Register as kitchen client
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({
        type: 'register',
        client: 'kitchen'
      }));
    });

    // Handle incoming messages
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'newOrder') {
          // Play notification sound
          if (audioRef.current) {
            audioRef.current.play();
          }

          // Show toast notification
          toast({
            title: "New Order Received",
            description: `Order #${data.order.id} has been placed.`,
          });

          // Refresh orders list
          queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });
        } else if (data.type === 'orderStatusUpdate' || data.type === 'paymentCompleted') {
          // Refresh orders list
          queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    return () => {
      socket.close();
    };
  }, [toast]);

  // Helper function to check if order is ready to start (for scheduled orders)
  const isOrderReadyToStart = (order: any) => {
    if (order.fulfillmentTime !== 'scheduled' || !order.scheduledTime) {
      return true; // ASAP orders are always ready
    }

    const scheduledTime = new Date(order.scheduledTime);
    const now = new Date();
    const minutesUntilScheduled = (scheduledTime.getTime() - now.getTime()) / (1000 * 60);

    // Allow starting 30 minutes before scheduled time
    return minutesUntilScheduled <= 30;
  };

  // Filter orders based on active tab
  const filteredOrders = orders ? orders.filter((order: any) => {
    if (activeTab === "pending") {
      // Show only orders ready to start (ASAP or scheduled orders within 30 minutes)
      return order.status === "pending" && (
        order.fulfillmentTime === 'asap' || isOrderReadyToStart(order)
      );
    }
    if (activeTab === "cooking") return order.status === "cooking";
    if (activeTab === "completed") return order.status === "completed";
    if (activeTab === "picked_up") return order.status === "picked_up";
    if (activeTab === "scheduled") {
      // Show only scheduled orders that are not ready to start yet
      return order.status === "pending" &&
             order.fulfillmentTime === 'scheduled' &&
             !isOrderReadyToStart(order);
    }
    return true;
  }) : [];

  // Separate pending orders into ready-to-start and scheduled-for-later
  const pendingOrders = orders ? orders.filter((order: any) => {
    return order.status === "pending" && (
      order.fulfillmentTime === 'asap' ||
      isOrderReadyToStart(order)
    );
  }) : [];

  const scheduledLaterOrders = orders ? orders.filter((order: any) => {
    return order.status === "pending" &&
           order.fulfillmentTime === 'scheduled' &&
           !isOrderReadyToStart(order);
  }) : [];

  // Update order status
  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      await apiRequest("PATCH", `/api/orders/${orderId}`, { status });
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });

      // Send WebSocket message to update customer display immediately
      sendMessage({
        type: 'orderStatusUpdate',
        orderId,
        status,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Order Updated",
        description: `Order #${orderId} has been marked as ${status}.`,
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Print order receipt
  const printOrder = (order: any) => {
    // In a real implementation, this would connect to the thermal printer
    toast({
      title: "Printing Order",
      description: `Sending order #${order.id} to printer...`,
    });

    // For demo purposes, open a print dialog with order details
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Order #${order.id} Receipt</title>
            <style>
              body { font-family: 'Courier New', monospace; margin: 0; padding: 20px; }
              h1, h2 { text-align: center; }
              .item { margin-bottom: 10px; }
              .total { margin-top: 20px; font-weight: bold; text-align: right; }
              .divider { border-top: 1px dashed #000; margin: 10px 0; }
            </style>
          </head>
          <body>
            <h1>Favilla's NY Pizza</h1>
            <h2>Order #${order.id}</h2>
            <p>Date: ${new Date(order.created_at).toLocaleString()}</p>
            <p>Type: ${order.order_type.toUpperCase()}</p>
            <p>Status: ${order.status.toUpperCase()}</p>
            <p>Payment: ${order.payment_status.toUpperCase()}</p>
            <p>Phone: ${order.phone}</p>
            ${order.address ? `<p>Delivery Address: ${order.address}</p>` : ''}
            ${order.specialInstructions ? `<p>Special Instructions: ${order.specialInstructions}</p>` : ''}
            <div class="divider"></div>
            ${order.items.map((item: any) => {
              let optionsHtml = '';

              // Handle new choice system format
              if (item.options && Array.isArray(item.options)) {
                optionsHtml = item.options.map((option: any) =>
                  `<p style="margin-left: 20px; color: #666;">${option.groupName}: ${option.itemName}${option.price > 0 ? ` (+$${option.price.toFixed(2)})` : ''}</p>`
                ).join('');
              } else if (item.options && typeof item.options === 'object') {
                // Handle legacy format
                const opts = [];
                if (item.options.size) opts.push(`<p style="margin-left: 20px; color: #666;">Size: ${item.options.size}</p>`);
                if (item.options.toppings && item.options.toppings.length > 0) {
                  opts.push(`<p style="margin-left: 20px; color: #666;">Toppings: ${item.options.toppings.join(', ')}</p>`);
                }
                if (item.options.addOns && item.options.addOns.length > 0) {
                  opts.push(`<p style="margin-left: 20px; color: #666;">Add-ons: ${item.options.addOns.join(', ')}</p>`);
                }
                if (item.options.extras && item.options.extras.length > 0) {
                  opts.push(`<p style="margin-left: 20px; color: #666;">Extras: ${item.options.extras.join(', ')}</p>`);
                }
                optionsHtml = opts.join('');
              }

              return `
                <div class="item">
                  <p><strong>${item.quantity}x ${item.menuItem?.name || 'Unknown Item'} - $${formatPrice(item.price)}</strong></p>
                  ${optionsHtml}
                  ${item.specialInstructions ? `<p style="margin-left: 20px; color: #d73a31; font-weight: bold;">*** SPECIAL: ${item.specialInstructions.toUpperCase()} ***</p>` : ''}
                </div>
              `;
            }).join('')}
            <div class="divider"></div>
            <div class="total">
              <p>Subtotal: $${formatPrice(order.total)}</p>
              <p>Tax: $${formatPrice(order.tax)}</p>
              <p>Total: $${formatPrice(Number(order.total) + Number(order.tax))}</p>
            </div>
            <div class="divider"></div>
            <p style="text-align: center;">Thank you for your order!</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-red-500 mb-4">Error Loading Orders</h1>
        <p className="mb-6 text-center">There was a problem loading the kitchen orders. Please try again.</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] })}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Kitchen Display | Favilla's NY Pizza</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Notification sound */}
      <audio ref={audioRef} src="https://assets.mixkit.co/sfx/preview/mixkit-bell-notification-933.mp3" />

      <div className="min-h-screen bg-gray-50 p-2 md:p-4">
        {/* Compact Header Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 md:mb-4 bg-white rounded-lg shadow-sm p-2 md:p-3 gap-2 sm:gap-0">
          <h1 className="text-lg md:text-xl font-bold text-gray-800">🍕 Kitchen Display</h1>
          <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs md:text-sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] })}
            >
              🔄 Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs md:text-sm"
              onClick={() => {
                if (audioRef.current) {
                  audioRef.current.play();
                }
              }}
            >
              🔊 Test
            </Button>
            <span className="text-xs md:text-sm text-gray-600 hidden sm:inline">Welcome, {user?.firstName}</span>
          </div>
        </div>

        {/* Responsive Layout: 1 column on iPad, 2 columns on larger screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 lg:h-[calc(100vh-120px)]">

          {/* LEFT COLUMN: Ready to Start & Cooking */}
          <div className="space-y-4">
            {/* Ready to Start Section */}
            <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 flex-1 lg:max-h-[48%] overflow-y-auto">
              <h2 className="text-base md:text-lg font-bold text-yellow-600 mb-3 flex items-center">
                📋 Ready to Start
                {pendingOrders.length > 0 && (
                  <Badge className="ml-2 bg-yellow-500">{pendingOrders.length}</Badge>
                )}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pendingOrders.map((order: any) => (
                  <Card key={order.id} className="border-l-4 border-yellow-400">
                    <CardContent className="p-2 md:p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">#{order.id}</h3>
                        <Badge variant={order.order_type === 'delivery' ? 'default' : 'secondary'}>
                          {order.order_type === 'delivery' ? '🚗' : '📦'} {order.order_type}
                        </Badge>
                      </div>

                      <p className="font-medium text-gray-800 mb-1">
                        👤 {order.customer_name || 'Customer'}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">📞 {order.phone}</p>

                      <div className="text-sm space-y-1 mb-3">
                        {order.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="font-medium">${formatPrice(item.price)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex justify-between font-bold text-sm mb-3">
                        <span>Total:</span>
                        <span>${formatPrice(Number(order.total) + Number(order.tax))}</span>
                      </div>

                      <Button
                        className={`w-full h-10 text-sm font-medium text-white ${
                          isOrderReadyToStart(order)
                            ? "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700"
                            : "bg-gray-400 cursor-not-allowed"
                        }`}
                        onClick={() => {
                          console.log('🍳 Start Cooking clicked for order:', order.id);
                          if (isOrderReadyToStart(order)) {
                            updateOrderStatus(order.id, 'cooking');
                          }
                        }}
                        disabled={!isOrderReadyToStart(order)}
                      >
                        {isOrderReadyToStart(order) ? "🍳 Start Cooking" : "📅 Scheduled"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {pendingOrders.length === 0 && (
                <p className="text-center text-gray-500 py-8">No orders ready to start</p>
              )}
            </div>

            {/* Cooking Section */}
            <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 flex-1 lg:max-h-[48%] overflow-y-auto">
              <h2 className="text-base md:text-lg font-bold text-orange-600 mb-3 flex items-center">
                🍳 Cooking
                {orders?.filter((o: any) => o.status === "cooking").length > 0 && (
                  <Badge className="ml-2 bg-orange-500">{orders.filter((o: any) => o.status === "cooking").length}</Badge>
                )}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {orders?.filter((o: any) => o.status === "cooking").map((order: any) => (
                  <Card key={order.id} className="border-l-4 border-orange-400">
                    <CardContent className="p-2 md:p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">#{order.id}</h3>
                        <Badge variant={order.order_type === 'delivery' ? 'default' : 'secondary'}>
                          {order.order_type === 'delivery' ? '🚗' : '📦'} {order.order_type}
                        </Badge>
                      </div>

                      <p className="font-medium text-gray-800 mb-1">
                        👤 {order.customer_name || 'Customer'}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">📞 {order.phone}</p>

                      <div className="text-sm space-y-1 mb-3">
                        {order.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="font-medium">${formatPrice(item.price)}</span>
                          </div>
                        ))}
                      </div>

                      <Button
                        className="w-full h-10 text-sm font-medium text-white bg-green-500 hover:bg-green-600 active:bg-green-700"
                        onClick={() => {
                          console.log('✅ Complete clicked for order:', order.id);
                          updateOrderStatus(order.id, 'completed');
                        }}
                      >
                        ✅ Complete
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {orders?.filter((o: any) => o.status === "cooking").length === 0 && (
                <p className="text-center text-gray-500 py-8">No orders currently cooking</p>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Ready for Pickup & Completed */}
          <div className="space-y-4">
            {/* Ready for Pickup Section */}
            <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 flex-1 lg:max-h-[48%] overflow-y-auto">
              <h2 className="text-base md:text-lg font-bold text-green-600 mb-3 flex items-center">
                📦 Ready for Pickup
                {orders?.filter((o: any) => o.status === "completed").length > 0 && (
                  <Badge className="ml-2 bg-green-500">{orders.filter((o: any) => o.status === "completed").length}</Badge>
                )}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {orders?.filter((o: any) => o.status === "completed").map((order: any) => (
                  <Card key={order.id} className="border-l-4 border-green-400">
                    <CardContent className="p-2 md:p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">#{order.id}</h3>
                        <Badge variant={order.order_type === 'delivery' ? 'default' : 'secondary'}>
                          {order.order_type === 'delivery' ? '🚗' : '📦'} {order.order_type}
                        </Badge>
                      </div>

                      <p className="font-medium text-gray-800 mb-1">
                        👤 {order.customer_name || 'Customer'}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">📞 {order.phone}</p>

                      <div className="text-sm space-y-1 mb-3">
                        {order.items.map((item: any, idx: number) => (
                          <div key={idx} className="flex justify-between">
                            <span>{item.quantity}x {item.name}</span>
                            <span className="font-medium">${formatPrice(item.price)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          className="flex-1 h-9 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600"
                          onClick={() => {
                            console.log('📦 Picked Up clicked for order:', order.id);
                            updateOrderStatus(order.id, 'picked_up');
                          }}
                        >
                          ✅ Picked Up
                        </Button>
                        <Button
                          className="flex-1 h-9 text-sm font-medium"
                          variant="outline"
                          onClick={() => printOrder(order)}
                        >
                          🖨️
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {orders?.filter((o: any) => o.status === "completed").length === 0 && (
                <p className="text-center text-gray-500 py-8">No orders ready for pickup</p>
              )}
            </div>

            {/* Recently Picked Up Section */}
            <div className="bg-white rounded-lg shadow-sm p-3 md:p-4 flex-1 lg:max-h-[48%] overflow-y-auto">
              <h2 className="text-base md:text-lg font-bold text-gray-600 mb-3 flex items-center">
                ✅ Recently Picked Up
                {orders?.filter((o: any) => o.status === 'picked_up').length > 0 && (
                  <Badge className="ml-2 bg-gray-500">{orders.filter((o: any) => o.status === 'picked_up').length}</Badge>
                )}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {orders?.filter((o: any) => o.status === 'picked_up').slice(0, 8).map((order: any) => (
                  <Card key={order.id} className="border-l-4 border-gray-400 opacity-75">
                    <CardContent className="p-2 md:p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg">#{order.id}</h3>
                        <Badge variant="secondary">
                          {order.order_type === 'delivery' ? '🚗' : '📦'} {order.order_type}
                        </Badge>
                      </div>

                      <p className="font-medium text-gray-600 mb-1">
                        👤 {order.customer_name || 'Customer'}
                      </p>
                      <p className="text-sm text-gray-500">📞 {order.phone}</p>

                      <p className="text-xs text-gray-500 mt-2">
                        Completed: {new Date(order.updated_at).toLocaleTimeString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {orders?.filter((o: any) => o.status === 'picked_up').length === 0 && (
                <p className="text-center text-gray-500 py-8">No recently picked up orders</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default KitchenPage;