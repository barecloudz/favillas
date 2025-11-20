import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-supabase-auth";
import { supabase } from "@/lib/supabase";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAdminWebSocket } from "@/hooks/use-admin-websocket";
import { Helmet } from "react-helmet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, Printer, Volume2, Columns3, LayoutGrid, User, Home, Settings, LogOut, PauseCircle, PlayCircle, Package, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { printToThermalPrinter, printDailySummary } from "@/utils/thermal-printer";
import { useLocation } from "wouter";
import { useVacationMode } from "@/hooks/use-vacation-mode";

const KitchenPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
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
  const [showPauseReasonDialog, setShowPauseReasonDialog] = useState(false);
  const [pauseReason, setPauseReason] = useState<string>('high_volume');
  const [customPauseMessage, setCustomPauseMessage] = useState('');
  const [isRestOfDay, setIsRestOfDay] = useState(false);

  // Daily Summary Modal State
  const [showDailySummaryModal, setShowDailySummaryModal] = useState(false);
  const [storeHours, setStoreHours] = useState<any[]>([]);
  const [closingTime, setClosingTime] = useState<string | null>(null);

  // Item Management Modal State
  const [showItemManagementModal, setShowItemManagementModal] = useState(false);
  const [expandedItemCategories, setExpandedItemCategories] = useState<Set<string>>(new Set());
  const [expandedChoiceGroups, setExpandedChoiceGroups] = useState<Set<number>>(new Set());

  // Order Status Mode State - check localStorage first for immediate feedback
  const [orderStatusMode, setOrderStatusMode] = useState<'manual' | 'automatic'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('orderStatusMode');
      console.log('🔍 Initial orderStatusMode from localStorage:', saved || 'manual (default)');
      return (saved as 'manual' | 'automatic') || 'manual';
    }
    return 'manual';
  });
  const [showStatusModeModal, setShowStatusModeModal] = useState(false);

  // Switch to appropriate tab when mode changes
  useEffect(() => {
    if (orderStatusMode === 'automatic' && (activeTab === 'pending' || activeTab === 'cooking' || activeTab === 'completed' || activeTab === 'picked_up' || activeTab === 'cancelled')) {
      setActiveTab('today');
    } else if (orderStatusMode === 'manual' && activeTab === 'today') {
      setActiveTab('pending');
    }
  }, [orderStatusMode, activeTab]);
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
  const [audioActivated, setAudioActivated] = useState(() => {
    // Check if user has already activated audio in this session
    return sessionStorage.getItem('audioActivated') === 'true';
  });

  // Cancel order confirmation dialog
  const [showCancelConfirmation, setShowCancelConfirmation] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<any>(null);

  // Fetch notification settings on mount
  useEffect(() => {
    apiRequest('GET', '/api/admin/system-settings?category=notifications')
      .then(data => {
        // data is already an array from the API
        const settings = Array.isArray(data) ? data : [];
        const enabled = settings.find((s: any) => s.setting_key === 'NOTIFICATION_SOUND_ENABLED');
        const type = settings.find((s: any) => s.setting_key === 'NOTIFICATION_SOUND_TYPE');
        const volume = settings.find((s: any) => s.setting_key === 'NOTIFICATION_SOUND_VOLUME');

        if (enabled) setSoundEnabled(enabled.setting_value === 'true');
        if (type) setSoundType(type.setting_value as any);
        if (volume) setSoundVolume(parseFloat(volume.setting_value));
      })
      .catch(err => console.warn('Failed to load notification settings:', err));
  }, []);

  // Fetch order status mode on mount
  useEffect(() => {
    apiRequest('GET', '/api/admin/system-settings?category=kitchen')
      .then(data => {
        // data is already an array from the API
        const settings = Array.isArray(data) ? data : [];
        console.log('📊 Fetched kitchen settings:', settings);
        const modeSetting = settings.find((s: any) => s.setting_key === 'ORDER_STATUS_MODE');
        if (modeSetting) {
          console.log('✅ Found ORDER_STATUS_MODE in database:', modeSetting.setting_value);
          setOrderStatusMode(modeSetting.setting_value as 'manual' | 'automatic');
          localStorage.setItem('orderStatusMode', modeSetting.setting_value);
        } else {
          console.warn('⚠️ ORDER_STATUS_MODE not found in database, using localStorage value');
          // Keep the localStorage value that was loaded in initial state
        }
      })
      .catch(err => console.warn('Failed to load order status mode:', err));
  }, []);

  // Fetch store hours on mount
  useEffect(() => {
    const fetchStoreHours = async () => {
      try {
        const response = await fetch('/api/store-hours', { credentials: 'include' });
        if (response.ok) {
          const data = await response.json();
          setStoreHours(data);

          // Get today's day of week (0 = Sunday, 6 = Saturday)
          const today = new Date().getDay();
          const todayHours = data.find((h: any) => h.dayOfWeek === today);

          if (todayHours && todayHours.isOpen && todayHours.closeTime) {
            setClosingTime(todayHours.closeTime);
            console.log(`Store closes today at: ${todayHours.closeTime}`);
          } else if (todayHours && !todayHours.isOpen) {
            console.log('Store is closed today');
            setClosingTime(null);
          } else {
            // Default to 22:00 if no hours found
            setClosingTime('22:00');
            console.log('Using default closing time: 22:00');
          }
        } else {
          // Default to 22:00 if API fails
          setClosingTime('22:00');
          console.log('Failed to fetch store hours, using default: 22:00');
        }
      } catch (error) {
        console.error('Error fetching store hours:', error);
        setClosingTime('22:00');
      }
    };

    fetchStoreHours();
  }, []);

  // Timer to check for daily summary prompt
  useEffect(() => {
    if (!closingTime) return;

    const checkForDailySummary = () => {
      const now = new Date();
      const todayDateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD format
      const storageKey = `dailySummaryPromptShown_${todayDateStr}`;

      // Check if we've already shown the prompt today
      if (localStorage.getItem(storageKey) === 'true') {
        return;
      }

      // Parse closing time (format: "HH:MM")
      const [closeHour, closeMinute] = closingTime.split(':').map(Number);
      const closingDate = new Date(now);
      closingDate.setHours(closeHour, closeMinute, 0, 0);

      // Calculate 30 minutes before closing
      const promptTime = new Date(closingDate);
      promptTime.setMinutes(promptTime.getMinutes() - 30);

      // Check if current time is within the window (30 minutes before closing to closing time)
      if (now >= promptTime && now < closingDate) {
        console.log('Time to show daily summary prompt!');
        setShowDailySummaryModal(true);
        localStorage.setItem(storageKey, 'true');
      }
    };

    // Check immediately on mount
    checkForDailySummary();

    // Then check every minute
    const interval = setInterval(checkForDailySummary, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [closingTime]);

  // Clear the daily summary flag at midnight
  useEffect(() => {
    const clearAtMidnight = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setDate(midnight.getDate() + 1);
      midnight.setHours(0, 0, 0, 0);

      const timeUntilMidnight = midnight.getTime() - now.getTime();

      setTimeout(() => {
        // Clear all daily summary flags from localStorage
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('dailySummaryPromptShown_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        console.log('Cleared daily summary flags at midnight');

        // Set up the next midnight clear
        clearAtMidnight();
      }, timeUntilMidnight);
    };

    clearAtMidnight();
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

  // Use ref for printedOrders to avoid recreating callback when it changes
  const printedOrdersRef = useRef(printedOrders);
  useEffect(() => {
    printedOrdersRef.current = printedOrders;
  }, [printedOrders]);

  // Memoize the onNewOrder callback to prevent reconnecting websocket on every render
  const handleNewOrder = useCallback((order: any) => {
    // Check if already printed (deduplication)
    if (printedOrdersRef.current.has(order.id)) {
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
          customerName: order.customerName || order.customer_name,
          phone: order.phone,
          address: order.address,
          items: order.items || [],
          total: parseFloat(order.total || 0),
          tax: parseFloat(order.tax || 0),
          deliveryFee: parseFloat(order.delivery_fee || order.deliveryFee || 0),
          serviceFee: parseFloat(order.service_fee || order.serviceFee || 0),
          tip: parseFloat(order.tip || 0),
          specialInstructions: order.special_instructions || order.specialInstructions,
          createdAt: order.created_at || order.createdAt || new Date().toISOString(),
          userId: order.user_id || order.userId,
          pointsEarned: order.pointsEarned || order.points_earned || 0,
          fulfillmentTime: order.fulfillmentTime || order.fulfillment_time,
          scheduledTime: order.scheduledTime || order.scheduled_time
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
  }, []); // Empty deps - uses refs and stable setState

  // Memoize the websocket options to prevent reconnecting
  const websocketOptions = useMemo(() => ({
    enableSounds: soundEnabled,
    soundType: soundType,
    volume: soundVolume,
    onNewOrder: handleNewOrder
  }), [soundEnabled, soundType, soundVolume, handleNewOrder]);

  // Use admin websocket with notification sound settings
  const { playTestSound, sendMessage } = useAdminWebSocket(websocketOptions);

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
    refetchInterval: 5000, // Refetch every 5 seconds (optimized from 2s to reduce database egress)
    enabled: !!user, // Only fetch when user is authenticated
  });

  // Fetch menu items for item management modal
  const { data: menuItems = [], refetch: refetchMenuItems } = useQuery({
    queryKey: ["/api/menu"],
    enabled: showItemManagementModal, // Only fetch when modal is open
  });

  // Fetch categories for item management modal
  const { data: categoriesData } = useQuery({
    queryKey: ["/api/categories"],
    enabled: showItemManagementModal, // Only fetch when modal is open
  });

  // Fetch choice groups and items for size management
  const { data: choiceGroups = [] } = useQuery({
    queryKey: ['choice-groups'],
    queryFn: async () => {
      const response = await fetch('/api/choice-groups');
      if (response.ok) return await response.json();
      return [];
    },
    enabled: showItemManagementModal,
  });

  const { data: choiceItems = [], refetch: refetchChoiceItems } = useQuery({
    queryKey: ['choice-items'],
    queryFn: async () => {
      const response = await fetch('/api/choice-items');
      if (response.ok) return await response.json();
      return [];
    },
    enabled: showItemManagementModal,
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
    if (activeTab === "today") {
      // Show all today's orders except cancelled and scheduled (not yet ready)
      const orderDate = new Date(order.created_at || order.createdAt).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      return orderDate === today &&
             order.status !== 'cancelled' &&
             !(order.status === 'pending' && order.fulfillmentTime === 'scheduled' && !isOrderReadyToStart(order));
    }
    if (activeTab === "pending") {
      // Show only orders ready to start (ASAP or scheduled orders within 30 minutes)
      return order.status === "pending" && (
        order.fulfillmentTime === 'asap' || isOrderReadyToStart(order)
      );
    }
    if (activeTab === "cooking") return order.status === "cooking";
    if (activeTab === "completed") return order.status === "completed";
    if (activeTab === "picked_up") return order.status === "picked_up";
    if (activeTab === "cancelled") return order.status === "cancelled";
    if (activeTab === "scheduled") {
      // Show only scheduled orders that are not ready to start yet
      return order.status === "pending" &&
             order.fulfillmentTime === 'scheduled' &&
             !isOrderReadyToStart(order);
    }
    return true;
  }).sort((a: any, b: any) => {
    // Sort by newest first for these tabs
    if (activeTab === "today" || activeTab === "picked_up" || activeTab === "all") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    // Default order for other tabs (pending, cooking, completed stay in order received)
    return 0;
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
          serviceFee: parseFloat(order.service_fee || order.serviceFee || 0),
          tip: parseFloat(order.tip || 0),
          specialInstructions: order.special_instructions || order.specialInstructions,
          createdAt: order.created_at || order.createdAt,
          userId: order.user_id || order.userId,
          pointsEarned: order.pointsEarned || order.points_earned || 0,
          fulfillmentTime: order.fulfillmentTime || order.fulfillment_time,
          scheduledTime: order.scheduledTime || order.scheduled_time
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

  // Cancel order with confirmation
  const handleCancelOrder = (order: any) => {
    setOrderToCancel(order);
    setShowCancelConfirmation(true);
  };

  const confirmCancelOrder = async () => {
    if (!orderToCancel) return;

    try {
      console.log(`❌ Cancelling order #${orderToCancel.id}`);
      const response = await apiRequest("PATCH", `/api/orders/${orderToCancel.id}`, { status: 'cancelled' });
      const responseData = await response.json();
      console.log('📥 Cancel response data:', responseData);

      queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });

      toast({
        title: "Order Cancelled",
        description: `Order #${orderToCancel.id} has been cancelled. Customer points have been revoked.`,
      });

      setShowCancelConfirmation(false);
      setOrderToCancel(null);
      setShowOrderModal(false);
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast({
        title: "Error",
        description: "Failed to cancel order. Please try again.",
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

  // Helper function to get printer server URL (same logic as thermal-printer.ts)
  const getPrinterServerUrl = async (): Promise<string> => {
    // Check if custom printer server URL is configured in localStorage first
    const customUrl = localStorage.getItem('printerServerUrl');
    if (customUrl) {
      return customUrl;
    }

    // Try to fetch from system settings
    try {
      const response = await fetch('/api/admin/system-settings', {
        credentials: 'include'
      });
      if (response.ok) {
        const settingsData = await response.json();
        const printerSettings = settingsData.printer || [];
        const serverUrlSetting = printerSettings.find((s: any) => s.setting_key === 'PRINTER_SERVER_URL');
        if (serverUrlSetting && serverUrlSetting.setting_value) {
          return serverUrlSetting.setting_value;
        }
      }
    } catch (error) {
      console.warn('Could not fetch printer server URL from settings, using default');
    }

    // Default: Raspberry Pi printer server on store network (HTTPS with self-signed cert)
    return 'https://192.168.1.18:3001';
  };

  // Toggle category availability
  const toggleCategoryAvailability = async (categoryId: number, isUnavailable: boolean, categoryName: string) => {
    try {
      // Get Supabase session token
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin-category-availability', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          categoryId,
          isTemporarilyUnavailable: isUnavailable,
          reason: isUnavailable ? 'Out of stock' : null
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update category availability');
      }

      // Refresh categories
      queryClient.invalidateQueries({ queryKey: ['/api/categories'] });

      toast({
        title: isUnavailable ? `${categoryName} marked as out of stock` : `${categoryName} marked as available`,
        description: 'Menu updated successfully'
      });
    } catch (error) {
      console.error('Error toggling category availability:', error);
      toast({
        title: 'Error',
        description: 'Failed to update category availability',
        variant: 'destructive'
      });
    }
  };

  // Toggle individual menu item availability
  const toggleItemAvailability = async (itemId: number, isAvailable: boolean, itemName: string) => {
    try {
      // Get Supabase session token
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin-menu-item-availability', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          menuItemId: itemId,
          isAvailable: isAvailable
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update item availability');
      }

      // Refresh menu items
      refetchMenuItems();

      toast({
        title: !isAvailable ? `${itemName} marked as out of stock` : `${itemName} marked as available`,
        description: 'Menu updated successfully'
      });
    } catch (error) {
      console.error('Error toggling item availability:', error);
      toast({
        title: 'Error',
        description: 'Failed to update item availability',
        variant: 'destructive'
      });
    }
  };

  // Toggle size availability
  const toggleSizeAvailability = async (choiceItemId: number, isUnavailable: boolean, sizeName: string) => {
    try {
      // Get Supabase session token
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/admin-choice-item-availability', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({
          choiceItemIds: [choiceItemId],
          isTemporarilyUnavailable: isUnavailable,
          reason: isUnavailable ? `${sizeName} size out of stock` : null
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Size availability API error:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to update size availability');
      }

      // Refresh choice items
      refetchChoiceItems();

      toast({
        title: isUnavailable ? `${sizeName} marked as out of stock` : `${sizeName} marked as available`,
        description: 'Menu updated successfully'
      });
    } catch (error: any) {
      console.error('Error toggling size availability:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update size availability',
        variant: 'destructive'
      });
    }
  };

  // Handle order status mode change
  const updateOrderStatusMode = async (newMode: 'manual' | 'automatic') => {
    try {
      await apiRequest('POST', '/api/admin/system-settings', {
        settings: [
          {
            setting_key: 'ORDER_STATUS_MODE',
            setting_value: newMode,
            category: 'kitchen',
            setting_type: 'select',
            display_name: 'Order Status Mode',
            description: 'Controls kitchen workflow mode'
          }
        ]
      });

      setOrderStatusMode(newMode);
      localStorage.setItem('orderStatusMode', newMode);
      setShowStatusModeModal(false);

      toast({
        title: 'Order Status Mode Updated',
        description: `Kitchen is now in ${newMode} mode`,
        variant: 'default'
      });
    } catch (error) {
      console.error('Error updating order status mode:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status mode',
        variant: 'destructive'
      });
    }
  };

  // Handle daily summary print
  const handlePrintDailySummary = async () => {
    try {
      console.log('Fetching today\'s orders for daily summary...');
      console.log('Current user:', user);

      // Get Supabase session token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      console.log('Auth token available:', !!token);

      // Fetch from kitchen-orders endpoint which has the data we need
      const response = await fetch(`/api/kitchen/orders`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Kitchen orders API error:', response.status, errorText);
        throw new Error(`Kitchen orders API returned ${response.status}: ${errorText}`);
      }

      const allOrders = await response.json();
      console.log('Daily Summary: Fetched orders:', allOrders.length);

      // Filter to today's orders only
      const today = new Date().toISOString().split('T')[0];
      const todaysOrders = allOrders.filter((order: any) => {
        const orderDate = new Date(order.created_at || order.createdAt).toISOString().split('T')[0];
        return orderDate === today && order.status !== 'cancelled';
      });

      console.log(`Daily Summary: ${todaysOrders.length} orders today`);

      // Calculate summary statistics
      const pickupOrders = todaysOrders.filter((o: any) => o.order_type === 'pickup' || o.orderType === 'pickup');
      const deliveryOrders = todaysOrders.filter((o: any) => o.order_type === 'delivery' || o.orderType === 'delivery');

      const totalRevenue = todaysOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total || 0), 0);
      const pickupRevenue = pickupOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total || 0), 0);
      const deliveryRevenue = deliveryOrders.reduce((sum: number, o: any) => sum + parseFloat(o.total || 0), 0);

      const totalTips = todaysOrders.reduce((sum: number, o: any) => sum + parseFloat(o.tip || 0), 0);
      const pickupTips = pickupOrders.reduce((sum: number, o: any) => sum + parseFloat(o.tip || 0), 0);
      const deliveryTips = deliveryOrders.reduce((sum: number, o: any) => sum + parseFloat(o.tip || 0), 0);

      const totalTax = todaysOrders.reduce((sum: number, o: any) => sum + parseFloat(o.tax || 0), 0);
      const totalDeliveryFees = deliveryOrders.reduce((sum: number, o: any) => sum + parseFloat(o.delivery_fee || o.deliveryFee || 0), 0);

      // Count popular items
      const itemCounts: Map<string, number> = new Map();
      todaysOrders.forEach((order: any) => {
        const items = order.items || [];
        items.forEach((item: any) => {
          const itemName = item.menuItem?.name || item.name || 'Unknown Item';
          itemCounts.set(itemName, (itemCounts.get(itemName) || 0) + (item.quantity || 1));
        });
      });

      const topItems = Array.from(itemCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      // Convert to print format
      const formattedOrders = [{
        id: 'daily-summary',
        orderType: 'summary',
        customerName: 'Daily Summary',
        phone: '',
        address: '',
        items: topItems,
        total: totalRevenue,
        tax: totalTax,
        deliveryFee: totalDeliveryFees,
        tip: totalTips,
        specialInstructions: '',
        createdAt: new Date().toISOString(),
        userId: null,
        pointsEarned: 0,
        paymentStatus: 'paid',
        payment_status: 'paid',
        // Add summary-specific data
        totalOrders: todaysOrders.length,
        pickupOrders: pickupOrders.length,
        deliveryOrders: deliveryOrders.length,
        pickupRevenue: pickupRevenue,
        deliveryRevenue: deliveryRevenue,
        pickupTips: pickupTips,
        deliveryTips: deliveryTips
      }];

      // Generate the daily summary receipt
      const summaryReceipt = printDailySummary(formattedOrders);

      // Get printer server URL using same logic as regular order printing
      const printerServerUrl = await getPrinterServerUrl();
      console.log(`Sending daily summary to printer server: ${printerServerUrl}`);

      const printResponse = await fetch(`${printerServerUrl}/print`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiptData: summaryReceipt,
          orderId: 'daily-summary',
          receiptType: 'daily-summary'
        })
      });

      if (!printResponse.ok) {
        throw new Error('Print request failed');
      }

      toast({
        title: "Daily Summary Printed",
        description: todaysOrders.length === 0
          ? "Summary printed. No orders received today."
          : `Successfully printed summary: ${todaysOrders.length} orders, $${totalRevenue.toFixed(2)} revenue, $${totalTips.toFixed(2)} tips.`,
      });

      setShowDailySummaryModal(false);

    } catch (error: any) {
      console.error('Failed to print daily summary:', error);

      // Check if it's an authentication error
      if (error.message?.includes('401')) {
        toast({
          title: "Authentication Error",
          description: "Your session may have expired. Please refresh the page and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Print Failed",
          description: error.message || "Could not print daily summary. Make sure the printer is connected.",
          variant: "destructive",
        });
      }
    }
  };

  // Helper function to generate customer message based on reason
  const getCustomerMessageForReason = (reason: string, customMessage?: string, restOfDay?: boolean): string => {
    if (reason === 'custom' && customMessage) {
      return customMessage;
    }

    if (restOfDay) {
      const restOfDayMessages: Record<string, string> = {
        high_volume: 'We are closed for the rest of the day due to high volume. Thank you for your understanding!',
        staff_shortage: 'We are closed for the rest of the day due to staffing. We apologize for the inconvenience!',
        equipment_issue: 'We are closed for the rest of the day due to equipment issues. We apologize for the inconvenience!',
        break_time: 'We are closed for the rest of the day. Thank you for your understanding!',
        other: 'We are closed for the rest of the day. Thank you for your understanding!'
      };
      return restOfDayMessages[reason] || restOfDayMessages.other;
    }

    const messages: Record<string, string> = {
      high_volume: 'We are temporarily pausing orders due to high volume. Please check back shortly!',
      staff_shortage: 'We are temporarily pausing orders due to limited staff availability. We appreciate your patience!',
      equipment_issue: 'We are temporarily pausing orders due to equipment maintenance. Please check back soon!',
      break_time: 'We are taking a brief break. Orders will resume shortly. Thank you for your patience!',
      other: 'We are temporarily pausing orders. Please check back shortly!'
    };

    return messages[reason] || messages.other;
  };

  // Helper function to get reason display name
  const getReasonDisplayName = (reason: string): string => {
    const names: Record<string, string> = {
      high_volume: 'High Volume',
      staff_shortage: 'Staff Shortage',
      equipment_issue: 'Equipment Issue',
      break_time: 'Break Time',
      custom: 'Custom Reason',
      other: 'Other'
    };

    return names[reason] || 'Emergency Pause';
  };

  // Toggle pause ordering (emergency pause)
  const togglePauseOrdering = async (reason?: string, customMessage?: string, restOfDay?: boolean) => {
    setIsTogglingPause(true);
    try {
      const newPauseState = !isOrderingPaused;

      // If pausing, use provided reason, otherwise default
      const pauseReasonToUse = newPauseState ? (reason || 'high_volume') : '';
      const customerMessage = newPauseState
        ? getCustomerMessageForReason(pauseReasonToUse, customMessage, restOfDay)
        : '';
      const reasonDisplay = newPauseState
        ? `${getReasonDisplayName(pauseReasonToUse)}${restOfDay ? ' (Rest of Day)' : ''}`
        : '';

      // Use apiRequest to ensure proper authentication
      await apiRequest('PUT', '/api/vacation-mode', {
        isEnabled: newPauseState,
        message: customerMessage,
        startDate: '',
        endDate: '',
        reason: newPauseState ? reasonDisplay : ''
      });

      queryClient.invalidateQueries({ queryKey: ['/api/vacation-mode'] });
      toast({
        title: newPauseState ? "Ordering Paused" : "Ordering Resumed",
        description: newPauseState
          ? `Orders paused: ${reasonDisplay}. Customers will see a message that ordering is temporarily unavailable.`
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
      setShowPauseReasonDialog(false);
    }
  };

  // Handle pause button click
  const handlePauseButtonClick = () => {
    if (isOrderingPaused) {
      // If currently paused, resume immediately
      togglePauseOrdering();
    } else {
      // If not paused, show dialog to select reason
      setShowPauseReasonDialog(true);
    }
  };

  // Handle pause with reason from dialog
  const handlePauseWithReason = () => {
    togglePauseOrdering(pauseReason, customPauseMessage, isRestOfDay);
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

      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 overflow-y-auto">
        {/* Audio Activation Banner - Shows until user clicks Test Sound */}
        {!audioActivated && soundEnabled && (
          <div className="bg-yellow-500 text-white px-4 py-3 shadow-lg border-b-4 border-yellow-600">
            <div className="container mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 flex-shrink-0 animate-pulse" />
                <p className="font-semibold text-sm md:text-base">
                  🔊 Click "Test Sound" to enable order notifications on iPad/Safari
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="bg-white text-yellow-700 hover:bg-yellow-50 border-2 border-white font-bold shadow-md flex-shrink-0"
                onClick={() => {
                  playTestSound();
                  setAudioActivated(true);
                  sessionStorage.setItem('audioActivated', 'true');
                }}
              >
                <Volume2 className="mr-2 h-4 w-4" />
                Test Sound
              </Button>
            </div>
          </div>
        )}
        <header className="bg-gradient-to-r from-[#d73a31] via-[#c22d25] to-[#d73a31] text-white p-4 md:p-6 shadow-2xl border-b-4 border-red-700">
          <div className="container mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight drop-shadow-lg">Favilla's Kitchen</h1>
              <p className="text-red-100 text-sm mt-1 font-medium">Professional Order Management</p>
            </div>
            <div className="flex items-center gap-2 md:gap-3 text-sm md:text-base">
              {orderStatusMode === 'manual' && (
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white/95 text-[#d73a31] border-2 border-white hover:bg-white hover:scale-105 font-semibold shadow-lg transition-all duration-200 backdrop-blur-sm"
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
              )}
              <Button
                variant="outline"
                size="sm"
                className="bg-white/95 text-[#d73a31] border-2 border-white hover:bg-white hover:scale-105 font-semibold shadow-lg transition-all duration-200 backdrop-blur-sm"
                onClick={() => {
                  playTestSound();
                  // Mark audio as activated so banner doesn't show again
                  setAudioActivated(true);
                  sessionStorage.setItem('audioActivated', 'true');
                }}
              >
                <Volume2 className="mr-1 md:mr-2 h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Test Sound</span>
                <span className="sm:hidden">Test</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`border-2 font-semibold shadow-lg transition-all duration-200 hover:scale-105 ${
                  isOrderingPaused
                    ? 'bg-yellow-500 text-white border-yellow-300 hover:bg-yellow-600'
                    : 'bg-white/95 text-[#d73a31] border-white hover:bg-white backdrop-blur-sm'
                }`}
                onClick={handlePauseButtonClick}
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
                    className="bg-white/95 text-[#d73a31] border-2 border-white hover:bg-white hover:scale-105 font-semibold shadow-lg transition-all duration-200 backdrop-blur-sm"
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
                  <DropdownMenuItem onClick={() => {
                    // Defer navigation to next tick to avoid state updates during cleanup
                    setTimeout(() => navigate('/'), 0);
                  }}>
                    <Home className="mr-2 h-4 w-4" />
                    <span>Home</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    // Defer navigation to next tick to avoid state updates during cleanup
                    setTimeout(() => navigate('/admin/dashboard'), 0);
                  }}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Admin Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setShowDailySummaryModal(true)}
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    <span>Print Daily Summary</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowItemManagementModal(true)}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    <span>Item Management</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setShowStatusModeModal(true)}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Order Status Mode</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      try {
                        await apiRequest('POST', '/api/logout', {});
                        // Defer navigation to next tick to avoid state updates during cleanup
                        setTimeout(() => {
                          navigate('/');
                          window.location.reload();
                        }, 0);
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
          <div className="bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 border-b-4 border-yellow-700 p-4 md:p-6 shadow-xl">
            <div className="container mx-auto flex items-center gap-4 text-white">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full">
                <PauseCircle className="h-10 w-10 flex-shrink-0 drop-shadow-lg" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-xl md:text-2xl drop-shadow-md">
                  ⏸️ Orders Temporarily Paused
                  {vacationMode?.reason && (
                    <span className="font-semibold text-base md:text-lg ml-2 bg-white/20 px-3 py-1 rounded-full">
                      {vacationMode.reason}
                    </span>
                  )}
                </p>
                <p className="text-sm md:text-base mt-2 font-medium">ASAP orders are currently paused. Scheduled orders will still come through.</p>
                {vacationMode?.message && (
                  <p className="text-sm md:text-base mt-2 italic bg-white/20 px-3 py-2 rounded-lg inline-block">
                    Customer message: "{vacationMode.message}"
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <main className="container mx-auto p-2 md:p-4">
          {isColumnMode && orderStatusMode === 'manual' ? (
            // Column Mode - 3 Column Kanban View (only available in manual mode)
            <>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">Kitchen Display</h2>
                  <p className="text-sm text-gray-600 font-medium">Column View - Real-time Order Management</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] })}
                >
                  🔄 Refresh
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
                {/* Column 1: Ready to Start */}
                <div className="flex flex-col bg-white rounded-2xl shadow-2xl border-4 border-red-100 overflow-hidden transform transition-all duration-300 hover:scale-[1.02]">
                  <div className="bg-gradient-to-r from-red-500 via-red-600 to-red-500 text-white p-4 font-bold text-center flex items-center justify-center gap-3 shadow-lg">
                    <span className="text-lg">Ready to Start</span>
                    <Badge className="bg-white text-red-600 font-bold text-base px-3 py-1 shadow-md">
                      {orders?.filter((o: any) => o.status === "pending" && (o.fulfillmentTime === 'asap' || isOrderReadyToStart(o))).length || 0}
                    </Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-red-50/30 to-transparent">
                    {orders?.filter((o: any) => o.status === "pending" && (o.fulfillmentTime === 'asap' || isOrderReadyToStart(o))).map((order: any) => (
                      <Card
                        key={order.id}
                        className="cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 border-red-200/50 hover:border-red-400 bg-gradient-to-br from-white to-red-50/20 hover:scale-[1.02]"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderModal(true);
                        }}
                      >
                        <CardContent className="p-5">
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
                            className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
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
                <div className="flex flex-col bg-white rounded-2xl shadow-2xl border-4 border-yellow-100 overflow-hidden transform transition-all duration-300 hover:scale-[1.02]">
                  <div className="bg-gradient-to-r from-yellow-500 via-yellow-600 to-yellow-500 text-white p-4 font-bold text-center flex items-center justify-center gap-3 shadow-lg">
                    <span className="text-lg">Cooking</span>
                    <Badge className="bg-white text-yellow-600 font-bold text-base px-3 py-1 shadow-md">
                      {orders?.filter((o: any) => o.status === "cooking").length || 0}
                    </Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-yellow-50/30 to-transparent">
                    {orders?.filter((o: any) => o.status === "cooking").map((order: any) => (
                      <Card
                        key={order.id}
                        className="cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 border-yellow-200/50 hover:border-yellow-400 bg-gradient-to-br from-white to-yellow-50/20 hover:scale-[1.02]"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderModal(true);
                        }}
                      >
                        <CardContent className="p-5">
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
                            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
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
                <div className="flex flex-col bg-white rounded-2xl shadow-2xl border-4 border-green-100 overflow-hidden transform transition-all duration-300 hover:scale-[1.02]">
                  <div className="bg-gradient-to-r from-green-500 via-green-600 to-green-500 text-white p-4 font-bold text-center flex items-center justify-center gap-3 shadow-lg">
                    <span className="text-lg">Ready for Pickup</span>
                    <Badge className="bg-white text-green-600 font-bold text-base px-3 py-1 shadow-md">
                      {orders?.filter((o: any) => o.status === "completed").length || 0}
                    </Badge>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-green-50/30 to-transparent">
                    {orders?.filter((o: any) => o.status === "completed").map((order: any) => (
                      <Card
                        key={order.id}
                        className="cursor-pointer hover:shadow-2xl transition-all duration-300 border-2 border-green-200/50 hover:border-green-400 bg-gradient-to-br from-white to-green-50/20 hover:scale-[1.02]"
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowOrderModal(true);
                        }}
                      >
                        <CardContent className="p-5">
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
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 md:mb-8">
              <TabsList className="w-full sm:w-auto overflow-x-auto flex-wrap sm:flex-nowrap text-xs sm:text-sm bg-white shadow-lg border-2 border-gray-200 p-1">
                {orderStatusMode === 'automatic' && (
                  <TabsTrigger value="today" className="px-2 md:px-3">
                    <span className="hidden sm:inline">Today's Orders</span>
                    <span className="sm:hidden">Today</span>
                    {orders?.filter((o: any) => {
                      const orderDate = new Date(o.created_at || o.createdAt).toISOString().split('T')[0];
                      const today = new Date().toISOString().split('T')[0];
                      return orderDate === today && o.status !== 'cancelled' && !(o.status === 'pending' && o.fulfillmentTime === 'scheduled' && !isOrderReadyToStart(o));
                    }).length > 0 && (
                      <Badge className="ml-1 sm:ml-2 bg-blue-500 text-xs">{orders.filter((o: any) => {
                        const orderDate = new Date(o.created_at || o.createdAt).toISOString().split('T')[0];
                        const today = new Date().toISOString().split('T')[0];
                        return orderDate === today && o.status !== 'cancelled' && !(o.status === 'pending' && o.fulfillmentTime === 'scheduled' && !isOrderReadyToStart(o));
                      }).length}</Badge>
                    )}
                  </TabsTrigger>
                )}
                {orderStatusMode === 'manual' && (
                  <>
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
                    <TabsTrigger value="cancelled" className="px-2 md:px-3">
                      Cancelled
                      {orders?.filter((o: any) => o.status === 'cancelled').length > 0 && (
                        <Badge className="ml-1 sm:ml-2 bg-red-500 text-xs">{orders.filter((o: any) => o.status === 'cancelled').length}</Badge>
                      )}
                    </TabsTrigger>
                  </>
                )}
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
                className="w-full sm:w-auto bg-white hover:bg-gray-50 border-2 border-gray-300 hover:border-gray-400 font-semibold shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] })}
              >
                🔄 Refresh
              </Button>
            </div>
            
            <TabsContent value={activeTab} className="mt-0">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-20 bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-xl border-2 border-gray-200">
                  <div className="text-6xl mb-4 opacity-50">📋</div>
                  <p className="text-2xl font-bold text-gray-700 mb-2">All Clear!</p>
                  <p className="text-lg text-gray-500">No {activeTab === 'cooking' ? 'cooking' : activeTab} orders at the moment</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredOrders.map((order: any) => (
                    <Card key={order.id} className="overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] border-2">
                      <CardHeader className={`
                        ${order.status === 'pending' ? 'bg-gradient-to-br from-red-100 to-red-50 border-b-4 border-red-300' : ''}
                        ${order.status === 'cooking' ? 'bg-gradient-to-br from-yellow-100 to-yellow-50 border-b-4 border-yellow-300' : ''}
                        ${order.status === 'completed' ? 'bg-gradient-to-br from-green-100 to-green-50 border-b-4 border-green-300' : ''}
                        ${order.status === 'picked_up' ? 'bg-gradient-to-br from-gray-100 to-gray-50 border-b-4 border-gray-300' : ''}
                      `}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="text-xl font-bold text-gray-900">
                              {order.customer_name || 'Guest'}
                            </p>
                            <CardTitle className="text-base">Order #{order.id}</CardTitle>
                          </div>
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
                          {order.items.map((item: any) => {
                            // item.price already includes all options/toppings from checkout calculation
                            // Do NOT add option prices again or we'll double-count
                            const totalPrice = parseFloat(item.price) || 0;

                            return (
                            <div key={item.id} className="border-b pb-2">
                              <div className="flex justify-between font-medium">
                                <span>{item.quantity}x {item.menuItem?.name || 'Unknown Item'}</span>
                                <span>${formatPrice(totalPrice)}</span>
                              </div>
                              {/* Display detailed choices and addons */}
                              {item.halfAndHalf ? (
                                /* Half-and-Half Pizza Display */
                                <div className="text-sm grid grid-cols-2 gap-2 mt-2 border-t pt-2">
                                  {/* First Half */}
                                  <div className="border-r-2 border-orange-300 pr-2">
                                    <div className="font-bold text-orange-600 mb-1">🍕 1st Half</div>
                                    {item.halfAndHalf.firstHalf && item.halfAndHalf.firstHalf.length > 0 ? (
                                      item.halfAndHalf.firstHalf.map((option: any, idx: number) => {
                                        const showPrice = option.price && option.price > 0;
                                        return (
                                          <div key={idx} className="flex justify-between items-start text-xs">
                                            <span className="flex-1">{option.itemName}</span>
                                            {showPrice && (
                                              <span className="text-green-600 font-medium ml-1">+${option.price.toFixed(2)}</span>
                                            )}
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <span className="text-gray-400 italic text-xs">Plain</span>
                                    )}
                                  </div>

                                  {/* Second Half */}
                                  <div className="pl-2">
                                    <div className="font-bold text-blue-600 mb-1">🍕 2nd Half</div>
                                    {item.halfAndHalf.secondHalf && item.halfAndHalf.secondHalf.length > 0 ? (
                                      item.halfAndHalf.secondHalf.map((option: any, idx: number) => {
                                        const showPrice = option.price && option.price > 0;
                                        return (
                                          <div key={idx} className="flex justify-between items-start text-xs">
                                            <span className="flex-1">{option.itemName}</span>
                                            {showPrice && (
                                              <span className="text-green-600 font-medium ml-1">+${option.price.toFixed(2)}</span>
                                            )}
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <span className="text-gray-400 italic text-xs">Plain</span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                /* Regular Options Display */
                                item.options && Array.isArray(item.options) && item.options.length > 0 && (
                                  <div className="text-sm text-gray-600 space-y-1">
                                    {item.options.map((option: any, idx: number) => {
                                      // Simplify group names for kitchen display
                                      const groupName = (option.groupName || '').replace(/specialty|gourmet|pizza/gi, '').trim();
                                      const isSize = option.groupName?.toLowerCase().includes('size');
                                      const showPrice = option.price && option.price > 0 && !isSize;

                                      return (
                                        <div key={idx} className="flex justify-between items-center">
                                          {/* Show category label only for sizes, just the item name for add-ons */}
                                          <span>{isSize ? `${groupName}: ${option.itemName}` : option.itemName}</span>
                                          {showPrice && (
                                            <span className="text-green-600 font-medium">+${option.price.toFixed(2)}</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )
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
                            );
                          })}
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
                          <span>Total Paid:</span>
                          <span>${formatPrice(Number(order.total))}</span>
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

                          {orderStatusMode === 'manual' && order.status === 'pending' && (
                            <Button
                              className={`w-full sm:flex-1 h-12 text-base font-bold text-white shadow-lg hover:shadow-xl transition-all duration-300 ${
                                isOrderReadyToStart(order)
                                  ? "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 hover:scale-105"
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

                          {orderStatusMode === 'manual' && order.status === 'cooking' && (
                            <Button
                              className="w-full sm:flex-1 h-12 text-base font-bold text-white bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                              onClick={() => {
                                console.log('✅ Complete clicked for order:', order.id);
                                updateOrderStatus(order.id, 'completed');
                              }}
                            >
                              ✅ Complete
                            </Button>
                          )}

                          {orderStatusMode === 'manual' && order.status === 'completed' && (
                            <div className="flex flex-col gap-2 sm:flex-row sm:flex-1">
                              <Button
                                className="w-full h-12 text-base font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                                onClick={() => {
                                  console.log('📦 Picked Up clicked for order:', order.id);
                                  updateOrderStatus(order.id, 'picked_up');
                                }}
                              >
                                📦 Picked Up
                              </Button>
                              <Button
                                className="w-full h-12 text-base font-bold bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
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
                    {selectedOrder.items?.map((item: any) => {
                      // item.price already includes all options/toppings from checkout calculation
                      // Do NOT add option prices again or we'll double-count
                      const totalPrice = parseFloat(item.price) || 0;

                      return (
                      <div key={item.id} className="border-b pb-3 last:border-b-0">
                        <div className="flex justify-between font-medium">
                          <span>{item.quantity}x {item.menuItem?.name || 'Unknown Item'}</span>
                          <span>${formatPrice(totalPrice)}</span>
                        </div>
                        {/* Display detailed choices and addons */}
                        {item.halfAndHalf ? (
                          /* Half-and-Half Pizza Display */
                          <div className="text-sm grid grid-cols-2 gap-3 mt-3 border-t pt-2">
                            {/* First Half */}
                            <div className="border-r-2 border-orange-300 pr-3">
                              <div className="font-bold text-orange-600 mb-2">🍕 1st Half</div>
                              {item.halfAndHalf.firstHalf && item.halfAndHalf.firstHalf.length > 0 ? (
                                item.halfAndHalf.firstHalf.map((option: any, idx: number) => {
                                  const showPrice = option.price && option.price > 0;
                                  return (
                                    <div key={idx} className="flex justify-between items-start text-sm mb-1">
                                      <span className="flex-1">{option.itemName}</span>
                                      {showPrice && (
                                        <span className="text-green-600 font-medium ml-2">+${option.price.toFixed(2)}</span>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <span className="text-gray-400 italic text-sm">Plain</span>
                              )}
                            </div>

                            {/* Second Half */}
                            <div className="pl-3">
                              <div className="font-bold text-blue-600 mb-2">🍕 2nd Half</div>
                              {item.halfAndHalf.secondHalf && item.halfAndHalf.secondHalf.length > 0 ? (
                                item.halfAndHalf.secondHalf.map((option: any, idx: number) => {
                                  const showPrice = option.price && option.price > 0;
                                  return (
                                    <div key={idx} className="flex justify-between items-start text-sm mb-1">
                                      <span className="flex-1">{option.itemName}</span>
                                      {showPrice && (
                                        <span className="text-green-600 font-medium ml-2">+${option.price.toFixed(2)}</span>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <span className="text-gray-400 italic text-sm">Plain</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* Regular Options Display */
                          item.options && Array.isArray(item.options) && item.options.length > 0 && (
                            <div className="text-sm text-gray-600 space-y-1 mt-1">
                              {item.options.map((option: any, idx: number) => {
                                // Simplify group names for kitchen display
                                const groupName = (option.groupName || '').replace(/specialty|gourmet|pizza/gi, '').trim();
                                const isSize = option.groupName?.toLowerCase().includes('size');
                                const showPrice = option.price && option.price > 0 && !isSize;

                                return (
                                  <div key={idx} className="flex justify-between items-center">
                                    {/* Show category label only for sizes, just the item name for add-ons */}
                                    <span>{isSize ? `${groupName}: ${option.itemName}` : option.itemName}</span>
                                    {showPrice && (
                                      <span className="text-green-600 font-medium">+${option.price.toFixed(2)}</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )
                        )}

                        {item.specialInstructions && (
                          <p className="text-sm text-gray-600 italic font-medium bg-yellow-100 px-2 py-1 rounded mt-2">
                            Special: "{item.specialInstructions}"
                          </p>
                        )}
                      </div>
                      );
                    })}
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
                    <span>Total Paid:</span>
                    <span>${formatPrice(Number(selectedOrder.total))}</span>
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

                  {orderStatusMode === 'manual' && selectedOrder.status === 'pending' && (
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

                  {orderStatusMode === 'manual' && selectedOrder.status === 'cooking' && (
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

                  {orderStatusMode === 'manual' && selectedOrder.status === 'completed' && (
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

                  {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'picked_up' && (
                    <Button
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                      onClick={() => handleCancelOrder(selectedOrder)}
                    >
                      ❌ Cancel Order
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Cancel Order Confirmation Dialog */}
        <Dialog open={showCancelConfirmation} onOpenChange={setShowCancelConfirmation}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cancel Order</DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel this order?
              </DialogDescription>
            </DialogHeader>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-900 mb-1">
                    Warning: This action cannot be undone
                  </p>
                  <p className="text-sm text-red-800">
                    The customer will lose all points earned from this order.
                  </p>
                </div>
              </div>
            </div>

            {orderToCancel && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Order #</span>
                  <span className="font-semibold">{orderToCancel.id}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Customer</span>
                  <span className="font-semibold">{orderToCancel.customer_name || 'Guest'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total</span>
                  <span className="font-semibold">${formatPrice(Number(orderToCancel.total))}</span>
                </div>
                {orderToCancel.pointsEarned > 0 && (
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="text-red-600">Points to Revoke</span>
                    <span className="font-semibold text-red-600">{orderToCancel.pointsEarned} points</span>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => {
                  setShowCancelConfirmation(false);
                  setOrderToCancel(null);
                }}
              >
                Keep Order
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto bg-red-500 hover:bg-red-600"
                onClick={confirmCancelOrder}
              >
                Yes, Cancel Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Daily Summary Modal */}
        <Dialog open={showDailySummaryModal} onOpenChange={setShowDailySummaryModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl">End of Day Summary</DialogTitle>
              <DialogDescription className="pt-2">
                It's 30 minutes before closing time. Would you like to print the daily summary report?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-start gap-2 flex-col sm:flex-row">
              <Button
                type="button"
                variant="default"
                className="w-full sm:w-auto"
                onClick={handlePrintDailySummary}
              >
                Yes, Print Summary
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setShowDailySummaryModal(false)}
              >
                No, Maybe Later
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Order Status Mode Modal */}
        <Dialog open={showStatusModeModal} onOpenChange={setShowStatusModeModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">Order Status Mode</DialogTitle>
              <DialogDescription>
                Choose how orders progress through the kitchen workflow
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              <RadioGroup value={orderStatusMode} onValueChange={(value) => updateOrderStatusMode(value as 'manual' | 'automatic')}>
                <div className="flex items-start space-x-3 space-y-0 rounded-md border border-gray-200 p-4 hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="manual" id="manual" />
                  <Label htmlFor="manual" className="font-normal cursor-pointer flex-1">
                    <div className="font-semibold text-base mb-1">Manual Mode</div>
                    <div className="text-sm text-gray-500">
                      Staff must click through each status: Start Cooking → Mark Ready → Mark Picked Up.
                      Best for experienced staff who want full control over order tracking.
                    </div>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 space-y-0 rounded-md border border-gray-200 p-4 hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="automatic" id="automatic" />
                  <Label htmlFor="automatic" className="font-normal cursor-pointer flex-1">
                    <div className="font-semibold text-base mb-1">Automatic Mode</div>
                    <div className="text-sm text-gray-500">
                      Simplified view with no status buttons. Orders appear in a clean list to prepare.
                      Delivery orders automatically sent to ShipDay on payment. Best for new workers.
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <strong>Current Mode: </strong>
                    {orderStatusMode === 'manual' ? 'Manual' : 'Automatic'}
                  </div>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Item Management Modal */}
        <Dialog open={showItemManagementModal} onOpenChange={setShowItemManagementModal}>
          <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col p-0">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle className="text-2xl font-bold">Item Management</DialogTitle>
              <DialogDescription>
                Mark categories, items, and sizes as out of stock quickly and easily
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {(() => {
                // Handle both array format and object format
                const categories = Array.isArray(categoriesData) ? categoriesData : (categoriesData?.categories || []);
                const sortedCategories = categories
                  .filter((cat: any) => cat.isActive)
                  .sort((a: any, b: any) => a.order - b.order);

                if (sortedCategories.length === 0) {
                  return (
                    <div className="flex items-center justify-center py-12 text-gray-500">
                      <p>No categories available</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {sortedCategories.map((category: any) => {
                      const isExpanded = expandedItemCategories.has(category.name);
                      const categoryItems = menuItems.filter((item: any) => item.category === category.name);
                      const isUnavailable = category.isTemporarilyUnavailable;

                      return (
                        <div key={category.id} className="border rounded-lg overflow-hidden">
                          {/* Category Header */}
                          <div className="bg-gray-50 border-b p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 flex-1">
                                <button
                                  onClick={() => {
                                    const newExpanded = new Set(expandedItemCategories);
                                    if (isExpanded) {
                                      newExpanded.delete(category.name);
                                    } else {
                                      newExpanded.add(category.name);
                                    }
                                    setExpandedItemCategories(newExpanded);
                                  }}
                                  className="hover:bg-gray-200 p-1 rounded"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-5 w-5" />
                                  ) : (
                                    <ChevronRight className="h-5 w-5" />
                                  )}
                                </button>
                                <div className="flex-1">
                                  <h3 className="font-bold text-lg">{category.name}</h3>
                                  <p className="text-sm text-gray-600">{categoryItems.length} items</p>
                                </div>
                                {isUnavailable && (
                                  <Badge variant="destructive" className="animate-pulse">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Out of Stock
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 ml-4">
                                <Switch
                                  checked={!isUnavailable}
                                  onCheckedChange={(checked) =>
                                    toggleCategoryAvailability(category.id, !checked, category.name)
                                  }
                                />
                                <span className="text-sm font-medium min-w-[90px]">
                                  {isUnavailable ? 'Unavailable' : 'Available'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Category Items (when expanded) */}
                          {isExpanded && categoryItems.length > 0 && (
                            <div className="p-4 space-y-2 bg-white">
                              {categoryItems.map((item: any) => {
                                const itemAvailable = item.isAvailable !== false;
                                return (
                                  <div key={item.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded hover:bg-gray-100">
                                    <div className="flex-1">
                                      <span className="font-medium">{item.name}</span>
                                      {!itemAvailable && (
                                        <Badge variant="destructive" className="ml-2">
                                          Out of Stock
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <Switch
                                        checked={itemAvailable}
                                        onCheckedChange={(checked) => toggleItemAvailability(item.id, checked, item.name)}
                                      />
                                      <span className="text-sm font-medium min-w-[90px]">
                                        {itemAvailable ? 'Available' : 'Unavailable'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Sizes Section */}
              <div className="mt-8">
                <h3 className="text-lg font-bold mb-4 text-gray-900">Size & Option Management</h3>
                {(() => {
                  // Show ALL active choice groups (not just sizes)
                  const activeGroups = (Array.isArray(choiceGroups) ? choiceGroups : []).filter((cg: any) => cg.isActive);

                  if (activeGroups.length === 0) {
                    return (
                      <div className="text-center py-6 text-gray-500 bg-gray-50 rounded-lg">
                        <p>No choice groups found</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {activeGroups.map((group: any) => {
                        const groupItems = (Array.isArray(choiceItems) ? choiceItems : []).filter((item: any) =>
                          item.choiceGroupId === group.id
                        );

                        if (groupItems.length === 0) return null;

                        const isExpanded = expandedChoiceGroups.has(group.id);
                        const unavailableCount = groupItems.filter((item: any) => item.isTemporarilyUnavailable).length;

                        return (
                          <div key={group.id} className="border rounded-lg overflow-hidden bg-white">
                            {/* Choice Group Header */}
                            <div
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                              onClick={() => {
                                const newExpanded = new Set(expandedChoiceGroups);
                                if (isExpanded) {
                                  newExpanded.delete(group.id);
                                } else {
                                  newExpanded.add(group.id);
                                }
                                setExpandedChoiceGroups(newExpanded);
                              }}
                            >
                              <div className="flex items-center gap-3">
                                {isExpanded ? (
                                  <ChevronDown className="h-5 w-5 text-gray-500" />
                                ) : (
                                  <ChevronRight className="h-5 w-5 text-gray-500" />
                                )}
                                <h4 className="font-semibold text-md text-gray-800">{group.name}</h4>
                                {unavailableCount > 0 && (
                                  <Badge variant="destructive" className="text-xs">
                                    {unavailableCount} Out of Stock
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                {groupItems.length} {groupItems.length === 1 ? 'option' : 'options'}
                              </div>
                            </div>

                            {/* Choice Group Items */}
                            {isExpanded && (
                              <div className="border-t p-4 bg-gray-50">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {groupItems.map((choiceItem: any) => {
                                    const isUnavailable = choiceItem.isTemporarilyUnavailable || false;
                                    return (
                                      <div
                                        key={choiceItem.id}
                                        className="flex items-center justify-between p-3 bg-white rounded-lg border"
                                      >
                                        <div className="flex-1">
                                          <span className="font-medium">{choiceItem.name}</span>
                                          {isUnavailable && (
                                            <Badge variant="destructive" className="ml-2 text-xs">
                                              Out of Stock
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <Switch
                                            checked={!isUnavailable}
                                            onCheckedChange={(checked) =>
                                              toggleSizeAvailability(choiceItem.id, !checked, choiceItem.name)
                                            }
                                          />
                                          <span className="text-sm font-medium min-w-[90px]">
                                            {isUnavailable ? 'Unavailable' : 'Available'}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            <DialogFooter className="px-6 pb-6 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setShowItemManagementModal(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Pause Reason Dialog */}
        <Dialog open={showPauseReasonDialog} onOpenChange={setShowPauseReasonDialog}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-xl">Pause Orders - Select Reason</DialogTitle>
              <DialogDescription className="pt-2">
                Choose why you're pausing orders. This helps track operations and informs customers appropriately.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <RadioGroup value={pauseReason} onValueChange={setPauseReason}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high_volume" id="high_volume" />
                  <Label htmlFor="high_volume" className="cursor-pointer">
                    <div>
                      <div className="font-medium">High Volume / Too Busy</div>
                      <div className="text-sm text-gray-500">Temporarily overwhelmed with orders</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="staff_shortage" id="staff_shortage" />
                  <Label htmlFor="staff_shortage" className="cursor-pointer">
                    <div>
                      <div className="font-medium">Staff Shortage</div>
                      <div className="text-sm text-gray-500">Limited staff available</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="equipment_issue" id="equipment_issue" />
                  <Label htmlFor="equipment_issue" className="cursor-pointer">
                    <div>
                      <div className="font-medium">Equipment Issue</div>
                      <div className="text-sm text-gray-500">Equipment maintenance or malfunction</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="break_time" id="break_time" />
                  <Label htmlFor="break_time" className="cursor-pointer">
                    <div>
                      <div className="font-medium">Taking a Break</div>
                      <div className="text-sm text-gray-500">Brief staff break</div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="cursor-pointer">
                    <div>
                      <div className="font-medium">Custom Reason</div>
                      <div className="text-sm text-gray-500">Write your own message</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {/* Duration Toggle */}
              <div className="flex items-start space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                <Checkbox
                  id="restOfDay"
                  checked={isRestOfDay}
                  onCheckedChange={(checked) => setIsRestOfDay(checked as boolean)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <Label htmlFor="restOfDay" className="cursor-pointer font-medium text-gray-900">
                    Close for rest of day
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Check this if you're closing permanently for today (not just a temporary pause)
                  </p>
                </div>
              </div>

              {pauseReason === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="customMessage">Custom Message for Customers</Label>
                  <Textarea
                    id="customMessage"
                    placeholder="Enter a custom message that customers will see..."
                    value={customPauseMessage}
                    onChange={(e) => setCustomPauseMessage(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              )}

              {pauseReason !== 'custom' && (
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm font-medium text-blue-900 mb-1">Customer will see:</p>
                  <p className="text-sm text-blue-800 italic">
                    "{getCustomerMessageForReason(pauseReason, undefined, isRestOfDay)}"
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setShowPauseReasonDialog(false)}
                disabled={isTogglingPause}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600"
                onClick={handlePauseWithReason}
                disabled={isTogglingPause || (pauseReason === 'custom' && !customPauseMessage.trim())}
              >
                {isTogglingPause ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Pausing...
                  </>
                ) : (
                  <>
                    <PauseCircle className="mr-2 h-4 w-4" />
                    Pause Orders
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default KitchenPage;
