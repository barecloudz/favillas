import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-supabase-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdminWebSocket } from "@/hooks/use-admin-websocket";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Printer, Volume2, Columns3, LayoutGrid, User, Home, Settings, LogOut, PauseCircle, PlayCircle } from "lucide-react";
import { printToThermalPrinter } from "@/utils/thermal-printer";
import { useLocation } from "wouter";
import { useVacationMode } from "@/hooks/use-vacation-mode";

const KitchenPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("pending");
  const [isColumnMode, setIsColumnMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('kitchenColumnMode') === 'true';
    }
    return false;
  });
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const { isOrderingPaused, vacationMode } = useVacationMode();
  const [isTogglingPause, setIsTogglingPause] = useState(false);
  const [wakeLock, setWakeLock] = useState<any>(null);
  // Use localStorage to track printed orders across all browser tabs/devices
  const [printedOrders, setPrintedOrders] = useState<Set<number>>(() => {
    const stored = localStorage.getItem('printedOrders');
    const orderIds = stored ? new Set(JSON.parse(stored)) : new Set();
    console.log(`🔄 Loaded ${orderIds.size} printed orders from localStorage (synced across tabs)`);
    return orderIds;
  });

  // Sync printed orders to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('printedOrders', JSON.stringify(Array.from(printedOrders)));
    console.log(`💾 Saved ${printedOrders.size} printed orders to localStorage`);
  }, [printedOrders]);

  // Listen for changes from other tabs/devices
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'printedOrders' && e.newValue) {
        const newPrinted = new Set(JSON.parse(e.newValue));
        console.log(`🔁 Synced ${newPrinted.size} printed orders from another tab/device`);
        setPrintedOrders(newPrinted);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Clear old printed orders after 1 hour to prevent localStorage from growing indefinitely
  useEffect(() => {
    const clearInterval = setInterval(() => {
      console.log('🧹 Clearing printed orders older than 1 hour');
      setPrintedOrders(new Set());
      localStorage.removeItem('printedOrders');
    }, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(clearInterval);
  }, []);

  // Load notification settings from system settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundType, setSoundType] = useState<'chime' | 'bell' | 'ding' | 'beep' | 'dingbell' | 'custom'>('dingbell');
  const [soundVolume, setSoundVolume] = useState(0.5);

  // Fetch notification settings on mount
  useEffect(() => {
    fetch('/api/admin/system-settings?category=notifications', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        const settings = data.notifications || [];
        const enabled = settings.find((s: any) => s.setting_key === 'NOTIFICATION_SOUND_ENABLED');
        const type = settings.find((s: any) => s.setting_key === 'NOTIFICATION_SOUND_TYPE');
        const volume = settings.find((s: any) => s.setting_key === 'NOTIFICATION_SOUND_VOLUME');

        if (enabled) setSoundEnabled(enabled.setting_value === 'true');
        if (type) setSoundType(type.setting_value as any);
        if (volume) setSoundVolume(parseFloat(volume.setting_value));
      })
      .catch(err => console.warn('Failed to load notification settings:', err));
  }, []);

  // Request wake lock to keep screen on
  useEffect(() => {
    let lock: any = null;

    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          lock = await (navigator as any).wakeLock.request('screen');
          setWakeLock(lock);
          console.log('✅ Screen wake lock activated - screen will stay on');

          lock.addEventListener('release', () => {
            console.log('⚠️ Wake lock released');
          });
        } else {
          console.warn('⚠️ Wake Lock API not supported on this device');
        }
      } catch (err) {
        console.error('❌ Failed to acquire wake lock:', err);
      }
    };

    // Request wake lock on mount
    requestWakeLock();

    // Re-request wake lock when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && lock === null) {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Release wake lock on unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (lock !== null) {
        lock.release().then(() => {
          console.log('🛑 Wake lock released on unmount');
        });
      }
    };
  }, []);

  // Use admin websocket with notification sound settings
  const { playTestSound, sendMessage } = useAdminWebSocket({
    enableSounds: soundEnabled,
    soundType: soundType,
    volume: soundVolume,
    onNewOrder: (order) => {
      // Check if already printed (deduplication)
      if (printedOrders.has(order.id)) {
        console.log(`⏭️  Order #${order.id} already printed, skipping...`);
        return;
      }

      // Auto-print if enabled
      const autoPrintEnabled = localStorage.getItem('autoPrintOrders') !== 'false';
      if (autoPrintEnabled) {
        console.log('🖨️  Auto-printing new order #' + order.id);
        console.log('📦 Full order data:', JSON.stringify(order, null, 2));

        // Detailed logging of each item's options
        console.log('📋 Item details:');
        order.items?.forEach((item: any, idx: number) => {
          console.log(`  Item ${idx + 1}: ${item.menuItem?.name || item.name}`);
          console.log(`    - Quantity: ${item.quantity}`);
          console.log(`    - Base Price: $${item.price}`);
          console.log(`    - Options:`, item.options);
          if (item.options) {
            console.log(`    - Options is Array: ${Array.isArray(item.options)}`);
            console.log(`    - Options length: ${Array.isArray(item.options) ? item.options.length : 'N/A'}`);
          }
        });

        // Mark as printed immediately to prevent duplicates
        setPrintedOrders(prev => new Set(prev).add(order.id));

        printToThermalPrinter(
          {
            id: order.id,
            orderType: order.order_type || order.orderType,
            customerName: order.customer_name || order.customerName,
            phone: order.phone,
            address: order.address,
            items: order.items || [],
            total: parseFloat(order.total || 0),
            tax: parseFloat(order.tax || 0),
            deliveryFee: parseFloat(order.delivery_fee || order.deliveryFee || 0),
            tip: parseFloat(order.tip || 0),
            specialInstructions: order.special_instructions || order.specialInstructions,
            createdAt: order.created_at || order.createdAt || new Date().toISOString(),
            userId: order.user_id || order.userId,
            pointsEarned: order.pointsEarned || order.points_earned || 0
          },
          {
            ipAddress: '192.168.1.18',
            port: 3001,
            name: 'Kitchen Printer'
          }
        ).then(result => {
          if (result.success) {
            console.log('✅ Auto-print successful');
          } else {
            console.error('❌ Auto-print failed:', result.message);
          }
        });
      }
    }
  });

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
    refetchInterval: 2000, // Refetch every 2 seconds for real-time updates
    enabled: !!user, // Only fetch when user is authenticated
  });

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

  // Print order receipt
  const printOrder = async (orderId: number) => {
    try {
      console.log(`🖨️ Printing order #${orderId}`);

      // Find the order in our orders list
      const order = orders?.find((o: any) => o.id === orderId);
      if (!order) {
        toast({
          title: "Order Not Found",
          description: `Could not find order #${orderId}`,
          variant: "destructive",
        });
        return;
      }

      // Print directly from browser to thermal printer on local network
      // Using same hardcoded config as auto-print
      const result = await printToThermalPrinter(
        {
          id: order.id,
          orderType: order.order_type || order.orderType,
          customerName: order.customerName || order.customer_name,
          phone: order.phone,
          address: order.address,
          items: order.items,
          total: parseFloat(order.total),
          tax: parseFloat(order.tax || 0),
          deliveryFee: parseFloat(order.delivery_fee || order.deliveryFee || 0),
          tip: parseFloat(order.tip || 0),
          specialInstructions: order.special_instructions || order.specialInstructions,
          createdAt: order.created_at || order.createdAt,
          userId: order.user_id || order.userId,
          pointsEarned: order.pointsEarned || order.points_earned || 0
        },
        {
          ipAddress: '192.168.1.18',
          port: 3001,
          name: 'Kitchen Printer'
        }
      );

      if (result.success) {
        toast({
          title: "Print Successful",
          description: result.message,
        });
      } else {
        toast({
          title: "Print Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Print error:', error);
      toast({
        title: "Print Error",
        description: error.message || "Could not connect to printer",
        variant: "destructive",
      });
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId: number, status: string) => {
    try {
      console.log(`📤 Sending PATCH to /api/orders/${orderId} with status:`, status);
      const response = await apiRequest("PATCH", `/api/orders/${orderId}`, { status });
      const responseData = await response.json();
      console.log('📥 PATCH response data:', responseData);
      if (responseData.shipdayDebug) {
        console.log('🚀 ShipDay Debug Data:', responseData.shipdayDebug);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });

      // Send WebSocket message to update customer display immediately
      sendMessage({
        type: 'orderStatusUpdate',
        orderId,
        status,
        timestamp: new Date().toISOString()
      });

      // Auto-switch to the appropriate tab
      if (status === 'cooking') {
        setActiveTab('cooking');
      } else if (status === 'completed') {
        setActiveTab('completed');
      } else if (status === 'picked_up') {
        setActiveTab('picked_up');
      }

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

  // Toggle pause ordering (emergency pause)
  const togglePauseOrdering = async () => {
    setIsTogglingPause(true);
    try {
      const newPauseState = !isOrderingPaused;

      // Use apiRequest to ensure proper authentication
      await apiRequest('PUT', '/api/vacation-mode', {
        isEnabled: newPauseState,
        message: newPauseState
          ? 'We are temporarily pausing orders due to high volume. Please check back shortly!'
          : '',
        startDate: '',
        endDate: '',
        reason: 'Emergency pause from kitchen'
      });

      queryClient.invalidateQueries({ queryKey: ['/api/vacation-mode'] });
      toast({
        title: newPauseState ? "Ordering Paused" : "Ordering Resumed",
        description: newPauseState
          ? "Customers will see a message that ordering is temporarily unavailable."
          : "Customers can now place orders again.",
      });
    } catch (error: any) {
      console.error('Toggle pause error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to toggle pause state",
        variant: "destructive",
      });
    } finally {
      setIsTogglingPause(false);
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

      <div className="min-h-screen bg-gray-100 overflow-y-auto">
        <header className="bg-[#d73a31] text-white p-3 md:p-4 shadow-md">
          <div className="container mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
            <h1 className="text-xl md:text-2xl font-bold">Favilla's Kitchen</h1>
            <div className="flex items-center gap-2 md:gap-4 text-sm md:text-base">
              <Button
                variant="outline"
                size="sm"
                className="bg-white text-[#d73a31] border-white hover:bg-gray-100 font-medium"
                onClick={() => {
                  const newMode = !isColumnMode;
                  setIsColumnMode(newMode);
                  localStorage.setItem('kitchenColumnMode', String(newMode));
                }}
              >
                {isColumnMode ? <LayoutGrid className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" /> : <Columns3 className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />}
                <span className="hidden sm:inline">{isColumnMode ? "Grid Mode" : "Column Mode"}</span>
                <span className="sm:hidden">{isColumnMode ? "Grid" : "Columns"}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-white text-[#d73a31] border-white hover:bg-gray-100 font-medium"
                onClick={() => {
                  playTestSound();
                }}
              >
                <Volume2 className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Test Sound</span>
                <span className="sm:hidden">Test</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`border-white hover:bg-gray-100 font-medium ${
                  isOrderingPaused
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                    : 'bg-white text-[#d73a31]'
                }`}
                onClick={togglePauseOrdering}
                disabled={isTogglingPause}
              >
                {isTogglingPause ? (
                  <Loader2 className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4 animate-spin" />
                ) : isOrderingPaused ? (
                  <PlayCircle className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                ) : (
                  <PauseCircle className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                )}
                <span className="hidden sm:inline">{isOrderingPaused ? "Resume Orders" : "Pause Orders"}</span>
                <span className="sm:hidden">{isOrderingPaused ? "Resume" : "Pause"}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-white text-[#d73a31] border-white hover:bg-gray-100 font-medium"
                  >
                    <User className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">{user?.firstName || 'Menu'}</span>
                    <span className="sm:hidden">Menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>
                    {user?.firstName} {user?.lastName}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setLocation('/')}>
                    <Home className="mr-2 h-4 w-4" />
                    <span>Home</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setLocation('/admin/dashboard')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Admin Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        await apiRequest('POST', '/api/logout', {});
                        setLocation('/');
                        window.location.reload();
                      } catch (error) {
                        console.error('Logout failed:', error);
                      }
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Pause Status Banner */}
        {isOrderingPaused && (
          <div className="bg-yellow-500 border-b-4 border-yellow-600 p-3 md:p-4">
            <div className="container mx-auto flex items-center gap-3 text-white">
              <PauseCircle className="h-8 w-8 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-lg md:text-xl">⏸️ Orders Temporarily Paused</p>
                <p className="text-sm md:text-base">ASAP orders are currently paused. Scheduled orders will still come through.</p>
              </div>
            </div>
          </div>
        )}

        <main className="container mx-auto p-2 md:p-4">
          {isColumnMode ? (
            // Column Mode - 3 Column Kanban View
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-700">Kitchen Display - Column View</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] })}
                >
                  🔄 Refresh
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-200px)]">
                {/* Column 1: Ready to Start */}
                <div className="flex flex-col bg-white rounded-lg shadow-sm border-2 border-red-200 overflow-hidden">
                  <div className="bg-red-500 text-white p-3 font-bold text-center flex items-center justify-center gap-2">
                    <span>Ready to Start</span>
                    <Badge className="bg-white text-red-500">
                      {orders?.filter((o: any) => o.status === "pending" && (o.fulfillmentTime === 'asap' || isOrderReadyToStart(o))).length || 0}
                    </Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {orders?.filter((o: any) => o.status === "pending" && (o.fulfillmentTime === 'asap' || isOrderReadyToStart(o))).map((order: any) => (
                      <Card
                        key={order.id}
                        className="cursor-pointer hover:shadow-md transition-shadow border-red-200"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderModal(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-2xl font-bold text-gray-900">
                                {order.customer_name || 'Guest'}
                              </p>
                              <p className="text-sm font-bold text-black">Order #{order.id}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {order.order_type?.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mb-3">
                            {new Date(order.created_at).toLocaleTimeString()}
                          </p>

                          {/* Order Items - Simplified for column view */}
                          <div className="space-y-2 mb-3">
                            {order.items?.map((item: any, idx: number) => (
                              <div key={idx} className="text-sm">
                                <div className="font-medium text-gray-800">
                                  {item.quantity}x {item.menuItem?.name || 'Unknown Item'}
                                  {item.specialInstructions && (
                                    <span className="text-xs text-orange-600 ml-2">⚠️</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          <Button
                            className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateOrderStatus(order.id, 'cooking');
                            }}
                          >
                            🍳 Start Cooking
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Column 2: Cooking */}
                <div className="flex flex-col bg-white rounded-lg shadow-sm border-2 border-yellow-200 overflow-hidden">
                  <div className="bg-yellow-500 text-white p-3 font-bold text-center flex items-center justify-center gap-2">
                    <span>Cooking</span>
                    <Badge className="bg-white text-yellow-600">
                      {orders?.filter((o: any) => o.status === "cooking").length || 0}
                    </Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {orders?.filter((o: any) => o.status === "cooking").map((order: any) => (
                      <Card
                        key={order.id}
                        className="cursor-pointer hover:shadow-md transition-shadow border-yellow-200"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderModal(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-2xl font-bold text-gray-900">
                                {order.customer_name || 'Guest'}
                              </p>
                              <p className="text-sm font-bold text-black">Order #{order.id}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {order.order_type?.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mb-3">
                            {new Date(order.created_at).toLocaleTimeString()}
                          </p>

                          {/* Order Items - Simplified for column view */}
                          <div className="space-y-2 mb-3">
                            {order.items?.map((item: any, idx: number) => (
                              <div key={idx} className="text-sm">
                                <div className="font-medium text-gray-800">
                                  {item.quantity}x {item.menuItem?.name || 'Unknown Item'}
                                  {item.specialInstructions && (
                                    <span className="text-xs text-orange-600 ml-2">⚠️</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          <Button
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateOrderStatus(order.id, 'completed');
                            }}
                          >
                            ✅ Complete
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Column 3: Ready for Pickup */}
                <div className="flex flex-col bg-white rounded-lg shadow-sm border-2 border-green-200 overflow-hidden">
                  <div className="bg-green-500 text-white p-3 font-bold text-center flex items-center justify-center gap-2">
                    <span>Ready for Pickup</span>
                    <Badge className="bg-white text-green-600">
                      {orders?.filter((o: any) => o.status === "completed").length || 0}
                    </Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {orders?.filter((o: any) => o.status === "completed").map((order: any) => (
                      <Card
                        key={order.id}
                        className="cursor-pointer hover:shadow-md transition-shadow border-green-200"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderModal(true);
                        }}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-2xl font-bold text-gray-900">
                                {order.customer_name || 'Guest'}
                              </p>
                              <p className="text-sm font-bold text-black">Order #{order.id}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {order.order_type?.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-500 mb-3">
                            {new Date(order.created_at).toLocaleTimeString()}
                          </p>

                          {/* Order Items - Simplified for column view */}
                          <div className="space-y-2 mb-3">
                            {order.items?.map((item: any, idx: number) => (
                              <div key={idx} className="text-sm">
                                <div className="font-medium text-gray-800">
                                  {item.quantity}x {item.menuItem?.name || 'Unknown Item'}
                                  {item.specialInstructions && (
                                    <span className="text-xs text-orange-600 ml-2">⚠️</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          <Button
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateOrderStatus(order.id, 'picked_up');
                            }}
                          >
                            📦 Picked Up
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-6">
              <TabsList className="w-full sm:w-auto overflow-x-auto flex-wrap sm:flex-nowrap text-xs sm:text-sm">
                <TabsTrigger value="pending" className="relative px-2 md:px-3">
                  <span className="hidden sm:inline">Ready to Start</span>
                  <span className="sm:hidden">Ready</span>
                  {orders?.filter((o: any) => o.status === "pending" && (o.fulfillmentTime === 'asap' || isOrderReadyToStart(o))).length > 0 && (
                    <Badge className="ml-1 sm:ml-2 bg-red-500 text-xs">{orders.filter((o: any) => o.status === "pending" && (o.fulfillmentTime === 'asap' || isOrderReadyToStart(o))).length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="cooking" className="px-2 md:px-3">
                  Cooking
                  {orders?.filter((o: any) => o.status === "cooking").length > 0 && (
                    <Badge className="ml-1 sm:ml-2 bg-yellow-500 text-xs">{orders.filter((o: any) => o.status === "cooking").length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="completed" className="px-2 md:px-3">
                  <span className="hidden sm:inline">Ready for Pickup</span>
                  <span className="sm:hidden">Ready</span>
                </TabsTrigger>
                <TabsTrigger value="picked_up" className="px-2 md:px-3">
                  <span className="hidden sm:inline">Picked Up</span>
                  <span className="sm:hidden">Done</span>
                  {orders?.filter((o: any) => o.status === 'picked_up').length > 0 && (
                    <Badge className="ml-1 sm:ml-2 bg-gray-500 text-xs">{orders.filter((o: any) => o.status === 'picked_up').length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="px-2 md:px-3">
                  <span className="hidden sm:inline">Scheduled Later</span>
                  <span className="sm:hidden">Scheduled</span>
                  {orders?.filter((o: any) => o.status === 'pending' && o.fulfillmentTime === 'scheduled' && !isOrderReadyToStart(o)).length > 0 && (
                    <Badge className="ml-1 sm:ml-2 bg-blue-500 text-xs">{orders.filter((o: any) => o.status === 'pending' && o.fulfillmentTime === 'scheduled' && !isOrderReadyToStart(o)).length}</Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all" className="px-2 md:px-3">All</TabsTrigger>
              </TabsList>

              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] })}
              >
                🔄 Refresh
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
                        ${order.status === 'picked_up' ? 'bg-gray-100' : ''}
                      `}>
                        <div className="flex justify-between items-center">
                          <CardTitle>Order #{order.id}</CardTitle>
                          <Badge className={`
                            ${order.status === 'pending' ? 'bg-red-500' : ''}
                            ${order.status === 'cooking' ? 'bg-yellow-500' : ''}
                            ${order.status === 'completed' ? 'bg-green-500' : ''}
                            ${order.status === 'picked_up' ? 'bg-gray-500' : ''}
                          `}>
                            {order.status.toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          <div className="flex justify-between">
                            <span>{new Date(order.created_at).toLocaleTimeString()}</span>
                            <Badge variant={order.payment_status === 'paid' ? 'default' : 'outline'}>
                              {order.payment_status?.toUpperCase() || 'UNKNOWN'}
                            </Badge>
                          </div>
                          <div className="mt-1">
                            <Badge variant="outline" className="mr-2">
                              {order.order_type?.toUpperCase() || 'UNKNOWN'}
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
                              {/* Display detailed choices and addons */}
                              {item.options && Array.isArray(item.options) && item.options.length > 0 && (
                                <div className="text-sm text-gray-600 space-y-1">
                                  {item.options.map((option: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center">
                                      <span>{option.groupName}: {option.itemName}</span>
                                      {option.price && option.price > 0 && (
                                        <span className="text-green-600 font-medium">+${option.price.toFixed(2)}</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Legacy options support */}
                              {item.options && typeof item.options === 'object' && !Array.isArray(item.options) && (
                                <div className="text-sm text-gray-600">
                                  {item.options.size && <p>Size: {item.options.size}</p>}
                                  {item.options.toppings && item.options.toppings.length > 0 && (
                                    <p>Toppings: {item.options.toppings.join(', ')}</p>
                                  )}
                                  {item.options.addOns && item.options.addOns.length > 0 && (
                                    <p>Add-ons: {item.options.addOns.join(', ')}</p>
                                  )}
                                  {item.options.extras && item.options.extras.length > 0 && (
                                    <p>Extras: {item.options.extras.join(', ')}</p>
                                  )}
                                </div>
                              )}

                              {item.specialInstructions && (
                                <p className="text-sm text-gray-600 italic font-medium bg-yellow-100 px-2 py-1 rounded">
                                  Special: "{item.specialInstructions}"
                                </p>
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
                        
                        <div className="flex flex-col gap-3 mt-4 sm:flex-row">
                          <Button
                            className="w-full sm:flex-1 h-12 text-base font-medium"
                            variant="outline"
                            onClick={() => printOrder(order.id)}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                          </Button>

                          {order.status === 'pending' && (
                            <Button
                              className={`w-full sm:flex-1 h-12 text-base font-medium text-white ${
                                isOrderReadyToStart(order)
                                  ? "bg-yellow-500 hover:bg-yellow-600 active:bg-yellow-700"
                                  : "bg-gray-400 cursor-not-allowed"
                              }`}
                              onClick={() => {
                                console.log('🍳 Start Cooking clicked for order:', order.id);
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
                              {isOrderReadyToStart(order) ? "🍳 Start Cooking" : "📅 Scheduled"}
                            </Button>
                          )}

                          {order.status === 'cooking' && (
                            <Button
                              className="w-full sm:flex-1 h-12 text-base font-medium text-white bg-green-500 hover:bg-green-600 active:bg-green-700"
                              onClick={() => {
                                console.log('✅ Complete clicked for order:', order.id);
                                updateOrderStatus(order.id, 'completed');
                              }}
                            >
                              ✅ Complete
                            </Button>
                          )}

                          {order.status === 'completed' && (
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-1">
                              <Button
                                className="w-full h-12 text-base font-medium text-white bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
                                onClick={() => {
                                  console.log('📦 Picked Up clicked for order:', order.id);
                                  updateOrderStatus(order.id, 'picked_up');
                                }}
                              >
                                📦 Picked Up
                              </Button>
                              <Button
                                className="w-full h-12 text-base font-medium bg-gray-500 hover:bg-gray-600 active:bg-gray-700 text-white"
                                onClick={() => {
                                  console.log('🔄 Reopen clicked for order:', order.id);
                                  updateOrderStatus(order.id, 'cooking');
                                }}
                              >
                                🔄 Reopen
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
          )}
        </main>

        {/* Order Detail Modal */}
        <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                Order #{selectedOrder?.id} - {selectedOrder?.customer_name}
              </DialogTitle>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-4">
                {/* Order Header Info */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={`
                    ${selectedOrder.status === 'pending' ? 'bg-red-500' : ''}
                    ${selectedOrder.status === 'cooking' ? 'bg-yellow-500' : ''}
                    ${selectedOrder.status === 'completed' ? 'bg-green-500' : ''}
                    ${selectedOrder.status === 'picked_up' ? 'bg-gray-500' : ''}
                  `}>
                    {selectedOrder.status.toUpperCase()}
                  </Badge>
                  <Badge variant="outline">
                    {selectedOrder.order_type?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                  <Badge variant={selectedOrder.payment_status === 'paid' ? 'default' : 'outline'}>
                    {selectedOrder.payment_status?.toUpperCase() || 'UNKNOWN'}
                  </Badge>
                </div>

                {/* Customer Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Customer Information</h3>
                  <p className="text-sm"><strong>Name:</strong> {selectedOrder.customer_name}</p>
                  <p className="text-sm"><strong>Phone:</strong> {selectedOrder.phone}</p>
                  {selectedOrder.address && (
                    <p className="text-sm"><strong>Address:</strong> {selectedOrder.address}</p>
                  )}
                  <p className="text-sm"><strong>Order Time:</strong> {new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>

                {/* Order Items */}
                <div>
                  <h3 className="font-semibold mb-2">Order Items</h3>
                  <div className="space-y-3 border rounded-lg p-4">
                    {selectedOrder.items?.map((item: any) => (
                      <div key={item.id} className="border-b pb-3 last:border-b-0">
                        <div className="flex justify-between font-medium">
                          <span>{item.quantity}x {item.menuItem?.name || 'Unknown Item'}</span>
                          <span>${formatPrice(item.price)}</span>
                        </div>
                        {/* Display detailed choices and addons */}
                        {item.options && Array.isArray(item.options) && item.options.length > 0 && (
                          <div className="text-sm text-gray-600 space-y-1 mt-1">
                            {item.options.map((option: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center">
                                <span>{option.groupName}: {option.itemName}</span>
                                {option.price && option.price > 0 && (
                                  <span className="text-green-600 font-medium">+${option.price.toFixed(2)}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                        {item.specialInstructions && (
                          <p className="text-sm text-gray-600 italic font-medium bg-yellow-100 px-2 py-1 rounded mt-2">
                            Special: "{item.specialInstructions}"
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Special Instructions */}
                {selectedOrder.special_instructions && (
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Special Instructions</h3>
                    <p className="text-sm">{selectedOrder.special_instructions}</p>
                  </div>
                )}

                {/* Scheduled Time */}
                {selectedOrder.fulfillmentTime === 'scheduled' && selectedOrder.scheduledTime && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Scheduled Time</h3>
                    <p className="text-sm font-mono">
                      {new Date(selectedOrder.scheduledTime).toLocaleString()}
                    </p>
                  </div>
                )}

                {/* Order Total */}
                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${formatPrice(Number(selectedOrder.total) + Number(selectedOrder.tax))}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    className="flex-1"
                    variant="outline"
                    onClick={() => printOrder(selectedOrder.id)}
                  >
                    <Printer className="h-4 w-4 mr-2" />
                    Print Order
                  </Button>

                  {selectedOrder.status === 'pending' && (
                    <Button
                      className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, 'cooking');
                        setShowOrderModal(false);
                      }}
                    >
                      🍳 Start Cooking
                    </Button>
                  )}

                  {selectedOrder.status === 'cooking' && (
                    <Button
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, 'completed');
                        setShowOrderModal(false);
                      }}
                    >
                      ✅ Complete
                    </Button>
                  )}

                  {selectedOrder.status === 'completed' && (
                    <>
                      <Button
                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                        onClick={() => {
                          updateOrderStatus(selectedOrder.id, 'picked_up');
                          setShowOrderModal(false);
                        }}
                      >
                        📦 Picked Up
                      </Button>
                      <Button
                        className="flex-1 bg-gray-500 hover:bg-gray-600 text-white"
                        onClick={() => {
                          updateOrderStatus(selectedOrder.id, 'cooking');
                          setShowOrderModal(false);
                        }}
                      >
                        🔄 Reopen
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default KitchenPage;
