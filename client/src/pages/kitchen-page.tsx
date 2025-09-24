import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-supabase-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { setupWebSocket } from "@/lib/websocket";
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
            <p>Date: ${new Date(order.createdAt).toLocaleString()}</p>
            <p>Type: ${order.orderType.toUpperCase()}</p>
            <p>Status: ${order.status.toUpperCase()}</p>
            <p>Payment: ${order.paymentStatus.toUpperCase()}</p>
            <p>Phone: ${order.phone}</p>
            ${order.address ? `<p>Delivery Address: ${order.address}</p>` : ''}
            ${order.specialInstructions ? `<p>Special Instructions: ${order.specialInstructions}</p>` : ''}
            <div class="divider"></div>
            ${order.items.map((item: any) => `
              <div class="item">
                <p>${item.quantity}x ${item.menuItem?.name || 'Unknown Item'} - $${formatPrice(item.price)}</p>
                ${item.options?.size ? `<p>Size: ${item.options.size}</p>` : ''}
                ${item.specialInstructions ? `<p>Note: ${item.specialInstructions}</p>` : ''}
              </div>
            `).join('')}
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
      
      <div className="min-h-screen bg-gray-100 overflow-y-auto">
        <header className="bg-[#d73a31] text-white p-4 shadow-md">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-bold">Favilla's Kitchen</h1>
            <div className="flex items-center gap-4">
              <Button variant="outline" className="text-white border-white hover:bg-white hover:text-[#d73a31]">
                <Volume2 className="mr-2 h-4 w-4" />
                Test Sound
              </Button>
              <span>Welcome, {user?.firstName}</span>
            </div>
          </div>
        </header>
        
        <main className="container mx-auto p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex justify-between items-center mb-6">
              <TabsList>
                <TabsTrigger value="pending" className="relative">
                  Ready to Start
                  {orders?.filter((o: any) => o.status === "pending" && (o.fulfillmentTime === 'asap' || isOrderReadyToStart(o))).length > 0 && (
                    <Badge className="ml-2 bg-red-500">{orders.filter((o: any) => o.status === "pending" && (o.fulfillmentTime === 'asap' || isOrderReadyToStart(o))).length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="cooking">
                  Cooking
                  {orders?.filter((o: any) => o.status === "cooking").length > 0 && (
                    <Badge className="ml-2 bg-yellow-500">{orders.filter((o: any) => o.status === "cooking").length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="scheduled">
                  Scheduled Later
                  {orders?.filter((o: any) => o.status === 'pending' && o.fulfillmentTime === 'scheduled' && !isOrderReadyToStart(o)).length > 0 && (
                    <Badge className="ml-2 bg-blue-500">{orders.filter((o: any) => o.status === 'pending' && o.fulfillmentTime === 'scheduled' && !isOrderReadyToStart(o)).length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all">All Orders</TabsTrigger>
              </TabsList>
              
              <Button 
                variant="outline" 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] })}
              >
                Refresh
              </Button>
            </div>
            
            <TabsContent value={activeTab} className="mt-0">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow">
                  <p className="text-xl text-gray-500">No {activeTab === 'cooking' ? 'cooking' : activeTab} orders found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredOrders.map((order: any) => (
                    <Card key={order.id} className="overflow-hidden">
                      <CardHeader className={`
                        ${order.status === 'pending' ? 'bg-red-100' : ''}
                        ${order.status === 'cooking' ? 'bg-yellow-100' : ''}
                        ${order.status === 'completed' ? 'bg-green-100' : ''}
                      `}>
                        <div className="flex justify-between items-center">
                          <CardTitle>Order #{order.id}</CardTitle>
                          <Badge className={`
                            ${order.status === 'pending' ? 'bg-red-500' : ''}
                            ${order.status === 'cooking' ? 'bg-yellow-500' : ''}
                            ${order.status === 'completed' ? 'bg-green-500' : ''}
                          `}>
                            {order.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          <div className="flex justify-between">
                            <span>{new Date(order.createdAt).toLocaleTimeString()}</span>
                            <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'outline'}>
                              {order.paymentStatus?.toUpperCase() || 'UNKNOWN'}
                            </Badge>
                          </div>
                          <div className="mt-1">
                            <Badge variant="outline" className="mr-2">
                              {order.orderType?.toUpperCase() || 'UNKNOWN'}
                            </Badge>
                            <span>{order.phone}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {order.items.map((item: any) => (
                            <div key={item.id} className="border-b pb-2">
                              <div className="flex justify-between font-medium">
                                <span>{item.quantity}x {item.menuItem?.name || 'Unknown Item'}</span>
                                <span>${formatPrice(item.price)}</span>
                              </div>
                              {item.options?.size && (
                                <p className="text-sm text-gray-600">Size: {item.options.size}</p>
                              )}
                              {item.specialInstructions && (
                                <p className="text-sm text-gray-600 italic">"{item.specialInstructions}"</p>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        {order.specialInstructions && (
                          <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                            <p className="font-medium text-sm">Special Instructions:</p>
                            <p className="text-sm">{order.specialInstructions}</p>
                          </div>
                        )}
                        
                        {order.address && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-md">
                            <p className="font-medium text-sm">Delivery Address:</p>
                            <p className="text-sm">{order.address}</p>
                          </div>
                        )}

                        {order.fulfillmentTime === 'scheduled' && order.scheduledTime && (
                          <div className="mt-4 p-3 bg-purple-50 rounded-md">
                            <p className="font-medium text-sm">Scheduled Time:</p>
                            <p className="text-sm font-mono">
                              {new Date(order.scheduledTime).toLocaleString()}
                            </p>
                            {!isOrderReadyToStart(order) && (
                              <p className="text-xs text-purple-600 mt-1">
                                Can start in {Math.ceil((new Date(order.scheduledTime).getTime() - Date.now()) / (1000 * 60) - 30)} minutes
                              </p>
                            )}
                          </div>
                        )}
                        
                        <Separator className="my-4" />
                        
                        <div className="flex justify-between font-medium">
                          <span>Total:</span>
                          <span>${formatPrice(Number(order.total) + Number(order.tax))}</span>
                        </div>
                        
                        <div className="flex space-x-2 mt-4">
                          <Button
                            className="flex-1"
                            variant="outline"
                            onClick={() => printOrder(order)}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                          </Button>
                          
                          {order.status === 'pending' && (
                            <Button
                              className={`flex-1 ${
                                isOrderReadyToStart(order)
                                  ? "bg-yellow-500 hover:bg-yellow-600"
                                  : "bg-gray-400 cursor-not-allowed"
                              }`}
                              onClick={() => {
                                if (isOrderReadyToStart(order)) {
                                  updateOrderStatus(order.id, 'cooking');
                                } else {
                                  toast({
                                    title: "Order Not Ready",
                                    description: `This scheduled order can be started 30 minutes before: ${new Date(order.scheduledTime).toLocaleTimeString()}`,
                                    variant: "destructive",
                                  });
                                }
                              }}
                              disabled={!isOrderReadyToStart(order)}
                            >
                              {isOrderReadyToStart(order) ? "Start Cooking" : "Scheduled"}
                            </Button>
                          )}
                          
                          {order.status === 'cooking' && (
                            <Button
                              className="flex-1 bg-green-500 hover:bg-green-600"
                              onClick={() => updateOrderStatus(order.id, 'completed')}
                            >
                              Complete
                            </Button>
                          )}
                          
                          {order.status === 'completed' && (
                            <Button
                              className="flex-1 bg-gray-500 hover:bg-gray-600"
                              variant="outline"
                              onClick={() => updateOrderStatus(order.id, 'cooking')}
                            >
                              Reopen
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
};

export default KitchenPage;
