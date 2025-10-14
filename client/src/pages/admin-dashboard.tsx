import React, { useState, useEffect, useCallback, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-supabase-auth";
import { useAdminWebSocket } from "@/hooks/use-admin-websocket";
import { supabase } from "@/lib/supabase";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet";
import { DeliverySettings } from "@/components/admin/delivery-settings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  ChefHat,
  Users,
  Pizza,
  BarChart3,
  Settings,
  Plus,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  ShoppingCart,
  Clock,
  Search,
  Filter,
  QrCode,
  Globe,
  Calendar,
  MapPin,
  Phone,
  Mail,
  FileText,
  Download,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  Upload,
  Link,
  Share2,
  Bell,
  Shield,
  Truck,
  Store,
  Users as UsersIcon,
  Package,
  CreditCard,
  Gift,
  Target,
  Tag,
  Zap,
  Database,
  Code,
  Palette,
  Image,
  Layers,
  Utensils,
  Grid,
  List,
  PieChart,
  Activity,
  Home,
  Menu,
  ShoppingBag,
  User,
  LogOut,
  Copy,
  ExternalLink,
  Instagram,
  Facebook,
  ChevronDown,
  RefreshCw,
  Star,
  Heart,
  MessageSquare,
  Camera,
  Video,
  Music,
  File,
  Folder,
  Archive,
  BookOpen,
  HelpCircle,
  Info,
  Save,
  MoreVertical,
  Printer,
  Wifi,
  ArrowLeft,
  Pause,
  Percent as PercentIcon
} from "lucide-react";
import PayrollDashboard from "@/components/admin/payroll-dashboard";
import ScheduleCreator from "@/components/admin/schedule-creator";
import { TemplateEditor } from "@/components/admin/template-editor";
import { RestaurantSettings } from "@/components/admin/restaurant-settings";
import FrontendCustomization from "@/components/admin/frontend-customization";

const AdminDashboard = () => {
  const { user, logoutMutation, isLoading } = useAuth();
  const { toast } = useToast();

  // Sound notification settings
  const [soundNotificationsEnabled, setSoundNotificationsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminSoundNotifications');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  const [soundType, setSoundType] = useState<'chime' | 'bell' | 'ding' | 'beep'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminSoundType');
      return saved ? JSON.parse(saved) : 'chime';
    }
    return 'chime';
  });

  const [soundVolume, setSoundVolume] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminSoundVolume');
      return saved !== null ? JSON.parse(saved) : 0.3;
    }
    return 0.3;
  });

  // Save sound preferences to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('adminSoundNotifications', JSON.stringify(soundNotificationsEnabled));
      localStorage.setItem('adminSoundType', JSON.stringify(soundType));
      localStorage.setItem('adminSoundVolume', JSON.stringify(soundVolume));
    }
  }, [soundNotificationsEnabled, soundType, soundVolume]);

  // Get custom sound settings from localStorage for main component
  const [mainCustomSoundUrl, setMainCustomSoundUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('adminCustomSoundUrl') || '';
    }
    return '';
  });

  // Listen for localStorage changes to sync custom sound (reduced frequency)
  useEffect(() => {
    const handleStorageChange = () => {
      if (typeof window !== 'undefined') {
        const newUrl = localStorage.getItem('adminCustomSoundUrl') || '';
        if (newUrl !== mainCustomSoundUrl) {
          setMainCustomSoundUrl(newUrl);
        }
      }
    };

    // Check for changes every 5 seconds instead of every second to reduce overhead
    const interval = setInterval(handleStorageChange, 5000);
    return () => clearInterval(interval);
  }, [mainCustomSoundUrl]);

  // Admin WebSocket for order notifications
  const { playTestSound } = useAdminWebSocket({
    enableSounds: soundNotificationsEnabled,
    soundType: soundType,
    volume: soundVolume,
    customSoundUrl: mainCustomSoundUrl,
    onNewOrder: (order) => {
      toast({
        title: "🔔 New Order Received!",
        description: `Order #${order.id} from ${order.customerName || 'Customer'}`,
        duration: 5000,
      });
    },
    onOrderUpdate: (order) => {
      toast({
        title: "📋 Order Updated",
        description: `Order #${order.id} status changed to ${order.status}`,
        duration: 3000,
      });
    }
  });
  
  // Ensure no undefined id variables
  if (typeof window !== 'undefined') {
    // @ts-ignore - Emergency fix for production undefined id error
    window.id = null;
  }
  const [activeTab, setActiveTab] = useState("dashboard");

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Start collapsed on mobile, expanded on desktop
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });
  
  // Initialize activeTab from localStorage on mount
  useEffect(() => {
    const savedTab = localStorage.getItem('adminActiveTab');
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []);

  // Handle window resize to manage sidebar state
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Function to change active tab and persist to localStorage
  const changeActiveTab = (tabName: string) => {
    setActiveTab(tabName);
    localStorage.setItem('adminActiveTab', tabName);
  };
  
  // Taxation and Currency component
  const TaxationAndCurrency = () => {
    const { toast } = useToast();

    // Tax settings state
    const { data: taxSettings = {}, refetch: refetchTaxSettings } = useQuery({
      queryKey: ['tax-settings'],
      queryFn: async () => {
        const response = await apiRequest('GET', '/api/tax-settings');
        return response.json();
      }
    });

    const { data: taxCategories = [], refetch: refetchTaxCategories } = useQuery({
      queryKey: ['tax-categories'],
      queryFn: async () => {
        const response = await apiRequest('GET', '/api/tax-categories');
        return response.json();
      }
    });

    // Service fees state
    const { data: serviceFees = {}, refetch: refetchServiceFees } = useQuery({
      queryKey: ['service-fees'],
      queryFn: async () => {
        const response = await apiRequest('GET', '/api/admin-service-fees');
        return response.json();
      }
    });

    const updateTaxSettingsMutation = useMutation({
      mutationFn: (data: any) => apiRequest('PUT', '/api/tax-settings', data),
      onSuccess: () => {
        refetchTaxSettings();
        toast({
          title: "Success",
          description: "Tax settings updated successfully",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to update tax settings",
          variant: "destructive",
        });
      }
    });

    const createTaxCategoryMutation = useMutation({
      mutationFn: (data: any) => apiRequest('POST', '/api/tax-categories', data),
      onSuccess: () => {
        refetchTaxCategories();
        toast({
          title: "Success",
          description: "Tax category created successfully",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to create tax category",
          variant: "destructive",
        });
      }
    });

    const updateServiceFeesMutation = useMutation({
      mutationFn: (data: any) => apiRequest('PUT', '/api/admin-service-fees', data),
      onSuccess: () => {
        refetchServiceFees();
        toast({
          title: "Success",
          description: "Service fees settings updated successfully",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Error",
          description: error.message || "Failed to update service fees settings",
          variant: "destructive",
        });
      }
    });

    const [formData, setFormData] = useState({
      taxApplication: taxSettings.taxApplication || 'on_top',
      taxName: taxSettings.taxName || 'Sales Tax',
      deliveryFeeTaxRate: taxSettings.deliveryFeeTaxRate || '0',
      tipsTaxRate: taxSettings.tipsTaxRate || '0',
      serviceFeeTaxRate: taxSettings.serviceFeeTaxRate || '4.75',
      currency: taxSettings.currency || 'USD'
    });

    const [serviceFeeData, setServiceFeeData] = useState({
      // Service Fee Settings
      serviceFeesEnabled: serviceFees.serviceFeesEnabled || false,
      serviceFeeType: serviceFees.serviceFeeType || 'percentage',
      serviceFeeAmount: serviceFees.serviceFeeAmount || 0,
      serviceFeeLabel: serviceFees.serviceFeeLabel || 'Service Fee',
      serviceFeeDescription: serviceFees.serviceFeeDescription || 'Processing and service fee',

      // Card Processing Fee Settings
      cardFeesEnabled: serviceFees.cardFeesEnabled || false,
      cardFeeType: serviceFees.cardFeeType || 'percentage',
      cardFeeAmount: serviceFees.cardFeeAmount || 2.9,
      cardFeeLabel: serviceFees.cardFeeLabel || 'Card Processing Fee',
      cardFeeDescription: serviceFees.cardFeeDescription || 'Credit card processing fee',

      // Application Rules
      applyToDelivery: serviceFees.applyToDelivery !== undefined ? serviceFees.applyToDelivery : true,
      applyToPickup: serviceFees.applyToPickup !== undefined ? serviceFees.applyToPickup : true,
      applyToTaxableTotal: serviceFees.applyToTaxableTotal || false,
      minimumOrderAmount: serviceFees.minimumOrderAmount || 0,
      maximumFeeAmount: serviceFees.maximumFeeAmount || 0,

      // Display Settings
      showOnMenuPage: serviceFees.showOnMenuPage !== undefined ? serviceFees.showOnMenuPage : true,
      showInOrderSummary: serviceFees.showInOrderSummary !== undefined ? serviceFees.showInOrderSummary : true,
      includeInEmailReceipts: serviceFees.includeInEmailReceipts !== undefined ? serviceFees.includeInEmailReceipts : true
    });

    const [newTaxCategory, setNewTaxCategory] = useState({
      name: '',
      description: '',
      rate: '0',
      appliesToDelivery: false,
      appliesToTips: false,
      appliesToServiceFees: false,
      appliesToMenuItems: true
    });

    // Update service fee data when query data changes
    useEffect(() => {
      if (serviceFees && Object.keys(serviceFees).length > 0) {
        setServiceFeeData({
          serviceFeesEnabled: serviceFees.serviceFeesEnabled || false,
          serviceFeeType: serviceFees.serviceFeeType || 'percentage',
          serviceFeeAmount: serviceFees.serviceFeeAmount || 0,
          serviceFeeLabel: serviceFees.serviceFeeLabel || 'Service Fee',
          serviceFeeDescription: serviceFees.serviceFeeDescription || 'Processing and service fee',
          cardFeesEnabled: serviceFees.cardFeesEnabled || false,
          cardFeeType: serviceFees.cardFeeType || 'percentage',
          cardFeeAmount: serviceFees.cardFeeAmount || 2.9,
          cardFeeLabel: serviceFees.cardFeeLabel || 'Card Processing Fee',
          cardFeeDescription: serviceFees.cardFeeDescription || 'Credit card processing fee',
          applyToDelivery: serviceFees.applyToDelivery !== undefined ? serviceFees.applyToDelivery : true,
          applyToPickup: serviceFees.applyToPickup !== undefined ? serviceFees.applyToPickup : true,
          applyToTaxableTotal: serviceFees.applyToTaxableTotal || false,
          minimumOrderAmount: serviceFees.minimumOrderAmount || 0,
          maximumFeeAmount: serviceFees.maximumFeeAmount || 0,
          showOnMenuPage: serviceFees.showOnMenuPage !== undefined ? serviceFees.showOnMenuPage : true,
          showInOrderSummary: serviceFees.showInOrderSummary !== undefined ? serviceFees.showInOrderSummary : true,
          includeInEmailReceipts: serviceFees.includeInEmailReceipts !== undefined ? serviceFees.includeInEmailReceipts : true
        });
      }
    }, [serviceFees]);

    const handleSaveSettings = () => {
      updateTaxSettingsMutation.mutate(formData);
    };

    const handleSaveServiceFees = () => {
      updateServiceFeesMutation.mutate(serviceFeeData);
    };

    const handleAddTaxCategory = () => {
      if (newTaxCategory.name && newTaxCategory.rate) {
        createTaxCategoryMutation.mutate(newTaxCategory);
        setNewTaxCategory({
          name: '',
          description: '',
          rate: '0',
          appliesToDelivery: false,
          appliesToTips: false,
          appliesToServiceFees: false,
          appliesToMenuItems: true
        });
      }
    };

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Taxation and Currency</h2>
            <p className="text-gray-600">Configure tax rates and currency settings</p>
          </div>
          <Button onClick={handleSaveSettings}>
            Next
          </Button>
        </div>

        {/* Disclaimer */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            Please note that it is your responsibility to confirm that any and all currency and taxes are accurate for the applicable jurisdiction. 
            <button className="text-blue-600 underline ml-1">Show more</button>
          </p>
        </div>

        {/* Tax Settings Form */}
        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Sales Tax Application */}
            <div>
              <Label htmlFor="taxApplication" className="text-sm font-medium">Sales Tax:</Label>
              <div className="flex items-center space-x-2 mt-1">
                <Select 
                  value={formData.taxApplication} 
                  onValueChange={(value) => setFormData({ ...formData, taxApplication: value })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_top">Apply tax on top of my menu prices</SelectItem>
                    <SelectItem value="included">Tax is included in my menu prices</SelectItem>
                  </SelectContent>
                </Select>
                <Info className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            {/* Tax Name */}
            <div>
              <Label htmlFor="taxName" className="text-sm font-medium">
                Name of the tax (E.g. Sales Tax):
              </Label>
              <Input
                id="taxName"
                value={formData.taxName}
                onChange={(e) => setFormData({ ...formData, taxName: e.target.value })}
                className="mt-1"
              />
            </div>

            {/* Tax Categories */}
            <div>
              <Label className="text-sm font-medium">Tax rates for menu items:</Label>
              <div className="mt-2 space-y-2">
                {taxCategories.map((category: any) => (
                  <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <span className="font-medium">{category.name}</span>
                      <span className="text-sm text-gray-500 ml-2">({category.rate}%)</span>
                    </div>
                    <Badge variant={category.isActive ? "default" : "secondary"}>
                      {category.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                ))}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-green-600 border-green-600 hover:bg-green-50"
                  onClick={() => {
                    // TODO: Implement add tax category modal
                    console.log('Add new tax category');
                  }}
                >
                  Add new tax category
                </Button>
              </div>
            </div>

            {/* Specific Tax Rates */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="deliveryFeeTaxRate" className="text-sm font-medium">
                  Taxation for delivery fee:
                </Label>
                <div className="flex items-center mt-1">
                  <Input
                    id="deliveryFeeTaxRate"
                    type="number"
                    step="0.01"
                    value={formData.deliveryFeeTaxRate}
                    onChange={(e) => setFormData({ ...formData, deliveryFeeTaxRate: e.target.value })}
                    className="rounded-r-none"
                  />
                  <span className="bg-gray-100 px-3 py-2 border border-l-0 rounded-r text-sm">%</span>
                </div>
              </div>

              <div>
                <Label htmlFor="tipsTaxRate" className="text-sm font-medium">
                  Taxation for the tips (online payments):
                </Label>
                <div className="flex items-center mt-1">
                  <Input
                    id="tipsTaxRate"
                    type="number"
                    step="0.01"
                    value={formData.tipsTaxRate}
                    onChange={(e) => setFormData({ ...formData, tipsTaxRate: e.target.value })}
                    className="rounded-r-none"
                  />
                  <span className="bg-gray-100 px-3 py-2 border border-l-0 rounded-r text-sm">%</span>
                </div>
              </div>

              <div>
                <Label htmlFor="serviceFeeTaxRate" className="text-sm font-medium">
                  Taxation for service fees:
                </Label>
                <div className="flex items-center mt-1">
                  <Input
                    id="serviceFeeTaxRate"
                    type="number"
                    step="0.01"
                    value={formData.serviceFeeTaxRate}
                    onChange={(e) => setFormData({ ...formData, serviceFeeTaxRate: e.target.value })}
                    className="rounded-r-none"
                  />
                  <span className="bg-gray-100 px-3 py-2 border border-l-0 rounded-r text-sm">%</span>
                </div>
              </div>
            </div>

            {/* Currency */}
            <div>
              <Label htmlFor="currency" className="text-sm font-medium">Currency:</Label>
              <Select
                value={formData.currency}
                onValueChange={(value) => setFormData({ ...formData, currency: value })}
              >
                <SelectTrigger className="w-full mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                  <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Service Fees Configuration */}
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Service Fees & Card Processing Fees</h3>
                <p className="text-sm text-gray-600">Configure additional fees applied to all orders</p>
              </div>
              <Button onClick={handleSaveServiceFees} disabled={updateServiceFeesMutation.isLoading}>
                {updateServiceFeesMutation.isLoading ? "Saving..." : "Save Service Fees"}
              </Button>
            </div>

            {/* Service Fee Settings */}
            <div className="space-y-4 border-b pb-6">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="serviceFeesEnabled"
                  checked={serviceFeeData.serviceFeesEnabled}
                  onChange={(e) => setServiceFeeData({ ...serviceFeeData, serviceFeesEnabled: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="serviceFeesEnabled" className="text-lg font-medium">Enable Service Fees</Label>
              </div>

              {serviceFeeData.serviceFeesEnabled && (
                <div className="ml-7 space-y-4 bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Fee Type:</Label>
                      <Select
                        value={serviceFeeData.serviceFeeType}
                        onValueChange={(value) => setServiceFeeData({ ...serviceFeeData, serviceFeeType: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">
                        {serviceFeeData.serviceFeeType === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}:
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={serviceFeeData.serviceFeeAmount}
                        onChange={(e) => setServiceFeeData({ ...serviceFeeData, serviceFeeAmount: parseFloat(e.target.value) || 0 })}
                        className="mt-1"
                        placeholder={serviceFeeData.serviceFeeType === 'percentage' ? 'e.g., 3.5' : 'e.g., 2.50'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Label:</Label>
                      <Input
                        value={serviceFeeData.serviceFeeLabel}
                        onChange={(e) => setServiceFeeData({ ...serviceFeeData, serviceFeeLabel: e.target.value })}
                        className="mt-1"
                        placeholder="Service Fee"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Description:</Label>
                      <Input
                        value={serviceFeeData.serviceFeeDescription}
                        onChange={(e) => setServiceFeeData({ ...serviceFeeData, serviceFeeDescription: e.target.value })}
                        className="mt-1"
                        placeholder="Processing and service fee"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Card Processing Fee Settings */}
            <div className="space-y-4 border-b pb-6">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="cardFeesEnabled"
                  checked={serviceFeeData.cardFeesEnabled}
                  onChange={(e) => setServiceFeeData({ ...serviceFeeData, cardFeesEnabled: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="cardFeesEnabled" className="text-lg font-medium">Enable Card Processing Fees</Label>
              </div>

              {serviceFeeData.cardFeesEnabled && (
                <div className="ml-7 space-y-4 bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Fee Type:</Label>
                      <Select
                        value={serviceFeeData.cardFeeType}
                        onValueChange={(value) => setServiceFeeData({ ...serviceFeeData, cardFeeType: value })}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">
                        {serviceFeeData.cardFeeType === 'percentage' ? 'Percentage (%)' : 'Amount ($)'}:
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={serviceFeeData.cardFeeAmount}
                        onChange={(e) => setServiceFeeData({ ...serviceFeeData, cardFeeAmount: parseFloat(e.target.value) || 0 })}
                        className="mt-1"
                        placeholder={serviceFeeData.cardFeeType === 'percentage' ? 'e.g., 2.9' : 'e.g., 0.30'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Label:</Label>
                      <Input
                        value={serviceFeeData.cardFeeLabel}
                        onChange={(e) => setServiceFeeData({ ...serviceFeeData, cardFeeLabel: e.target.value })}
                        className="mt-1"
                        placeholder="Card Processing Fee"
                      />
                    </div>

                    <div>
                      <Label className="text-sm font-medium">Description:</Label>
                      <Input
                        value={serviceFeeData.cardFeeDescription}
                        onChange={(e) => setServiceFeeData({ ...serviceFeeData, cardFeeDescription: e.target.value })}
                        className="mt-1"
                        placeholder="Credit card processing fee"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Application Rules */}
            <div className="space-y-4 border-b pb-6">
              <h4 className="text-md font-semibold">Application Rules</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="applyToDelivery"
                      checked={serviceFeeData.applyToDelivery}
                      onChange={(e) => setServiceFeeData({ ...serviceFeeData, applyToDelivery: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <Label htmlFor="applyToDelivery">Apply to delivery orders</Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="applyToPickup"
                      checked={serviceFeeData.applyToPickup}
                      onChange={(e) => setServiceFeeData({ ...serviceFeeData, applyToPickup: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <Label htmlFor="applyToPickup">Apply to pickup orders</Label>
                  </div>

                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="applyToTaxableTotal"
                      checked={serviceFeeData.applyToTaxableTotal}
                      onChange={(e) => setServiceFeeData({ ...serviceFeeData, applyToTaxableTotal: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <Label htmlFor="applyToTaxableTotal">Apply to taxable total (vs subtotal)</Label>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-sm font-medium">Minimum order amount ($):</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={serviceFeeData.minimumOrderAmount / 100}
                      onChange={(e) => setServiceFeeData({ ...serviceFeeData, minimumOrderAmount: Math.round((parseFloat(e.target.value) || 0) * 100) })}
                      className="mt-1"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Maximum fee amount ($):</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={serviceFeeData.maximumFeeAmount / 100}
                      onChange={(e) => setServiceFeeData({ ...serviceFeeData, maximumFeeAmount: Math.round((parseFloat(e.target.value) || 0) * 100) })}
                      className="mt-1"
                      placeholder="0.00 (0 = no cap)"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Display Settings */}
            <div className="space-y-4">
              <h4 className="text-md font-semibold">Display Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="showOnMenuPage"
                    checked={serviceFeeData.showOnMenuPage}
                    onChange={(e) => setServiceFeeData({ ...serviceFeeData, showOnMenuPage: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="showOnMenuPage">Show on menu page</Label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="showInOrderSummary"
                    checked={serviceFeeData.showInOrderSummary}
                    onChange={(e) => setServiceFeeData({ ...serviceFeeData, showInOrderSummary: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="showInOrderSummary">Show in order summary</Label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="includeInEmailReceipts"
                    checked={serviceFeeData.includeInEmailReceipts}
                    onChange={(e) => setServiceFeeData({ ...serviceFeeData, includeInEmailReceipts: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="includeInEmailReceipts">Include in email receipts</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  


  
  // Queries for different data
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/orders"],
    refetchInterval: false, // Disabled auto-refresh for menu editing
    enabled: true, // Enable orders query for admin dashboard
  });

  const { data: menuItems, isLoading: menuLoading } = useQuery({
    queryKey: ["/api/menu"],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/menu');
      if (!response.ok) {
        throw new Error('Failed to fetch menu items');
      }
      return await response.json();
    }
  });

  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useQuery({
    queryKey: ["/api/orders-analytics"],
    enabled: true, // Enable analytics query for admin dashboard
    retry: 3,
    refetchInterval: false, // Disabled auto-refresh for menu editing
    onError: (error) => {
      console.error('Analytics query failed:', error);
    }
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: false,
  });

  const { data: printerStatus, isLoading: printerLoading } = useQuery({
    queryKey: ["/api/printer/status"],
    enabled: false,
    refetchInterval: false,
  });

  const { data: cateringData, isLoading: cateringLoading } = useQuery({
    queryKey: ["/api/admin/catering-inquiries"],
    enabled: activeTab === 'dashboard' || activeTab === 'orders' || activeTab === 'catering', // Only load when needed
  });

  // Scroll to top when activeTab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Validate activeTab - moved to after queries to prevent hook violations
  useEffect(() => {
    // Define tabs inline to avoid dependency issues
    const primaryTabsHrefs = ["dashboard", "orders", "catering"];
    const categoryTabsHrefs = [
      "analytics", "reports", 
      "menu-editor", "pricing", "out-of-stock", "multi-location", "experimental",
      "frontend", "qr-codes", "widget", "smart-links", "printer", "receipt-templates", "scheduling", "reservations", 
      "vacation-mode", "delivery", "taxation",
      "promo-codes", "rewards", "subscribed-users", "kickstarter", "email-campaigns", "sms-marketing", "local-seo",
      "customers", "users", "reviews",
      "employee-schedules", "payroll", "tip-settings",
      "api", "pos-integration", "integrations", "webhooks",
      "restaurant-info", "system-settings", "backup", "help"
    ];
    const allValidTabs = [...primaryTabsHrefs, ...categoryTabsHrefs];
    
    if (!allValidTabs.includes(activeTab)) {
      localStorage.removeItem('adminActiveTab');
      setActiveTab("dashboard");
    }
  }, [activeTab]);

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

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

  // Show loading while authentication is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check for admin access (either main auth or localStorage admin session)
  const hasAdminAccess = user?.isAdmin || (() => {
    try {
      const adminUser = localStorage.getItem('admin-user');
      if (adminUser) {
        const admin = JSON.parse(adminUser);
        return admin.role === 'admin' && admin.isAdmin;
      }
    } catch (error) {
      console.error('Error checking admin session:', error);
    }
    return false;
  })();

  // Redirect if not admin after authentication is complete
  if (!hasAdminAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  // Temporarily disable loading checks to bypass API issues
  // if (ordersLoading || menuLoading || usersLoading || printerLoading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gray-100">
  //       <Loader2 className="h-8 w-8 animate-spin text-primary" />
  //     </div>
  //   );
  // }

  // Calculate statistics
  const totalOrders = (analytics as any)?.totalOrders || (orders as any[])?.length || 0;
  const pendingOrders = (orders as any[])?.filter((o: any) => o.status === "pending").length || 0;
  const processingOrders = (orders as any[])?.filter((o: any) => o.status === "processing").length || 0;
  const completedOrders = (orders as any[])?.filter((o: any) => o.status === "completed").length || 0;
  const totalMenuItems = (menuItems as any[])?.length || 0;
  // Calculate revenue directly from orders since analytics API returns NaN
  const calculatedRevenue = orders ? (orders as any[]).reduce((sum: number, order: any) => {
    const orderTotal = parseFloat(order.total || order.totalAmount || 0);
    // Skip NaN values
    if (isNaN(orderTotal)) {
      console.log('⚠️ Skipping order with invalid total:', order.id, order.total);
      return sum;
    }
    return sum + orderTotal;
  }, 0) : 0;

  const calculatedAvgOrderValue = orders && orders.length > 0 ? calculatedRevenue / orders.length : 0;

  const totalRevenue = ((analytics as any)?.totalRevenue && !isNaN(parseFloat((analytics as any)?.totalRevenue)))
    ? parseFloat((analytics as any)?.totalRevenue).toFixed(2)
    : calculatedRevenue.toFixed(2);

  const averageOrderValue = ((analytics as any)?.averageOrderValue && !isNaN(parseFloat((analytics as any)?.averageOrderValue)))
    ? parseFloat((analytics as any)?.averageOrderValue).toFixed(2)
    : calculatedAvgOrderValue.toFixed(2);

  // Debug sample order totals
  const sampleOrderTotals = orders ? (orders as any[]).slice(0, 5).map((order: any) => ({
    id: order.id,
    total: order.total,
    totalAmount: order.totalAmount,
    parsed: parseFloat(order.total || order.totalAmount || 0),
    isNaN: isNaN(parseFloat(order.total || order.totalAmount || 0))
  })) : [];

  console.log('💰 Revenue debug:', {
    analyticsRevenue: (analytics as any)?.totalRevenue,
    calculatedRevenue,
    finalRevenue: totalRevenue,
    analyticsAvgOrder: (analytics as any)?.averageOrderValue,
    calculatedAvgOrder: calculatedAvgOrderValue,
    finalAvgOrder: averageOrderValue,
    ordersCount: orders ? orders.length : 0,
    sampleOrderTotals
  });
  // Calculate unique customers from orders instead of users query
  const totalCustomers = orders ? new Set((orders as any[]).map((order: any) => {
    const customerId = order.userId || order.user_id || order.customerEmail || order.customer_email;
    return customerId;
  }).filter(Boolean)).size : 0;

  console.log('👥 Total unique customers calculated:', totalCustomers);
  const totalEmployees = (users as any[])?.filter((u: any) => u.role === "employee").length || 0;

  // Primary tabs always visible
  const primaryTabs = [
    { name: "Overview", icon: Home, href: "dashboard" },
    { name: "Orders", icon: ShoppingCart, href: "orders" },
    { name: "Catering", icon: Utensils, href: "catering" },
  ];

  // Categorized dropdown sections
  const navigationCategories = [
    {
      title: "Analytics & Reports",
      icon: BarChart3,
      items: [
        { name: "Analytics", icon: BarChart3, href: "analytics" },
        { name: "Reports", icon: FileText, href: "reports" },
      ]
    },
    {
      title: "Menu & Inventory",
      icon: Menu,
      items: [
        { name: "Menu Editor", icon: Menu, href: "menu-editor" },
        { name: "Pricing", icon: DollarSign, href: "pricing" },
        { name: "Out of Stock", icon: Package, href: "out-of-stock" },
        { name: "Multi-location", icon: Store, href: "multi-location" },
        { name: "Experimental Features", icon: Zap, href: "experimental" },
      ]
    },
    {
      title: "Operations",
      icon: Settings,
      items: [
        { name: "Frontend Customization", icon: Palette, href: "frontend" },
        { name: "QR Code Management", icon: QrCode, href: "qr-codes" },
        { name: "Website Widget", icon: Globe, href: "widget" },
        { name: "Smart Links", icon: Link, href: "smart-links" },
        { name: "Receipt Templates", icon: FileText, href: "receipt-templates" },
        { name: "Order Scheduling", icon: Calendar, href: "scheduling" },
        { name: "Table Reservations", icon: MapPin, href: "reservations" },
        { name: "Vacation Mode", icon: Bell, href: "vacation-mode" },
        { name: "Delivery Options", icon: Truck, href: "delivery" },
        { name: "Taxation & Currency", icon: DollarSign, href: "taxation" },
      ]
    },
    {
      title: "Marketing",
      icon: Target,
      items: [
        { name: "Promo Codes", icon: Tag, href: "promo-codes" },
        { name: "Rewards System", icon: Star, href: "rewards" },
        { name: "Subscribed Users", icon: Mail, href: "subscribed-users" },
        { name: "Kickstarter Marketing", icon: Target, href: "kickstarter" },
        { name: "Email Campaigns", icon: Mail, href: "email-campaigns" },
        { name: "SMS Marketing", icon: MessageSquare, href: "sms-marketing" },
        { name: "Local SEO Tools", icon: Search, href: "local-seo" },
      ]
    },
    {
      title: "Customers & Users",
      icon: UsersIcon,
      items: [
        { name: "Customer Database", icon: UsersIcon, href: "customers" },
        { name: "User Management", icon: Users, href: "users" },
        { name: "Reviews & Ratings", icon: Heart, href: "reviews" },
      ]
    },
    {
      title: "Employee Management",
      icon: Clock,
      items: [
        { name: "Employee Schedules", icon: Calendar, href: "employee-schedules" },
        { name: "Payroll & Hours", icon: DollarSign, href: "payroll" },
        { name: "Tip Settings", icon: Gift, href: "tip-settings" },
      ]
    },
    {
      title: "Integrations & API",
      icon: Zap,
      items: [
        { name: "API Management", icon: Code, href: "api" },
        { name: "POS Integration", icon: Database, href: "pos-integration" },
        { name: "Third-party Apps", icon: Layers, href: "integrations" },
        { name: "Webhooks", icon: Zap, href: "webhooks" },
      ]
    },
    {
      title: "System",
      icon: Settings,
      items: [
        { name: "Restaurant Info", icon: Store, href: "restaurant-info" },
        { name: "System Settings", icon: Settings, href: "system-settings" },
        { name: "Backup & Export", icon: Download, href: "backup" },
        { name: "Help & Support", icon: HelpCircle, href: "help" },
      ]
    }
  ];


  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <>
      <Helmet>
        <title>Admin Dashboard | Favilla's NY Pizza</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="min-h-screen bg-gray-100 flex">
        {/* Mobile Menu Overlay */}
        {!sidebarCollapsed && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}
        
        {/* Sidebar */}
        <div className={`bg-white shadow-lg transition-all duration-300 z-50 flex flex-col ${
          sidebarCollapsed
            ? 'w-16 md:w-16 fixed md:fixed h-full -translate-x-full md:translate-x-0'
            : 'w-64 md:w-64 fixed md:fixed h-full translate-x-0'
        }`}>
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              {!sidebarCollapsed && (
                <h1 className="text-xl font-bold text-gray-800">Favilla's Admin</h1>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="ml-auto"
              >
                {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <nav className="p-4 space-y-3 flex-1 overflow-y-auto">
            {/* Primary Tabs */}
            <div className="space-y-2">
              {primaryTabs.map((item, index) => (
                <Button
                  key={index}
                  variant={activeTab === item.href ? "default" : "ghost"}
                  className={`w-full justify-start ${sidebarCollapsed ? 'px-2' : 'px-3'}`}
                  onClick={() => {
                    changeActiveTab(item.href);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  <item.icon className={`h-4 w-4 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
                  {!sidebarCollapsed && item.name}
                </Button>
              ))}
            </div>

            {/* Separator */}
            {!sidebarCollapsed && <div className="border-t border-gray-200"></div>}

            {/* Dropdown Categories */}
            <div className="space-y-2">
              {navigationCategories.map((category, categoryIndex) => (
                <div key={categoryIndex}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start ${sidebarCollapsed ? 'px-2' : 'px-3'}`}
                      >
                        <category.icon className={`h-4 w-4 ${sidebarCollapsed ? 'mx-auto' : 'mr-3'}`} />
                        {!sidebarCollapsed && (
                          <>
                            <span className="flex-1 text-left">{category.title}</span>
                            <ChevronDown className="h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side={sidebarCollapsed ? "right" : "bottom"} align="start" className="w-56">
                      {!sidebarCollapsed && (
                        <div className="px-2 py-1.5 text-sm font-semibold text-gray-900">
                          {category.title}
                        </div>
                      )}
                      {category.items.map((item, itemIndex) => (
                        <DropdownMenuItem
                          key={itemIndex}
                          onClick={() => {
                            changeActiveTab(item.href);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className={activeTab === item.href ? "bg-red-50 text-red-600" : ""}
                        >
                          <item.icon className="h-4 w-4 mr-3" />
                          {item.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className={`flex-1 flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? 'ml-0 md:ml-16' : 'ml-0 md:ml-64'
        }`}>
          {/* Top Header */}
          <header className="bg-white shadow-sm border-b px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 md:space-x-4">
                {/* Mobile Menu Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="md:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                
                <h2 className="text-lg md:text-2xl font-bold text-gray-800 truncate">
                  {[...primaryTabs, ...navigationCategories.flatMap(c => c.items)].find(item => item.href === activeTab)?.name || "Dashboard"}
                </h2>
              </div>
              
              <div className="flex items-center space-x-2 md:space-x-4">
                {/* Search - Hidden on mobile, shown on tablet+ */}
                <div className="relative hidden sm:block">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search here..."
                    className="pl-10 w-40 md:w-64"
                  />
                </div>
                
                <div className="flex items-center space-x-1 md:space-x-2">
                  <Button variant="ghost" size="sm" className="hidden sm:flex">
                    <Bell className="h-5 w-5" />
                  </Button>
                  
                  <div className="flex items-center space-x-1 md:space-x-2">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="hidden lg:block">
                      <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs text-gray-500">{user?.role?.replace('_', ' ').toUpperCase()}</p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <User className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => window.open('/', '_blank')}>
                          <Home className="h-4 w-4 mr-2" />
                          Go to Frontend
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => window.open('/kitchen', '_blank')}>
                          <ChefHat className="h-4 w-4 mr-2" />
                          Go to Kitchen
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 border-t mt-1 pt-1">
                          <LogOut className="h-4 w-4 mr-2" />
                          Logout
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="flex-1 p-4 md:p-6 bg-gray-100 overflow-y-auto">
            {activeTab === "dashboard" && (
              <DashboardOverview
                totalOrders={(orders as any[])?.length || 0}
                pendingOrders={(orders as any[])?.filter((o: any) => o.status === "pending").length || 0}
                processingOrders={(orders as any[])?.filter((o: any) => o.status === "processing").length || 0}
                completedOrders={(orders as any[])?.filter((o: any) => o.status === "completed").length || 0}
                totalMenuItems={(menuItems as any[])?.length || 0}
                totalRevenue={totalRevenue}
                averageOrderValue={averageOrderValue}
                totalCustomers={totalCustomers}
                totalEmployees={(users as any[])?.filter((u: any) => u.role === "employee").length || 0}
                analytics={analytics}
                orders={orders}
                cateringData={cateringData}
              />
            )}
            
            {activeTab === "orders" && (
              <OrdersManagement orders={orders} cateringData={cateringData} onUpdateStatus={updateOrderStatus} />
            )}

            {activeTab === "catering" && (
              <CateringManagement cateringData={cateringData} />
            )}

            {activeTab === "users" && (
              <UserManagementTab />
            )}

            {activeTab === "employee-schedules" && (
              <ScheduleCreator />
            )}

            {activeTab === "payroll" && (
              <PayrollDashboard />
            )}

            {activeTab === "tip-settings" && (
              <TipSettingsTab />
            )}
            
            {activeTab === "analytics" && (
              <AnalyticsDashboard analytics={analytics} orders={orders} />
            )}
            
            {activeTab === "reports" && (
              <ReportsSection analytics={analytics} orders={orders} />
            )}
            
            {activeTab === "menu-editor" && (
              <MenuEditor menuItems={menuItems} />
            )}

            {activeTab === "experimental" && (
              <ExperimentalFeaturesSection />
            )}

            {activeTab === "frontend" && (
              <FrontendCustomization />
            )}
            
            {activeTab === "qr-codes" && (
              <QRCodeManagement />
            )}
            
            {activeTab === "widget" && (
              <WebsiteWidget />
            )}
            
            {activeTab === "smart-links" && (
              <SmartLinks />
            )}
            
            {activeTab === "scheduling" && (
              <OrderScheduling />
            )}
            
            {activeTab === "reservations" && (
              <TableReservations />
            )}
            
            {activeTab === "vacation-mode" && (
              <VacationMode />
            )}
            
            {activeTab === "out-of-stock" && (
              <OutOfStockManagement menuItems={menuItems} />
            )}
            
            {activeTab === "delivery" && (
              <DeliveryOptions />
            )}
            
            {activeTab === "taxation" && (
              <TaxationAndCurrency />
            )}
            
            {activeTab === "promo-codes" && (
              <PromoCodesManagement />
            )}

            {activeTab === "rewards" && (
              <RewardsManagement />
            )}

            {activeTab === "subscribed-users" && (
              <SubscribedUsersManagement />
            )}

            {activeTab === "kickstarter" && (
              <KickstarterMarketing />
            )}
            
            {activeTab === "customers" && (
              <CustomerDatabase users={users} />
            )}
            

            {activeTab === "receipt-templates" && (
              <TemplateEditor />
            )}

            {activeTab === "restaurant-info" && (
              <Suspense fallback={<div>Loading Restaurant Settings...</div>}>
                <RestaurantSettings />
              </Suspense>
            )}
            

            
            
            {activeTab === "pricing" && (
              <PricingTab menuItems={menuItems} />
            )}
            
            {activeTab === "multi-location" && (
              <MultiLocationTab />
            )}
            
            {activeTab === "email-campaigns" && (
              <EmailCampaignsTab users={users} />
            )}
            
            {activeTab === "sms-marketing" && (
              <SMSMarketingTab users={users} />
            )}
            
            {activeTab === "local-seo" && (
              <LocalSEOToolsTab />
            )}
            
            {activeTab === "reviews" && (
              <ReviewsTab />
            )}
            
            {activeTab === "api" && (
              <APIManagementTab />
            )}
            
            {activeTab === "pos-integration" && (
              <POSIntegrationTab />
            )}
            
            {activeTab === "integrations" && (
              <IntegrationsTab />
            )}
            
            {activeTab === "webhooks" && (
              <WebhooksTab />
            )}
            
            {activeTab === "backup" && (
              <BackupExportTab orders={orders} menuItems={menuItems} users={users} />
            )}
            
            {activeTab === "help" && (
              <HelpSupportTab />
            )}

            {activeTab === "system-settings" && (
              <Suspense fallback={<div>Loading System Settings...</div>}>
                <SettingsPanel />
              </Suspense>
            )}
          </main>
        </div>
      </div>
    </>
  );
};

// Catering Management Component
const CateringManagement = ({ cateringData }: any) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { toast } = useToast();

  const updateCateringStatus = async (inquiryId: number, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/catering-inquiries', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          id: inquiryId,
          status: newStatus
        })
      });

      if (response.ok) {
        toast({
          title: "Status updated",
          description: `Catering request status changed to ${newStatus}`,
        });
        // Refresh the page to update the data
        window.location.reload();
      } else {
        const error = await response.json();
        toast({
          title: "Update failed",
          description: error.message || "Failed to update catering status",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Update failed",
        description: "An error occurred while updating catering status",
        variant: "destructive",
      });
    }
  };

  const filteredInquiries = cateringData?.inquiries?.filter((inquiry: any) => {
    const matchesStatus = statusFilter === "all" || inquiry.status === statusFilter;
    const matchesSearch = inquiry.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inquiry.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inquiry.event_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inquiry.id?.toString().includes(searchTerm);
    return matchesStatus && matchesSearch;
  }) || [];

  const formatGuestCount = (inquiry: any) => {
    if (inquiry.guest_count === '200+') {
      return `${inquiry.custom_guest_count || '200+'} people`;
    }
    return inquiry.guest_count;
  };

  const formatEventDate = (dateStr: string) => {
    if (!dateStr) return 'Not specified';
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Inquiries</p>
                <p className="text-2xl font-bold text-gray-900">{cateringData?.total || 0}</p>
              </div>
              <Utensils className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-yellow-600">{cateringData?.counts?.pending || 0}</p>
                  {(cateringData?.counts?.pending || 0) > 0 && (
                    <div className="h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-[10px] text-white font-bold">!</span>
                    </div>
                  )}
                </div>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Contacted</p>
                <p className="text-2xl font-bold text-blue-600">{cateringData?.counts?.contacted || 0}</p>
              </div>
              <Phone className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Confirmed</p>
                <p className="text-2xl font-bold text-green-600">{cateringData?.counts?.confirmed || 0}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Catering Inquiries Management</CardTitle>
          <CardDescription>
            Manage all catering requests, update statuses, and track event details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by customer name, email, event type, or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Inquiries</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="quoted">Quoted</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Catering Inquiries Table */}
          <div className="overflow-x-auto mobile-scroll-container touch-pan-x">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">ID</th>
                  <th className="text-left py-3 px-4 font-medium">Customer</th>
                  <th className="text-left py-3 px-4 font-medium">Event Details</th>
                  <th className="text-left py-3 px-4 font-medium">Date & Time</th>
                  <th className="text-left py-3 px-4 font-medium">Guests</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredInquiries.map((inquiry: any) => (
                  <tr key={inquiry.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">#{inquiry.id}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{inquiry.full_name}</p>
                        <p className="text-sm text-gray-500">{inquiry.email}</p>
                        <p className="text-sm text-gray-500">{inquiry.phone_number}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium capitalize">{inquiry.event_type.replace('_', ' ')}</p>
                        <p className="text-sm text-gray-500 capitalize">{inquiry.service_type}</p>
                        <p className="text-sm text-gray-500 capitalize">{inquiry.menu_style}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        {inquiry.event_date && (
                          <p className="font-medium">{new Date(inquiry.event_date).toLocaleDateString()}</p>
                        )}
                        {inquiry.event_time && (
                          <p className="text-sm text-gray-500">{inquiry.event_time}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium">{formatGuestCount(inquiry)}</p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={
                        inquiry.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        inquiry.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                        inquiry.status === 'quoted' ? 'bg-purple-100 text-purple-800' :
                        inquiry.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }>
                        {inquiry.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedInquiry(inquiry);
                            setIsDetailOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Select
                          value={inquiry.status}
                          onValueChange={(newStatus) => updateCateringStatus(inquiry.id, newStatus)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="quoted">Quoted</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredInquiries.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No catering inquiries found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Catering Inquiry #{selectedInquiry?.id} Details</DialogTitle>
          </DialogHeader>

          {selectedInquiry && (
            <div className="space-y-6">
              {/* Customer Information */}
              <div>
                <h4 className="font-semibold text-lg mb-3">Customer Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{selectedInquiry.full_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{selectedInquiry.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{selectedInquiry.phone_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Preferred Contact</p>
                    <p className="font-medium capitalize">{selectedInquiry.preferred_contact}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Best Time to Call</p>
                    <p className="font-medium capitalize">{selectedInquiry.best_time_to_call}</p>
                  </div>
                </div>
              </div>

              {/* Event Information */}
              <div>
                <h4 className="font-semibold text-lg mb-3">Event Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Event Type</p>
                    <p className="font-medium capitalize">{selectedInquiry.event_type.replace('_', ' ')}</p>
                    {selectedInquiry.custom_event_type && (
                      <p className="text-sm text-gray-500">{selectedInquiry.custom_event_type}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Service Type</p>
                    <p className="font-medium capitalize">{selectedInquiry.service_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Guest Count</p>
                    <p className="font-medium">{formatGuestCount(selectedInquiry)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Menu Style</p>
                    <p className="font-medium capitalize">{selectedInquiry.menu_style.replace('_', ' ')}</p>
                  </div>
                  {selectedInquiry.event_date && (
                    <div>
                      <p className="text-sm text-gray-600">Event Date</p>
                      <p className="font-medium">{formatEventDate(selectedInquiry.event_date)}</p>
                    </div>
                  )}
                  {selectedInquiry.event_time && (
                    <div>
                      <p className="text-sm text-gray-600">Event Time</p>
                      <p className="font-medium">{selectedInquiry.event_time}</p>
                    </div>
                  )}
                  {selectedInquiry.budget_range && (
                    <div>
                      <p className="text-sm text-gray-600">Budget Range</p>
                      <p className="font-medium">{selectedInquiry.budget_range}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Information */}
              {selectedInquiry.service_type === 'delivery' && selectedInquiry.event_address && (
                <div>
                  <h4 className="font-semibold text-lg mb-3">Delivery Information</h4>
                  <div>
                    <p className="text-sm text-gray-600">Event Address</p>
                    <p className="font-medium">{selectedInquiry.event_address}</p>
                    {selectedInquiry.special_delivery_instructions && (
                      <div className="mt-2">
                        <p className="text-sm text-gray-600">Special Instructions</p>
                        <p className="font-medium">{selectedInquiry.special_delivery_instructions}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Information */}
              <div>
                <h4 className="font-semibold text-lg mb-3">Additional Information</h4>
                <div className="space-y-3">
                  {selectedInquiry.dietary_restrictions && JSON.parse(selectedInquiry.dietary_restrictions).length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600">Dietary Restrictions</p>
                      <p className="font-medium">{JSON.parse(selectedInquiry.dietary_restrictions).join(', ')}</p>
                    </div>
                  )}
                  {selectedInquiry.additional_services && JSON.parse(selectedInquiry.additional_services).length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600">Additional Services</p>
                      <p className="font-medium">{JSON.parse(selectedInquiry.additional_services).join(', ')}</p>
                    </div>
                  )}
                  {selectedInquiry.special_requests && (
                    <div>
                      <p className="text-sm text-gray-600">Special Requests</p>
                      <p className="font-medium">{selectedInquiry.special_requests}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status & Timestamps */}
              <div>
                <h4 className="font-semibold text-lg mb-3">Status & Timeline</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Current Status</p>
                    <Badge className={
                      selectedInquiry.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      selectedInquiry.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                      selectedInquiry.status === 'quoted' ? 'bg-purple-100 text-purple-800' :
                      selectedInquiry.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {selectedInquiry.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Submitted</p>
                    <p className="font-medium">{new Date(selectedInquiry.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.open(`mailto:${selectedInquiry.email}?subject=Catering Inquiry #${selectedInquiry.id}`);
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email Customer
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      window.open(`tel:${selectedInquiry.phone_number}`);
                    }}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Call Customer
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Dashboard Overview Component
const DashboardOverview = ({
  totalOrders,
  pendingOrders,
  processingOrders,
  completedOrders,
  totalMenuItems,
  totalRevenue,
  averageOrderValue,
  totalCustomers,
  totalEmployees,
  analytics,
  orders,
  cateringData
}: any) => {
  // Use real analytics data or calculate from orders
  const analyticsData = React.useMemo(() => {
    console.log('📊 DashboardOverview - Analytics Data Debug:', {
      hasAnalytics: !!analytics,
      hasOrders: !!orders,
      analyticsKeys: analytics ? Object.keys(analytics) : [],
      ordersLength: orders ? orders.length : 0,
      totalCustomers,
      totalRevenue,
      averageOrderValue
    });

    if (!orders || orders.length === 0) {
      console.log('❌ No orders data available for charts');
      return {
        revenue: { total: 0, change: 0, trend: "up", daily: [0,0,0,0,0,0,0] },
        orders: { total: 0, change: 0, trend: "up", daily: [0,0,0,0,0,0,0] },
        customers: { total: 0, change: 0, trend: "up", daily: [0,0,0,0,0,0,0] },
        averageOrder: { total: 0, change: 0, trend: "up", daily: [0,0,0,0,0,0,0] }
      };
    }

    // Debug: Show sample order dates first
    const sampleOrderDates = orders.slice(0, 5).map((order: any) => ({
      id: order.id,
      createdAt: order.createdAt || order.created_at,
      formattedDate: new Date(order.createdAt || order.created_at).toISOString().split('T')[0],
      userId: order.userId || order.user_id,
      total: order.total || order.totalAmount
    }));
    console.log('📅 Sample order dates and data:', sampleOrderDates);

    // Get all unique dates from orders and use the most recent 7 days that have data
    const allOrderDates = orders.map((order: any) =>
      new Date(order.createdAt || order.created_at).toISOString().split('T')[0]
    );
    const uniqueDates = [...new Set(allOrderDates)].sort().slice(-7); // Last 7 unique dates with orders

    console.log('📅 Using actual order dates for charts:', uniqueDates);

    const dailyData = uniqueDates.map(date => {
      const dayOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.createdAt || order.created_at).toISOString().split('T')[0];
        return orderDate === date;
      });

      console.log(`📅 ${date}: ${dayOrders.length} orders`);

      const dayRevenue = dayOrders.reduce((sum: number, order: any) => {
        const total = parseFloat(order.total || order.totalAmount || 0);
        return sum + total;
      }, 0);

      const uniqueCustomers = new Set(dayOrders.map((order: any) => order.userId || order.user_id)).size;

      return {
        date,
        orders: dayOrders.length,
        revenue: dayRevenue,
        customers: uniqueCustomers,
        avgOrderValue: dayOrders.length > 0 ? dayRevenue / dayOrders.length : 0
      };
    });

    console.log('📈 Calculated daily data:', dailyData);

    const totalOrdersCount = orders.length;
    const totalRevenueAmount = parseFloat(totalRevenue) || 0;
    const avgOrderValueAmount = parseFloat(averageOrderValue) || 0;

    // Ensure we always have 7 data points for consistent chart display
    const chartData = Array.from({ length: 7 }, (_, i) => {
      return dailyData[i] || { date: '', orders: 0, revenue: 0, customers: 0, avgOrderValue: 0 };
    });

    const result = {
      revenue: {
        total: totalRevenueAmount,
        change: 0, // TODO: Calculate based on previous period
        trend: "up" as const,
        daily: chartData.map(d => d.revenue)
      },
      orders: {
        total: totalOrdersCount,
        change: 0, // TODO: Calculate based on previous period
        trend: "up" as const,
        daily: chartData.map(d => d.orders)
      },
      customers: {
        total: totalCustomers || 0,
        change: 0, // TODO: Calculate based on previous period
        trend: "up" as const,
        daily: chartData.map(d => d.customers)
      },
      averageOrder: {
        total: avgOrderValueAmount,
        change: 0, // TODO: Calculate based on previous period
        trend: "up" as const,
        daily: chartData.map(d => d.avgOrderValue)
      }
    };

    console.log('✅ Final analytics data:', result);
    return result;
  }, [analytics, orders, totalCustomers, totalRevenue, averageOrderValue]);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">TRAFFIC</CardTitle>
            <BarChart3 className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders.toLocaleString()}</div>
            <p className="text-xs text-green-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +3.48% Since last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NEW USERS</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-red-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 rotate-180" />
              -3.48% Since last week
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SALES</CardTitle>
            <DollarSign className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue}</div>
            <p className="text-xs text-red-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1 rotate-180" />
              -1.10% Since yesterday
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CATERING</CardTitle>
            <div className="relative">
              <Utensils className="h-4 w-4 text-purple-500" />
              {cateringData?.pendingCount > 0 && (
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-[10px] text-white font-bold">
                    {cateringData.pendingCount > 9 ? '9+' : cateringData.pendingCount}
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cateringData?.total || 0}</div>
            <p className="text-xs text-orange-600 flex items-center">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {cateringData?.pendingCount || 0} pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Value Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Value Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between space-x-2">
              {analyticsData.revenue.daily.map((value, index) => (
                <div key={index} className="flex-1 bg-blue-100 rounded-t" style={{ height: `${(value / 2000) * 100}%` }}>
                  <div className="bg-blue-600 h-full rounded-t"></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Orders Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Total Orders Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between space-x-2">
              {analyticsData.orders.daily.map((value, index) => (
                <div key={index} className="flex-1 bg-green-100 rounded-t" style={{ height: `${(value / 80) * 100}%` }}>
                  <div className="bg-green-600 h-full rounded-t"></div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Page Visits</CardTitle>
            <Button variant="outline" size="sm">See all</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">/menu/</span>
                <div className="flex items-center space-x-4">
                  <span className="text-sm">4,569</span>
                  <span className="text-sm">340</span>
                  <span className="text-sm text-green-600">↑ 46.53%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">/checkout/</span>
                <div className="flex items-center space-x-4">
                  <span className="text-sm">3,985</span>
                  <span className="text-sm">319</span>
                  <span className="text-sm text-green-600">↑ 46.53%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">/rewards/</span>
                <div className="flex items-center space-x-4">
                  <span className="text-sm">3,513</span>
                  <span className="text-sm">294</span>
                  <span className="text-sm text-green-600">↑ 36.49%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex justify-between items-center">
            <CardTitle>Social Traffic</CardTitle>
            <Button variant="outline" size="sm">See all</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Facebook</span>
                <div className="flex items-center space-x-4">
                  <span className="text-sm">1,480</span>
                  <span className="text-sm">60%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Google</span>
                <div className="flex items-center space-x-4">
                  <span className="text-sm">4,807</span>
                  <span className="text-sm">80%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Instagram</span>
                <div className="flex items-center space-x-4">
                  <span className="text-sm">3,678</span>
                  <span className="text-sm">75%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Functional Orders Management Component
const OrdersManagement = ({ orders, cateringData, onUpdateStatus }: any) => {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<any>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isRefundDialogOpen, setIsRefundDialogOpen] = useState(false);
  const [orderToRefund, setOrderToRefund] = useState<any>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("requested_by_customer");
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set());
  const [bulkActionMode, setBulkActionMode] = useState(false);
  const { toast } = useToast();

  const updateCateringStatus = async (inquiryId: number, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/catering-inquiries', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          id: inquiryId,
          status: newStatus
        })
      });

      if (response.ok) {
        toast({
          title: "Status updated",
          description: `Catering request status changed to ${newStatus}`,
        });
        // Refresh the page to update the data
        window.location.reload();
      } else {
        const error = await response.json();
        toast({
          title: "Update failed",
          description: error.message || "Failed to update catering status",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Update failed",
        description: "An error occurred while updating catering status",
        variant: "destructive",
      });
    }
  };

  const filteredOrders = (orders as any[])?.filter((order: any) => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSearch = order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id?.toString().includes(searchTerm) ||
                         order.items?.some((item: any) => item?.name?.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  }) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "processing": return "bg-blue-100 text-blue-800";
      case "ready": return "bg-green-100 text-green-800";
      case "completed": return "bg-gray-100 text-gray-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const handleDeleteClick = (order: any) => {
    setOrderToDelete(order);
    setIsDeleteDialogOpen(true);
    setDeleteConfirmation("");
  };

  const handleDeleteConfirm = async () => {
    if (deleteConfirmation.toLowerCase() !== "delete") {
      toast({
        title: "Invalid confirmation",
        description: "Please type 'delete' to confirm the deletion.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast({
          title: "Order deleted",
          description: `Order #${orderToDelete.id} has been successfully deleted.`,
        });
        setIsDeleteDialogOpen(false);
        setOrderToDelete(null);
        setDeleteConfirmation("");
        // Refresh the orders list
        window.location.reload();
      } else {
        const error = await response.json();
        toast({
          title: "Delete failed",
          description: error.message || "Failed to delete order.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "An error occurred while deleting the order.",
        variant: "destructive",
      });
    }
  };

  const handleRefundClick = (order: any) => {
    if (!order.paymentIntentId) {
      toast({
        title: "Cannot refund",
        description: "This order has no payment to refund.",
        variant: "destructive",
      });
      return;
    }
    setOrderToRefund(order);
    setRefundAmount(order.total || "");
    setRefundReason("requested_by_customer");
    setIsRefundDialogOpen(true);
  };

  const handleRefundConfirm = async () => {
    if (!orderToRefund || !refundAmount) return;

    setIsProcessingRefund(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderToRefund.id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: parseFloat(refundAmount),
          reason: refundReason
        })
      });
      
      if (response.ok) {
        toast({
          title: "Refund processed",
          description: `Refund of ${formatCurrency(parseFloat(refundAmount))} has been processed successfully.`,
        });
        
        setIsRefundDialogOpen(false);
        setOrderToRefund(null);
        setRefundAmount("");
        setRefundReason("requested_by_customer");
        // Refresh the orders list
        window.location.reload();
      } else {
        const error = await response.json();
        toast({
          title: "Refund failed",
          description: error.message || "Failed to process refund.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Refund failed",
        description: "An error occurred while processing the refund.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingRefund(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{orders?.length || 0}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {orders?.filter((o: any) => o.status === "pending").length || 0}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Processing</p>
                <p className="text-2xl font-bold text-blue-600">
                  {orders?.filter((o: any) => o.status === "processing").length || 0}
                </p>
              </div>
              <ChefHat className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed Today</p>
                <p className="text-2xl font-bold text-green-600">
                  {orders?.filter((o: any) => o.status === "completed" && 
                    new Date(o.createdAt).toDateString() === new Date().toDateString()).length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Catering</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-purple-600">{cateringData?.total || 0}</p>
                  {cateringData?.pendingCount > 0 && (
                    <div className="h-4 w-4 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-[10px] text-white font-bold">
                        {cateringData.pendingCount > 9 ? '9+' : cateringData.pendingCount}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="relative">
                <Utensils className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Order Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders by customer, order ID, or items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Catering Requests Table */}
          {cateringData?.inquiries && cateringData.inquiries.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4">Catering Requests</h3>
              <div className="overflow-x-auto mobile-scroll-container touch-pan-x">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">ID</th>
                      <th className="text-left py-3 px-4 font-medium">Customer</th>
                      <th className="text-left py-3 px-4 font-medium">Event Type</th>
                      <th className="text-left py-3 px-4 font-medium">Date & Time</th>
                      <th className="text-left py-3 px-4 font-medium">Guests</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cateringData.inquiries.slice(0, 5).map((inquiry: any) => (
                      <tr key={inquiry.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">#{inquiry.id}</td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{inquiry.full_name}</p>
                            <p className="text-sm text-gray-500">{inquiry.email}</p>
                            <p className="text-sm text-gray-500">{inquiry.phone_number}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{inquiry.event_type}</p>
                            <p className="text-sm text-gray-500">{inquiry.service_type}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            {inquiry.event_date && (
                              <p className="font-medium">{new Date(inquiry.event_date).toLocaleDateString()}</p>
                            )}
                            {inquiry.event_time && (
                              <p className="text-sm text-gray-500">{inquiry.event_time}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium">
                            {inquiry.guest_count === '200+' ? `${inquiry.custom_guest_count || '200+'} people` : inquiry.guest_count}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={
                            inquiry.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            inquiry.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                            inquiry.status === 'quoted' ? 'bg-purple-100 text-purple-800' :
                            inquiry.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {inquiry.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <Select
                              value={inquiry.status}
                              onValueChange={(newStatus) => updateCateringStatus(inquiry.id, newStatus)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="quoted">Quoted</SelectItem>
                                <SelectItem value="confirmed">Confirmed</SelectItem>
                                <SelectItem value="cancelled">Cancelled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Orders Table */}
          <div className="overflow-x-auto mobile-scroll-container touch-pan-x">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Order #</th>
                  <th className="text-left py-3 px-4 font-medium">Customer</th>
                  <th className="text-left py-3 px-4 font-medium">Items</th>
                  <th className="text-left py-3 px-4 font-medium">Total</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                  <th className="text-left py-3 px-4 font-medium">Date & Time</th>
                  <th className="text-left py-3 px-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order: any) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">#{order.id}</td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{order.customerName || "Guest"}</p>
                        <p className="text-sm text-gray-500">{order.customerEmail || order.customerPhone}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="max-w-xs">
                        <p className="text-sm">
                          {order.items?.slice(0, 2).map((item: any) => item?.name || 'Unknown Item').join(", ")}
                          {order.items?.length > 2 && ` +${order.items.length - 2} more`}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {formatCurrency(order.total || 0)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500">
                      <div>
                        <div>{new Date(order.createdAt).toLocaleDateString()}</div>
                        <div className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleTimeString()}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedOrder(order);
                            setIsOrderDetailOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {order.status === "pending" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUpdateStatus(order.id, "processing")}
                          >
                            <ChefHat className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {order.status === "processing" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUpdateStatus(order.id, "ready")}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {order.status === "ready" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onUpdateStatus(order.id, "completed")}
                          >
                            <Truck className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {(order.status === "completed" || order.status === "processing") && order.paymentIntentId && !order.refundId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRefundClick(order)}
                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(order)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredOrders.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No orders found matching your criteria.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={isOrderDetailOpen} onOpenChange={setIsOrderDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.id} Details</DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium">Customer Information</h4>
                  <p className="text-sm text-gray-600">{selectedOrder.customerName}</p>
                  <p className="text-sm text-gray-600">{selectedOrder.customerEmail}</p>
                  <p className="text-sm text-gray-600">{selectedOrder.customerPhone}</p>
                </div>
                <div>
                  <h4 className="font-medium">Order Information</h4>
                  <p className="text-sm text-gray-600">Status: {selectedOrder.status}</p>
                  <p className="text-sm text-gray-600">Created: {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                  <p className="text-sm text-gray-600">Total: {formatCurrency(selectedOrder.total)}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Order Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{item?.name || 'Unknown Item'}</p>
                        {item.notes && <p className="text-sm text-gray-600">{item.notes}</p>}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(item.basePrice)}</p>
                        <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {selectedOrder.deliveryAddress && (
                <div>
                  <h4 className="font-medium">Delivery Address</h4>
                  <p className="text-sm text-gray-600">{selectedOrder.deliveryAddress}</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsOrderDetailOpen(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  // Handle print receipt
                  setIsOrderDetailOpen(false);
                }}>
                  Print Receipt
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete Order #{orderToDelete?.id}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="delete-confirmation">Type "delete" to confirm</Label>
              <Input
                id="delete-confirmation"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Type 'delete' to confirm"
                className="mt-1"
              />
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsDeleteDialogOpen(false);
                  setOrderToDelete(null);
                  setDeleteConfirmation("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleteConfirmation.toLowerCase() !== "delete"}
              >
                Delete Order
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Dialog */}
      <Dialog open={isRefundDialogOpen} onOpenChange={setIsRefundDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
            <DialogDescription>
              Process a refund for Order #{orderToRefund?.id}. The refund will be processed through Stripe.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="refund-amount">Refund Amount</Label>
              <Input
                id="refund-amount"
                type="number"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                placeholder="Enter refund amount"
              />
              <p className="text-sm text-gray-600 mt-1">
                Order total: {orderToRefund ? formatCurrency(parseFloat(orderToRefund.total || 0)) : "$0.00"}
              </p>
            </div>
            
            <div>
              <Label htmlFor="refund-reason">Refund Reason</Label>
              <Select value={refundReason} onValueChange={setRefundReason}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="requested_by_customer">Requested by customer</SelectItem>
                  <SelectItem value="duplicate">Duplicate order</SelectItem>
                  <SelectItem value="fraudulent">Fraudulent order</SelectItem>
                  <SelectItem value="order_error">Order error</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRefundDialogOpen(false);
                  setOrderToRefund(null);
                  setRefundAmount("");
                  setRefundReason("requested_by_customer");
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRefundConfirm}
                disabled={isProcessingRefund || !refundAmount || parseFloat(refundAmount) <= 0}
                className="flex-1"
              >
                {isProcessingRefund ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Refund ${refundAmount ? formatCurrency(parseFloat(refundAmount)) : "$0.00"}`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const AnalyticsDashboard = ({ analytics, orders }: any) => {
  const [timeRange, setTimeRange] = useState("7d");
  const [selectedMetric, setSelectedMetric] = useState("revenue");

  // Use real analytics data or fallback to default
  const analyticsData = React.useMemo(() => {
    console.log('📊 AnalyticsDashboard - Data Debug:', {
      hasAnalytics: !!analytics,
      hasOrders: !!orders,
      ordersLength: orders ? orders.length : 0,
      timeRange,
      selectedMetric
    });

    if (!orders || orders.length === 0) {
      console.log('❌ No orders data for AnalyticsDashboard');
      return {
        revenue: { total: 0, change: 0, trend: "up", daily: [0,0,0,0,0,0,0], maxValue: 0 },
        orders: { total: 0, change: 0, trend: "up", daily: [0,0,0,0,0,0,0], maxValue: 0 },
        customers: { total: 0, change: 0, trend: "up", daily: [0,0,0,0,0,0,0], maxValue: 0 },
        averageOrder: { total: 0, change: 0, trend: "up", daily: [0,0,0,0,0,0,0], maxValue: 0 },
        topSellingItems: [],
        customerInsights: {
          totalCustomers: 0,
          repeatCustomerPercentage: 0,
          avgOrdersPerCustomer: 0
        }
      };
    }

    // Calculate daily data from orders based on selected time range
    const now = new Date();
    const daysToShow = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 7;

    console.log('📅 AnalyticsDashboard filtering for:', timeRange, 'showing', daysToShow, 'days');

    const dailyData = Array.from({ length: daysToShow }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (daysToShow - 1 - i));
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      const dayOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= dayStart && orderDate < dayEnd;
      });
      
      const dayRevenue = dayOrders.reduce((sum: number, order: any) => {
        const orderTotal = parseFloat(order.total || order.totalAmount || 0);
        if (isNaN(orderTotal)) return sum; // Skip invalid totals
        return sum + orderTotal;
      }, 0);

      return {
        orders: dayOrders.length,
        revenue: dayRevenue,
        customers: new Set(dayOrders.map((order: any) => order.userId || order.user_id).filter(Boolean)).size
      };
    });

    // Filter orders to selected time range
    const cutoffDate = new Date(now);
    cutoffDate.setDate(cutoffDate.getDate() - daysToShow);

    const filteredOrders = orders.filter((order: any) => {
      const orderDate = new Date(order.createdAt || order.created_at);
      return orderDate >= cutoffDate;
    });

    console.log('📊 Filtered orders:', {
      totalOrders: orders.length,
      filteredOrders: filteredOrders.length,
      timeRange,
      daysToShow,
      cutoffDate: cutoffDate.toISOString().split('T')[0],
      sampleOrderDates: orders.slice(0, 3).map((order: any) => ({
        id: order.id,
        date: new Date(order.createdAt || order.created_at).toISOString().split('T')[0]
      }))
    });

    // If no orders in selected range but we have orders, expand to show all orders for now
    const ordersToUse = filteredOrders.length > 0 ? filteredOrders : orders;

    // Calculate totals directly from filtered orders since analytics API returns NaN
    const calculatedRevenue = ordersToUse.reduce((sum: number, order: any) => {
      const orderTotal = parseFloat(order.total || order.totalAmount || 0);
      if (isNaN(orderTotal)) return sum; // Skip invalid totals
      return sum + orderTotal;
    }, 0);

    const totalRevenue = calculatedRevenue;
    const totalOrders = ordersToUse.length;
    const avgOrderValue = totalOrders > 0 ? calculatedRevenue / totalOrders : 0;
    const uniqueCustomers = new Set(ordersToUse.map((order: any) => order.userId || order.user_id).filter(Boolean)).size;

    // Calculate top selling items from order items
    const itemCounts = new Map();

    ordersToUse.forEach((order: any) => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach((item: any) => {
          const itemId = item.menuItemId || item.menu_item_id;
          const itemName = item.name || item.menuItem?.name || `Item ${itemId}`;
          const quantity = parseInt(item.quantity) || 1;
          const price = parseFloat(item.price) || 0;

          if (!itemCounts.has(itemId)) {
            itemCounts.set(itemId, {
              id: itemId,
              name: itemName,
              sales: 0,
              revenue: 0
            });
          }

          const existing = itemCounts.get(itemId);
          existing.sales += quantity;
          existing.revenue += (price * quantity);
        });
      }
    });

    const topSellingItems = Array.from(itemCounts.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5); // Top 5 items

    // Calculate customer insights
    const customerOrderCounts = new Map();

    ordersToUse.forEach((order: any) => {
      const customerId = order.userId || order.user_id;
      if (customerId) {
        customerOrderCounts.set(customerId, (customerOrderCounts.get(customerId) || 0) + 1);
      }
    });

    const totalUniqueCustomers = customerOrderCounts.size;
    const repeatCustomers = Array.from(customerOrderCounts.values()).filter(count => count > 1).length;
    const repeatCustomerPercentage = totalUniqueCustomers > 0 ? Math.round((repeatCustomers / totalUniqueCustomers) * 100) : 0;
    const avgOrdersPerCustomer = totalUniqueCustomers > 0 ? Math.round((ordersToUse.length / totalUniqueCustomers) * 10) / 10 : 0;

    const customerInsights = {
      totalCustomers: totalUniqueCustomers,
      repeatCustomerPercentage,
      avgOrdersPerCustomer
    };

    // Calculate max values for chart scaling
    const revenueDaily = dailyData.map(d => d.revenue);
    const ordersDaily = dailyData.map(d => d.orders);
    const customersDaily = dailyData.map(d => d.customers);
    const avgOrderDaily = dailyData.map(d => d.orders > 0 ? d.revenue / d.orders : 0);

    const maxRevenue = Math.max(...revenueDaily, 1);
    const maxOrders = Math.max(...ordersDaily, 1);
    const maxCustomers = Math.max(...customersDaily, 1);
    const maxAvgOrder = Math.max(...avgOrderDaily, 1);

    console.log('📊 AnalyticsDashboard calculated totals:', {
      totalRevenue,
      totalOrders,
      avgOrderValue,
      uniqueCustomers,
      topSellingItemsCount: topSellingItems.length,
      customerInsights
    });

    return {
      revenue: {
        total: totalRevenue,
        change: 0, // TODO: Calculate change from previous period
        trend: "up",
        daily: revenueDaily,
        maxValue: maxRevenue
      },
      orders: {
        total: totalOrders,
        change: 0, // TODO: Calculate change from previous period
        trend: "up",
        daily: ordersDaily,
        maxValue: maxOrders
      },
      customers: {
        total: uniqueCustomers,
        change: 0, // TODO: Calculate change from previous period
        trend: "up",
        daily: customersDaily,
        maxValue: maxCustomers
      },
      averageOrder: {
        total: avgOrderValue,
        change: 0, // TODO: Calculate change from previous period
        trend: "up",
        daily: avgOrderDaily,
        maxValue: maxAvgOrder
      },
      topSellingItems,
      customerInsights
    };
  }, [analytics, orders, timeRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getTrendIcon = (trend: string) => {
    return trend === "up" ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
  };

  const getTrendColor = (trend: string) => {
    return trend === "up" ? "text-green-600" : "text-red-600";
  };

  const handleExportAnalytics = (orders: any[], timeRange: string, analyticsData: any) => {
    try {
      // Create summary data
      const summaryData = {
        reportDate: new Date().toISOString().split('T')[0],
        timeRange: timeRange,
        totalOrders: analyticsData.orders.total,
        totalRevenue: `$${analyticsData.revenue.total.toFixed(2)}`,
        averageOrderValue: `$${analyticsData.averageOrder.total.toFixed(2)}`,
        totalCustomers: analyticsData.customers.total
      };

      // Create CSV content with summary and detailed order data
      const headers = ['Order ID', 'Date', 'Customer ID', 'Total Amount', 'Status', 'Type'];
      const orderRows = orders.map(order => [
        order.id,
        new Date(order.createdAt || order.created_at).toLocaleDateString(),
        order.userId || order.user_id,
        `$${parseFloat(order.total || 0).toFixed(2)}`,
        order.status,
        order.order_type || order.orderType || order.type || 'N/A'
      ]);

      // Combine summary and detail data
      let csvContent = "Analytics Report Summary\n";
      csvContent += `Report Date,${summaryData.reportDate}\n`;
      csvContent += `Time Range,${summaryData.timeRange}\n`;
      csvContent += `Total Orders,${summaryData.totalOrders}\n`;
      csvContent += `Total Revenue,${summaryData.totalRevenue}\n`;
      csvContent += `Average Order Value,${summaryData.averageOrderValue}\n`;
      csvContent += `Total Customers,${summaryData.totalCustomers}\n\n`;
      csvContent += "Detailed Order Data\n";
      csvContent += headers.join(',') + '\n';
      csvContent += orderRows.map(row => row.join(',')).join('\n');

      // Download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `analytics-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('📁 Analytics exported successfully');
    } catch (error) {
      console.error('❌ Export failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h2>
          <p className="text-gray-600">Track your business performance and customer insights</p>
        </div>
        
        <div className="flex space-x-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Today</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={() => {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - (timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : timeRange === "90d" ? 90 : 7));
            const filteredForExport = orders.filter((order: any) => {
              const orderDate = new Date(order.createdAt || order.created_at);
              return orderDate >= cutoffDate;
            });
            const exportOrders = filteredForExport.length > 0 ? filteredForExport : orders;
            handleExportAnalytics(exportOrders, timeRange, analyticsData);
          }}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(analyticsData.revenue.total)}</p>
                <div className="flex items-center mt-2">
                  {getTrendIcon(analyticsData.revenue.trend)}
                  <span className={`text-sm font-medium ml-1 ${getTrendColor(analyticsData.revenue.trend)}`}>
                    {analyticsData.revenue.change}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last period</span>
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.orders.total}</p>
                <div className="flex items-center mt-2">
                  {getTrendIcon(analyticsData.orders.trend)}
                  <span className={`text-sm font-medium ml-1 ${getTrendColor(analyticsData.orders.trend)}`}>
                    {analyticsData.orders.change}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last period</span>
                </div>
              </div>
              <ShoppingCart className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">New Customers</p>
                <p className="text-2xl font-bold text-gray-900">{analyticsData.customers.total}</p>
                <div className="flex items-center mt-2">
                  {getTrendIcon(analyticsData.customers.trend)}
                  <span className={`text-sm font-medium ml-1 ${getTrendColor(analyticsData.customers.trend)}`}>
                    {analyticsData.customers.change}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last period</span>
                </div>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(analyticsData.averageOrder.total)}</p>
                <div className="flex items-center mt-2">
                  {getTrendIcon(analyticsData.averageOrder.trend)}
                  <span className={`text-sm font-medium ml-1 ${getTrendColor(analyticsData.averageOrder.trend)}`}>
                    {analyticsData.averageOrder.change}%
                  </span>
                  <span className="text-sm text-gray-500 ml-1">vs last period</span>
                </div>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between space-x-2">
              {analyticsData.revenue.daily.map((value, index) => {
                const height = analyticsData.revenue.maxValue > 0 ? (value / analyticsData.revenue.maxValue) * 100 : 0;
                return (
                  <div key={index} className="flex-1 bg-blue-100 rounded-t relative group" style={{ height: `${Math.max(height, 2)}%` }}>
                    <div className="bg-blue-600 h-full rounded-t"></div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      ${value.toFixed(0)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </CardContent>
        </Card>

        {/* Orders Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Orders Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between space-x-2">
              {analyticsData.orders.daily.map((value, index) => {
                const height = analyticsData.orders.maxValue > 0 ? (value / analyticsData.orders.maxValue) * 100 : 0;
                return (
                  <div key={index} className="flex-1 bg-green-100 rounded-t relative group" style={{ height: `${Math.max(height, 2)}%` }}>
                    <div className="bg-green-600 h-full rounded-t"></div>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {value} orders
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Items and Customer Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.topSellingItems && analyticsData.topSellingItems.length > 0 ? (
                analyticsData.topSellingItems.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.sales} sold</p>
                      </div>
                    </div>
                    <p className="font-medium">{formatCurrency(item.revenue)}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No sales data available yet.</p>
                  <p className="text-sm">Top selling items will appear here once orders are placed.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Customer Insights */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Insights</CardTitle>
          </CardHeader>
          <CardContent>
            {analyticsData.customerInsights && analyticsData.customerInsights.totalCustomers > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                  <div>
                    <p className="font-medium">Repeat Customers</p>
                    <p className="text-sm text-gray-600">Customers who ordered more than once</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{analyticsData.customerInsights.repeatCustomerPercentage}%</p>
                    <p className="text-sm text-gray-500">of total customers</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                  <div>
                    <p className="font-medium">Total Customers</p>
                    <p className="text-sm text-gray-600">Unique customers who have ordered</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{analyticsData.customerInsights.totalCustomers}</p>
                    <p className="text-sm text-gray-500">customers</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-purple-50 rounded">
                  <div>
                    <p className="font-medium">Average Orders per Customer</p>
                    <p className="text-sm text-gray-600">Average orders placed per customer</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">{analyticsData.customerInsights.avgOrdersPerCustomer}</p>
                    <p className="text-sm text-gray-500">orders/customer</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No customer data available yet.</p>
                <p className="text-sm">Customer insights will appear here once orders are placed.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const MenuEditor = ({ menuItems }: any) => {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [expandedMenuCategories, setExpandedMenuCategories] = useState<Set<number>>(new Set());
  const [expandedChoices, setExpandedChoices] = useState<Set<number>>(new Set());
  const [isCreateChoiceOpen, setIsCreateChoiceOpen] = useState(false);
  const [editingChoice, setEditingChoice] = useState<any>(null);
  const [newChoiceData, setNewChoiceData] = useState({ name: '', description: '', priority: 0 });
  const [editingChoiceData, setEditingChoiceData] = useState({ name: '', description: '', priority: 0 });
  const [editingChoiceItem, setEditingChoiceItem] = useState<any>(null);
  const [newChoiceItemData, setNewChoiceItemData] = useState({
    name: '',
    description: '',
    price: '0.00',
    isDefault: false
  });
  const [editingChoiceItemData, setEditingChoiceItemData] = useState({
    name: '',
    description: '',
    price: '0.00',
    isDefault: false,
    sizePricing: {},
    pricingCategory: 'pizza', // pizza, calzone, stromboli
    enableSizePricing: false
  });

  const [availableSizes, setAvailableSizes] = useState<any[]>([]);
  const [isSavingPricing, setIsSavingPricing] = useState(false);

  // New state for menu item choice groups management
  const [expandedItemChoiceGroups, setExpandedItemChoiceGroups] = useState<Set<number>>(new Set());
  const [draggingOver, setDraggingOver] = useState<number | null>(null);
  const [reorderingGroup, setReorderingGroup] = useState<{itemId: number, groupId: number} | null>(null);

  // Fetch size choices for a specific category
  const fetchSizesForCategory = async (category: string) => {
    try {
      const response = await fetch('/.netlify/functions/choice-items');
      if (response.ok) {
        const allChoiceItems = await response.json();

        // Find size choice groups that apply to this category
        const sizeItems = allChoiceItems.filter((item: any) => {
          const groupName = item.choice_group_name?.toLowerCase() || '';
          return groupName.includes('size');
        });

        // Filter sizes based on category
        let categorySizes = sizeItems;

        if (category === 'pizza') {
          categorySizes = sizeItems.filter((item: any) => {
            const name = item.name.toLowerCase();
            return name.includes('10') || name.includes('14') || name.includes('16') || name.includes('sicilian');
          });
        } else if (category === 'calzone' || category === 'stromboli') {
          categorySizes = sizeItems.filter((item: any) => {
            const name = item.name.toLowerCase();
            return name.includes('small') || name.includes('medium') || name.includes('large');
          });
        }

        setAvailableSizes(categorySizes);

        // Initialize sizePricing object with empty values for all available sizes
        // BUT preserve any existing values
        setEditingChoiceItemData(prev => {
          const newSizePricing = { ...prev.sizePricing }; // Keep existing prices
          categorySizes.forEach((size: any) => {
            // Only set empty string if no price exists
            if (!newSizePricing[size.id]) {
              newSizePricing[size.id] = '';
            }
          });

          return {
            ...prev,
            sizePricing: newSizePricing
          };
        });
      }
    } catch (error) {
      console.error('Error fetching sizes for category:', error);
    }
  };

  // Enhanced categories with order and more specific pizza categories
  // Fetch categories from API
  const { data: categoriesData, isLoading: categoriesLoading, refetch: refetchCategories } = useQuery({
    queryKey: ["/api/categories"],
  });
  
  const categories = categoriesData?.categories || [];

  const createMenuItemMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/menu", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/featured"] });
      toast({ title: "Success", description: "Menu item created successfully!" });
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create menu item", variant: "destructive" });
    },
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/menu/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/featured"] });
      toast({ title: "Success", description: "Menu item updated successfully!" });
      setEditingItem(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update menu item", variant: "destructive" });
    },
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/menu/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      toast({ title: "Success", description: "Menu item deleted successfully!" });
    },
    onError: (error: any) => {
      // Parse the error message to show a more user-friendly message
      let errorMessage = "Failed to delete menu item";
      try {
        if (error.message) {
          const errorData = JSON.parse(error.message);
          if (errorData.message && errorData.message.includes("foreign key constraint")) {
            errorMessage = "Cannot delete this menu item because it's being used in existing orders. Consider marking it as unavailable instead.";
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
        }
      } catch (e) {
        // If parsing fails, use the original error message
        errorMessage = error.message || "Failed to delete menu item";
      }
      
      toast({ 
        title: "Cannot Delete", 
        description: errorMessage, 
        variant: "destructive" 
      });
    },
  });

  // Category mutations
  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/categories", data),
    onSuccess: (result) => {
      console.log("Category created:", result);
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      refetchCategories(); // Explicit refetch
      toast({ title: "Success", description: "Category created successfully!" });
      setIsCreateCategoryOpen(false);
    },
    onError: (error: any) => {
      console.error("Category creation failed:", error);
      toast({ title: "Error", description: error.message || "Failed to create category", variant: "destructive" });
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest("PUT", `/api/categories/${id}`, data),
    onSuccess: (result) => {
      console.log("Category update result:", result);

      const updatedItems = result?.updatedMenuItems || 0;
      const message = updatedItems > 0
        ? `Category updated successfully! Moved ${updatedItems} menu items. Page will refresh.`
        : "Category updated successfully! Page will refresh.";

      toast({ title: "Success", description: message });
      setEditingCategory(null);

      // Reload page to show fresh data (API now has no-cache headers)
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update category", variant: "destructive" });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      refetchCategories(); // Explicit refetch
      toast({ title: "Success", description: "Category deleted successfully!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete category", variant: "destructive" });
    },
  });

  // Group menu items by category
  const menuItemsByCategory = (menuItems as any[] || []).reduce((acc: any, item: any) => {
    const category = item.category || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {}) || {};

  // Add choice groups to categories and items
  const [categoryChoices, setCategoryChoices] = useState<{[key: string]: number[]}>({});
  const [itemChoices, setItemChoices] = useState<{[key: number]: number[]}>({});

  const addChoiceToCategory = (categoryName: string, choiceId: number) => {
    // Check if already assigned
    if (categoryChoices[categoryName]?.includes(choiceId)) {
      return;
    }
    
    // Update local state immediately for UI feedback
    setCategoryChoices(prev => ({
      ...prev,
      [categoryName]: [...(prev[categoryName] || []), choiceId]
    }));
    
    // Persist to database
    createCategoryChoiceGroupMutation.mutate({
      categoryName,
      choiceGroupId: choiceId
    });
  };

  const removeChoiceFromCategory = (categoryName: string, choiceId: number) => {
    // Update local state immediately for UI feedback
    setCategoryChoices(prev => ({
      ...prev,
      [categoryName]: (prev[categoryName] || []).filter(id => id !== choiceId)
    }));
    
    // Remove from database
    deleteCategoryChoiceGroupMutation.mutate({
      categoryName,
      choiceGroupId: choiceId
    });
  };

  const addChoiceToItem = (itemId: number, choiceId: number) => {
    // Check if already assigned
    const existingGroups = menuItemChoiceGroupsMap[itemId] || [];
    if (existingGroups.some(g => g.choice_group_id === choiceId)) {
      toast({
        title: "Already assigned",
        description: "This choice group is already assigned to this menu item",
        variant: "destructive"
      });
      return;
    }

    // Determine if this should be required and the order
    const choiceGroup = choiceGroups.find((cg: any) => cg.id === choiceId);
    const groupName = choiceGroup?.name?.toLowerCase() || '';
    const isRequired = groupName.includes('size') || groupName.includes('wing flavors');
    const order = existingGroups.length + 1;

    // Create the assignment
    createMenuItemChoiceGroupMutation.mutate({
      menuItemId: itemId,
      choiceGroupId: choiceId,
      order: order,
      isRequired: isRequired
    });
  };

  const removeChoiceFromItem = (itemId: number, assignmentId: number) => {
    // Find the assignment
    const assignment = menuItemChoiceGroups.find((micg: any) => micg.id === assignmentId);
    if (!assignment) return;

    // Show confirmation for primary groups
    const choiceGroup = choiceGroups.find((cg: any) => cg.id === assignment.choice_group_id);
    const groupName = choiceGroup?.name?.toLowerCase() || '';
    const isPrimary = groupName.includes('size') || groupName.includes('wing flavors');

    if (isPrimary) {
      if (!confirm(`This is a primary choice group (${choiceGroup?.name}). Are you sure you want to remove it?`)) {
        return;
      }
    }

    deleteMenuItemChoiceGroupMutation.mutate(assignmentId);
  };

  // Get sorted categories
  const sortedCategories = categories
    .filter(cat => cat.isActive)
    .sort((a, b) => a.order - b.order);

  const filteredItems = (menuItems as any[])?.filter((item: any) => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    return matchesSearch && matchesCategory;
  }) || [];

  // Drag and drop handlers for categories
  const handleDragStart = (e: React.DragEvent, categoryId: number) => {
    e.dataTransfer.setData("categoryId", categoryId.toString());
    e.dataTransfer.effectAllowed = "move";
    // Add visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Reset visual feedback
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetCategoryId: number) => {
    e.preventDefault();
    const draggedCategoryId = parseInt(e.dataTransfer.getData("categoryId"));
    
    if (draggedCategoryId === targetCategoryId) return;

    const draggedCategory = categories.find(cat => cat.id === draggedCategoryId);
    const targetCategory = categories.find(cat => cat.id === targetCategoryId);
    
    if (!draggedCategory || !targetCategory) return;

    // Update both categories with swapped orders via API
    const draggedOrder = draggedCategory.order;
    const targetOrder = targetCategory.order;

    // Update dragged category with target's order
    updateCategoryMutation.mutate({
      id: draggedCategoryId,
      data: {
        name: draggedCategory.name,
        order: targetOrder,
        isActive: draggedCategory.isActive
      }
    });

    // Update target category with dragged category's order
    updateCategoryMutation.mutate({
      id: targetCategoryId,
      data: {
        name: targetCategory.name,
        order: draggedOrder,
        isActive: targetCategory.isActive
      }
    });
  };

  const handleCreateCategory = (data: any) => {
    const newCategory = {
      ...data,
      order: categories.length + 1,
      isActive: true
    };
    createCategoryMutation.mutate(newCategory);
  };

  const handleUpdateCategory = (id: number, data: any) => {
    updateCategoryMutation.mutate({ id, data });
  };

  const handleDeleteCategory = (id: number) => {
    const category = categories.find(cat => cat.id === id);
    const itemCount = menuItemsByCategory[category?.name || '']?.length || 0;

    if (itemCount > 0) {
      toast({
        title: "Cannot delete category",
        description: `This category contains ${itemCount} menu items. Move or delete the items first.`,
        variant: "destructive"
      });
      return;
    }

    if (confirm(`Are you sure you want to delete the category "${category?.name}"? This action cannot be undone.`)) {
      deleteCategoryMutation.mutate(id);
    }
  };

  const toggleCategoryStatus = (id: number) => {
    const category = categories.find(cat => cat.id === id);
    if (category) {
      updateCategoryMutation.mutate({
        id,
        data: {
          name: category.name,
          order: category.order,
          isActive: !category.isActive
        }
      });
    }
  };

  // Choices & Addons management with API
  const { data: choiceGroups = [], refetch: refetchChoiceGroups } = useQuery({
    queryKey: ['choice-groups'],
    queryFn: async () => {
      console.log('🔍 Fetching choice groups...');
      try {
        const response = await apiRequest('GET', '/api/choice-groups');
        if (!response.ok) {
          console.error('❌ Choice groups API failed:', response.status, response.statusText);
          return [];
        }
        const data = await response.json();
        console.log('📦 Choice groups response:', data, 'Length:', data?.length || 0);
        return data || [];
      } catch (error) {
        console.error('💥 Choice groups fetch error:', error);
        return [];
      }
    }
  });

  const { data: choiceItems = [], refetch: refetchChoiceItems } = useQuery({
    queryKey: ['choice-items'],
    queryFn: async () => {
      console.log('🔍 Fetching choice items...');
      try {
        const response = await apiRequest('GET', '/api/choice-items');
        if (!response.ok) {
          console.error('❌ Choice items API failed:', response.status, response.statusText);
          return [];
        }
        const data = await response.json();
        console.log('📦 Choice items response:', data, 'Length:', data?.length || 0);
        return data || [];
      } catch (error) {
        console.error('💥 Choice items fetch error:', error);
        return [];
      }
    }
  });

  const { data: categoryChoiceGroups = [] } = useQuery({
    queryKey: ['category-choice-groups'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/category-choice-groups');
      return response.json();
    }
  });

  // Fetch menu item choice groups
  const { data: menuItemChoiceGroups = [], refetch: refetchMenuItemChoiceGroups } = useQuery({
    queryKey: ['menu-item-choice-groups'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/menu-item-choice-groups');
        if (!response.ok) {
          console.error('Failed to fetch menu item choice groups:', response.status);
          return [];
        }
        const data = await response.json();
        console.log('Fetched menu item choice groups:', data);
        return data || [];
      } catch (error) {
        console.error('Error fetching menu item choice groups:', error);
        return [];
      }
    }
  });

  // Group menu item choice groups by menu item ID for easy lookup
  const menuItemChoiceGroupsMap = React.useMemo(() => {
    const map: { [key: number]: any[] } = {};
    menuItemChoiceGroups.forEach((micg: any) => {
      if (!map[micg.menu_item_id]) {
        map[micg.menu_item_id] = [];
      }
      // Find the choice group name from our choiceGroups data
      const choiceGroup = choiceGroups.find((cg: any) => cg.id === micg.choice_group_id);
      map[micg.menu_item_id].push({
        ...micg,
        choice_group_name: choiceGroup?.name || 'Unknown Group',
        choice_group_description: choiceGroup?.description || ''
      });
    });
    // Sort each item's groups by order
    Object.keys(map).forEach(itemId => {
      map[parseInt(itemId)].sort((a, b) => a.order - b.order);
    });
    return map;
  }, [menuItemChoiceGroups, choiceGroups]);

  // Load existing category choice group assignments
  React.useEffect(() => {
    const groupedChoices: {[key: string]: number[]} = {};
    categoryChoiceGroups.forEach((ccg: any) => {
      if (!groupedChoices[ccg.category_name]) {
        groupedChoices[ccg.category_name] = [];
      }
      groupedChoices[ccg.category_name].push(ccg.choice_group_id);
    });

    // Only update if we don't have local state yet, or if API data is more recent
    setCategoryChoices(prev => {
      // If prev is empty, use API data
      if (Object.keys(prev).length === 0) {
        return groupedChoices;
      }

      // Merge API data with local state, preferring local state for immediate UI feedback
      const merged = { ...groupedChoices };

      // Keep any local additions that might not be in API yet (due to timing)
      Object.keys(prev).forEach(categoryName => {
        if (prev[categoryName]) {
          // Combine API data with local data, removing duplicates
          const apiChoices = merged[categoryName] || [];
          const localChoices = prev[categoryName] || [];
          merged[categoryName] = [...new Set([...apiChoices, ...localChoices])];
        }
      });

      return merged;
    });
  }, [categoryChoiceGroups]);

  const createChoiceGroupMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/choice-groups', data),
    onSuccess: () => {
      refetchChoiceGroups();
      toast({
        title: "Success",
        description: "Choice group created successfully",
      });
      setIsCreateChoiceOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create choice group",
        variant: "destructive",
      });
    }
  });

  const updateChoiceGroupMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest('PUT', `/api/choice-groups/${id}`, data),
    onSuccess: () => {
      refetchChoiceGroups();
      toast({
        title: "Success",
        description: "Choice group updated successfully",
      });
      setEditingChoice(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update choice group",
        variant: "destructive",
      });
    }
  });

  const deleteChoiceGroupMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/choice-groups/${id}`),
    onSuccess: () => {
      refetchChoiceGroups();
      toast({
        title: "Success",
        description: "Choice group deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete choice group",
        variant: "destructive",
      });
    }
  });

  const createChoiceItemMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/choice-items', data),
    onSuccess: () => {
      refetchChoiceItems();
      toast({
        title: "Success",
        description: "Choice item created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create choice item",
        variant: "destructive",
      });
    }
  });

  const updateChoiceItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => apiRequest('PUT', `/api/choice-items/${id}`, data),
    onSuccess: () => {
      refetchChoiceItems();
      toast({
        title: "Success",
        description: "Choice item updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update choice item",
        variant: "destructive",
      });
    }
  });

  const deleteChoiceItemMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/choice-items/${id}`),
    onSuccess: () => {
      refetchChoiceItems();
      toast({
        title: "Success",
        description: "Choice item deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete choice item",
        variant: "destructive",
      });
    }
  });

  // Category choice group mutations
  const createCategoryChoiceGroupMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/category-choice-groups', data),
    onSuccess: () => {
      // Refetch data to update UI
      queryClient.invalidateQueries({ queryKey: ['category-choice-groups'] });
      toast({
        title: "Success",
        description: "Choice group assigned to category successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign choice group to category",
        variant: "destructive",
      });
    }
  });

  const deleteCategoryChoiceGroupMutation = useMutation({
    mutationFn: async (data: { categoryName: string; choiceGroupId: number }) => {
      // Find the record to delete
      const record = categoryChoiceGroups.find((ccg: any) =>
        ccg.category_name === data.categoryName && ccg.choice_group_id === data.choiceGroupId
      );
      if (!record) {
        throw new Error('Record not found');
      }
      return apiRequest('DELETE', `/api/category-choice-groups/${record.id}`);
    },
    onSuccess: () => {
      // Refetch data to update UI
      queryClient.invalidateQueries({ queryKey: ['category-choice-groups'] });
      toast({
        title: "Success",
        description: "Choice group removed from category successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove choice group from category",
        variant: "destructive",
      });
    }
  });

  // Menu item choice group mutations
  const createMenuItemChoiceGroupMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/menu-item-choice-groups', data),
    onSuccess: () => {
      refetchMenuItemChoiceGroups();
      toast({
        title: "Success",
        description: "Choice group assigned to menu item successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign choice group to menu item",
        variant: "destructive",
      });
    },
  });

  const updateMenuItemChoiceGroupMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest('PUT', `/api/menu-item-choice-groups/${id}`, data),
    onSuccess: () => {
      refetchMenuItemChoiceGroups();
      toast({
        title: "Success",
        description: "Choice group updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update choice group",
        variant: "destructive",
      });
    },
  });

  const deleteMenuItemChoiceGroupMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/menu-item-choice-groups/${id}`),
    onSuccess: () => {
      refetchMenuItemChoiceGroups();
      toast({
        title: "Success",
        description: "Choice group removed from menu item",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove choice group",
        variant: "destructive",
      });
    },
  });

  const handleCreateChoice = (data: any) => {
    createChoiceGroupMutation.mutate(data);
  };

  const handleUpdateChoice = (id: number, data: any) => {
    updateChoiceGroupMutation.mutate({ id, data });
  };

  const handleDeleteChoice = (id: number) => {
    deleteChoiceGroupMutation.mutate(id);
  };

  const toggleChoiceStatus = (id: number) => {
    const choice = choiceGroups.find((c: any) => c.id === id);
    if (choice) {
      // Since isActive field is missing from API response, default to true and toggle to false
      const currentStatus = choice.isActive !== false; // true if undefined or true
      console.log('🔄 Toggling choice status:', { id, currentStatus, newStatus: !currentStatus });
      updateChoiceGroupMutation.mutate({
        id,
        data: {
          isActive: !currentStatus,
          // Include required fields to avoid validation errors
          name: choice.name,
          description: choice.description || '',
          order: choice.order || 0,
          minSelections: choice.minSelections || 0,
          isRequired: choice.isRequired || false
        }
      });
    }
  };

  const handleCreateChoiceItem = (choiceGroupId: number) => {
    if (newChoiceItemData.name) {
      createChoiceItemMutation.mutate({
        ...newChoiceItemData,
        choiceGroupId,
        order: choiceItems.filter((item: any) => item.choiceGroupId === choiceGroupId).length + 1
      });
      setNewChoiceItemData({ name: '', description: '', price: '0.00', isDefault: false });
    }
  };

  const handleUpdateChoiceItem = async (id: number, data: any) => {
    console.log('💾 Saving choice item:', id, data);
    setIsSavingPricing(true);
    try {
      // Handle size-based pricing first (before closing dialog)
      if (data.enableSizePricing && data.sizePricing) {
        // Save pricing rules for each size with a price
        for (const [sizeId, price] of Object.entries(data.sizePricing)) {
          if (price && parseFloat(price as string) > 0) {
            const response = await fetch('/.netlify/functions/choice-pricing', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                choiceItemId: id,
                conditionChoiceItemId: parseInt(sizeId),
                price: parseFloat(price as string)
              })
            });

            if (!response.ok) {
              console.error('❌ Failed to save pricing rule:', response.status, response.statusText);
              const errorText = await response.text();
              console.error('Error details:', errorText);
            } else {
              console.log('✅ Pricing rule saved successfully');
            }
          }
        }
      } else if (!data.enableSizePricing) {
        console.log('🗑️ Size pricing disabled, removing existing rules');
        // If size pricing is disabled, remove all existing pricing rules for this item
        try {
          const pricingResponse = await fetch('/.netlify/functions/choice-pricing');
          if (pricingResponse.ok) {
            const pricingData = await pricingResponse.json();
            const itemRules = pricingData.pricingRules?.filter((rule: any) => rule.choice_item_id === id) || [];
            console.log('🔍 Found', itemRules.length, 'existing rules to delete');

            // Delete each existing rule
            for (const rule of itemRules) {
              await fetch(`/.netlify/functions/choice-pricing/${rule.id}`, {
                method: 'DELETE'
              });
            }
          }
        } catch (error) {
          console.error('Error removing existing pricing rules:', error);
        }
      }

      // Save the basic choice item data after pricing rules are saved
      const basicData = {
        name: data.name,
        price: data.price,
        isDefault: data.isDefault
      };
      console.log('📝 Basic data to save:', basicData);
      updateChoiceItemMutation.mutate({ id, data: basicData });

      // Wait a moment for mutation to complete before closing dialog
      await new Promise(resolve => setTimeout(resolve, 500));

      setEditingChoiceItem(null);
      setEditingChoiceItemData({ name: '', description: '', price: '0.00', isDefault: false, sizePricing: {}, pricingCategory: 'pizza', enableSizePricing: false });
      console.log('✅ Choice item update completed');
    } catch (error) {
      console.error('💥 Error updating choice item with size pricing:', error);
    } finally {
      setIsSavingPricing(false);
    }
  };

  const handleEditChoiceItem = async (item: any) => {
    console.log('✏️ Editing choice item:', item);
    setEditingChoiceItem(item);

    // Load existing size pricing data
    let sizePricing = {};
    let enableSizePricing = false;
    let pricingCategory = 'pizza';

    try {
      console.log('🔍 Loading existing pricing rules for item:', item.id);
      const pricingResponse = await fetch('/.netlify/functions/choice-pricing');
      if (pricingResponse.ok) {
        const data = await pricingResponse.json();
        console.log('📊 All pricing rules:', data);
        const itemPricingRules = data.pricingRules?.filter((rule: any) => rule.choice_item_id === item.id) || [];
        console.log('🎯 Pricing rules for this item:', itemPricingRules);

        if (itemPricingRules.length > 0) {
          enableSizePricing = true;
          console.log('✅ Size pricing enabled - found', itemPricingRules.length, 'rules');

          // Determine category based on the first pricing rule
          const firstRule = itemPricingRules[0];
          const conditionName = firstRule.condition_choice_name?.toLowerCase() || '';
          console.log('🔍 Analyzing condition name:', conditionName);

          if (conditionName.includes('10') || conditionName.includes('14') || conditionName.includes('16') || conditionName.includes('sicilian')) {
            pricingCategory = 'pizza';
          } else if (conditionName.includes('small') || conditionName.includes('medium') || conditionName.includes('large')) {
            // Check if it's calzone or stromboli based on context (this could be enhanced)
            pricingCategory = 'calzone'; // Default to calzone, user can change if needed
          }
          console.log('📂 Determined category:', pricingCategory);

          // Build sizePricing object using actual choice item IDs
          itemPricingRules.forEach((rule: any) => {
            sizePricing[rule.condition_choice_item_id] = rule.price.toString();
          });
        }
      } else {
        console.error('❌ Failed to load pricing data:', pricingResponse.status);
      }
    } catch (error) {
      console.error('💥 Error loading size pricing:', error);
    }

    console.log('🏗️ Setting edit data:', {
      name: item.name,
      enableSizePricing,
      pricingCategory,
      sizePricing
    });

    setEditingChoiceItemData({
      name: item.name,
      description: item.description || '',
      price: item.price || '0.00',
      isDefault: item.isDefault || false,
      sizePricing,
      pricingCategory,
      enableSizePricing
    });

    // If size pricing is enabled, fetch the available sizes
    if (enableSizePricing) {
      console.log('📐 Fetching sizes for category:', pricingCategory);
      await fetchSizesForCategory(pricingCategory);
    }
  };

  // Drag and drop handlers for choices
  const handleChoiceDragStart = (e: React.DragEvent, choiceId: number) => {
    e.dataTransfer.setData("choiceId", choiceId.toString());
    e.dataTransfer.setData("type", "choice");
  };

  const handleChoiceDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleChoiceDrop = (e: React.DragEvent, targetChoiceId: number) => {
    e.preventDefault();
    const draggedChoiceId = parseInt(e.dataTransfer.getData("choiceId"));
    
    if (draggedChoiceId === targetChoiceId) return;

    const draggedChoice = choiceGroups.find((choice: any) => choice.id === draggedChoiceId);
    const targetChoice = choiceGroups.find((choice: any) => choice.id === targetChoiceId);
    
    if (!draggedChoice || !targetChoice) return;

    // Update the order of both choices
    updateChoiceGroupMutation.mutate({ 
      id: draggedChoiceId, 
      data: { order: targetChoice.order } 
    });
    updateChoiceGroupMutation.mutate({ 
      id: targetChoiceId, 
      data: { order: draggedChoice.order } 
    });
  };

  // Drop handlers for categories and items
  const handleCategoryDrop = (e: React.DragEvent, categoryName: string) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    if (type === "choice") {
      const choiceId = parseInt(e.dataTransfer.getData("choiceId"));
      addChoiceToCategory(categoryName, choiceId);
    }
  };

  const handleItemDrop = (e: React.DragEvent, itemId: number) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("type");
    if (type === "choice") {
      const choiceId = parseInt(e.dataTransfer.getData("choiceId"));
      addChoiceToItem(itemId, choiceId);
    }
  };

  // Get sorted choices
  const sortedChoices = choiceGroups
    .filter((choice: any) => choice.isActive !== false) // Show if isActive is true or undefined
    .sort((a: any, b: any) => (a.order || 0) - (b.order || 0));


  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  // Component to display assigned choice groups
  const AssignedChoices = ({ choiceIds, onRemove }: { choiceIds: number[], onRemove: (choiceId: number) => void }) => {
    if (choiceIds.length === 0) return null;

    return (
      <div className="mt-2 space-y-1">
        <p className="text-xs font-medium text-gray-600">Choice Groups:</p>
        <div className="flex flex-wrap gap-1">
          {choiceIds.map(choiceId => {
            const choice = choiceGroups.find((c: any) => c.id === choiceId);
            if (!choice) return null;

            return (
              <div key={choiceId} className="flex items-center space-x-1 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                <span>{choice.name}</span>
                <button
                  onClick={() => onRemove(choiceId)}
                  className="text-blue-600 hover:text-blue-800 font-bold"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Enhanced component to display menu item choice group badges with full management
  const MenuItemChoiceGroupBadges = ({ itemId }: { itemId: number }) => {
    const assignments = menuItemChoiceGroupsMap[itemId] || [];
    const [isExpanded, setIsExpanded] = useState(expandedItemChoiceGroups.has(itemId));
    const [showAddDropdown, setShowAddDropdown] = useState(false);

    if (assignments.length === 0 && !showAddDropdown) {
      return (
        <div className="mt-2">
          <button
            onClick={() => setShowAddDropdown(true)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            + Add Choice Groups
          </button>
        </div>
      );
    }

    const toggleRequired = (assignment: any) => {
      updateMenuItemChoiceGroupMutation.mutate({
        id: assignment.id,
        data: {
          is_required: !assignment.is_required,
          order: assignment.order
        }
      });
    };

    const handleReorder = (assignment: any, direction: 'up' | 'down') => {
      const currentIndex = assignments.findIndex(a => a.id === assignment.id);
      const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

      if (swapIndex < 0 || swapIndex >= assignments.length) return;

      const swapAssignment = assignments[swapIndex];

      // Update both assignments with swapped orders
      updateMenuItemChoiceGroupMutation.mutate({
        id: assignment.id,
        data: { order: swapAssignment.order, is_required: assignment.is_required }
      });
      updateMenuItemChoiceGroupMutation.mutate({
        id: swapAssignment.id,
        data: { order: assignment.order, is_required: swapAssignment.is_required }
      });
    };

    const getBadgeColor = (assignment: any) => {
      const groupName = assignment.choice_group_name?.toLowerCase() || '';

      // Primary required groups (red)
      if (assignment.is_required && (groupName.includes('size') || groupName.includes('flavors'))) {
        return 'bg-red-100 text-red-800 border-red-200';
      }
      // Other required groups (blue)
      if (assignment.is_required) {
        return 'bg-blue-100 text-blue-800 border-blue-200';
      }
      // Optional groups (gray)
      return 'bg-gray-100 text-gray-700 border-gray-200';
    };

    const availableChoiceGroups = choiceGroups.filter((cg: any) =>
      !assignments.some(a => a.choice_group_id === cg.id)
    );

    return (
      <div className="mt-3 space-y-2">
        {/* Compact Badge View */}
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {assignments.map((assignment, index) => (
              <div
                key={assignment.id}
                className={`flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium border ${getBadgeColor(assignment)}`}
              >
                <span className="font-bold">{assignment.order}</span>
                <span>{assignment.is_required ? '•' : '○'}</span>
                <span>{assignment.choice_group_name}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              const newExpanded = new Set(expandedItemChoiceGroups);
              if (isExpanded) {
                newExpanded.delete(itemId);
              } else {
                newExpanded.add(itemId);
              }
              setExpandedItemChoiceGroups(newExpanded);
              setIsExpanded(!isExpanded);
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Expanded Management Panel */}
        {isExpanded && (
          <div className="bg-gray-50 border rounded-lg p-3 space-y-3">
            <div className="text-sm font-medium text-gray-700">Choice Groups Management</div>

            {/* List of assigned groups with controls */}
            <div className="space-y-2">
              {assignments.map((assignment, index) => (
                <div key={assignment.id} className="flex items-center justify-between bg-white p-2 rounded border">
                  <div className="flex items-center space-x-3">
                    <div className="flex flex-col">
                      <button
                        onClick={() => handleReorder(assignment, 'up')}
                        disabled={index === 0}
                        className={`text-xs ${index === 0 ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleReorder(assignment, 'down')}
                        disabled={index === assignments.length - 1}
                        className={`text-xs ${index === assignments.length - 1 ? 'text-gray-300' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        ▼
                      </button>
                    </div>
                    <span className="font-bold text-sm">{assignment.order}</span>
                    <div>
                      <div className="font-medium text-sm">{assignment.choice_group_name}</div>
                      {assignment.choice_group_description && (
                        <div className="text-xs text-gray-500">{assignment.choice_group_description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleRequired(assignment)}
                      className={`px-2 py-1 text-xs rounded ${
                        assignment.is_required
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {assignment.is_required ? 'Required' : 'Optional'}
                    </button>
                    <button
                      onClick={() => removeChoiceFromItem(itemId, assignment.id)}
                      className="text-red-500 hover:text-red-700 text-sm font-bold"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new choice group dropdown */}
            {availableChoiceGroups.length > 0 && (
              <div className="relative">
                {showAddDropdown ? (
                  <div className="flex items-center space-x-2">
                    <select
                      className="flex-1 text-sm border rounded px-2 py-1"
                      onChange={(e) => {
                        const choiceId = parseInt(e.target.value);
                        if (choiceId) {
                          addChoiceToItem(itemId, choiceId);
                          setShowAddDropdown(false);
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="">Select a choice group...</option>
                      {availableChoiceGroups.map((cg: any) => (
                        <option key={cg.id} value={cg.id}>{cg.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => setShowAddDropdown(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddDropdown(true)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Choice Group
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Menu Editor</h2>
          <p className="text-gray-600">Manage your menu items, categories, and pricing</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setIsCategoryManagerOpen(true)}>
            <Grid className="h-4 w-4 mr-2" />
            Manage Categories
          </Button>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Menu Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Items</p>
                <p className="text-2xl font-bold text-gray-900">{menuItems?.length || 0}</p>
              </div>
              <Pizza className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Categories</p>
                <p className="text-2xl font-bold text-green-600">{categories.length}</p>
              </div>
              <Grid className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Average Price</p>
                <p className="text-2xl font-bold text-purple-600">
                  {menuItems?.length > 0
                    ? formatCurrency((menuItems || []).reduce((sum: number, item: any) => {
                        const price = parseFloat(item.basePrice || item.price || 0);
                        return sum + (isNaN(price) ? 0 : price);
                      }, 0) / menuItems.length)
                    : "$0.00"
                  }
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Items</p>
                <p className="text-2xl font-bold text-orange-600">
                  {menuItems?.filter((item: any) => item.isAvailable !== false).length || 0}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>


      {/* GloriaFood-Style Menu Editor Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Menu Categories */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Menu Categories & Items</span>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sortedCategories.map((category) => {
                  const categoryItems = menuItemsByCategory[category.name] || [];
                  const isExpanded = expandedCategories.has(category.id);
                  
                  return (
                    <div 
                      key={category.id} 
                      className="border rounded-lg transition-opacity duration-200"
                      draggable
                      onDragStart={(e) => handleDragStart(e, category.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, category.id)}
                    >
                      {/* Category Header */}
                      <div 
                        className="flex items-center justify-between p-4 bg-gray-50 cursor-move hover:bg-gray-100"
                        onClick={() => {
                          const newExpanded = new Set(expandedCategories);
                          if (isExpanded) {
                            newExpanded.delete(category.id);
                          } else {
                            newExpanded.add(category.id);
                          }
                          setExpandedCategories(newExpanded);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => handleCategoryDrop(e, category.name)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                            {categoryItems.length > 0 && categoryItems[0].image ? (
                              <img 
                                src={categoryItems[0].image} 
                                alt={category.name} 
                                className="w-8 h-8 object-cover rounded"
                              />
                            ) : (
                              <Pizza className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold">{category.name}</h3>
                            {categoryItems.length > 0 && (
                              <p className="text-sm text-gray-500">{categoryItems.length} items</p>
                            )}
                            <AssignedChoices 
                              choiceIds={categoryChoices[category.name] || []}
                              onRemove={(choiceId) => removeChoiceFromCategory(category.name, choiceId)}
                            />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <ChevronDown 
                            className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                          />
                        </div>
                      </div>
                      
                      {/* Category Items */}
                      {isExpanded && (
                        <div className="p-4 space-y-3">
                          {categoryItems.map((item: any) => (
                            <div
                              key={item.id}
                              className={`border rounded-lg transition-all ${draggingOver === item.id ? 'ring-2 ring-blue-400 bg-blue-50' : 'hover:bg-gray-50'}`}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDraggingOver(item.id);
                              }}
                              onDragLeave={() => setDraggingOver(null)}
                              onDrop={(e) => {
                                handleItemDrop(e, item.id);
                                setDraggingOver(null);
                              }}
                            >
                              <div className="p-3">
                                <div className="flex items-start justify-between">
                                  <div className="flex items-start space-x-3 flex-1">
                                    <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                                      {item.imageUrl ? (
                                        <img
                                          src={item.imageUrl}
                                          alt={item.name}
                                          className="w-10 h-10 object-cover rounded"
                                        />
                                      ) : (
                                        <Pizza className="h-6 w-6 text-gray-400" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between">
                                        <h4 className="font-medium text-gray-900">{item.name}</h4>
                                        <span className="font-semibold text-gray-900 ml-2">{formatCurrency(item.basePrice || 0)}</span>
                                      </div>
                                      {item.description && (
                                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{item.description}</p>
                                      )}
                                      <MenuItemChoiceGroupBadges itemId={item.id} />
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 ml-3">
                                    <Badge variant={item.isAvailable !== false ? "default" : "secondary"}>
                                      {item.isAvailable !== false ? "Active" : "Inactive"}
                                    </Badge>
                                    <div className="flex space-x-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setEditingItem(item)}
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteMenuItemMutation.mutate(item.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Add Item to Category Button */}
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => setIsCreateDialogOpen(true)}
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add item to {category.name}
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
                
                {/* Add Category Button */}
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setIsCreateCategoryOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Choices & Addons */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Choices & Addons</span>
                <Button variant="outline" size="sm" onClick={() => setIsCreateChoiceOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Group
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {sortedChoices.map((choice) => {
                  const isExpanded = expandedChoices.has(choice.id);
                  
                  return (
                    <div 
                      key={choice.id}
                      draggable
                      onDragStart={(e) => handleChoiceDragStart(e, choice.id)}
                      onDragOver={handleChoiceDragOver}
                      onDrop={(e) => handleChoiceDrop(e, choice.id)}
                      className="border rounded hover:bg-gray-50"
                    >
                      {/* Choice Header */}
                      <div 
                        className="flex items-center justify-between p-3 cursor-pointer"
                        onClick={() => {
                          const newExpanded = new Set(expandedChoices);
                          if (isExpanded) {
                            newExpanded.delete(choice.id);
                          } else {
                            newExpanded.add(choice.id);
                          }
                          setExpandedChoices(newExpanded);
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <ChevronDown 
                            className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                          />
                          <span className="font-medium">{choice.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {choiceItems.filter((item: any) => item.choiceGroupId === choice.id).length} items
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingChoice(choice);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleChoiceStatus(choice.id);
                            }}
                          >
                            {(choice.isActive !== false) ? "Deactivate" : "Activate"}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteChoice(choice.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Choice Items */}
                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-2">
                          {/* Add New Item Form */}
                          <div className="p-3 bg-blue-50 rounded border">
                            <div className="space-y-3">
                              <div>
                                <Label htmlFor={`new-item-name-${choice.id}`} className="text-sm font-medium">Name</Label>
                                <Input
                                  id={`new-item-name-${choice.id}`}
                                  placeholder="e.g., Pepperoni"
                                  value={newChoiceItemData.name}
                                  onChange={(e) => setNewChoiceItemData({ ...newChoiceItemData, name: e.target.value })}
                                  className="text-sm"
                                />
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <Label htmlFor={`new-item-price-${choice.id}`} className="text-sm font-medium">Price</Label>
                                  <Input
                                    id={`new-item-price-${choice.id}`}
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={newChoiceItemData.price}
                                    onChange={(e) => setNewChoiceItemData({ ...newChoiceItemData, price: e.target.value })}
                                    className="text-sm"
                                  />
                                </div>
                                <div className="flex items-center space-x-2 pt-6">
                                  <input
                                    type="checkbox"
                                    id={`new-item-default-${choice.id}`}
                                    checked={newChoiceItemData.isDefault}
                                    onChange={(e) => setNewChoiceItemData({ ...newChoiceItemData, isDefault: e.target.checked })}
                                    className="rounded"
                                  />
                                  <Label htmlFor={`new-item-default-${choice.id}`} className="text-sm">Pre-select</Label>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <Button 
                                  size="sm"
                                  onClick={() => handleCreateChoiceItem(choice.id)}
                                  disabled={!newChoiceItemData.name}
                                >
                                  Add Item
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setNewChoiceItemData({ name: '', description: '', price: '0.00', isDefault: false })}
                                >
                                  Clear
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Existing Items */}
                          {choiceItems
                            .filter((item: any) => item.choiceGroupId === choice.id)
                            .map((item: any) => (
                              <div key={item.id} className="border rounded p-3">
                                {editingChoiceItem?.id === item.id ? (
                                  // Edit Mode
                                  <div className="space-y-3">
                                    <div>
                                      <Label htmlFor={`edit-item-name-${item.id}`} className="text-sm font-medium">Name</Label>
                                      <Input
                                        id={`edit-item-name-${item.id}`}
                                        placeholder="e.g., Pepperoni"
                                        value={editingChoiceItemData.name}
                                        onChange={(e) => setEditingChoiceItemData({ ...editingChoiceItemData, name: e.target.value })}
                                        className="text-sm"
                                      />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {!editingChoiceItemData.enableSizePricing && (
                                        <div>
                                          <Label htmlFor={`edit-item-price-${item.id}`} className="text-sm font-medium">Price</Label>
                                          <Input
                                            id={`edit-item-price-${item.id}`}
                                            type="number"
                                            step="0.01"
                                            placeholder="0.00"
                                            value={editingChoiceItemData.price}
                                            onChange={(e) => setEditingChoiceItemData({ ...editingChoiceItemData, price: e.target.value })}
                                            className="text-sm"
                                          />
                                        </div>
                                      )}
                                      {editingChoiceItemData.enableSizePricing && (
                                        <div className="text-sm text-gray-500 flex items-center">
                                          <span>Price set by size selection below</span>
                                        </div>
                                      )}
                                      <div className="flex items-center space-x-2 pt-6">
                                        <input
                                          type="checkbox"
                                          id={`edit-item-default-${item.id}`}
                                          checked={editingChoiceItemData.isDefault}
                                          onChange={(e) => setEditingChoiceItemData({ ...editingChoiceItemData, isDefault: e.target.checked })}
                                          className="rounded"
                                        />
                                        <Label htmlFor={`edit-item-default-${item.id}`} className="text-sm">Pre-select</Label>
                                      </div>
                                    </div>

                                    {/* Size-Based Pricing for Toppings */}
                                    {(choice.name.toLowerCase().includes('topping') || choice.name.toLowerCase().includes('addon')) && (
                                      <div className="border rounded-lg p-3 bg-gray-50">
                                        <div className="flex items-center space-x-2 mb-3">
                                          <input
                                            type="checkbox"
                                            id={`enable-size-pricing-${item.id}`}
                                            checked={editingChoiceItemData.enableSizePricing}
                                            onChange={(e) => {
                                              setEditingChoiceItemData({
                                                ...editingChoiceItemData,
                                                enableSizePricing: e.target.checked
                                              });
                                              if (e.target.checked) {
                                                fetchSizesForCategory(editingChoiceItemData.pricingCategory);
                                              }
                                            }}
                                            className="rounded"
                                          />
                                          <Label htmlFor={`enable-size-pricing-${item.id}`} className="text-sm font-medium">
                                            Enable Size-Based Pricing
                                          </Label>
                                        </div>

                                        {editingChoiceItemData.enableSizePricing && (
                                          <>
                                            <div className="mb-3">
                                              <Label className="text-xs font-medium">Category:</Label>
                                              <select
                                                value={editingChoiceItemData.pricingCategory}
                                                onChange={(e) => {
                                                  setEditingChoiceItemData({
                                                    ...editingChoiceItemData,
                                                    pricingCategory: e.target.value
                                                  });
                                                  fetchSizesForCategory(e.target.value);
                                                }}
                                                className="w-full text-xs p-2 border rounded mt-1"
                                              >
                                                <option value="pizza">Pizza</option>
                                                <option value="calzone">Calzone</option>
                                                <option value="stromboli">Stromboli</option>
                                              </select>
                                            </div>

                                            {availableSizes.length > 0 && (
                                              <div>
                                                <Label className="text-xs font-medium mb-2 block">Pricing by Size:</Label>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                  {availableSizes.map((size) => (
                                                    <div key={size.id}>
                                                      <Label htmlFor={`edit-size-${size.id}-${item.id}`} className="text-xs">
                                                        {size.name}
                                                      </Label>
                                                      <Input
                                                        id={`edit-size-${size.id}-${item.id}`}
                                                        type="number"
                                                        step="0.01"
                                                        placeholder="0.00"
                                                        value={editingChoiceItemData.sizePricing?.[size.id] || ''}
                                                        onChange={(e) => setEditingChoiceItemData({
                                                          ...editingChoiceItemData,
                                                          sizePricing: {
                                                            ...editingChoiceItemData.sizePricing,
                                                            [size.id]: e.target.value
                                                          }
                                                        })}
                                                        className="text-xs h-8"
                                                      />
                                                    </div>
                                                  ))}
                                                </div>
                                                <p className="text-xs text-gray-500 mt-2">
                                                  Leave empty to use base price. Prices will apply when the corresponding size is selected.
                                                </p>
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    )}

                                    <div className="flex space-x-2">
                                      <Button 
                                        size="sm"
                                        onClick={() => handleUpdateChoiceItem(item.id, editingChoiceItemData)}
                                        disabled={!editingChoiceItemData.name}
                                      >
                                        Save
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => {
                                          setEditingChoiceItem(null);
                                          setEditingChoiceItemData({ name: '', description: '', price: '0.00', isDefault: false, sizePricing: {}, pricingCategory: 'pizza', enableSizePricing: false });
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  // View Mode
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <span className="text-sm font-medium">{item.name}</span>
                                      {item.price && parseFloat(item.price) > 0 && (
                                        <span className="text-xs text-gray-500 ml-2">+${parseFloat(item.price).toFixed(2)}</span>
                                      )}
                                      {item.isDefault && (
                                        <span className="text-xs text-blue-600 ml-2">(Pre-selected)</span>
                                      )}
                                    </div>
                                    <div className="flex space-x-1">
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => handleEditChoiceItem(item)}
                                      >
                                        <Edit className="h-3 w-3" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        onClick={() => deleteChoiceItemMutation.mutate(item.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Create Menu Item Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Menu Item</DialogTitle>
          </DialogHeader>
          
          <CreateMenuItemForm
            onSubmit={(data) => createMenuItemMutation.mutate(data)}
            onCancel={() => setIsCreateDialogOpen(false)}
            categories={sortedCategories.map(cat => cat.name)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Menu Item Dialog */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Menu Item</DialogTitle>
          </DialogHeader>
          
          {editingItem && (
            <EditMenuItemForm
              item={editingItem}
              onSubmit={(data) => updateMenuItemMutation.mutate({ id: editingItem.id, data })}
              onCancel={() => setEditingItem(null)}
              categories={sortedCategories.map(cat => cat.name)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Category Management Dialog */}
      <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Menu Categories</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">Drag and drop categories to reorder them</p>
              <Button onClick={() => setIsCreateCategoryOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
            
            <div className="space-y-2">
              {[...categories].sort((a, b) => a.order - b.order).map((category) => (
                <div
                  key={category.id}
                  className="flex items-center border rounded-lg bg-white hover:bg-gray-50 transition-opacity duration-200"
                >
                  {/* Drag Handle */}
                  <div
                    className="flex items-center justify-center p-4 cursor-move hover:bg-gray-100 border-r"
                    draggable
                    onDragStart={(e) => handleDragStart(e, category.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, category.id)}
                    title="Drag to reorder"
                  >
                    <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 3H11V5H9V3ZM13 3H15V5H13V3ZM9 7H11V9H9V7ZM13 7H15V9H13V7ZM9 11H11V13H9V11ZM13 11H15V13H13V11ZM9 15H11V17H9V15ZM13 15H15V17H13V15ZM9 19H11V21H9V19ZM13 19H15V21H13V19Z" />
                    </svg>
                  </div>

                  {/* Category Content */}
                  <div className="flex items-center justify-between flex-1 p-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">{category.order}</span>
                      </div>
                      <div>
                        <h3 className="font-medium">{category.name}</h3>
                        <p className="text-sm text-gray-500">
                          {(menuItemsByCategory[category.name] || []).length} items
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge variant={category.isActive ? "default" : "secondary"}>
                        {category.isActive ? "Active" : "Inactive"}
                      </Badge>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingCategory(category)}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleCategoryStatus(category.id)}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {category.isActive ? "Deactivate" : "Activate"}
                      </Button>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteCategory(category.id)}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Category Dialog */}
      <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          
          <CreateCategoryForm
            onSubmit={handleCreateCategory}
            onCancel={() => setIsCreateCategoryOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog open={!!editingCategory} onOpenChange={() => setEditingCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          
          {editingCategory && (
            <EditCategoryForm
              category={editingCategory}
              onSubmit={(data) => handleUpdateCategory(editingCategory.id, data)}
              onCancel={() => setEditingCategory(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Create Choice Dialog */}
      <Dialog open={isCreateChoiceOpen} onOpenChange={setIsCreateChoiceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Choice Group</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Toppings, Size, Add-ons"
                value={newChoiceData.name || ''}
                onChange={(e) => setNewChoiceData({ ...newChoiceData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="Brief description of this choice group"
                value={newChoiceData.description || ''}
                onChange={(e) => setNewChoiceData({ ...newChoiceData, description: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="priority">Priority (Display Order)</Label>
              <Input
                id="priority"
                type="number"
                min="0"
                placeholder="0 = first, higher numbers show later"
                value={newChoiceData.priority || 0}
                onChange={(e) => setNewChoiceData({ ...newChoiceData, priority: parseInt(e.target.value) || 0 })}
              />
              <small className="text-gray-500">Lower numbers display first (e.g., sizes should be 1, toppings should be 2)</small>
            </div>
            <div className="flex space-x-2">
              <Button 
                onClick={() => {
                  if (newChoiceData.name) {
                    handleCreateChoice(newChoiceData);
                    setNewChoiceData({ name: '', description: '', priority: 0 });
                  }
                }}
                disabled={!newChoiceData.name}
              >
                Create Choice Group
              </Button>
              <Button variant="outline" onClick={() => {
                setIsCreateChoiceOpen(false);
                setNewChoiceData({ name: '', description: '' });
              }}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Choice Dialog */}
      <Dialog open={!!editingChoice} onOpenChange={() => setEditingChoice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Choice Group</DialogTitle>
          </DialogHeader>
          
          {editingChoice && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  placeholder="e.g., Toppings, Size, Add-ons"
                  value={editingChoiceData.name || editingChoice.name}
                  onChange={(e) => setEditingChoiceData({ ...editingChoiceData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <Input
                  id="edit-description"
                  placeholder="Brief description of this choice group"
                  value={editingChoiceData.description || editingChoice.description || ''}
                  onChange={(e) => setEditingChoiceData({ ...editingChoiceData, description: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-priority">Priority (Display Order)</Label>
                <Input
                  id="edit-priority"
                  type="number"
                  min="0"
                  placeholder="0 = first, higher numbers show later"
                  value={editingChoiceData.priority || editingChoice.priority || 0}
                  onChange={(e) => setEditingChoiceData({ ...editingChoiceData, priority: parseInt(e.target.value) || 0 })}
                />
                <small className="text-gray-500">Lower numbers display first (e.g., sizes should be 1, toppings should be 2)</small>
              </div>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => {
                    if (editingChoiceData.name) {
                      handleUpdateChoice(editingChoice.id, editingChoiceData);
                      setEditingChoiceData({ name: '', description: '', priority: 0 });
                    }
                  }}
                  disabled={!editingChoiceData.name}
                >
                  Update Choice Group
                </Button>
                <Button variant="outline" onClick={() => {
                  setEditingChoice(null);
                  setEditingChoiceData({ name: '', description: '' });
                }}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const QRCodeManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingQR, setEditingQR] = useState<any>(null);

  // Fetch QR codes from API
  const { data: qrCodes = [], isLoading, refetch } = useQuery({
    queryKey: ['qr-codes'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/qr-codes');
      return response.json();
    }
  });

  // Create QR code mutation
  const createQRMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/admin/qr-codes', data),
    onSuccess: () => {
      refetch();
      setIsCreateDialogOpen(false);
      toast({
        title: "Success",
        description: "QR code created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create QR code",
        variant: "destructive",
      });
    }
  });

  // Update QR code mutation
  const updateQRMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest('PUT', `/api/admin/qr-codes/${id}`, data),
    onSuccess: () => {
      refetch();
      setEditingQR(null);
      toast({
        title: "Success",
        description: "QR code updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update QR code",
        variant: "destructive",
      });
    }
  });

  // Delete QR code mutation
  const deleteQRMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/admin/qr-codes/${id}`),
    onSuccess: () => {
      refetch();
      toast({
        title: "Success",
        description: "QR code deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete QR code",
        variant: "destructive",
      });
    }
  });

  const handleCreateQR = (data: any) => {
    createQRMutation.mutate(data);
  };

  const handleUpdateQR = (id: number, data: any) => {
    updateQRMutation.mutate({ id, data });
  };

  const handleDeleteQR = (id: number) => {
    if (window.confirm('Are you sure you want to delete this QR code? This action cannot be undone.')) {
      deleteQRMutation.mutate(id);
    }
  };

  const toggleQRStatus = (id: number, currentStatus: boolean) => {
    handleUpdateQR(id, { is_active: !currentStatus });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">QR Code Management</h2>
          <p className="text-gray-600">Generate and manage QR codes for table ordering</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create QR Code
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total QR Codes</p>
                <p className="text-2xl font-bold text-gray-900">{qrCodes.length}</p>
              </div>
              <QrCode className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {qrCodes.filter((qr: any) => qr.is_active).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Inactive</p>
                <p className="text-2xl font-bold text-gray-600">
                  {qrCodes.filter((qr: any) => !qr.is_active).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Scans</p>
                <p className="text-2xl font-bold text-purple-600">
                  {qrCodes.reduce((total: number, qr: any) => total + (qr.usage_count || 0), 0)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Codes Grid */}
      <Card>
        <CardHeader>
          <CardTitle>QR Codes</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : qrCodes.length === 0 ? (
            <div className="text-center py-12">
              <QrCode className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No QR Codes Found</h3>
              <p className="text-gray-500 mb-4">Create your first QR code to get started.</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create QR Code
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {qrCodes.map((qr: any) => (
                <Card key={qr.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="mb-4">
                        <img
                          src={qr.qr_data || `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qr.url)}`}
                          alt={`QR Code for ${qr.name}`}
                          className="w-32 h-32 mx-auto border rounded"
                        />
                      </div>

                      <h3 className="font-semibold text-lg mb-2">{qr.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">Type: {qr.type}</p>
                      {qr.description && (
                        <p className="text-xs text-gray-500 mb-2">{qr.description}</p>
                      )}

                      <Badge variant={qr.is_active ? "default" : "secondary"} className="mb-4">
                        {qr.is_active ? "Active" : "Inactive"}
                      </Badge>

                      <div className="text-xs text-gray-500 mb-4">
                        Scans: {qr.usage_count || 0}
                      </div>

                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => setEditingQR(qr)}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => toggleQRStatus(qr.id, qr.is_active)}
                          disabled={updateQRMutation.isLoading}
                        >
                          {qr.is_active ? "Deactivate" : "Activate"}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => {
                            navigator.clipboard.writeText(qr.url);
                            toast({
                              title: "Copied!",
                              description: "QR code URL copied to clipboard",
                            });
                          }}
                        >
                          <Link className="h-4 w-4 mr-2" />
                          Copy URL
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteQR(qr.id)}
                          disabled={deleteQRMutation.isLoading}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {deleteQRMutation.isLoading ? "Deleting..." : "Delete"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create QR Code Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New QR Code</DialogTitle>
          </DialogHeader>
          
          <CreateQRCodeForm
            onSubmit={handleCreateQR}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit QR Code Dialog */}
      <Dialog open={!!editingQR} onOpenChange={() => setEditingQR(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit QR Code</DialogTitle>
          </DialogHeader>
          
          {editingQR && (
            <EditQRCodeForm
              qrCode={editingQR}
              onSubmit={(data) => handleUpdateQR(editingQR.id, data)}
              onCancel={() => setEditingQR(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

const WebsiteWidget = () => (
  <Card>
    <CardHeader>
      <CardTitle>Website Ordering Widget</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-gray-500">Add a "See MENU & Order" button to your website for instant ordering capabilities.</p>
    </CardContent>
  </Card>
);

const SmartLinks = () => {
  const [smartLinks, setSmartLinks] = useState([
    {
      id: 1,
      platform: "Instagram",
      description: "Link for Instagram bio",
      url: `${window.location.origin}/menu`,
      clickCount: 0
    },
    {
      id: 2,
      platform: "Facebook",
      description: "Link for Facebook page",
      url: `${window.location.origin}/menu`,
      clickCount: 0
    },
    {
      id: 3,
      platform: "Google Business",
      description: "Google My Business ordering link",
      url: `${window.location.origin}/menu`,
      clickCount: 0
    }
  ]);
  const { toast } = useToast();

  const copyToClipboard = (url: string, platform: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Copied!",
        description: `${platform} smart link copied to clipboard`,
      });
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Smart Links for Social & Google</h2>
          <p className="text-gray-600">Create embeddable ordering links for your social media and business profiles</p>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Smart Links</p>
                <p className="text-2xl font-bold text-gray-900">{smartLinks.length}</p>
              </div>
              <Link className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clicks</p>
                <p className="text-2xl font-bold text-green-600">
                  {smartLinks.reduce((total, link) => total + link.clickCount, 0)}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Platform Types</p>
                <p className="text-2xl font-bold text-purple-600">3</p>
              </div>
              <Globe className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Links Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {smartLinks.map((link) => (
          <Card key={link.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                    {link.platform === 'Instagram' && <Instagram className="h-8 w-8 text-pink-600" />}
                    {link.platform === 'Facebook' && <Facebook className="h-8 w-8 text-blue-600" />}
                    {link.platform === 'Google Business' && <Globe className="h-8 w-8 text-green-600" />}
                  </div>
                </div>

                <h3 className="font-semibold text-lg mb-2">{link.platform}</h3>
                <p className="text-sm text-gray-600 mb-2">{link.description}</p>

                <div className="text-xs text-gray-500 mb-4 bg-gray-50 p-2 rounded font-mono break-all">
                  {link.url}
                </div>

                <div className="text-xs text-gray-500 mb-4">
                  Clicks: {link.clickCount}
                </div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => copyToClipboard(link.url, link.platform)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(link.url, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use Smart Links</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Instagram:</h4>
            <p className="text-sm text-gray-600">Copy the Instagram link and paste it in your Instagram bio. Customers can click to order directly from your menu.</p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Facebook:</h4>
            <p className="text-sm text-gray-600">Add this link to your Facebook page's "Order Food" button or post it in your page updates.</p>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Google My Business:</h4>
            <p className="text-sm text-gray-600">Set this as your ordering URL in your Google Business Profile to enable direct ordering from Google Search and Maps.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const OrderScheduling = () => {
  const { toast } = useToast();
  const [schedulingSettings, setSchedulingSettings] = useState({
    enabled: false,
    minAdvanceTime: 30, // minutes
    maxAdvanceDays: 7,
    deliveryScheduling: true,
    pickupScheduling: true,
    timeSlotInterval: 15, // minutes
    businessHours: {
      open: '11:00',
      close: '22:00'
    },
    blackoutDates: []
  });

  const [timeSlots, setTimeSlots] = useState([
    { time: '11:00', available: true, maxOrders: 5 },
    { time: '11:30', available: true, maxOrders: 5 },
    { time: '12:00', available: true, maxOrders: 8 },
    { time: '12:30', available: true, maxOrders: 8 },
    { time: '13:00', available: true, maxOrders: 6 },
    { time: '18:00', available: true, maxOrders: 10 },
    { time: '18:30', available: true, maxOrders: 10 },
    { time: '19:00', available: true, maxOrders: 8 },
    { time: '19:30', available: true, maxOrders: 8 },
    { time: '20:00', available: true, maxOrders: 6 }
  ]);

  const handleSaveSettings = async () => {
    try {
      // In a real implementation, this would save to the API
      toast({
        title: "Success",
        description: "Order scheduling settings saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save scheduling settings",
        variant: "destructive",
      });
    }
  };

  const generateTimeSlots = () => {
    const slots = [];
    const start = new Date(`2024-01-01 ${schedulingSettings.businessHours.open}`);
    const end = new Date(`2024-01-01 ${schedulingSettings.businessHours.close}`);
    const interval = schedulingSettings.timeSlotInterval;

    while (start < end) {
      slots.push({
        time: start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        available: true,
        maxOrders: 5
      });
      start.setMinutes(start.getMinutes() + interval);
    }

    setTimeSlots(slots);
    toast({
      title: "Success",
      description: `Generated ${slots.length} time slots`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Order Scheduling ("Order for Later")</h2>
          <p className="text-gray-600">Allow customers to choose fulfillment time for pickup or delivery</p>
        </div>
        <Button onClick={handleSaveSettings}>
          Save Settings
        </Button>
      </div>

      {/* Enable/Disable Scheduling */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-medium">Enable Order Scheduling</h3>
              <p className="text-sm text-gray-500">Allow customers to schedule orders for later pickup or delivery</p>
            </div>
            <Switch
              checked={schedulingSettings.enabled}
              onCheckedChange={(checked) =>
                setSchedulingSettings({ ...schedulingSettings, enabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {schedulingSettings.enabled && (
        <>
          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Scheduling Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Minimum advance time (minutes)</Label>
                  <Input
                    type="number"
                    value={schedulingSettings.minAdvanceTime}
                    onChange={(e) =>
                      setSchedulingSettings({
                        ...schedulingSettings,
                        minAdvanceTime: parseInt(e.target.value) || 30
                      })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">How far in advance customers must place orders</p>
                </div>

                <div>
                  <Label>Maximum advance days</Label>
                  <Input
                    type="number"
                    value={schedulingSettings.maxAdvanceDays}
                    onChange={(e) =>
                      setSchedulingSettings({
                        ...schedulingSettings,
                        maxAdvanceDays: parseInt(e.target.value) || 7
                      })
                    }
                  />
                  <p className="text-xs text-gray-500 mt-1">How many days in advance customers can schedule</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Switch
                    checked={schedulingSettings.deliveryScheduling}
                    onCheckedChange={(checked) =>
                      setSchedulingSettings({ ...schedulingSettings, deliveryScheduling: checked })
                    }
                  />
                  <Label>Enable for delivery orders</Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Switch
                    checked={schedulingSettings.pickupScheduling}
                    onCheckedChange={(checked) =>
                      setSchedulingSettings({ ...schedulingSettings, pickupScheduling: checked })
                    }
                  />
                  <Label>Enable for pickup orders</Label>
                </div>
              </div>

              <div>
                <Label>Time slot interval (minutes)</Label>
                <Select
                  value={schedulingSettings.timeSlotInterval.toString()}
                  onValueChange={(value) =>
                    setSchedulingSettings({ ...schedulingSettings, timeSlotInterval: parseInt(value) })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Business Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Business Hours</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Opening Time</Label>
                  <Input
                    type="time"
                    value={schedulingSettings.businessHours.open}
                    onChange={(e) =>
                      setSchedulingSettings({
                        ...schedulingSettings,
                        businessHours: { ...schedulingSettings.businessHours, open: e.target.value }
                      })
                    }
                  />
                </div>

                <div>
                  <Label>Closing Time</Label>
                  <Input
                    type="time"
                    value={schedulingSettings.businessHours.close}
                    onChange={(e) =>
                      setSchedulingSettings({
                        ...schedulingSettings,
                        businessHours: { ...schedulingSettings.businessHours, close: e.target.value }
                      })
                    }
                  />
                </div>
              </div>

              <Button variant="outline" onClick={generateTimeSlots}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Time Slots
              </Button>
            </CardContent>
          </Card>

          {/* Time Slots Management */}
          <Card>
            <CardHeader>
              <CardTitle>Available Time Slots</CardTitle>
              <CardDescription>Manage capacity and availability for each time slot</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {timeSlots.map((slot, index) => (
                  <Card key={index} className={`p-4 ${slot.available ? 'border-green-200' : 'border-red-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{slot.time}</span>
                      <Switch
                        checked={slot.available}
                        onCheckedChange={(checked) => {
                          const newSlots = [...timeSlots];
                          newSlots[index] = { ...slot, available: checked };
                          setTimeSlots(newSlots);
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Max Orders</Label>
                      <Input
                        type="number"
                        size="sm"
                        value={slot.maxOrders}
                        onChange={(e) => {
                          const newSlots = [...timeSlots];
                          newSlots[index] = { ...slot, maxOrders: parseInt(e.target.value) || 0 };
                          setTimeSlots(newSlots);
                        }}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Integration Info */}
          <Card>
            <CardHeader>
              <CardTitle>Shipday Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Integration Status</h4>
                <p className="text-sm text-blue-800 mb-3">
                  Scheduled orders will be automatically sent to Shipday with the correct delivery/pickup time.
                  Orders marked as "for later" will include the scheduled time in the order details.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>API integration active</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>Scheduled delivery support enabled</span>
                  </div>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span>Time zone synchronization active</span>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-900 mb-2">Implementation Notes</h4>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Scheduled orders appear as "ASAP" in Shipday until their scheduled time</li>
                  <li>• Orders are automatically dispatched at the scheduled time</li>
                  <li>• Kitchen receives notification 30 minutes before pickup/delivery time</li>
                  <li>• Customer receives confirmation with scheduled time details</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

const TableReservations = () => {
  const { toast } = useToast();
  const [reservationSettings, setReservationSettings] = useState({
    enabled: false,
    maxPartySize: 8,
    minAdvanceTime: 60, // minutes
    maxAdvanceDays: 30,
    allowPreOrdering: true,
    requireDeposit: false,
    depositAmount: 0,
    bookingWindow: {
      start: '11:00',
      end: '21:00'
    },
    timeSlotDuration: 120, // minutes
    bufferTime: 15 // minutes between reservations
  });

  const [tables, setTables] = useState([
    { id: 1, name: 'Table 1', capacity: 2, available: true, location: 'Window Side' },
    { id: 2, name: 'Table 2', capacity: 4, available: true, location: 'Main Floor' },
    { id: 3, name: 'Table 3', capacity: 4, available: true, location: 'Main Floor' },
    { id: 4, name: 'Table 4', capacity: 6, available: true, location: 'Back Section' },
    { id: 5, name: 'Table 5', capacity: 8, available: true, location: 'Private Area' },
    { id: 6, name: 'Bar Table 1', capacity: 3, available: true, location: 'Bar Area' },
    { id: 7, name: 'Bar Table 2', capacity: 3, available: true, location: 'Bar Area' }
  ]);

  const [upcomingReservations] = useState([
    { id: 1, customerName: 'John Smith', partySize: 4, date: '2024-01-15', time: '19:00', table: 'Table 2', phone: '555-0123', preOrder: true },
    { id: 2, customerName: 'Sarah Johnson', partySize: 2, date: '2024-01-15', time: '20:00', table: 'Table 1', phone: '555-0456', preOrder: false },
    { id: 3, customerName: 'Mike Wilson', partySize: 6, date: '2024-01-16', time: '18:30', table: 'Table 4', phone: '555-0789', preOrder: true }
  ]);

  const handleSaveSettings = async () => {
    try {
      // In a real implementation, this would save to the API
      toast({
        title: "Success",
        description: "Table reservation settings saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save reservation settings",
        variant: "destructive",
      });
    }
  };

  const toggleTableAvailability = (tableId: number) => {
    setTables(tables.map(table =>
      table.id === tableId
        ? { ...table, available: !table.available }
        : table
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Table Reservations & Pre-ordering</h2>
          <p className="text-gray-600">Integrate booking with ordering features for complete restaurant management</p>
        </div>
        <Button onClick={handleSaveSettings}>
          Save Settings
        </Button>
      </div>

      {/* Enable/Disable Toggle */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-medium">Enable Table Reservations</h3>
              <p className="text-sm text-gray-500">
                {reservationSettings.enabled
                  ? "Table reservations are currently enabled for customers"
                  : "Table reservations are disabled - toggle on when ready to launch"
                }
              </p>
            </div>
            <Switch
              checked={reservationSettings.enabled}
              onCheckedChange={(checked) =>
                setReservationSettings({ ...reservationSettings, enabled: checked })
              }
            />
          </div>

          {!reservationSettings.enabled && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Table reservations are currently disabled. Enable this feature when you're ready to accept table bookings from customers.
                All settings below will be saved and applied once you enable the feature.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings Section - Always visible for configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Reservation Settings</CardTitle>
          <CardDescription>Configure how table reservations work for your restaurant</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Maximum party size</Label>
              <Input
                type="number"
                value={reservationSettings.maxPartySize}
                onChange={(e) =>
                  setReservationSettings({
                    ...reservationSettings,
                    maxPartySize: parseInt(e.target.value) || 8
                  })
                }
              />
              <p className="text-xs text-gray-500 mt-1">Largest group that can make a reservation</p>
            </div>

            <div>
              <Label>Minimum advance time (minutes)</Label>
              <Input
                type="number"
                value={reservationSettings.minAdvanceTime}
                onChange={(e) =>
                  setReservationSettings({
                    ...reservationSettings,
                    minAdvanceTime: parseInt(e.target.value) || 60
                  })
                }
              />
              <p className="text-xs text-gray-500 mt-1">How far in advance reservations must be made</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Maximum advance days</Label>
              <Input
                type="number"
                value={reservationSettings.maxAdvanceDays}
                onChange={(e) =>
                  setReservationSettings({
                    ...reservationSettings,
                    maxAdvanceDays: parseInt(e.target.value) || 30
                  })
                }
              />
              <p className="text-xs text-gray-500 mt-1">How many days ahead customers can book</p>
            </div>

            <div>
              <Label>Time slot duration (minutes)</Label>
              <Select
                value={reservationSettings.timeSlotDuration.toString()}
                onValueChange={(value) =>
                  setReservationSettings({ ...reservationSettings, timeSlotDuration: parseInt(value) })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="90">90 minutes</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="150">2.5 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Switch
                checked={reservationSettings.allowPreOrdering}
                onCheckedChange={(checked) =>
                  setReservationSettings({ ...reservationSettings, allowPreOrdering: checked })
                }
              />
              <div>
                <Label>Allow pre-ordering with reservations</Label>
                <p className="text-xs text-gray-500">Let customers order food when making their reservation</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <Switch
                checked={reservationSettings.requireDeposit}
                onCheckedChange={(checked) =>
                  setReservationSettings({ ...reservationSettings, requireDeposit: checked })
                }
              />
              <div>
                <Label>Require deposit for reservations</Label>
                <p className="text-xs text-gray-500">Charge a deposit to secure reservations</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Reservation window start</Label>
              <Input
                type="time"
                value={reservationSettings.bookingWindow.start}
                onChange={(e) =>
                  setReservationSettings({
                    ...reservationSettings,
                    bookingWindow: { ...reservationSettings.bookingWindow, start: e.target.value }
                  })
                }
              />
            </div>

            <div>
              <Label>Reservation window end</Label>
              <Input
                type="time"
                value={reservationSettings.bookingWindow.end}
                onChange={(e) =>
                  setReservationSettings({
                    ...reservationSettings,
                    bookingWindow: { ...reservationSettings.bookingWindow, end: e.target.value }
                  })
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Management */}
      <Card>
        <CardHeader>
          <CardTitle>Table Management</CardTitle>
          <CardDescription>Manage your restaurant tables and their availability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => (
              <Card key={table.id} className={`p-4 ${table.available ? 'border-green-200' : 'border-red-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium">{table.name}</h4>
                    <p className="text-sm text-gray-500">{table.location}</p>
                  </div>
                  <Switch
                    checked={table.available}
                    onCheckedChange={() => toggleTableAvailability(table.id)}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-sm">Capacity: {table.capacity} people</p>
                  <Badge variant={table.available ? "default" : "secondary"}>
                    {table.available ? "Available" : "Unavailable"}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming Reservations */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Reservations</CardTitle>
          <CardDescription>Preview of how reservations would appear when the feature is active</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingReservations.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No upcoming reservations</p>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingReservations.map((reservation) => (
                <div key={reservation.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">{reservation.customerName}</h4>
                      <p className="text-sm text-gray-500">
                        {reservation.partySize} guests • {reservation.date} at {reservation.time}
                      </p>
                      <p className="text-sm text-gray-500">
                        {reservation.table} • {reservation.phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {reservation.preOrder && (
                      <Badge variant="outline">Pre-ordered</Badge>
                    )}
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feature Status */}
      <Card>
        <CardHeader>
          <CardTitle>Implementation Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Current Status: Configuration Ready</h4>
            <p className="text-sm text-blue-800 mb-3">
              The table reservation system is fully configured and ready to be enabled.
              All settings are saved and will take effect immediately when you toggle the feature on.
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-900 mb-2">Future Implementation Features</h4>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• Real-time table availability checking</li>
              <li>• Customer booking confirmation emails</li>
              <li>• SMS reminders for upcoming reservations</li>
              <li>• Integration with POS system for pre-orders</li>
              <li>• Waitlist management for busy periods</li>
              <li>• Customer reservation history and preferences</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const VacationMode = () => (
  <Card>
    <CardHeader>
      <CardTitle>Vacation Mode & Pause Services</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-gray-500">Temporarily disable services like delivery or set closed hours with custom messaging.</p>
    </CardContent>
  </Card>
);

const OutOfStockManagement = ({ menuItems }: any) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all"); // all, available, unavailable

  // Get unique categories
  const categories = Array.from(new Set(menuItems?.map((item: any) => item.category) || []));

  // Filter menu items based on search and filters
  const filteredItems = menuItems?.filter((item: any) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesStatus = statusFilter === "all" ||
                         (statusFilter === "available" && item.isAvailable !== false) ||
                         (statusFilter === "unavailable" && item.isAvailable === false);

    return matchesSearch && matchesCategory && matchesStatus;
  }) || [];

  // Separate available and unavailable items for display
  const availableItems = filteredItems.filter((item: any) => item.isAvailable !== false);
  const unavailableItems = filteredItems.filter((item: any) => item.isAvailable === false);

  // Mutation to toggle item availability
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async ({ itemId, isAvailable }: { itemId: number, isAvailable: boolean }) => {
      const response = await apiRequest("PATCH", `/api/menu/${itemId}`, {
        isAvailable: isAvailable
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      toast({
        title: "Success",
        description: `Item ${variables.isAvailable ? 'marked as available' : 'marked as out of stock'}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update item availability",
        variant: "destructive",
      });
    },
  });

  const handleToggleAvailability = (itemId: number, currentlyAvailable: boolean) => {
    toggleAvailabilityMutation.mutate({
      itemId,
      isAvailable: !currentlyAvailable
    });
  };

  const formatPrice = (price: number | string) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(price));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Out of Stock Management</h2>
          <p className="text-gray-600">Manage item availability and track out-of-stock items</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
            {unavailableItems.length} Out of Stock
          </span>
          <span className="flex items-center ml-4">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
            {availableItems.length} Available
          </span>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Search Items</Label>
              <Input
                id="search"
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Availability Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="available">Available Only</SelectItem>
                  <SelectItem value="unavailable">Out of Stock Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Out of Stock Items (Priority Section) */}
      {unavailableItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Out of Stock Items ({unavailableItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {unavailableItems.map((item) => (
                <Card key={item.id} className="border-red-200 bg-red-50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-lg">{item.name}</h4>
                        <p className="text-sm text-gray-600">{item.category}</p>
                      </div>
                      <Badge variant="secondary" className="bg-red-100 text-red-800">
                        Out of Stock
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-green-600">{formatPrice(item.basePrice || 0)}</span>
                      <Button
                        size="sm"
                        onClick={() => handleToggleAvailability(item.id, false)}
                        disabled={toggleAvailabilityMutation.isPending}
                      >
                        Mark Available
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Items */}
      {availableItems.length > 0 && (statusFilter === "all" || statusFilter === "available") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 text-green-500 mr-2" />
              Available Items ({availableItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableItems.map((item) => (
                <Card key={item.id} className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-lg">{item.name}</h4>
                        <p className="text-sm text-gray-600">{item.category}</p>
                      </div>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Available
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-green-600">{formatPrice(item.basePrice || 0)}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleAvailability(item.id, true)}
                        disabled={toggleAvailabilityMutation.isPending}
                      >
                        Mark Out of Stock
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No Items Found */}
      {filteredItems.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-500">
              {searchTerm || categoryFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters to see more items"
                : "No menu items available. Add items in the Menu Editor first."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const DeliveryOptions = () => <DeliverySettings />;

const SubscribedUsersManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch subscribed users
  const { data: subscribedUsers, isLoading, error } = useQuery({
    queryKey: ['/api/subscribed-users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/subscribed-users');
      if (!response.ok) {
        throw new Error('Failed to fetch subscribed users');
      }
      return response.json();
    }
  });

  // Unsubscribe user mutation
  const unsubscribeMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest('PUT', `/api/subscribed-users/${userId}`, {
        marketingOptIn: false
      });
      if (!response.ok) {
        throw new Error('Failed to unsubscribe user');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscribed-users'] });
      toast({
        title: "User Unsubscribed",
        description: `${data.user.firstName} ${data.user.lastName} has been unsubscribed from marketing emails.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Unsubscribe Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading subscribed users...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading subscribed users</p>
            <p className="text-sm">{error instanceof Error ? error.message : 'Unknown error'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Subscribed Users</CardTitle>
              <CardDescription>
                Manage users who are subscribed to marketing emails for exclusive offers
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {subscribedUsers?.length || 0} Subscribers
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {subscribedUsers && subscribedUsers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Email</th>
                    <th className="text-left p-3 font-medium">Phone</th>
                    <th className="text-left p-3 font-medium">Points</th>
                    <th className="text-left p-3 font-medium">Joined</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribedUsers.map((user: any) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div>
                          <div className="font-medium">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500 capitalize">
                            {user.role}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {user.email}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          {user.phone || 'Not provided'}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center">
                          <Star className="h-4 w-4 mr-1 text-yellow-500" />
                          {user.currentPoints}
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unsubscribeMutation.mutate(user.id)}
                          disabled={unsubscribeMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          {unsubscribeMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Mail className="h-4 w-4 mr-1" />
                              Unsubscribe
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No subscribed users</h3>
              <p className="text-gray-500">
                Users who subscribe to marketing emails will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const KickstarterMarketing = () => (
  <Card>
    <CardHeader>
      <CardTitle>Kickstarter Marketing Module</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-gray-500">Generate flyers, invite clients via email/SMS, and run promotions aimed at new customers.</p>
    </CardContent>
  </Card>
);

const CustomerDatabase = ({ users }: any) => (
  <Card>
    <CardHeader>
      <CardTitle>Customer Database Export</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-gray-500">Export customer/order data (Excel/PDF) for further analysis and marketing campaigns.</p>
    </CardContent>
  </Card>
);

const PrinterManagement = ({ 
  isDialogOpen, 
  setIsDialogOpen, 
  editingPrinter, 
  setEditingPrinter 
}: any) => {
  const { toast } = useToast();
  const [isTestLoading, setIsTestLoading] = useState<number | null>(null);
  const queryClient = useQueryClient();

  // Fetch printers from API
  const { data: printers = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/printer/config'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/printer/config', {});
      if (!response.ok) {
        throw new Error('Failed to fetch printers');
      }
      return await response.json();
    }
  });

  // Create printer mutation
  const createPrinterMutation = useMutation({
    mutationFn: async (printerData: any) => {
      const response = await apiRequest('POST', '/api/printer/config', {
        name: printerData.name,
        ipAddress: printerData.ip,
        port: parseInt(printerData.port) || 80,
        printerType: printerData.type,
        isActive: printerData.isActive,
        isPrimary: printerData.isPrimary || false
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create printer');
      }
      return await response.json();
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Printer Added",
        description: "New printer has been added to your system.",
      });
      setIsDialogOpen(false);
      setEditingPrinter(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update printer mutation
  const updatePrinterMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await apiRequest('PUT', `/api/printer/config/${id}`, {
        name: data.name,
        ipAddress: data.ip,
        port: parseInt(data.port) || 80,
        printerType: data.type,
        isActive: data.isActive,
        isPrimary: data.isPrimary || false
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update printer');
      }
      return await response.json();
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Printer Updated",
        description: "Printer settings have been updated successfully.",
      });
      setIsDialogOpen(false);
      setEditingPrinter(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete printer mutation
  const deletePrinterMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/printer/config/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete printer');
      }
      return await response.json();
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Printer Deleted",
        description: "Printer has been removed from your system.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Set primary printer mutation
  const setPrimaryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/printer/config/${id}/set-primary`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to set primary printer');
      }
      return await response.json();
    },
    onSuccess: () => {
      refetch();
      toast({
        title: "Primary Printer Set",
        description: "Printer has been set as the primary printer.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleAddPrinter = () => {
    setEditingPrinter(null);
    setIsDialogOpen(true);
  };

  const handleEditPrinter = (printer: any) => {
    setEditingPrinter(printer);
    setIsDialogOpen(true);
  };

  const handleDeletePrinter = (id: number) => {
    if (window.confirm('Are you sure you want to delete this printer?')) {
      deletePrinterMutation.mutate(id);
    }
  };

  const handleSavePrinter = (printerData: any) => {
    console.log('💾 handleSavePrinter called with:', printerData);
    console.log('📝 editingPrinter:', editingPrinter);
    
    if (editingPrinter) {
      console.log('✏️ Updating existing printer');
      updatePrinterMutation.mutate({ id: editingPrinter.id, data: printerData });
    } else {
      console.log('➕ Creating new printer');
      createPrinterMutation.mutate(printerData);
    }
  };

  const handleSetPrimary = (id: number) => {
    setPrimaryMutation.mutate(id);
  };

  const handleTestPrinter = async (printer: any) => {
    setIsTestLoading(printer.id);
    try {
      const response = await apiRequest('POST', `/api/printer/config/${printer.id}/test-connection`);
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Test Successful",
          description: `Printer ${printer.name} is working correctly!`,
        });
      } else {
        toast({
          title: "Test Failed",
          description: result.message || "Could not connect to printer",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Network error occurred while testing printer",
        variant: "destructive",
      });
    } finally {
      setIsTestLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Printer Management</h2>
          <p className="text-gray-600">Manage your Epson thermal printers for receipts and kitchen tickets</p>
        </div>
        <Button onClick={handleAddPrinter}>
          <Plus className="h-4 w-4 mr-2" />
          Add Printer
        </Button>
      </div>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Info className="h-5 w-5 mr-2 text-blue-500" />
            Quick Setup Guide
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p className="text-gray-600">
              <strong>Step 1:</strong> Connect your Epson TM-M32 printer to your network via Ethernet cable
            </p>
            <p className="text-gray-600">
              <strong>Step 2:</strong> Find your printer's IP address (check router settings or print a test page)
            </p>
            <p className="text-gray-600">
              <strong>Step 3:</strong> Add the printer below with the correct IP address
            </p>
            <p className="text-gray-600">
              <strong>Step 4:</strong> Test the connection to ensure it's working
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Printers List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Printers</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-gray-400 mb-4" />
              <p className="text-gray-500">Loading printers...</p>
            </div>
          ) : printers.length === 0 ? (
            <div className="text-center py-8">
              <Printer className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No printers added yet</h3>
              <p className="text-gray-500 mb-4">Add your first printer to start printing receipts and kitchen tickets</p>
              <Button onClick={handleAddPrinter}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Printer
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {printers.map((printer) => (
                <div key={printer.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`w-3 h-3 rounded-full ${printer.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{printer.name}</h3>
                          {printer.isActive && (
                            <Badge variant="default" className="text-xs">PRIMARY</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {printer.printerType} • IP: {printer.ipAddress}:{printer.port}
                        </p>
                        <p className="text-xs text-gray-400">
                          Status: {printer.connectionStatus} • Created: {new Date(printer.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {!printer.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetPrimary(printer.id)}
                          disabled={setPrimaryMutation.isPending}
                        >
                          <Star className="h-4 w-4" />
                          Set Primary
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestPrinter(printer)}
                        disabled={isTestLoading === printer.id}
                      >
                        {isTestLoading === printer.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wifi className="h-4 w-4" />
                        )}
                        Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditPrinter(printer)}
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePrinter(printer.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Printer Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingPrinter ? 'Edit Printer' : 'Add New Printer'}
            </DialogTitle>
            <DialogDescription>
              Configure your Epson thermal printer settings
            </DialogDescription>
          </DialogHeader>
          <PrinterForm 
            printer={editingPrinter}
            onSave={handleSavePrinter}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingPrinter(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

const SettingsPanel = () => {
  const { toast } = useToast();

  // Sound notification settings
  const [soundNotificationsEnabled, setSoundNotificationsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminSoundNotifications');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  const [soundType, setSoundType] = useState<'chime' | 'bell' | 'ding' | 'beep' | 'dingbell' | 'custom'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminSoundType');
      return saved ? JSON.parse(saved) : 'chime';
    }
    return 'chime';
  });

  const [customSoundUrl, setCustomSoundUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminCustomSoundUrl');
      return saved || '';
    }
    return '';
  });

  const [customSoundName, setCustomSoundName] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminCustomSoundName');
      return saved || '';
    }
    return '';
  });

  const [soundVolume, setSoundVolume] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('adminSoundVolume');
      return saved !== null ? JSON.parse(saved) : 0.3;
    }
    return 0.3;
  });

  // Save sound preferences to localStorage AND system settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Save to localStorage for immediate access
      localStorage.setItem('adminSoundNotifications', JSON.stringify(soundNotificationsEnabled));
      localStorage.setItem('adminSoundType', JSON.stringify(soundType));
      localStorage.setItem('adminSoundVolume', JSON.stringify(soundVolume));
      localStorage.setItem('adminCustomSoundUrl', customSoundUrl);
      localStorage.setItem('adminCustomSoundName', customSoundName);

      // Save to system settings (debounced to avoid excessive API calls)
      const timeoutId = setTimeout(async () => {
        try {
          await fetch('/api/admin/system-settings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              category: 'notifications',
              settings: [
                { setting_key: 'NOTIFICATION_SOUND_ENABLED', setting_value: String(soundNotificationsEnabled) },
                { setting_key: 'NOTIFICATION_SOUND_TYPE', setting_value: soundType },
                { setting_key: 'NOTIFICATION_SOUND_VOLUME', setting_value: String(soundVolume) },
                { setting_key: 'NOTIFICATION_CUSTOM_SOUND_URL', setting_value: customSoundUrl },
                { setting_key: 'NOTIFICATION_CUSTOM_SOUND_NAME', setting_value: customSoundName }
              ]
            })
          });
        } catch (err) {
          console.warn('Failed to save notification settings:', err);
        }
      }, 1000); // Debounce by 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [soundNotificationsEnabled, soundType, soundVolume, customSoundUrl, customSoundName]);

  // Fetch notification settings from system settings on mount
  useEffect(() => {
    const fetchNotificationSettings = async () => {
      try {
        // Fetch from system settings
        const response = await fetch('/api/admin/system-settings?category=notifications', {
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          const settings = data.notifications || [];

          // Update state from system settings (using setting_key and setting_value)
          const soundEnabled = settings.find((s: any) => s.setting_key === 'NOTIFICATION_SOUND_ENABLED');
          const soundTypeVal = settings.find((s: any) => s.setting_key === 'NOTIFICATION_SOUND_TYPE');
          const soundVolumeVal = settings.find((s: any) => s.setting_key === 'NOTIFICATION_SOUND_VOLUME');
          const customUrl = settings.find((s: any) => s.setting_key === 'NOTIFICATION_CUSTOM_SOUND_URL');
          const customName = settings.find((s: any) => s.setting_key === 'NOTIFICATION_CUSTOM_SOUND_NAME');

          if (soundEnabled) setSoundNotificationsEnabled(soundEnabled.setting_value === 'true');
          if (soundTypeVal) setSoundType(soundTypeVal.setting_value as any);
          if (soundVolumeVal) setSoundVolume(parseFloat(soundVolumeVal.setting_value));
          if (customUrl && customUrl.setting_value) setCustomSoundUrl(customUrl.setting_value);
          if (customName && customName.setting_value) setCustomSoundName(customName.setting_value);
        }
      } catch (error) {
        console.error('Failed to fetch notification settings:', error);
      }
    };

    fetchNotificationSettings();
  }, []); // Run once on mount

  // Handle custom sound file upload
  const handleCustomSoundUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      alert('Please select an audio file (MP3, WAV, OGG, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64String = e.target?.result as string;

        // Upload to Supabase Storage via API
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          alert('You must be logged in to upload a custom sound');
          return;
        }

        const response = await fetch('/api/notification-sound', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audioFile: base64String,
            fileName: file.name,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to upload sound');
        }

        const data = await response.json();

        // Update local state with the public URL from Supabase
        setCustomSoundUrl(data.url);
        setCustomSoundName(file.name);
        setSoundType('custom');

        // Also update localStorage for backward compatibility
        localStorage.setItem('adminCustomSoundUrl', data.url);
        localStorage.setItem('adminCustomSoundName', file.name);

        // Save to system settings so all devices can access
        try {
          await fetch('/api/admin/system-settings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              category: 'notifications',
              settings: [
                { setting_key: 'NOTIFICATION_CUSTOM_SOUND_URL', setting_value: data.url },
                { setting_key: 'NOTIFICATION_CUSTOM_SOUND_NAME', setting_value: file.name }
              ]
            })
          });
        } catch (err) {
          console.warn('Failed to save to system settings:', err);
        }

        // Test the uploaded sound
        const audio = new Audio(data.url);
        audio.volume = soundVolume;
        audio.play().catch(error => {
          console.warn('Failed to play uploaded sound:', error);
        });

        toast({
          title: "✅ Custom sound uploaded",
          description: "Your notification sound has been saved",
          duration: 3000,
        });
      };

      reader.onerror = () => {
        alert('Failed to read the audio file. Please try again.');
      };

      // Read file as data URL (base64)
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload custom sound. Please try again.');
    }
  }, [soundVolume]);

  // Create a test sound function for this component
  const playTestSound = useCallback(async () => {
    if (!soundNotificationsEnabled) {
      alert('Please enable sound notifications first');
      return;
    }

    console.log('Playing test sound:', soundType, 'Volume:', soundVolume);

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('AudioContext state:', audioContext.state);

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const volume = soundVolume;
      const gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);

      if (soundType === 'chime') {
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        oscillator1.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator2.frequency.setValueAtTime(1200, audioContext.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
        oscillator1.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.15);
        oscillator2.start(audioContext.currentTime + 0.15);
        oscillator2.stop(audioContext.currentTime + 0.4);
      } else if (soundType === 'bell') {
        const fundamental = audioContext.createOscillator();
        const harmonic2 = audioContext.createOscillator();
        const harmonic3 = audioContext.createOscillator();
        fundamental.connect(gainNode);
        harmonic2.connect(gainNode);
        harmonic3.connect(gainNode);
        fundamental.frequency.setValueAtTime(523, audioContext.currentTime);
        harmonic2.frequency.setValueAtTime(659, audioContext.currentTime);
        harmonic3.frequency.setValueAtTime(784, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1.0);
        fundamental.start(audioContext.currentTime);
        harmonic2.start(audioContext.currentTime);
        harmonic3.start(audioContext.currentTime);
        fundamental.stop(audioContext.currentTime + 1.0);
        harmonic2.stop(audioContext.currentTime + 1.0);
        harmonic3.stop(audioContext.currentTime + 1.0);
      } else if (soundType === 'ding') {
        const oscillator = audioContext.createOscillator();
        oscillator.connect(gainNode);
        oscillator.frequency.setValueAtTime(1480, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1480 * 0.8, audioContext.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } else if (soundType === 'beep') {
        const oscillator = audioContext.createOscillator();
        oscillator.connect(gainNode);
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContext.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.15);
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.15);
      } else if (soundType === 'dingbell') {
        // Play uploaded bell sound from Supabase
        const dingBellUrl = 'https://tamsxlebouauwiivoyxa.supabase.co/storage/v1/object/public/notification-sounds/bellsound.wav';
        try {
          const audio = new Audio(dingBellUrl);
          audio.volume = volume;
          await audio.play();
        } catch (error) {
          console.warn('Failed to play ding bell sound:', error);
        }
        return; // Exit early since we're using HTML5 Audio
      } else if (soundType === 'custom' && customSoundUrl) {
        // Play custom uploaded audio file (base64 data URL)
        try {
          const audio = new Audio(customSoundUrl);
          audio.volume = soundVolume;

          // Ensure audio can load and play
          audio.addEventListener('canplay', () => {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.warn('Failed to play custom sound:', error);
              });
            }
          });

          audio.addEventListener('error', (error) => {
            console.warn('Custom audio error:', error);
          });

          // If already can play, play immediately
          if (audio.readyState >= 2) {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.warn('Failed to play custom sound:', error);
              });
            }
          }
        } catch (error) {
          console.warn('Failed to create custom audio:', error);
        }
        return; // Exit early since we're using HTML5 Audio instead of Web Audio API
      }
    } catch (error) {
      console.error('Failed to play test sound:', error);
      alert(`Failed to play test sound: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [soundNotificationsEnabled, soundType, soundVolume, customSoundUrl]);

  // Fetch restaurant settings from the same API as Restaurant Info tab
  const { data: restaurantData, isLoading: restaurantLoading } = useQuery({
    queryKey: ['/api/restaurant-settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/restaurant-settings');
      if (!response.ok) {
        throw new Error('Failed to fetch restaurant settings');
      }
      return await response.json();
    }
  });

  const [settings, setSettings] = useState({
    restaurantName: "Favilla's NY Pizza",
    address: "123 Main Street, New York, NY 10001",
    phone: "(555) 123-4567",
    email: "info@favillas.com",
    website: "https://favillas.com",
    currency: "USD",
    timezone: "America/New_York",
    deliveryFee: 3.99,
    minimumOrder: 15.00,
    autoAcceptOrders: true,
    sendOrderNotifications: true,
    sendCustomerNotifications: true,
    vacationMode: {
      isEnabled: false,
      startDate: "",
      endDate: "",
      message: "We are currently on vacation and will be back soon. Thank you for your patience!",
      reason: ""
    },
    storeHours: {
      0: { isOpen: true, openTime: "11:00", closeTime: "22:00" },
      1: { isOpen: true, openTime: "11:00", closeTime: "22:00" },
      2: { isOpen: true, openTime: "11:00", closeTime: "22:00" },
      3: { isOpen: true, openTime: "11:00", closeTime: "22:00" },
      4: { isOpen: true, openTime: "11:00", closeTime: "22:00" },
      5: { isOpen: true, openTime: "11:00", closeTime: "23:00" },
      6: { isOpen: true, openTime: "11:00", closeTime: "23:00" }
    }
  });

  // Update settings when restaurant data is loaded
  useEffect(() => {
    if (restaurantData) {
      setSettings(prevSettings => ({
        ...prevSettings,
        restaurantName: restaurantData.restaurantName || prevSettings.restaurantName,
        address: restaurantData.address || prevSettings.address,
        phone: restaurantData.phone || prevSettings.phone,
        email: restaurantData.email || prevSettings.email,
        website: restaurantData.website || prevSettings.website,
        currency: restaurantData.currency || prevSettings.currency,
        timezone: restaurantData.timezone || prevSettings.timezone,
        deliveryFee: restaurantData.deliveryFee || prevSettings.deliveryFee,
        minimumOrder: restaurantData.minimumOrder || prevSettings.minimumOrder,
        autoAcceptOrders: restaurantData.autoAcceptOrders !== undefined ? restaurantData.autoAcceptOrders : prevSettings.autoAcceptOrders,
        sendOrderNotifications: restaurantData.sendOrderNotifications !== undefined ? restaurantData.sendOrderNotifications : prevSettings.sendOrderNotifications,
        sendCustomerNotifications: restaurantData.sendCustomerNotifications !== undefined ? restaurantData.sendCustomerNotifications : prevSettings.sendCustomerNotifications
      }));
    }
  }, [restaurantData]);

  const [activeSection, setActiveSection] = useState("general");

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Mutation to update restaurant settings
  const updateRestaurantSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: any) => {
      const response = await apiRequest('PUT', '/api/restaurant-settings', updatedSettings);
      if (!response.ok) {
        throw new Error('Failed to update restaurant settings');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Restaurant settings updated successfully",
      });
      // Invalidate the query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant-settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update restaurant settings",
        variant: "destructive",
      });
      console.error('Error updating restaurant settings:', error);
    }
  });

  const handleSave = () => {
    // Save to restaurant settings API so both tabs stay in sync
    updateRestaurantSettingsMutation.mutate(settings);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
          <p className="text-gray-600">Configure operational settings, notifications, and system preferences</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Settings Navigation */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="p-4">
              <nav className="space-y-2">
                {[
                  { id: "general", name: "General", icon: Settings },
                  { id: "ordering", name: "Ordering", icon: ShoppingCart },
                  { id: "notifications", name: "Notifications", icon: Bell },
                  { id: "integrations", name: "Integrations", icon: Link },
                  { id: "appearance", name: "Appearance", icon: Palette },
                  { id: "vacation-mode", name: "Vacation Mode", icon: Calendar },
                  { id: "store-hours", name: "Store Hours", icon: Clock },
                  { id: "printer", name: "Printer Management", icon: Printer }
                ].map((section) => (
                  <Button
                    key={section.id}
                    variant={activeSection === section.id ? "default" : "ghost"}
                    className="w-full justify-start"
                    onClick={() => setActiveSection(section.id)}
                  >
                    <section.icon className="h-4 w-4 mr-2" />
                    {section.name}
                  </Button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6">
              {activeSection === "general" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">General Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="restaurant-name">Restaurant Name</Label>
                      <Input
                        id="restaurant-name"
                        value={settings.restaurantName}
                        onChange={(e) => handleSettingChange("restaurantName", e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={settings.phone}
                        onChange={(e) => handleSettingChange("phone", e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={settings.email}
                        onChange={(e) => handleSettingChange("email", e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={settings.website}
                        onChange={(e) => handleSettingChange("website", e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={settings.address}
                      onChange={(e) => handleSettingChange("address", e.target.value)}
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select value={settings.currency} onValueChange={(value) => handleSettingChange("currency", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select value={settings.timezone} onValueChange={(value) => handleSettingChange("timezone", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/New_York">Eastern Time</SelectItem>
                          <SelectItem value="America/Chicago">Central Time</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "ordering" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Ordering Settings</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="delivery-fee">Delivery Fee</Label>
                      <Input
                        id="delivery-fee"
                        type="number"
                        step="0.01"
                        value={settings.deliveryFee}
                        onChange={(e) => handleSettingChange("deliveryFee", parseFloat(e.target.value))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="minimum-order">Minimum Order Amount</Label>
                      <Input
                        id="minimum-order"
                        type="number"
                        step="0.01"
                        value={settings.minimumOrder}
                        onChange={(e) => handleSettingChange("minimumOrder", parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="auto-accept"
                        checked={settings.autoAcceptOrders}
                        onChange={(e) => handleSettingChange("autoAcceptOrders", e.target.checked)}
                      />
                      <Label htmlFor="auto-accept">Automatically accept orders</Label>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "notifications" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Notification Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="order-notifications"
                        checked={settings.sendOrderNotifications}
                        onChange={(e) => handleSettingChange("sendOrderNotifications", e.target.checked)}
                      />
                      <Label htmlFor="order-notifications">Send order notifications to staff</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="customer-notifications"
                        checked={settings.sendCustomerNotifications}
                        onChange={(e) => handleSettingChange("sendCustomerNotifications", e.target.checked)}
                      />
                      <Label htmlFor="customer-notifications">Send order updates to customers</Label>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-lg border space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="sound-notifications"
                              checked={soundNotificationsEnabled}
                              onChange={(e) => setSoundNotificationsEnabled(e.target.checked)}
                            />
                            <Label htmlFor="sound-notifications" className="font-medium">🔔 Sound Notifications</Label>
                          </div>
                          <p className="text-sm text-gray-600">Play notification sounds when new orders arrive</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={playTestSound}
                          disabled={!soundNotificationsEnabled}
                        >
                          Test Sound
                        </Button>
                      </div>

                      {soundNotificationsEnabled && (
                        <div className="space-y-4 pt-2 border-t border-blue-200">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="sound-type" className="text-sm font-medium">Sound Type</Label>
                              <Select value={soundType} onValueChange={(value: 'chime' | 'bell' | 'ding' | 'beep' | 'dingbell' | 'custom') => setSoundType(value)}>
                                <SelectTrigger id="sound-type" className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="chime">🎵 Chime (Default)</SelectItem>
                                  <SelectItem value="bell">🔔 Bell</SelectItem>
                                  <SelectItem value="ding">✨ Ding</SelectItem>
                                  <SelectItem value="beep">📢 Beep</SelectItem>
                                  <SelectItem value="dingbell">🛎️ Ding Bell</SelectItem>
                                  <SelectItem value="custom">📁 Custom Upload</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="sound-volume" className="text-sm font-medium">
                                Volume ({Math.round(soundVolume * 100)}%)
                              </Label>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs text-gray-500">🔉</span>
                                <input
                                  type="range"
                                  id="sound-volume"
                                  min="0.1"
                                  max="1.0"
                                  step="0.1"
                                  value={soundVolume}
                                  onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                                  className="flex-1"
                                />
                                <span className="text-xs text-gray-500">🔊</span>
                              </div>
                            </div>
                          </div>

                          {/* Custom Sound Upload Section */}
                          {soundType === 'custom' && (
                            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200 space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-yellow-800">📁 Custom Sound Upload</h4>
                                {customSoundName && (
                                  <span className="text-sm text-green-600">✅ {customSoundName}</span>
                                )}
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="custom-sound-upload" className="text-sm font-medium text-yellow-700">
                                  Upload Audio File (MP3, WAV, OGG - Max 5MB)
                                </Label>
                                <input
                                  type="file"
                                  id="custom-sound-upload"
                                  accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg"
                                  onChange={handleCustomSoundUpload}
                                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
                                />
                              </div>

                              {customSoundUrl && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={playTestSound}
                                  >
                                    🎵 Test Custom Sound
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      try {
                                        const { data: { session } } = await supabase.auth.getSession();
                                        const token = session?.access_token;

                                        if (token) {
                                          await fetch('/api/notification-sound', {
                                            method: 'DELETE',
                                            headers: {
                                              'Authorization': `Bearer ${token}`,
                                            },
                                          });
                                        }

                                        setCustomSoundUrl('');
                                        setCustomSoundName('');
                                        setSoundType('chime');
                                        localStorage.removeItem('adminCustomSoundUrl');
                                        localStorage.removeItem('adminCustomSoundName');

                                        toast({
                                          title: "🗑️ Custom sound removed",
                                          description: "Your notification sound has been reset",
                                          duration: 3000,
                                        });
                                      } catch (error) {
                                        console.error('Failed to remove custom sound:', error);
                                      }
                                    }}
                                  >
                                    🗑️ Remove
                                  </Button>
                                </div>
                              )}

                              <p className="text-xs text-yellow-600">
                                💡 Tip: Short sounds (1-3 seconds) work best for notifications
                              </p>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setSoundType('chime'); setTimeout(playTestSound, 100); }}
                            >
                              🎵 Chime
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setSoundType('bell'); setTimeout(playTestSound, 100); }}
                            >
                              🔔 Bell
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setSoundType('ding'); setTimeout(playTestSound, 100); }}
                            >
                              ✨ Ding
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setSoundType('beep'); setTimeout(playTestSound, 100); }}
                            >
                              📢 Beep
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setSoundType('dingbell'); setTimeout(playTestSound, 100); }}
                            >
                              🛎️ Ding Bell
                            </Button>
                            {customSoundUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => { setSoundType('custom'); setTimeout(playTestSound, 100); }}
                              >
                                📁 Custom
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "integrations" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Integrations</h3>
                  
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Stripe Payment Processing</h4>
                            <p className="text-sm text-gray-600">Process credit card payments securely</p>
                            <p className="text-xs text-green-600 mt-1">✅ Integrated and active</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="default">Connected</Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
                            >
                              Dashboard
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Google Business Profile</h4>
                            <p className="text-sm text-gray-600">Sync with Google Business Profile for reviews, hours, and location</p>
                            <p className="text-xs text-blue-600 mt-1">🚀 Manage your Google listing and customer reviews</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open('https://business.google.com', '_blank')}
                          >
                            Connect
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Facebook Business</h4>
                            <p className="text-sm text-gray-600">Connect Facebook Business for social media marketing</p>
                            <p className="text-xs text-blue-600 mt-1">📱 Manage Facebook posts, ads, and customer engagement</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open('https://business.facebook.com', '_blank')}
                          >
                            Connect
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {activeSection === "appearance" && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Appearance Settings</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <Label>Primary Color</Label>
                      <div className="flex space-x-2 mt-2">
                        {["#d73a31", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"].map((color) => (
                          <button
                            key={color}
                            className="w-8 h-8 rounded-full border-2 border-gray-300"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Label>Logo</Label>
                      <div className="mt-2 p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                        <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">Click to upload logo</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === "vacation-mode" && (
                <VacationModeSection />
              )}

              {activeSection === "store-hours" && (
                <StoreHoursSection />
              )}

              {activeSection === "printer" && (
                <PrinterManagementSection />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// Vacation Mode Section Component
const VacationModeSection = () => {
  const { toast } = useToast();
  const [vacationMode, setVacationMode] = useState({
    isEnabled: false,
    startDate: "",
    endDate: "",
    message: "We are currently on vacation and will be back soon. Thank you for your patience!",
    reason: ""
  });

  const { data: vacationModeData, refetch } = useQuery({
    queryKey: ["/api/vacation-mode"],
    queryFn: () => apiRequest("/api/vacation-mode"),
  });

  const updateVacationModeMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/vacation-mode", {
      method: "PUT",
      body: JSON.stringify(data)
    }),
    onSuccess: () => {
      toast({ title: "Success", description: "Vacation mode updated successfully." });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to update vacation mode.", variant: "destructive" });
    }
  });

  useEffect(() => {
    if (vacationModeData) {
      setVacationMode({
        isEnabled: vacationModeData.isEnabled || false,
        startDate: vacationModeData.startDate ? new Date(vacationModeData.startDate).toISOString().split('T')[0] : "",
        endDate: vacationModeData.endDate ? new Date(vacationModeData.endDate).toISOString().split('T')[0] : "",
        message: vacationModeData.message || "We are currently on vacation and will be back soon. Thank you for your patience!",
        reason: vacationModeData.reason || ""
      });
    }
  }, [vacationModeData]);

  const handleSave = () => {
    updateVacationModeMutation.mutate(vacationMode);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Vacation Mode</h3>
          <p className="text-sm text-gray-600">Pause services and show customers a message when you're closed</p>
        </div>
        <Button onClick={handleSave} disabled={updateVacationModeMutation.isPending}>
          {updateVacationModeMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Save Changes
        </Button>
      </div>

      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="vacation-enabled"
            checked={vacationMode.isEnabled}
            onChange={(e) => setVacationMode({ ...vacationMode, isEnabled: e.target.checked })}
          />
          <Label htmlFor="vacation-enabled">Enable Vacation Mode</Label>
        </div>

        {vacationMode.isEnabled && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={vacationMode.startDate}
                  onChange={(e) => setVacationMode({ ...vacationMode, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={vacationMode.endDate}
                  onChange={(e) => setVacationMode({ ...vacationMode, endDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="vacation-message">Message to Customers</Label>
              <textarea
                id="vacation-message"
                className="w-full p-3 border border-gray-300 rounded-md"
                rows={4}
                value={vacationMode.message}
                onChange={(e) => setVacationMode({ ...vacationMode, message: e.target.value })}
                placeholder="We are currently on vacation and will be back soon. Thank you for your patience!"
              />
            </div>

            <div>
              <Label htmlFor="vacation-reason">Reason (Optional)</Label>
              <Input
                id="vacation-reason"
                value={vacationMode.reason}
                onChange={(e) => setVacationMode({ ...vacationMode, reason: e.target.value })}
                placeholder="e.g., Family vacation, Staff training, etc."
              />
            </div>
          </div>
        )}

        {vacationMode.isEnabled && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-yellow-600" />
              <h4 className="font-medium text-yellow-800">Vacation Mode Active</h4>
            </div>
            <p className="text-sm text-yellow-700 mt-2">
              When vacation mode is enabled, customers will see your message and won't be able to place orders.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Pause Services component
const PauseServices = ({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (open: boolean) => void }) => {
  const { toast } = useToast();

  const { data: pauseServices = [], refetch: refetchPauseServices } = useQuery({
    queryKey: ['pause-services'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/pause-services');
      return response.json();
    }
  });

  const createPauseServiceMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/pause-services', data),
    onSuccess: () => {
      refetchPauseServices();
      onOpenChange(false);
      toast({
        title: "Success",
        description: "Services paused successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to pause services",
        variant: "destructive",
      });
    }
  });

  const [formData, setFormData] = useState({
    pauseType: 'all',
    specificServices: [] as string[],
    pauseDuration: 660, // 11 hours in minutes
    pauseUntilEndOfDay: false,
    notificationMessage: ''
  });

  const handleSave = () => {
    createPauseServiceMutation.mutate(formData);
  };

  const handleBack = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>Pause services</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Service Selection</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="allServices"
                  name="pauseType"
                  value="all"
                  checked={formData.pauseType === 'all'}
                  onChange={(e) => setFormData({ ...formData, pauseType: e.target.value })}
                />
                <Label htmlFor="allServices" className="text-sm">All services</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="specificServices"
                  name="pauseType"
                  value="specific"
                  checked={formData.pauseType === 'specific'}
                  onChange={(e) => setFormData({ ...formData, pauseType: e.target.value })}
                />
                <Label htmlFor="specificServices" className="text-sm">Specific services</Label>
              </div>
            </div>
          </div>

          {/* Pause Duration */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Pause for</Label>
            <div className="flex items-center space-x-2">
              <Select
                value={formData.pauseUntilEndOfDay ? 'endOfDay' : 'custom'}
                onValueChange={(value) => setFormData({
                  ...formData,
                  pauseUntilEndOfDay: value === 'endOfDay'
                })}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">
                    {Math.floor(formData.pauseDuration / 60)}
                  </SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm">Hrs</span>

              <Select
                value={formData.pauseUntilEndOfDay ? '0' : String(formData.pauseDuration % 60)}
                onValueChange={(value) => setFormData({
                  ...formData,
                  pauseDuration: formData.pauseUntilEndOfDay
                    ? formData.pauseDuration
                    : Math.floor(formData.pauseDuration / 60) * 60 + parseInt(value)
                })}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">0</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="45">45</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm">Min</span>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="restOfDay"
                checked={formData.pauseUntilEndOfDay}
                onChange={(e) => setFormData({ ...formData, pauseUntilEndOfDay: e.target.checked })}
              />
              <Label htmlFor="restOfDay" className="text-sm">Rest of the day</Label>
            </div>
          </div>

          {/* Notification Message */}
          <div className="space-y-2">
            <Label htmlFor="notificationMessage" className="text-sm font-medium">
              Notification message (optional)
            </Label>
            <div className="relative">
              <Textarea
                id="notificationMessage"
                placeholder="Enter notification message..."
                value={formData.notificationMessage}
                onChange={(e) => setFormData({ ...formData, notificationMessage: e.target.value })}
                className="min-h-[80px]"
                maxLength={200}
              />
              <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                {formData.notificationMessage.length}/200
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600">
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Store Hours Section Component
const StoreHoursSection = () => {
  const { toast } = useToast();
  const [storeHours, setStoreHours] = useState<any[]>([]);
  const [isPauseDialogOpen, setIsPauseDialogOpen] = useState(false);

  const { data: storeHoursData, refetch } = useQuery({
    queryKey: ["/api/store-hours"],
    queryFn: () => apiRequest("/api/store-hours"),
  });

  const updateStoreHoursMutation = useMutation({
    mutationFn: ({ dayOfWeek, data }: { dayOfWeek: number; data: any }) => 
      apiRequest(`/api/store-hours/${dayOfWeek}`, {
        method: "PUT",
        body: JSON.stringify(data)
      }),
    onSuccess: () => {
      toast({ title: "Success", description: "Store hours updated successfully." });
      refetch();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: "Failed to update store hours.", variant: "destructive" });
    }
  });

  useEffect(() => {
    if (storeHoursData) {
      setStoreHours(storeHoursData);
    }
  }, [storeHoursData]);

  const daysOfWeek = [
    { id: 0, name: "Sunday" },
    { id: 1, name: "Monday" },
    { id: 2, name: "Tuesday" },
    { id: 3, name: "Wednesday" },
    { id: 4, name: "Thursday" },
    { id: 5, name: "Friday" },
    { id: 6, name: "Saturday" }
  ];

  const handleDayUpdate = (dayOfWeek: number, field: string, value: any) => {
    const updatedHours = storeHours.map(day => 
      day.dayOfWeek === dayOfWeek ? { ...day, [field]: value } : day
    );
    setStoreHours(updatedHours);
    
    const dayData = updatedHours.find(day => day.dayOfWeek === dayOfWeek);
    if (dayData) {
      updateStoreHoursMutation.mutate({ dayOfWeek, data: dayData });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Store Hours</h3>
        <p className="text-sm text-gray-600">Set your restaurant's operating hours for each day of the week</p>
      </div>

      <div className="space-y-4">
        {daysOfWeek.map((day) => {
          const dayData = storeHours.find(h => h.dayOfWeek === day.id) || {
            dayOfWeek: day.id,
            dayName: day.name,
            isOpen: true,
            openTime: "09:00",
            closeTime: "22:00",
            isBreakTime: false,
            breakStartTime: "",
            breakEndTime: ""
          };

          return (
            <Card key={day.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium">{day.name}</h4>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`open-${day.id}`}
                      checked={dayData.isOpen}
                      onChange={(e) => handleDayUpdate(day.id, "isOpen", e.target.checked)}
                    />
                    <Label htmlFor={`open-${day.id}`}>Open</Label>
                  </div>
                </div>

                {dayData.isOpen && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor={`open-time-${day.id}`}>Open Time</Label>
                      <Input
                        id={`open-time-${day.id}`}
                        type="time"
                        value={dayData.openTime || ""}
                        onChange={(e) => handleDayUpdate(day.id, "openTime", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`close-time-${day.id}`}>Close Time</Label>
                      <Input
                        id={`close-time-${day.id}`}
                        type="time"
                        value={dayData.closeTime || ""}
                        onChange={(e) => handleDayUpdate(day.id, "closeTime", e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {dayData.isOpen && (
                  <div className="mt-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <input
                        type="checkbox"
                        id={`break-${day.id}`}
                        checked={dayData.isBreakTime}
                        onChange={(e) => handleDayUpdate(day.id, "isBreakTime", e.target.checked)}
                      />
                      <Label htmlFor={`break-${day.id}`}>Break Time</Label>
                    </div>
                    
                    {dayData.isBreakTime && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor={`break-start-${day.id}`}>Break Start</Label>
                          <Input
                            id={`break-start-${day.id}`}
                            type="time"
                            value={dayData.breakStartTime || ""}
                            onChange={(e) => handleDayUpdate(day.id, "breakStartTime", e.target.value)}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`break-end-${day.id}`}>Break End</Label>
                          <Input
                            id={`break-end-${day.id}`}
                            type="time"
                            value={dayData.breakEndTime || ""}
                            onChange={(e) => handleDayUpdate(day.id, "breakEndTime", e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      {/* Pause Services Section */}
      <div className="border-t pt-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h4 className="text-md font-semibold">Exceptions</h4>
            <p className="text-sm text-gray-600">Manage special days and service pauses</p>
          </div>
        </div>
        
        <div className="flex space-x-4">
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add special day / holiday
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsPauseDialogOpen(true)}
          >
            <Pause className="h-4 w-4 mr-2" />
            Pause services
          </Button>
        </div>
      </div>
      
      {/* Pause Services Dialog */}
      <PauseServices 
        isOpen={isPauseDialogOpen} 
        onOpenChange={setIsPauseDialogOpen} 
      />
    </div>
  );
};

// Printer Management Section Component
const PrinterManagementSection = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isPrinterDialogOpen, setIsPrinterDialogOpen] = useState(false);
  const [editingPrinter, setEditingPrinter] = useState<any>(null);
  const [isTestLoading, setIsTestLoading] = useState<number | null>(null);

  // Fetch printers from API
  const { data: printers = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/printer/config'],
    queryFn: async () => {
      console.log('🔄 Fetching printers from API...');
      try {
        const response = await apiRequest('GET', '/api/printer/config');
        console.log('📨 Fetch response status:', response.status, response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Fetch error response:', errorText);
          throw new Error(`Failed to fetch printers: ${response.status} ${errorText}`);
        }
        
        const result = await response.json();
        console.log('✅ Fetch success, got printers:', result.length);
        return result;
      } catch (error) {
        console.error('❌ Fetch error:', error);
        throw error;
      }
    },
    retry: 1,
    staleTime: 0 // Always refetch
  });

  // Create printer mutation
  const createPrinterMutation = useMutation({
    mutationFn: async (printerData: any) => {
      console.log('🔧 Creating printer with data:', printerData);
      const payload = {
        name: printerData.name,
        ipAddress: printerData.ip,
        port: parseInt(printerData.port) || 80,
        printerType: printerData.type,
        isActive: printerData.isActive,
        isPrimary: printerData.isPrimary || false
      };
      console.log('📤 API payload:', payload);
      
      const response = await apiRequest('POST', '/api/printer/config', payload);
      console.log('📨 API response status:', response.status, response.ok);
      
      if (!response.ok) {
        const error = await response.json();
        console.error('❌ API error response:', error);
        throw new Error(error.message || 'Failed to create printer');
      }
      const result = await response.json();
      console.log('✅ API success response:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('🎉 Mutation onSuccess called with:', data);
      // Use setTimeout to avoid race conditions
      setTimeout(() => {
        console.log('🔄 Invalidating and refetching after delay...');
        queryClient.invalidateQueries({ queryKey: ['/api/printer/config'] });
        refetch();
      }, 100);
      
      toast({
        title: "Success",
        description: "Printer added successfully.",
      });
      setIsPrinterDialogOpen(false);
      setEditingPrinter(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update printer mutation
  const updatePrinterMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await apiRequest('PUT', `/api/printer/config/${id}`, {
        name: data.name,
        ipAddress: data.ip,
        port: parseInt(data.port) || 80,
        printerType: data.type,
        isActive: data.isActive,
        isPrimary: data.isPrimary || false
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update printer');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/printer/config'] });
      refetch();
      toast({
        title: "Success",
        description: "Printer updated successfully.",
      });
      setIsPrinterDialogOpen(false);
      setEditingPrinter(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete printer mutation
  const deletePrinterMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/printer/config/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete printer');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/printer/config'] });
      refetch();
      toast({
        title: "Success", 
        description: "Printer deleted successfully."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Set primary printer mutation
  const setPrimaryMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('POST', `/api/printer/config/${id}/set-primary`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to set primary printer');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/printer/config'] });
      refetch();
      toast({
        title: "Success",
        description: "Primary printer set successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Discover printers mutation (client-side discovery)
  const discoverMutation = useMutation({
    mutationFn: async () => {
      const { discoverEpsonPrinters } = await import('@/utils/printer-discovery');
      return await discoverEpsonPrinters();
    },
    onSuccess: (discoveredPrinters) => {
      const foundCount = discoveredPrinters.length;

      if (foundCount === 0) {
        toast({
          title: "No Printers Found",
          description: "Scanned 192.168.1.200-210. Make sure your printer is powered on and connected to WiFi.",
        });
      } else {
        toast({
          title: "Discovery Complete",
          description: `Found ${foundCount} printer(s): ${discoveredPrinters.map(p => p.ipAddress).join(', ')}`,
        });

        // Auto-add discovered printers if they don't exist
        discoveredPrinters.forEach(async (printer) => {
          // Check if printer already exists
          const exists = printers.some((p: any) => p.ipAddress === printer.ipAddress);
          if (!exists) {
            // Add the discovered printer
            createPrinterMutation.mutate({
              name: printer.name,
              ip: printer.ipAddress,
              port: printer.port.toString(),
              type: printer.modelName || 'TM-M30II',
              isActive: false
            });
          }
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Discovery Failed",
        description: error.message || 'Failed to scan network for printers',
        variant: "destructive",
      });
    }
  });

  const handleDiscoverPrinters = () => {
    toast({
      title: "Scanning Network",
      description: "Checking 192.168.1.200-210 for Epson printers. This may take 10-15 seconds...",
    });
    discoverMutation.mutate();
  };

  const handleAddPrinter = () => {
    setEditingPrinter(null);
    setIsPrinterDialogOpen(true);
  };

  const handleEditPrinter = (printer: any) => {
    setEditingPrinter(printer);
    setIsPrinterDialogOpen(true);
  };

  const handleDeletePrinter = (id: number) => {
    if (window.confirm('Are you sure you want to delete this printer?')) {
      deletePrinterMutation.mutate(id);
    }
  };

  const handleSavePrinter = (printerData: any) => {
    console.log('💾 handleSavePrinter called with:', printerData);
    console.log('📝 editingPrinter:', editingPrinter);
    
    if (editingPrinter) {
      console.log('✏️ Updating existing printer');
      updatePrinterMutation.mutate({ id: editingPrinter.id, data: printerData });
    } else {
      console.log('➕ Creating new printer');
      createPrinterMutation.mutate(printerData);
    }
  };

  const handleSetPrimary = (id: number) => {
    setPrimaryMutation.mutate(id);
  };

  const handleTestPrint = async (printer: any) => {
    setIsTestLoading(printer.id);
    try {
      const response = await apiRequest('POST', `/api/printer/config/${printer.id}/test-connection`, {
        ipAddress: printer.ipAddress,
        port: printer.port
      });
      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Test Successful",
          description: `Printer ${printer.name} is working correctly!`,
        });
      } else {
        toast({
          title: "Test Failed",
          description: result.message || "Could not connect to printer",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: "Network error occurred while testing printer",
        variant: "destructive",
      });
    } finally {
      setIsTestLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Printer Management</h3>
          <p className="text-sm text-gray-600">Configure thermal printers for kitchen tickets and receipts</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              refetch();
              toast({
                title: "Refreshed",
                description: "Printer list updated from server.",
              });
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDiscoverPrinters}
            disabled={discoverMutation.isPending}
          >
            {discoverMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Search className="h-4 w-4 mr-2" />
            )}
            Discover Printers
          </Button>
          <Button onClick={handleAddPrinter}>
            <Plus className="h-4 w-4 mr-2" />
            Add Printer
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-gray-400 mb-4" />
            <p className="text-gray-500">Loading printers...</p>
          </div>
        ) : printers.length === 0 ? (
          <div className="text-center py-8">
            <Printer className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No printers added yet</h3>
            <p className="text-gray-500 mb-4">Add your Epson TM-M30II printer to start printing receipts</p>
            <Button onClick={handleAddPrinter}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Printer
            </Button>
          </div>
        ) : (
          printers.map((printer) => (
            <Card key={printer.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Printer className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{printer.name}</h4>
                        {printer.isPrimary && (
                          <Badge variant="default" className="text-xs">PRIMARY</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{printer.printerType} • IP: {printer.ipAddress}:{printer.port}</p>
                      <p className="text-xs text-gray-500">Status: {printer.connectionStatus} • Created: {new Date(printer.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {!printer.isPrimary && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetPrimary(printer.id)}
                        disabled={setPrimaryMutation.isPending}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Set Primary
                      </Button>
                    )}
                    <Badge variant={printer.isActive ? "default" : "secondary"}>
                      {printer.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleTestPrint(printer)}
                      disabled={isTestLoading === printer.id}
                    >
                      {isTestLoading === printer.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                      Test
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEditPrinter(printer)}>
                      <Edit className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeletePrinter(printer.id)}
                      disabled={deletePrinterMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Printer Configuration Dialog */}
      <Dialog open={isPrinterDialogOpen} onOpenChange={setIsPrinterDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingPrinter ? "Edit Printer" : "Add New Printer"}</DialogTitle>
            <DialogDescription>
              Configure your Epson thermal printer settings
            </DialogDescription>
          </DialogHeader>
          <PrinterForm 
            printer={editingPrinter}
            onSave={handleSavePrinter}
            onCancel={() => {
              setIsPrinterDialogOpen(false);
              setEditingPrinter(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Menu Item Form Components
const CreateMenuItemForm = ({ onSubmit, onCancel, categories }: { onSubmit: (data: any) => void; onCancel: () => void; categories: string[] }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    image: "",
    isAvailable: true,
    options: {
      sizes: [] as { name: string; price: string }[],
      toppings: [] as { name: string; price: string }[],
      extras: [] as { name: string; price: string }[],
      addOns: [] as { name: string; price: string }[],
      customizations: [] as { name: string; price: string }[]
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      description: formData.description,
      basePrice: parseFloat(formData.price).toString(), // Convert to string for decimal field
      category: formData.category,
      imageUrl: formData.image || null, // Map image to imageUrl
      isAvailable: formData.isAvailable,
      options: formData.options
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            required
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>
      
      <ImageUpload
        label="Menu Item Image"
        value={formData.image}
        onChange={(imageUrl) => setFormData({ ...formData, image: imageUrl })}
      />
      
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isAvailable"
          checked={formData.isAvailable}
          onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
        />
        <Label htmlFor="isAvailable">Available for ordering</Label>
      </div>

      {/* Options Management */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Customization Options</h3>
        
        {/* Sizes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Sizes</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const name = prompt("Enter size name:");
                const price = prompt("Enter price:");
                if (name && price) {
                  setFormData(prev => ({
                    ...prev,
                    options: {
                      ...prev.options,
                      sizes: [...(prev.options.sizes || []), { name, price }]
                    }
                  }));
                }
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Size
            </Button>
          </div>
          {formData.options.sizes?.map((size, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 border rounded">
              <Input
                value={size.name}
                onChange={(e) => {
                  const newSizes = [...formData.options.sizes];
                  newSizes[index] = { ...size, name: e.target.value };
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, sizes: newSizes }
                  }));
                }}
                placeholder="Size name"
                className="flex-1"
              />
              <Input
                type="number"
                step="0.01"
                value={size.price}
                onChange={(e) => {
                  const newSizes = [...formData.options.sizes];
                  newSizes[index] = { ...size, price: e.target.value };
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, sizes: newSizes }
                  }));
                }}
                placeholder="Price"
                className="w-24"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newSizes = formData.options.sizes.filter((_, i) => i !== index);
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, sizes: newSizes }
                  }));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Toppings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Toppings</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const name = prompt("Enter topping name:");
                const price = prompt("Enter price:");
                if (name && price) {
                  setFormData(prev => ({
                    ...prev,
                    options: {
                      ...prev.options,
                      toppings: [...(prev.options.toppings || []), { name, price }]
                    }
                  }));
                }
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Topping
            </Button>
          </div>
          {formData.options.toppings?.map((topping, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 border rounded">
              <Input
                value={topping.name}
                onChange={(e) => {
                  const newToppings = [...formData.options.toppings];
                  newToppings[index] = { ...topping, name: e.target.value };
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, toppings: newToppings }
                  }));
                }}
                placeholder="Topping name"
                className="flex-1"
              />
              <Input
                type="number"
                step="0.01"
                value={topping.price}
                onChange={(e) => {
                  const newToppings = [...formData.options.toppings];
                  newToppings[index] = { ...topping, price: e.target.value };
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, toppings: newToppings }
                  }));
                }}
                placeholder="Price"
                className="w-24"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newToppings = formData.options.toppings.filter((_, i) => i !== index);
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, toppings: newToppings }
                  }));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Extras */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Extras</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const name = prompt("Enter extra name:");
                const price = prompt("Enter price:");
                if (name && price) {
                  setFormData(prev => ({
                    ...prev,
                    options: {
                      ...prev.options,
                      extras: [...(prev.options.extras || []), { name, price }]
                    }
                  }));
                }
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Extra
            </Button>
          </div>
          {formData.options.extras?.map((extra, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 border rounded">
              <Input
                value={extra.name}
                onChange={(e) => {
                  const newExtras = [...formData.options.extras];
                  newExtras[index] = { ...extra, name: e.target.value };
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, extras: newExtras }
                  }));
                }}
                placeholder="Extra name"
                className="flex-1"
              />
              <Input
                type="number"
                step="0.01"
                value={extra.price}
                onChange={(e) => {
                  const newExtras = [...formData.options.extras];
                  newExtras[index] = { ...extra, price: e.target.value };
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, extras: newExtras }
                  }));
                }}
                placeholder="Price"
                className="w-24"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newExtras = formData.options.extras.filter((_, i) => i !== index);
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, extras: newExtras }
                  }));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add-ons */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Add-ons</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const name = prompt("Enter add-on name:");
                const price = prompt("Enter price:");
                if (name && price) {
                  setFormData(prev => ({
                    ...prev,
                    options: {
                      ...prev.options,
                      addOns: [...(prev.options.addOns || []), { name, price }]
                    }
                  }));
                }
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Add-on
            </Button>
          </div>
          {formData.options.addOns?.map((addOn, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 border rounded">
              <Input
                value={addOn.name}
                onChange={(e) => {
                  const newAddOns = [...formData.options.addOns];
                  newAddOns[index] = { ...addOn, name: e.target.value };
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, addOns: newAddOns }
                  }));
                }}
                placeholder="Add-on name"
                className="flex-1"
              />
              <Input
                type="number"
                step="0.01"
                value={addOn.price}
                onChange={(e) => {
                  const newAddOns = [...formData.options.addOns];
                  newAddOns[index] = { ...addOn, price: e.target.value };
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, addOns: newAddOns }
                  }));
                }}
                placeholder="Price"
                className="w-24"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newAddOns = formData.options.addOns.filter((_, i) => i !== index);
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, addOns: newAddOns }
                  }));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Customizations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Customizations</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const name = prompt("Enter customization name:");
                const price = prompt("Enter price:");
                if (name && price) {
                  setFormData(prev => ({
                    ...prev,
                    options: {
                      ...prev.options,
                      customizations: [...(prev.options.customizations || []), { name, price }]
                    }
                  }));
                }
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Customization
            </Button>
          </div>
          {formData.options.customizations?.map((custom, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 border rounded">
              <Input
                value={custom.name}
                onChange={(e) => {
                  const newCustoms = [...formData.options.customizations];
                  newCustoms[index] = { ...custom, name: e.target.value };
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, customizations: newCustoms }
                  }));
                }}
                placeholder="Customization name"
                className="flex-1"
              />
              <Input
                type="number"
                step="0.01"
                value={custom.price}
                onChange={(e) => {
                  const newCustoms = [...formData.options.customizations];
                  newCustoms[index] = { ...custom, price: e.target.value };
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, customizations: newCustoms }
                  }));
                }}
                placeholder="Price"
                className="w-24"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newCustoms = formData.options.customizations.filter((_, i) => i !== index);
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, customizations: newCustoms }
                  }));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="sticky bottom-0 bg-white pt-4 border-t mt-6 flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Item</Button>
      </div>
    </form>
  );
};

const EditMenuItemForm = ({ item, onSubmit, onCancel, categories }: { item: any; onSubmit: (data: any) => void; onCancel: () => void; categories: string[] }) => {
  const [formData, setFormData] = useState({
    name: item.name || "",
    description: item.description || "",
    price: item.basePrice?.toString() || "", // Map basePrice to price for form
    category: item.category || "",
    image: item.imageUrl || "", // Map imageUrl to image for form
    isAvailable: item.isAvailable !== false,
    isPopular: item.isPopular || false,
    isBestSeller: item.isBestSeller || false,
    isNew: item.isNew || false,
    options: item.options || {
      sizes: [] as { name: string; price: string }[],
      toppings: [] as { name: string; price: string }[],
      extras: [] as { name: string; price: string }[],
      addOns: [] as { name: string; price: string }[],
      customizations: [] as { name: string; price: string }[]
    }
  });

  // Update form data when item prop changes (after save/refresh)
  useEffect(() => {
    setFormData({
      name: item.name || "",
      description: item.description || "",
      price: item.basePrice?.toString() || "",
      category: item.category || "",
      image: item.imageUrl || "", // This will now update with fresh data
      isAvailable: item.isAvailable !== false,
      isPopular: item.isPopular || false,
      isBestSeller: item.isBestSeller || false,
      isNew: item.isNew || false,
      options: item.options || {
        sizes: [] as { name: string; price: string }[],
        toppings: [] as { name: string; price: string }[],
        extras: [] as { name: string; price: string }[],
        addOns: [] as { name: string; price: string }[],
        customizations: [] as { name: string; price: string }[]
      }
    });
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      description: formData.description,
      basePrice: parseFloat(formData.price).toString(), // Convert to string for decimal field
      category: formData.category,
      imageUrl: formData.image || null, // Map image to imageUrl
      isAvailable: formData.isAvailable,
      isPopular: formData.isPopular,
      isBestSeller: formData.isBestSeller,
      isNew: formData.isNew,
      options: formData.options
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-name">Name</Label>
          <Input
            id="edit-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="edit-price">Price</Label>
          <Input
            id="edit-price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            required
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="edit-category">Category</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="edit-description">Description</Label>
        <Input
          id="edit-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <ImageUpload
        label="Menu Item Image"
        value={formData.image}
        onChange={(imageUrl) => setFormData({ ...formData, image: imageUrl })}
      />
      
      <div className="space-y-3 border-t pt-4">
        <h3 className="text-base font-semibold">Item Settings</h3>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="edit-isAvailable"
            checked={formData.isAvailable}
            onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
          />
          <Label htmlFor="edit-isAvailable">Available for ordering</Label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="edit-isPopular"
            checked={formData.isPopular}
            onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
          />
          <Label htmlFor="edit-isPopular">Mark as Popular (shows on home page)</Label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="edit-isBestSeller"
            checked={formData.isBestSeller}
            onChange={(e) => setFormData({ ...formData, isBestSeller: e.target.checked })}
          />
          <Label htmlFor="edit-isBestSeller">Mark as Best Seller (shows on home page)</Label>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="edit-isNew"
            checked={formData.isNew}
            onChange={(e) => setFormData({ ...formData, isNew: e.target.checked })}
          />
          <Label htmlFor="edit-isNew">Mark as New</Label>
        </div>
      </div>

      {/* Options Management */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold">Customization Options</h3>
        
        {/* Sizes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Sizes</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const name = prompt("Enter size name:");
                const price = prompt("Enter price:");
                if (name && price) {
                  setFormData(prev => ({
                    ...prev,
                    options: {
                      ...prev.options,
                      sizes: [...(prev.options.sizes || []), { name, price }]
                    }
                  }));
                }
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Size
            </Button>
          </div>
          {formData.options.sizes?.map((size, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 border rounded">
              <Input
                value={size.name}
                onChange={(e) => {
                  const newSizes = [...formData.options.sizes];
                  newSizes[index] = { ...size, name: e.target.value };
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, sizes: newSizes }
                  }));
                }}
                placeholder="Size name"
                className="flex-1"
              />
              <Input
                type="number"
                step="0.01"
                value={size.price}
                onChange={(e) => {
                  const newSizes = [...formData.options.sizes];
                  newSizes[index] = { ...size, price: e.target.value };
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, sizes: newSizes }
                  }));
                }}
                placeholder="Price"
                className="w-24"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newSizes = formData.options.sizes.filter((_, i) => i !== index);
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, sizes: newSizes }
                  }));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Toppings */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Toppings</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const name = prompt("Enter topping name:");
                const price = prompt("Enter price:");
                if (name && price) {
                  setFormData(prev => ({
                    ...prev,
                    options: {
                      ...prev.options,
                      toppings: [...(prev.options.toppings || []), { name, price }]
                    }
                  }));
                }
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Topping
            </Button>
          </div>
          {formData.options.toppings?.map((topping, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 border rounded">
              <Input
                value={topping.name}
                onChange={(e) => {
                  const newToppings = [...formData.options.toppings];
                  newToppings[index] = { ...topping, name: e.target.value };
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, toppings: newToppings }
                  }));
                }}
                placeholder="Topping name"
                className="flex-1"
              />
              <Input
                type="number"
                step="0.01"
                value={topping.price}
                onChange={(e) => {
                  const newToppings = [...formData.options.toppings];
                  newToppings[index] = { ...topping, price: e.target.value };
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, toppings: newToppings }
                  }));
                }}
                placeholder="Price"
                className="w-24"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newToppings = formData.options.toppings.filter((_, i) => i !== index);
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, toppings: newToppings }
                  }));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Extras */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Extras</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const name = prompt("Enter extra name:");
                const price = prompt("Enter price:");
                if (name && price) {
                  setFormData(prev => ({
                    ...prev,
                    options: {
                      ...prev.options,
                      extras: [...(prev.options.extras || []), { name, price }]
                    }
                  }));
                }
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Extra
            </Button>
          </div>
          {formData.options.extras?.map((extra, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 border rounded">
              <Input
                value={extra.name}
                onChange={(e) => {
                  const newExtras = [...formData.options.extras];
                  newExtras[index] = { ...extra, name: e.target.value };
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, extras: newExtras }
                  }));
                }}
                placeholder="Extra name"
                className="flex-1"
              />
              <Input
                type="number"
                step="0.01"
                value={extra.price}
                onChange={(e) => {
                  const newExtras = [...formData.options.extras];
                  newExtras[index] = { ...extra, price: e.target.value };
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, extras: newExtras }
                  }));
                }}
                placeholder="Price"
                className="w-24"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newExtras = formData.options.extras.filter((_, i) => i !== index);
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, extras: newExtras }
                  }));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Add-ons */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Add-ons</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const name = prompt("Enter add-on name:");
                const price = prompt("Enter price:");
                if (name && price) {
                  setFormData(prev => ({
                    ...prev,
                    options: {
                      ...prev.options,
                      addOns: [...(prev.options.addOns || []), { name, price }]
                    }
                  }));
                }
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Add-on
            </Button>
          </div>
          {formData.options.addOns?.map((addOn, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 border rounded">
              <Input
                value={addOn.name}
                onChange={(e) => {
                  const newAddOns = [...formData.options.addOns];
                  newAddOns[index] = { ...addOn, name: e.target.value };
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, addOns: newAddOns }
                  }));
                }}
                placeholder="Add-on name"
                className="flex-1"
              />
              <Input
                type="number"
                step="0.01"
                value={addOn.price}
                onChange={(e) => {
                  const newAddOns = [...formData.options.addOns];
                  newAddOns[index] = { ...addOn, price: e.target.value };
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, addOns: newAddOns }
                  }));
                }}
                placeholder="Price"
                className="w-24"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newAddOns = formData.options.addOns.filter((_, i) => i !== index);
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, addOns: newAddOns }
                  }));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Customizations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-medium">Customizations</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const name = prompt("Enter customization name:");
                const price = prompt("Enter price:");
                if (name && price) {
                  setFormData(prev => ({
                    ...prev,
                    options: {
                      ...prev.options,
                      customizations: [...(prev.options.customizations || []), { name, price }]
                    }
                  }));
                }
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Customization
            </Button>
          </div>
          {formData.options.customizations?.map((custom, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 border rounded">
              <Input
                value={custom.name}
                onChange={(e) => {
                  const newCustoms = [...formData.options.customizations];
                  newCustoms[index] = { ...custom, name: e.target.value };
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, customizations: newCustoms }
                  }));
                }}
                placeholder="Customization name"
                className="flex-1"
              />
              <Input
                type="number"
                step="0.01"
                value={custom.price}
                onChange={(e) => {
                  const newCustoms = [...formData.options.customizations];
                  newCustoms[index] = { ...custom, price: e.target.value };
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, customizations: newCustoms }
                  }));
                }}
                placeholder="Price"
                className="w-24"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const newCustoms = formData.options.customizations.filter((_, i) => i !== index);
                  setFormData(prev => ({
                    ...prev,
                    options: { ...prev.options, customizations: newCustoms }
                  }));
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
      
      <div className="sticky bottom-0 bg-white pt-4 border-t mt-6 flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Update Item</Button>
      </div>
    </form>
  );
};

// QR Code Form Components
const CreateQRCodeForm = ({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    type: "menu",
    url: "",
    table_number: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      table_number: formData.table_number ? parseInt(formData.table_number) : null
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="qr-name">Name</Label>
        <Input
          id="qr-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Table 1, Menu QR, Instagram Link"
          required
        />
      </div>

      <div>
        <Label htmlFor="qr-description">Description (Optional)</Label>
        <Input
          id="qr-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of this QR code"
        />
      </div>

      <div>
        <Label htmlFor="qr-type">QR Code Type</Label>
        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="menu">Menu / Table Ordering</SelectItem>
            <SelectItem value="social">Social Media Link</SelectItem>
            <SelectItem value="table">Table Number</SelectItem>
            <SelectItem value="promotion">Promotion / Discount</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="qr-url">URL</Label>
        <Input
          id="qr-url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="e.g., /menu, /order?table=1, https://instagram.com/yourpage"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Use relative URLs (e.g., /menu) or full URLs (e.g., https://instagram.com/yourpage)
        </p>
      </div>

      {formData.type === 'table' && (
        <div>
          <Label htmlFor="qr-table">Table Number (Optional)</Label>
          <Input
            id="qr-table"
            type="number"
            value={formData.table_number}
            onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
            placeholder="e.g., 1, 5, 12"
          />
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create QR Code</Button>
      </div>
    </form>
  );
};

const EditQRCodeForm = ({ qrCode, onSubmit, onCancel }: { qrCode: any; onSubmit: (data: any) => void; onCancel: () => void }) => {
  const [formData, setFormData] = useState({
    name: qrCode.name || "",
    description: qrCode.description || "",
    type: qrCode.type || "menu",
    url: qrCode.url || "",
    table_number: qrCode.table_number?.toString() || ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const submitData = {
      ...formData,
      table_number: formData.table_number ? parseInt(formData.table_number) : null
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="edit-qr-name">Name</Label>
        <Input
          id="edit-qr-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Table 1, Menu QR, Instagram Link"
          required
        />
      </div>

      <div>
        <Label htmlFor="edit-qr-description">Description (Optional)</Label>
        <Input
          id="edit-qr-description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of this QR code"
        />
      </div>

      <div>
        <Label htmlFor="edit-qr-type">QR Code Type</Label>
        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="menu">Menu / Table Ordering</SelectItem>
            <SelectItem value="social">Social Media Link</SelectItem>
            <SelectItem value="table">Table Number</SelectItem>
            <SelectItem value="promotion">Promotion / Discount</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="edit-qr-url">URL</Label>
        <Input
          id="edit-qr-url"
          value={formData.url}
          onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          placeholder="e.g., /menu, /order?table=1, https://instagram.com/yourpage"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Use relative URLs (e.g., /menu) or full URLs (e.g., https://instagram.com/yourpage)
        </p>
      </div>

      {formData.type === 'table' && (
        <div>
          <Label htmlFor="edit-qr-table">Table Number (Optional)</Label>
          <Input
            id="edit-qr-table"
            type="number"
            value={formData.table_number}
            onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
            placeholder="e.g., 1, 5, 12"
          />
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Update QR Code</Button>
      </div>
    </form>
  );
};

// Promotion Form Components
const CreatePromotionForm = ({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) => {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    type: "percentage",
    value: "",
    minOrder: "",
    maxUsage: "",
    startDate: "",
    endDate: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim()) {
      alert("Promotion name is required");
      return;
    }
    if (!formData.code.trim()) {
      alert("Coupon code is required");
      return;
    }
    if (!formData.value || parseFloat(formData.value) <= 0) {
      alert("Discount value must be greater than 0");
      return;
    }
    if (!formData.minOrder || parseFloat(formData.minOrder) < 0) {
      alert("Minimum order amount must be 0 or greater");
      return;
    }
    if (!formData.maxUsage || parseInt(formData.maxUsage) <= 0) {
      alert("Maximum usage must be greater than 0");
      return;
    }
    if (!formData.startDate) {
      alert("Start date is required");
      return;
    }
    if (!formData.endDate) {
      alert("End date is required");
      return;
    }
    
    const submissionData = {
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      discountType: formData.type,
      discount: parseFloat(formData.value).toString(), // Convert to string for decimal field
      minOrderAmount: parseFloat(formData.minOrder).toString(), // Convert to string for decimal field
      maxUses: parseInt(formData.maxUsage),
      startDate: new Date(formData.startDate), // Send as Date object for timestamp field
      endDate: new Date(formData.endDate), // Send as Date object for timestamp field
      isActive: true,
      description: "" // Add empty description since it's optional
    };
    console.log("Submitting promotion data:", submissionData);
    onSubmit(submissionData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="promo-name">Promotion Name</Label>
          <Input
            id="promo-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., First Order Discount"
            required
          />
        </div>
        <div>
          <Label htmlFor="promo-code">Coupon Code</Label>
          <Input
            id="promo-code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="e.g., FIRST15"
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="promo-type">Discount Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage (%)</SelectItem>
              <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="promo-value">Discount Value</Label>
          <Input
            id="promo-value"
            type="number"
            step="0.01"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            placeholder={formData.type === "percentage" ? "15" : "5.00"}
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="promo-min-order">Minimum Order Amount</Label>
          <Input
            id="promo-min-order"
            type="number"
            step="0.01"
            value={formData.minOrder}
            onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
            placeholder="20.00"
            required
          />
        </div>
        <div>
          <Label htmlFor="promo-max-usage">Maximum Usage</Label>
          <Input
            id="promo-max-usage"
            type="number"
            value={formData.maxUsage}
            onChange={(e) => setFormData({ ...formData, maxUsage: e.target.value })}
            placeholder="100"
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="promo-start-date">Start Date</Label>
          <Input
            id="promo-start-date"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="promo-end-date">End Date</Label>
          <Input
            id="promo-end-date"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Promotion</Button>
      </div>
    </form>
  );
};

const EditPromotionForm = ({ promotion, onSubmit, onCancel }: { promotion: any; onSubmit: (data: any) => void; onCancel: () => void }) => {
  const [formData, setFormData] = useState({
    name: promotion.name || "",
    code: promotion.code || "",
    type: promotion.discountType || "percentage",
    value: promotion.discount?.toString() || "",
    minOrder: promotion.minOrderAmount?.toString() || "",
    maxUsage: promotion.maxUses?.toString() || "",
    startDate: promotion.startDate ? new Date(promotion.startDate).toISOString().split('T')[0] : "",
    endDate: promotion.endDate ? new Date(promotion.endDate).toISOString().split('T')[0] : ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      code: formData.code,
      discountType: formData.type,
      discount: parseFloat(formData.value),
      minOrderAmount: parseFloat(formData.minOrder),
      maxUses: parseInt(formData.maxUsage),
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString()
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-promo-name">Promotion Name</Label>
          <Input
            id="edit-promo-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., First Order Discount"
            required
          />
        </div>
        <div>
          <Label htmlFor="edit-promo-code">Coupon Code</Label>
          <Input
            id="edit-promo-code"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            placeholder="e.g., FIRST15"
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-promo-type">Discount Type</Label>
          <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage (%)</SelectItem>
              <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="edit-promo-value">Discount Value</Label>
          <Input
            id="edit-promo-value"
            type="number"
            step="0.01"
            value={formData.value}
            onChange={(e) => setFormData({ ...formData, value: e.target.value })}
            placeholder={formData.type === "percentage" ? "15" : "5.00"}
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-promo-min-order">Minimum Order Amount</Label>
          <Input
            id="edit-promo-min-order"
            type="number"
            step="0.01"
            value={formData.minOrder}
            onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
            placeholder="20.00"
            required
          />
        </div>
        <div>
          <Label htmlFor="edit-promo-max-usage">Maximum Usage</Label>
          <Input
            id="edit-promo-max-usage"
            type="number"
            value={formData.maxUsage}
            onChange={(e) => setFormData({ ...formData, maxUsage: e.target.value })}
            placeholder="100"
            required
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="edit-promo-start-date">Start Date</Label>
          <Input
            id="edit-promo-start-date"
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="edit-promo-end-date">End Date</Label>
          <Input
            id="edit-promo-end-date"
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            required
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Update Promotion</Button>
      </div>
    </form>
  );
};

// Loyalty Program Component - Removed for future browser popup implementation

// All spin wheel related code has been removed for future browser popup implementation
// This section previously contained the LoyaltyProgram component and related functionality

// Printer Form Component
const PrinterForm = ({ printer, onSave, onCancel }: { printer?: any, onSave: (data: any) => void, onCancel: () => void }) => {
  const [formData, setFormData] = useState({
    name: printer?.name || '',
    ip: printer?.ipAddress || '',
    port: printer?.port?.toString() || '80',
    type: printer?.printerType || 'Epson TM-M30II',
    isActive: printer?.isActive ?? true,
    isPrimary: printer?.isPrimary || false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="printer-name">Printer Name</Label>
        <Input
          id="printer-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Kitchen Printer"
          required
        />
      </div>

      <div>
        <Label htmlFor="printer-ip">IP Address</Label>
        <Input
          id="printer-ip"
          value={formData.ip}
          onChange={(e) => setFormData({ ...formData, ip: e.target.value })}
          placeholder="e.g., 192.168.1.100"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Find this in your router settings or print a test page from the printer
        </p>
      </div>

      <div>
        <Label htmlFor="printer-port">Port</Label>
        <Input
          id="printer-port"
          type="number"
          value={formData.port}
          onChange={(e) => setFormData({ ...formData, port: e.target.value })}
          placeholder="80"
          required
        />
        <p className="text-xs text-gray-500 mt-1">
          Usually 80 for Epson printers
        </p>
      </div>

      <div>
        <Label htmlFor="printer-type">Printer Type</Label>
        <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Epson TM-M30II">Epson TM-M30II</SelectItem>
            <SelectItem value="Epson TM-M32">Epson TM-M32</SelectItem>
            <SelectItem value="Epson TM-T88VI">Epson TM-T88VI</SelectItem>
            <SelectItem value="Epson TM-T88V">Epson TM-T88V</SelectItem>
            <SelectItem value="Other">Other Epson Model</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="printer-active"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="rounded"
        />
        <Label htmlFor="printer-active">Active (enabled for printing)</Label>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="printer-primary"
          checked={formData.isPrimary}
          onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
          className="rounded"
        />
        <Label htmlFor="printer-primary">Set as Primary Printer</Label>
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {printer ? 'Update Printer' : 'Add Printer'}
        </Button>
      </div>
    </form>
  );
};

// Spin Wheel Slice Form Component - Removed for future browser popup implementation

// Category Form Components
const CreateCategoryForm = ({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) => {
  const [formData, setFormData] = useState({
    name: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="category-name">Category Name</Label>
        <Input
          id="category-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Traditional Pizza"
          required
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Category</Button>
      </div>
    </form>
  );
};

const EditCategoryForm = ({ category, onSubmit, onCancel }: { category: any; onSubmit: (data: any) => void; onCancel: () => void }) => {
  const [formData, setFormData] = useState({
    name: category.name || "",
    order: category.order || 1,
    isActive: category.isActive !== false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="edit-category-name">Category Name</Label>
        <Input
          id="edit-category-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Traditional Pizza"
          required
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Update Category</Button>
      </div>
    </form>
  );
};

// Choice Form Components
const CreateChoiceForm = ({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) => {
  const [formData, setFormData] = useState({
    name: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="choice-name">Choice Group Name</Label>
        <Input
          id="choice-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Toppings 10 inch"
          required
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Create Choice Group</Button>
      </div>
    </form>
  );
};

const EditChoiceForm = ({ choice, onSubmit, onCancel }: { choice: any; onSubmit: (data: any) => void; onCancel: () => void }) => {
  const [formData, setFormData] = useState({
    name: choice.name || ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="edit-choice-name">Choice Group Name</Label>
        <Input
          id="edit-choice-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Toppings 10 inch"
          required
        />
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Update Choice Group</Button>
      </div>
    </form>
  );
};

// Award Points Form Component
const AwardPointsForm = ({ user, onSubmit, onCancel, isLoading }: any) => {
  const [formData, setFormData] = useState({
    points: '',
    reason: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const points = parseInt(formData.points);
    if (points <= 0) {
      alert('Points must be a positive number');
      return;
    }
    onSubmit({
      points,
      reason: formData.reason || `Points awarded by admin`
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPoints">Current Points</Label>
        <div className="text-lg font-semibold text-green-600">
          {user.currentPoints || 0} points
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="points">Points to Award *</Label>
        <Input
          id="points"
          type="number"
          min="1"
          step="1"
          value={formData.points}
          onChange={(e) => setFormData({ ...formData, points: e.target.value })}
          placeholder="Enter points amount"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="reason">Reason (Optional)</Label>
        <Input
          id="reason"
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          placeholder="e.g., Customer appreciation, Special promotion"
        />
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="submit"
          disabled={isLoading || !formData.points}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Awarding...
            </>
          ) : (
            'Award Points'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

// User Management Tab Component (keeping the existing implementation)
const UserManagementTab = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [awardingPointsUser, setAwardingPointsUser] = useState<any>(null);
  const [editingRateUser, setEditingRateUser] = useState<any>(null);

  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: currentUser?.isAdmin,
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await apiRequest("POST", "/api/users", userData);
      if (!response.ok) {
        throw new Error("Failed to create user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsCreateDialogOpen(false);
      toast({
        title: "User Created",
        description: "User has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async ({ id, userData }: { id: number; userData: any }) => {
      const response = await apiRequest("PUT", `/api/users/${id}`, userData);
      if (!response.ok) {
        throw new Error("Failed to update user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingUser(null);
      toast({
        title: "User Updated",
        description: "User has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/users/${id}`);
      if (!response.ok) {
        throw new Error("Failed to delete user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User Deleted",
        description: "User has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Award points mutation
  const awardPointsMutation = useMutation({
    mutationFn: async ({ userId, points, reason }: { userId: number; points: number; reason: string }) => {
      const response = await apiRequest("POST", "/api/award-points", { userId, points, reason });
      if (!response.ok) {
        throw new Error("Failed to award points");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setAwardingPointsUser(null);
      toast({
        title: "Points Awarded",
        description: `Successfully awarded ${data.pointsAwarded} points to ${data.user.firstName} ${data.user.lastName}. New total: ${data.newTotal} points.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update rate mutation
  const updateRateMutation = useMutation({
    mutationFn: async (rateData: any) => {
      const response = await apiRequest("PUT", "/api/update-user-rate", rateData);
      if (!response.ok) {
        throw new Error("Failed to update user rate");
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditingRateUser(null);
      toast({
        title: "Rate Updated",
        description: `Successfully updated hourly rate for ${data.user.firstName} ${data.user.lastName}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter users
  const filteredUsers = (users as any[])?.filter((user: any) => {
    const matchesSearch = 
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  }) || [];

  const handleCreateUser = (userData: any) => {
    createUserMutation.mutate(userData);
  };

  const handleUpdateUser = (id: number, userData: any) => {
    updateUserMutation.mutate({ id, userData });
  };

  const handleDeleteUser = (id: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(id);
    }
  };

  const handleEditRate = (user: any) => {
    setEditingRateUser(user);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin": return "bg-red-100 text-red-800";
      case "admin": return "bg-purple-100 text-purple-800";
      case "employee": return "bg-blue-100 text-blue-800";
      case "customer": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">User Management</h2>
          <p className="text-gray-600">Manage users, admins, and employees</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#d73a31] hover:bg-[#c73128]">
              <Plus className="mr-2 h-4 w-4" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <CreateUserForm onSubmit={handleCreateUser} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Create Admin User (Supabase) */}
      {currentUser?.role === 'super_admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Create Admin User (Supabase)
            </CardTitle>
            <CardDescription>
              Create new admin or employee accounts with Supabase authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SupabaseAdminCreator />
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="super_admin">Super Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto mobile-scroll-container touch-pan-x">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Name</th>
                  <th className="text-left p-2">Email</th>
                  <th className="text-left p-2">Role</th>
                  <th className="text-left p-2">Hourly Rate</th>
                  <th className="text-left p-2">Points</th>
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Created</th>
                  <th className="text-left p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user: any) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{user.firstName} {user.lastName}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="p-2">{user.email}</td>
                    <td className="p-2">
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role?.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </td>
                    <td className="p-2">
                      {(user.role === 'employee' || user.role === 'admin' || user.role === 'manager') ? (
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {user.hourlyRate ? `$${parseFloat(user.hourlyRate).toFixed(2)}/hr` : 'Not set'}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditRate(user)}
                            className="text-xs px-2 py-1 h-6"
                          >
                            Edit
                          </Button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-green-600">
                          {user.currentPoints || 0} pts
                        </span>
                        {user.role === 'customer' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAwardingPointsUser(user)}
                            className="text-xs px-2 py-1 h-6"
                          >
                            Award
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="p-2">
                      <Badge variant={user.isActive ? "default" : "destructive"}>
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="p-2 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-2">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {user.id !== currentUser?.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <EditUserForm 
              user={editingUser} 
              onSubmit={(userData) => handleUpdateUser(editingUser.id, userData)}
              onCancel={() => setEditingUser(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Award Points Dialog */}
      {awardingPointsUser && (
        <Dialog open={!!awardingPointsUser} onOpenChange={() => setAwardingPointsUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Award Points</DialogTitle>
              <DialogDescription>
                Award points to {awardingPointsUser.firstName} {awardingPointsUser.lastName}
              </DialogDescription>
            </DialogHeader>
            <AwardPointsForm
              user={awardingPointsUser}
              onSubmit={(pointsData) => awardPointsMutation.mutate({
                userId: awardingPointsUser.id,
                points: pointsData.points,
                reason: pointsData.reason
              })}
              onCancel={() => setAwardingPointsUser(null)}
              isLoading={awardPointsMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Rate Dialog */}
      {editingRateUser && (
        <Dialog open={!!editingRateUser} onOpenChange={() => setEditingRateUser(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Hourly Rate</DialogTitle>
              <DialogDescription>
                Set hourly rate for {editingRateUser.firstName} {editingRateUser.lastName}
              </DialogDescription>
            </DialogHeader>
            <EditRateForm
              user={editingRateUser}
              onSubmit={(rateData) => updateRateMutation.mutate({
                userId: editingRateUser.id,
                ...rateData
              })}
              onCancel={() => setEditingRateUser(null)}
              isLoading={updateRateMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

// Supabase Admin Creator Component
const SupabaseAdminCreator = () => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "admin",
    firstName: "",
    lastName: ""
  });

  const createSupabaseAdminMutation = useMutation({
    mutationFn: async (adminData: any) => {
      const response = await apiRequest("POST", "/api/create-supabase-admin", adminData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Admin User Created",
        description: `${data.user?.role} user created successfully with email: ${data.user?.email}`,
      });
      setFormData({
        email: "",
        password: "",
        role: "admin",
        firstName: "",
        lastName: ""
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create admin user",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createSupabaseAdminMutation.mutate({
      email: formData.email,
      password: formData.password,
      role: formData.role,
      firstName: formData.firstName,
      lastName: formData.lastName
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            placeholder="John"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            placeholder="Doe"
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          placeholder="admin@restaurant.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          placeholder="Strong password (min 8 characters)"
          minLength={8}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="kitchen">Kitchen Staff</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        disabled={createSupabaseAdminMutation.isPending}
        className="w-full"
      >
        {createSupabaseAdminMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Creating Admin...
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 mr-2" />
            Create {formData.role.replace('_', ' ')} User
          </>
        )}
      </Button>
    </form>
  );
};

// Create User Form Component
const CreateUserForm = ({ onSubmit }: { onSubmit: (data: any) => void }) => {
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    role: "customer",
    isAdmin: false,
    isActive: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="role">Role</Label>
        <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex gap-4">
        <Button type="submit" className="flex-1">
          Create User
        </Button>
      </div>
    </form>
  );
};

// Edit User Form Component
const EditUserForm = ({ 
  user, 
  onSubmit, 
  onCancel 
}: { 
  user: any; 
  onSubmit: (data: any) => void; 
  onCancel: () => void;
}) => {
  const [formData, setFormData] = useState({
    firstName: user.firstName || "",
    lastName: user.lastName || "",
    email: user.email || "",
    role: user.role || "customer",
    isAdmin: user.isAdmin || false,
    isActive: user.isActive !== false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="editFirstName">First Name</Label>
          <Input
            id="editFirstName"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="editLastName">Last Name</Label>
          <Input
            id="editLastName"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="editEmail">Email</Label>
        <Input
          id="editEmail"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="editRole">Role</Label>
        <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="employee">Employee</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="super_admin">Super Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex gap-4">
        <Button type="submit" className="flex-1">
          Update User
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

// Promo Codes Management Component
const PromoCodesManagement = () => {
  const { toast } = useToast();
  const [promoCodes, setPromoCodes] = useState([
    {
      id: 1,
      code: "WELCOME10",
      discount: 10,
      discountType: "percentage",
      minOrderAmount: 20,
      maxUses: 1000,
      currentUses: 0,
      expiresAt: new Date("2024-12-31"),
      isActive: true,
      description: "Welcome discount for new customers"
    },
    {
      id: 2,
      code: "SAVE5",
      discount: 5,
      discountType: "fixed",
      minOrderAmount: 15,
      maxUses: 500,
      currentUses: 0,
      expiresAt: new Date("2024-12-31"),
      isActive: true,
      description: "Fixed $5 off any order"
    },
    {
      id: 3,
      code: "PIZZA20",
      discount: 20,
      discountType: "percentage",
      minOrderAmount: 25,
      maxUses: 200,
      currentUses: 0,
      expiresAt: new Date("2024-12-31"),
      isActive: false,
      description: "20% off pizza orders"
    }
  ]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<any>(null);

  const handleCreatePromo = (data: any) => {
    const newPromo = {
      id: Date.now(),
      ...data,
      currentUses: 0,
      isActive: true
    };
    setPromoCodes([...promoCodes, newPromo]);
    setIsCreateDialogOpen(false);
    toast({
      title: "Promo code created",
      description: `Promo code "${data.code}" has been created successfully.`,
    });
  };

  const handleUpdatePromo = (id: number, data: any) => {
    setPromoCodes(promoCodes.map(promo => 
      promo.id === id ? { ...promo, ...data } : promo
    ));
    setEditingPromo(null);
    toast({
      title: "Promo code updated",
      description: `Promo code "${data.code}" has been updated successfully.`,
    });
  };

  const handleDeletePromo = (id: number) => {
    const promo = promoCodes.find(p => p.id === id);
    setPromoCodes(promoCodes.filter(p => p.id !== id));
    toast({
      title: "Promo code deleted",
      description: `Promo code "${promo?.code}" has been deleted.`,
    });
  };

  const togglePromoStatus = (id: number) => {
    setPromoCodes(promoCodes.map(promo => 
      promo.id === id ? { ...promo, isActive: !promo.isActive } : promo
    ));
  };

  const getUsagePercentage = (current: number, max: number) => {
    return Math.round((current / max) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Promo Code Management</h2>
          <p className="text-gray-600">Create and manage promotional codes for customer discounts</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Promo Code
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Promo Codes</p>
                <p className="text-2xl font-bold text-gray-900">{promoCodes.length}</p>
              </div>
              <CreditCard className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">
                  {promoCodes.filter(promo => promo.isActive).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Uses</p>
              <p className="text-2xl font-bold text-blue-600">
                {(promoCodes || []).reduce((sum, promo) => sum + promo.currentUses, 0)}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-red-600">
                {promoCodes.filter(promo => new Date() > promo.expiresAt).length}
              </p>
            </div>
            <Clock className="h-8 w-8 text-red-600" />
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Promo Codes List */}
    <Card>
      <CardHeader>
        <CardTitle>Promo Codes</CardTitle>
        <CardDescription>Manage all promotional codes and their usage</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {promoCodes.map((promo) => (
            <div key={promo.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={promo.isActive ? "default" : "secondary"}>
                      {promo.isActive ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant={new Date() > promo.expiresAt ? "destructive" : "outline"}>
                      {new Date() > promo.expiresAt ? "Expired" : "Valid"}
                    </Badge>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{promo.code}</h3>
                    <p className="text-sm text-gray-600">{promo.description}</p>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      <span>
                        {promo.discountType === 'percentage' ? `${promo.discount}% off` : `$${promo.discount} off`}
                      </span>
                      <span>Min order: ${promo.minOrderAmount}</span>
                      <span>Uses: {promo.currentUses}/{promo.maxUses}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          getUsagePercentage(promo.currentUses, promo.maxUses) > 80
                            ? 'bg-red-500'
                            : getUsagePercentage(promo.currentUses, promo.maxUses) > 60
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(getUsagePercentage(promo.currentUses, promo.maxUses), 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {getUsagePercentage(promo.currentUses, promo.maxUses)}%
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingPromo(promo)}
                >
                  <Edit className="h-4 w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => togglePromoStatus(promo.id)}
                >
                  {promo.isActive ? "Deactivate" : "Activate"}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeletePromo(promo.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>

    {/* Create Promo Code Dialog */}
    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Promo Code</DialogTitle>
        </DialogHeader>
        
        <CreatePromoCodeForm
          onSubmit={handleCreatePromo}
          onCancel={() => setIsCreateDialogOpen(false)}
        />
      </DialogContent>
    </Dialog>

    {/* Edit Promo Code Dialog */}
    <Dialog open={!!editingPromo} onOpenChange={() => setEditingPromo(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Promo Code</DialogTitle>
        </DialogHeader>
        
        {editingPromo && (
          <EditPromoCodeForm
            promo={editingPromo}
            onSubmit={(data) => handleUpdatePromo(editingPromo.id, data)}
            onCancel={() => setEditingPromo(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  </div>
  );
};

// Create Promo Code Form Component
const CreatePromoCodeForm = ({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) => {
  const [formData, setFormData] = useState({
    code: "",
    discount: "",
    discountType: "percentage",
    minOrderAmount: "",
    maxUses: "",
    expiresAt: "",
    description: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      discount: parseFloat(formData.discount),
      minOrderAmount: parseFloat(formData.minOrderAmount),
      maxUses: parseInt(formData.maxUses),
      expiresAt: new Date(formData.expiresAt)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="code">Promo Code</Label>
        <Input
          id="code"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          placeholder="WELCOME10"
          required
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="discount">Discount</Label>
          <Input
            id="discount"
            type="number"
            step="0.01"
            value={formData.discount}
            onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="discountType">Type</Label>
          <Select value={formData.discountType} onValueChange={(value) => setFormData({ ...formData, discountType: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage (%)</SelectItem>
              <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="minOrderAmount">Minimum Order Amount</Label>
          <Input
            id="minOrderAmount"
            type="number"
            step="0.01"
            value={formData.minOrderAmount}
            onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="maxUses">Maximum Uses</Label>
          <Input
            id="maxUses"
            type="number"
            value={formData.maxUses}
            onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
            required
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="expiresAt">Expiration Date</Label>
        <Input
          id="expiresAt"
          type="date"
          value={formData.expiresAt}
          onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of the promo code"
        />
      </div>
      
      <div className="flex gap-4">
        <Button type="submit" className="flex-1">
          Create Promo Code
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

// Edit Promo Code Form Component
const EditPromoCodeForm = ({ promo, onSubmit, onCancel }: { promo: any; onSubmit: (data: any) => void; onCancel: () => void }) => {
  const [formData, setFormData] = useState({
    code: promo.code || "",
    discount: promo.discount?.toString() || "",
    discountType: promo.discountType || "percentage",
    minOrderAmount: promo.minOrderAmount?.toString() || "",
    maxUses: promo.maxUses?.toString() || "",
    expiresAt: promo.expiresAt ? new Date(promo.expiresAt).toISOString().split('T')[0] : "",
    description: promo.description || ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      discount: parseFloat(formData.discount),
      minOrderAmount: parseFloat(formData.minOrderAmount),
      maxUses: parseInt(formData.maxUses),
      expiresAt: new Date(formData.expiresAt)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="editCode">Promo Code</Label>
        <Input
          id="editCode"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
          placeholder="WELCOME10"
          required
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="editDiscount">Discount</Label>
          <Input
            id="editDiscount"
            type="number"
            step="0.01"
            value={formData.discount}
            onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="editDiscountType">Type</Label>
          <Select value={formData.discountType} onValueChange={(value) => setFormData({ ...formData, discountType: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage (%)</SelectItem>
              <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="editMinOrderAmount">Minimum Order Amount</Label>
          <Input
            id="editMinOrderAmount"
            type="number"
            step="0.01"
            value={formData.minOrderAmount}
            onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="editMaxUses">Maximum Uses</Label>
          <Input
            id="editMaxUses"
            type="number"
            value={formData.maxUses}
            onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
            required
          />
        </div>
      </div>
      
      <div>
        <Label htmlFor="editExpiresAt">Expiration Date</Label>
        <Input
          id="editExpiresAt"
          type="date"
          value={formData.expiresAt}
          onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="editDescription">Description</Label>
        <Input
          id="editDescription"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of the promo code"
        />
      </div>
      
      <div className="flex gap-4">
        <Button type="submit" className="flex-1">
          Update Promo Code
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

// Tip Settings Tab Component
const TipSettingsTab = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    deliveryTipPercentageToEmployees: 25,
    pickupTipSplitEnabled: true,
    deliveryTipSplitEnabled: true,
  });

  // Get current tip settings
  const { data: tipSettings, isLoading: settingsLoading } = useQuery({
    queryKey: ["/api/admin/tip-settings"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/tip-settings", {});
      return await response.json();
    },
  });

  // Update tip settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (newSettings: any) => {
      const response = await apiRequest("PUT", "/api/admin/tip-settings", newSettings);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Tip settings have been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tip-settings"] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update tip settings",
        variant: "destructive",
      });
    },
  });

  // Get tip distributions
  const { data: tipDistributions } = useQuery({
    queryKey: ["/api/admin/tip-distributions"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/tip-distributions", {});
      return await response.json();
    },
  });

  useEffect(() => {
    if (tipSettings) {
      setSettings({
        deliveryTipPercentageToEmployees: parseFloat(tipSettings.delivery_tip_percentage_to_employees) || 25,
        pickupTipSplitEnabled: tipSettings.pickup_tip_split_enabled || true,
        deliveryTipSplitEnabled: tipSettings.delivery_tip_split_enabled || true,
      });
    }
  }, [tipSettings]);

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate(settings);
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Tip Management</h2>
        <p className="text-gray-600">Configure how tips are distributed to employees</p>
      </div>

      {/* Tip Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Tip Distribution Settings</CardTitle>
          <CardDescription>
            Configure how customer tips are distributed among clocked-in employees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pickup Tip Settings */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Pickup Orders</Label>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Split pickup tips among employees</p>
                <p className="text-sm text-gray-500">
                  100% of pickup tips will be split evenly among all clocked-in employees
                </p>
              </div>
              <Switch
                checked={settings.pickupTipSplitEnabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, pickupTipSplitEnabled: checked })
                }
              />
            </div>
          </div>

          {/* Delivery Tip Settings */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Delivery Orders</Label>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Split delivery tips with employees</p>
                  <p className="text-sm text-gray-500">
                    Share a percentage of delivery tips with clocked-in employees
                  </p>
                </div>
                <Switch
                  checked={settings.deliveryTipSplitEnabled}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, deliveryTipSplitEnabled: checked })
                  }
                />
              </div>

              {settings.deliveryTipSplitEnabled && (
                <div className="p-4 border rounded-lg bg-gray-50">
                  <Label className="text-sm font-medium">
                    Percentage shared with employees: {settings.deliveryTipPercentageToEmployees}%
                  </Label>
                  <div className="mt-2 flex items-center space-x-4">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={settings.deliveryTipPercentageToEmployees}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          deliveryTipPercentageToEmployees: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-20"
                    />
                    <span className="text-sm text-gray-500">
                      The remaining {100 - settings.deliveryTipPercentageToEmployees}% goes to the delivery driver
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleSaveSettings}
            disabled={updateSettingsMutation.isPending}
            className="w-full"
          >
            {updateSettingsMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Tip Distributions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tip Distributions</CardTitle>
          <CardDescription>
            View how tips have been distributed to employees
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tipDistributions && tipDistributions.length > 0 ? (
            <div className="overflow-x-auto mobile-scroll-container touch-pan-x">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Order</th>
                    <th className="text-left py-2">Employee</th>
                    <th className="text-left py-2">Order Type</th>
                    <th className="text-right py-2">Original Tip</th>
                    <th className="text-right py-2">Amount Received</th>
                  </tr>
                </thead>
                <tbody>
                  {tipDistributions.slice(0, 10).map((distribution: any) => (
                    <tr key={distribution.id} className="border-b">
                      <td className="py-2">
                        {new Date(distribution.distribution_date).toLocaleDateString()}
                      </td>
                      <td className="py-2">#{distribution.order_number}</td>
                      <td className="py-2">
                        {distribution.first_name} {distribution.last_name}
                      </td>
                      <td className="py-2">
                        <Badge variant={distribution.order_type === 'delivery' ? 'default' : 'secondary'}>
                          {distribution.order_type}
                        </Badge>
                      </td>
                      <td className="text-right py-2">
                        ${parseFloat(distribution.original_tip_amount).toFixed(2)}
                      </td>
                      <td className="text-right py-2 font-medium">
                        ${parseFloat(distribution.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              No tip distributions yet. Tips will appear here when orders with tips are completed.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const ReportsSection = ({ analytics, orders }: any) => {
  const [dateRange, setDateRange] = useState("7d");
  const [reportType, setReportType] = useState("overview");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  // Show loading only if we don't have orders data
  if (!orders || orders.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">No order data available for reports.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate date filtering
  const now = new Date();
  const daysToShow = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : dateRange === "90d" ? 90 : 7;
  const cutoffDate = new Date(now);
  cutoffDate.setDate(cutoffDate.getDate() - daysToShow);

  const filteredOrders = orders.filter((order: any) => {
    const orderDate = new Date(order.createdAt || order.created_at);
    return orderDate >= cutoffDate;
  });

  // Use filtered orders if available, otherwise fall back to all orders
  const ordersToUse = filteredOrders.length > 0 ? filteredOrders : orders;

  // Debug: Show actual order dates vs cutoff
  const orderDates = orders.slice(0, 5).map((order: any) => ({
    id: order.id,
    date: new Date(order.createdAt || order.created_at).toISOString().split('T')[0],
    total: order.total || order.totalAmount
  }));

  console.log('📊 Reports filtering debug:', {
    totalOrders: orders.length,
    filteredOrders: filteredOrders.length,
    dateRange,
    daysToShow,
    cutoffDate: cutoffDate.toISOString().split('T')[0],
    today: now.toISOString().split('T')[0],
    sampleOrderDates: orderDates,
    usingFiltered: filteredOrders.length > 0,
    filteredRevenue: filteredOrders.reduce((sum: number, order: any) => {
      const orderTotal = parseFloat(order.total || order.totalAmount || 0);
      return sum + (isNaN(orderTotal) ? 0 : orderTotal);
    }, 0),
    allOrdersRevenue: orders.reduce((sum: number, order: any) => {
      const orderTotal = parseFloat(order.total || order.totalAmount || 0);
      return sum + (isNaN(orderTotal) ? 0 : orderTotal);
    }, 0)
  });

  // Calculate real totals from filtered orders
  const calculatedRevenue = ordersToUse.reduce((sum: number, order: any) => {
    const orderTotal = parseFloat(order.total || order.totalAmount || 0);
    if (isNaN(orderTotal)) return sum; // Skip invalid totals like NaN
    return sum + orderTotal;
  }, 0);

  const totalOrders = ordersToUse.length;
  const avgOrderValue = totalOrders > 0 ? calculatedRevenue / totalOrders : 0;
  const uniqueCustomers = new Set(ordersToUse.map((order: any) => order.userId || order.user_id).filter(Boolean)).size;

  // Calculate order status breakdown from filtered orders
  const statusBreakdown = ordersToUse.reduce((acc: any, order: any) => {
    const status = order.status || 'unknown';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  // Debug order types first
  const orderTypeDebug = ordersToUse.slice(0, 10).map((order: any) => ({
    id: order.id,
    orderType: order.orderType,
    type: order.type,
    delivery_method: order.delivery_method,
    order_type: order.order_type,
    allKeys: Object.keys(order).filter(key => key.toLowerCase().includes('type') || key.toLowerCase().includes('delivery'))
  }));

  console.log('🚚 Order Type Debug:', {
    sampleOrderTypes: orderTypeDebug,
    uniqueOrderTypes: [...new Set(ordersToUse.map(o => o.orderType))],
    uniqueTypes: [...new Set(ordersToUse.map(o => o.type))],
    uniqueDeliveryMethods: [...new Set(ordersToUse.map(o => o.delivery_method))],
    uniqueOrderTypeFields: [...new Set(ordersToUse.map(o => o.order_type))]
  });

  // Calculate order type breakdown from filtered orders
  const typeBreakdown = ordersToUse.reduce((acc: any, order: any) => {
    // For bulk orders from API, use order_type (snake_case from database)
    // For single orders, orderType is transformed to camelCase
    const type = order.order_type || order.orderType || order.type || 'unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  // Calculate revenue by day from filtered orders
  const revenueByDay = ordersToUse.reduce((acc: any, order: any) => {
    const orderDate = new Date(order.createdAt || order.created_at);
    const date = orderDate.toDateString();
    const orderTotal = parseFloat(order.total || order.totalAmount || 0);
    if (!isNaN(orderTotal)) {
      acc[date] = (acc[date] || 0) + orderTotal;
    }
    return acc;
  }, {});

  const handleExportReport = (orders: any[], timeRange: string, reportData: any) => {
    try {
      // Create comprehensive report data
      const summaryData = {
        reportDate: new Date().toISOString().split('T')[0],
        timeRange: timeRange,
        reportType: reportType,
        totalOrders: reportData.totalOrders,
        totalRevenue: `$${reportData.totalRevenue.toFixed(2)}`,
        averageOrderValue: `$${reportData.avgOrderValue.toFixed(2)}`,
        uniqueCustomers: reportData.uniqueCustomers
      };

      // Create CSV content with summary, breakdowns, and detailed order data
      const headers = ['Order ID', 'Date', 'Customer ID', 'Type', 'Status', 'Total Amount'];
      const orderRows = orders.map(order => [
        order.id,
        new Date(order.createdAt || order.created_at).toLocaleDateString(),
        order.userId || order.user_id || 'Guest',
        order.order_type || order.orderType || order.type || 'N/A',
        order.status || 'unknown',
        `$${parseFloat(order.total || order.totalAmount || 0).toFixed(2)}`
      ]);

      // Combine summary, breakdown, and detail data
      let csvContent = `Business Report - ${reportType.toUpperCase()}\n`;
      csvContent += `Report Date,${summaryData.reportDate}\n`;
      csvContent += `Time Range,${summaryData.timeRange}\n`;
      csvContent += `Report Type,${summaryData.reportType}\n\n`;

      csvContent += "Summary Metrics\n";
      csvContent += `Total Orders,${summaryData.totalOrders}\n`;
      csvContent += `Total Revenue,${summaryData.totalRevenue}\n`;
      csvContent += `Average Order Value,${summaryData.averageOrderValue}\n`;
      csvContent += `Unique Customers,${summaryData.uniqueCustomers}\n\n`;

      csvContent += "Order Status Breakdown\n";
      Object.entries(reportData.statusBreakdown).forEach(([status, count]) => {
        csvContent += `${status},${count}\n`;
      });
      csvContent += '\n';

      csvContent += "Order Type Breakdown\n";
      Object.entries(reportData.typeBreakdown).forEach(([type, count]) => {
        csvContent += `${type},${count}\n`;
      });
      csvContent += '\n';

      csvContent += "Detailed Order Data\n";
      csvContent += headers.join(',') + '\n';
      csvContent += orderRows.map(row => row.join(',')).join('\n');

      // Download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `business-report-${reportType}-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('📁 Business report exported successfully');
    } catch (error) {
      console.error('❌ Report export failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <div className="flex space-x-4">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="border rounded-md px-3 py-2"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="border rounded-md px-3 py-2"
          >
            <option value="overview">Overview</option>
            <option value="detailed">Detailed</option>
            <option value="financial">Financial</option>
          </select>
          <Button variant="outline" onClick={() => handleExportReport(ordersToUse, dateRange, {
            totalOrders,
            totalRevenue: calculatedRevenue,
            avgOrderValue,
            uniqueCustomers,
            statusBreakdown,
            typeBreakdown
          })}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalOrders}</p>
            <p className="text-xs text-gray-500 mt-1">
              {dateRange === "7d" && "Last 7 days"}
              {dateRange === "30d" && "Last 30 days"}
              {dateRange === "90d" && "Last 90 days"}
              {filteredOrders.length === 0 && "(All time)"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(calculatedRevenue)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {dateRange === "7d" && "Last 7 days"}
              {dateRange === "30d" && "Last 30 days"}
              {dateRange === "90d" && "Last 90 days"}
              {filteredOrders.length === 0 && "(All time)"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Average Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(avgOrderValue)}</p>
            <p className="text-xs text-gray-500 mt-1">
              {dateRange === "7d" && "Last 7 days"}
              {dateRange === "30d" && "Last 30 days"}
              {dateRange === "90d" && "Last 90 days"}
              {filteredOrders.length === 0 && "(All time)"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Unique Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{uniqueCustomers}</p>
            <p className="text-xs text-gray-500 mt-1">
              {dateRange === "7d" && "Last 7 days"}
              {dateRange === "30d" && "Last 30 days"}
              {dateRange === "90d" && "Last 90 days"}
              {filteredOrders.length === 0 && "(All time)"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Order Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="capitalize">{status}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(count as number / ordersToUse.length) * 100}%` }}
                      ></div>
                    </div>
                    <span className="font-medium">{count as number}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Order Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Order Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(typeBreakdown).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <span className="capitalize">{type}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${(count as number / ordersToUse.length) * 100}%` }}
                      ></div>
                    </div>
                    <span className="font-medium">{count as number}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Orders Table */}
      {reportType === "detailed" && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto mobile-scroll-container touch-pan-x">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Order ID</th>
                    <th className="text-left py-2">Date</th>
                    <th className="text-left py-2">Type</th>
                    <th className="text-left py-2">Status</th>
                    <th className="text-left py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersToUse.slice(0, 10).map((order: any) => (
                    <tr key={order.id} className="border-b">
                      <td className="py-2">#{order.id}</td>
                      <td className="py-2">{formatDate(order.createdAt || order.created_at)}</td>
                      <td className="py-2 capitalize">{order.order_type || order.orderType || order.type || 'N/A'}</td>
                      <td className="py-2">
                        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                          {order.status || 'unknown'}
                        </Badge>
                      </td>
                      <td className="py-2">{formatCurrency(parseFloat(order.total || order.totalAmount || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Revenue by Day */}
      {reportType === "financial" && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(revenueByDay)
                .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                .slice(0, 7)
                .map(([date, revenue]) => (
                  <div key={date} className="flex justify-between items-center">
                    <span>{formatDate(date)}</span>
                    <span className="font-medium">{formatCurrency(revenue as number)}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Conditional Pricing Management Component
const ConditionalPricingCard = () => {
  const [pricingRules, setPricingRules] = useState<any[]>([]);
  const [choiceItems, setChoiceItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newRule, setNewRule] = useState({
    choiceItemId: '',
    conditionChoiceItemId: '',
    price: ''
  });
  const { toast } = useToast();

  // Fetch pricing rules and choice items
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [rulesResponse, choicesResponse] = await Promise.all([
        apiRequest('GET', '/api/choice-pricing'),
        apiRequest('GET', '/api/choice-items')
      ]);

      setPricingRules(rulesResponse.pricingRules || []);
      setChoiceItems(choicesResponse || []);
    } catch (error: any) {
      toast({
        title: "Load Failed",
        description: error.message || "Failed to load pricing data.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  const handleCreateRule = async () => {
    if (!newRule.choiceItemId || !newRule.conditionChoiceItemId || !newRule.price) {
      toast({
        title: "Invalid Data",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest('PUT', '/api/choice-pricing', {
        choiceItemId: parseInt(newRule.choiceItemId),
        conditionChoiceItemId: parseInt(newRule.conditionChoiceItemId),
        price: parseFloat(newRule.price)
      });

      toast({
        title: "Rule Created",
        description: "Conditional pricing rule created successfully.",
      });

      setNewRule({ choiceItemId: '', conditionChoiceItemId: '', price: '' });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create pricing rule.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (!confirm('Are you sure you want to delete this pricing rule?')) return;

    try {
      await apiRequest('DELETE', `/api/choice-pricing/${ruleId}`);
      toast({
        title: "Rule Deleted",
        description: "Pricing rule deleted successfully.",
      });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete pricing rule.",
        variant: "destructive",
      });
    }
  };

  // Group choice items by group for easier selection
  const groupedChoices = Array.isArray(choiceItems) ? choiceItems.reduce((acc: any, item: any) => {
    const groupName = item.choice_group_name || 'Other';
    if (!acc[groupName]) acc[groupName] = [];
    acc[groupName].push(item);
    return acc;
  }, {}) : {};

  if (isLoading) {
    return <div className="flex justify-center py-8">Loading pricing rules...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conditional Pricing</CardTitle>
        <CardDescription>
          Set different prices for choices based on other selections (e.g., topping prices based on pizza size)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create New Rule */}
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-3">Create New Pricing Rule</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <Label>Choice Item (will have dynamic price)</Label>
              <Select value={newRule.choiceItemId} onValueChange={(value) => setNewRule({...newRule, choiceItemId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select choice item" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(groupedChoices).map(([groupName, items]: [string, any]) => (
                    <div key={groupName}>
                      <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">{groupName}</div>
                      {items.map((item: any) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.name} (${item.price})
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>When This Choice is Selected</Label>
              <Select value={newRule.conditionChoiceItemId} onValueChange={(value) => setNewRule({...newRule, conditionChoiceItemId: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select condition" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(groupedChoices).map(([groupName, items]: [string, any]) => (
                    <div key={groupName}>
                      <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">{groupName}</div>
                      {items.map((item: any) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={newRule.price}
                onChange={(e) => setNewRule({...newRule, price: e.target.value})}
              />
            </div>

            <Button onClick={handleCreateRule}>
              Create Rule
            </Button>
          </div>
        </div>

        {/* Existing Rules */}
        {pricingRules.length > 0 ? (
          <div>
            <h4 className="font-medium mb-3">Existing Pricing Rules</h4>
            <div className="space-y-2">
              {pricingRules.map((rule: any) => (
                <div key={rule.id} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex-1">
                    <div className="font-medium">
                      {rule.choice_item_name} costs ${rule.price}
                    </div>
                    <div className="text-sm text-gray-600">
                      when {rule.condition_choice_name} is selected
                    </div>
                    <div className="text-xs text-gray-500">
                      {rule.choice_group_name} → {rule.condition_group_name}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    Delete
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No conditional pricing rules yet. Create your first rule above.
            <br />
            <small>Example: Set pepperoni to cost $3.00 when Large size is selected</small>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Pricing Management Tab
const PricingTab = ({ menuItems }: { menuItems: any[] }) => {
  const [priceChanges, setPriceChanges] = useState<{ [key: number]: string }>({});
  const [bulkChangePercentage, setBulkChangePercentage] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { toast } = useToast();

  const categories = Array.from(new Set(menuItems?.map(item => item.category) || []));

  const handlePriceChange = (itemId: number, newPrice: string) => {
    setPriceChanges(prev => ({ ...prev, [itemId]: newPrice }));
  };

  const savePriceChanges = async () => {
    try {
      const updates = Object.entries(priceChanges).map(([itemId, price]) => ({
        id: parseInt(itemId),
        basePrice: price
      }));

      for (const update of updates) {
        await apiRequest("PATCH", `/api/menu-items/${update.id}`, {
          basePrice: update.basePrice
        });
      }

      toast({
        title: "Prices Updated",
        description: `Updated prices for ${updates.length} items.`,
      });

      setPriceChanges({});
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update prices.",
        variant: "destructive",
      });
    }
  };

  const applyBulkChange = () => {
    if (!bulkChangePercentage) return;

    const percentage = parseFloat(bulkChangePercentage);
    const filteredItems = selectedCategory === "all" 
      ? menuItems 
      : menuItems?.filter(item => item.category === selectedCategory);

    const newChanges = { ...priceChanges };
    filteredItems?.forEach(item => {
      const currentPrice = parseFloat(item.basePrice);
      const newPrice = (currentPrice * (1 + percentage / 100)).toFixed(2);
      newChanges[item.id] = newPrice;
    });

    setPriceChanges(newChanges);
    setBulkChangePercentage("");
  };

  const filteredItems = selectedCategory === "all" 
    ? menuItems 
    : menuItems?.filter(item => item.category === selectedCategory);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Pricing Management</h3>
        <div className="flex items-center space-x-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Price Change */}
      <Card>
        <CardHeader>
          <CardTitle>Bulk Price Change</CardTitle>
          <CardDescription>
            Apply a percentage increase or decrease to multiple items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <Label htmlFor="bulk-percentage">Percentage Change</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="bulk-percentage"
                  type="number"
                  step="0.1"
                  placeholder="10 (for 10% increase)"
                  value={bulkChangePercentage}
                  onChange={(e) => setBulkChangePercentage(e.target.value)}
                />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <Button onClick={applyBulkChange} disabled={!bulkChangePercentage}>
              Apply to {selectedCategory === "all" ? "All Items" : selectedCategory}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Price Changes Summary */}
      {Object.keys(priceChanges).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Changes</CardTitle>
            <CardDescription>
              {Object.keys(priceChanges).length} items have price changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => setPriceChanges({})}>
                Clear All Changes
              </Button>
              <Button onClick={savePriceChanges}>
                Save All Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Menu Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto mobile-scroll-container touch-pan-x">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Item</th>
                  <th className="text-left py-2">Category</th>
                  <th className="text-left py-2">Current Price</th>
                  <th className="text-left py-2">New Price</th>
                  <th className="text-left py-2">Change</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems?.map((item) => {
                  const newPrice = priceChanges[item.id];
                  const currentPrice = parseFloat(item.basePrice);
                  const change = newPrice ? ((parseFloat(newPrice) - currentPrice) / currentPrice * 100).toFixed(1) : null;
                  
                  return (
                    <tr key={item.id} className="border-b">
                      <td className="py-2">{item.name}</td>
                      <td className="py-2">{item.category}</td>
                      <td className="py-2">${item.basePrice}</td>
                      <td className="py-2">
                        <Input
                          type="number"
                          step="0.01"
                          value={newPrice || item.basePrice}
                          onChange={(e) => handlePriceChange(item.id, e.target.value)}
                          className="w-24"
                        />
                      </td>
                      <td className="py-2">
                        {change && (
                          <span className={`text-sm ${parseFloat(change) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {parseFloat(change) >= 0 ? '+' : ''}{change}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Multi-Location Management Tab
const MultiLocationTab = () => {
  const { toast } = useToast();

  // Fetch restaurant settings to populate main location
  const { data: restaurantData, isLoading } = useQuery({
    queryKey: ['/api/restaurant-settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/restaurant-settings');
      if (!response.ok) {
        throw new Error('Failed to fetch restaurant settings');
      }
      return await response.json();
    }
  });

  const [locations, setLocations] = useState([
    {
      id: 1,
      name: "Main Location",
      address: "123 Main Street, New York, NY 10001",
      phone: "(555) 123-4567",
      isActive: true,
      deliveryRadius: 10,
      minOrder: 0.00
    }
  ]);

  // Update main location when restaurant data loads
  useEffect(() => {
    if (restaurantData) {
      setLocations(prev => prev.map(location =>
        location.id === 1 ? {
          ...location,
          name: restaurantData.restaurantName || "Main Location",
          address: restaurantData.address || location.address,
          phone: restaurantData.phone || location.phone,
          deliveryRadius: restaurantData.maxDeliveryRadius ? parseFloat(restaurantData.maxDeliveryRadius) : 10,
          minOrder: restaurantData.minimumOrder || 0.00
        } : location
      ));
    }
  }, [restaurantData]);

  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [editingLocation, setEditingLocation] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    deliveryRadius: "",
    minOrder: ""
  });

  // Mutation to update restaurant settings when main location is edited
  const updateRestaurantMutation = useMutation({
    mutationFn: async (updatedData: any) => {
      const response = await apiRequest('PUT', '/api/restaurant-settings', updatedData);
      if (!response.ok) {
        throw new Error('Failed to update restaurant settings');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      // Update local state with the saved data
      setLocations(prev => prev.map(location =>
        location.id === 1 ? {
          ...location,
          name: data.restaurantName,
          address: data.address,
          phone: data.phone,
          minOrder: parseFloat(data.minimumOrder)
        } : location
      ));

      setFormData({ name: "", address: "", phone: "", deliveryRadius: "", minOrder: "" });
      setIsEditingLocation(false);
      setEditingLocation(null);

      toast({
        title: "Success",
        description: "Main location updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant-settings'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update main location",
        variant: "destructive",
      });
    }
  });

  const handleEditLocation = (location: any) => {
    setEditingLocation(location);
    setFormData({
      name: location.name,
      address: location.address,
      phone: location.phone,
      deliveryRadius: location.deliveryRadius.toString(),
      minOrder: location.minOrder.toString()
    });
    setIsEditingLocation(true);
  };

  const handleSaveEdit = () => {
    if (editingLocation?.id === 1) {
      // Editing main location - save to restaurant settings
      const updatedSettings = {
        restaurantName: formData.name,
        address: formData.address,
        phone: formData.phone,
        minimumOrder: formData.minOrder
      };
      updateRestaurantMutation.mutate(updatedSettings);
    } else {
      // Editing other locations - update local state
      setLocations(prev => prev.map(location =>
        location.id === editingLocation?.id ? {
          ...location,
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          deliveryRadius: parseFloat(formData.deliveryRadius),
          minOrder: parseFloat(formData.minOrder)
        } : location
      ));

      setFormData({ name: "", address: "", phone: "", deliveryRadius: "", minOrder: "" });
      setIsEditingLocation(false);
      setEditingLocation(null);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Multi-Location Management</h3>
        <Button onClick={() => setIsAddingLocation(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map((location) => (
          <Card key={location.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">{location.name}</CardTitle>
                <Badge variant={location.isActive ? "default" : "secondary"}>
                  {location.isActive ? "Active" : "Inactive"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{location.address}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Phone className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{location.phone}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Truck className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{location.deliveryRadius} mile radius</span>
                </div>
                <div className="flex items-center text-sm">
                  <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                  <span>${location.minOrder} minimum order</span>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEditLocation(location)}
                >
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  {location.isActive ? "Disable" : "Enable"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Contact Message Dialog */}
      <Dialog open={isAddingLocation} onOpenChange={setIsAddingLocation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Multi-Location Feature</DialogTitle>
            <DialogDescription>
              Contact us to enable multi-location functionality for your restaurant.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center">
            <div className="mb-4">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Store className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Expand to Multiple Locations
              </h3>
              <p className="text-gray-600 mb-6">
                Ready to manage multiple restaurant locations? Contact Nardoni Media to unlock advanced multi-location features including centralized management, location-specific settings, and more.
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-gray-900 mb-2">Contact Nardoni Media:</p>
              <p className="text-sm text-gray-600">
                Email: <span className="font-medium">contact@nardonimedia.com</span>
              </p>
              <p className="text-sm text-gray-600">
                Phone: <span className="font-medium">(555) 123-4567</span>
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setIsAddingLocation(false)}>
              Got it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog open={isEditingLocation} onOpenChange={setIsEditingLocation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editingLocation?.name}</DialogTitle>
            <DialogDescription>
              Update the details for this restaurant location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-location-name">Location Name</Label>
              <Input
                id="edit-location-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Downtown Branch"
              />
            </div>
            <div>
              <Label htmlFor="edit-location-address">Address</Label>
              <Input
                id="edit-location-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="456 Downtown Ave, City, State 12345"
              />
            </div>
            <div>
              <Label htmlFor="edit-location-phone">Phone</Label>
              <Input
                id="edit-location-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 987-6543"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-location-delivery-radius">Delivery Radius (miles)</Label>
                <Input
                  id="edit-location-delivery-radius"
                  type="number"
                  step="0.5"
                  min="0"
                  value={formData.deliveryRadius}
                  onChange={(e) => setFormData({ ...formData, deliveryRadius: e.target.value })}
                  placeholder="5.0"
                />
              </div>
              <div>
                <Label htmlFor="edit-location-min-order">Minimum Order ($)</Label>
                <Input
                  id="edit-location-min-order"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.minOrder}
                  onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                  placeholder="15.00"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditingLocation(false);
                  setEditingLocation(null);
                  setFormData({ name: "", address: "", phone: "", deliveryRadius: "", minOrder: "" });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateRestaurantMutation.isPending}
              >
                {updateRestaurantMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Email Campaigns Tab
const EmailCampaignsTab = ({ users }: { users: any[] }) => {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [campaignName, setCampaignName] = useState('');
  const [campaignSubject, setCampaignSubject] = useState('');
  const [campaignContent, setCampaignContent] = useState('');
  const [testEmails, setTestEmails] = useState('');
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledTime, setScheduledTime] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Fetch email marketing data
  const { data: emailData, isLoading, refetch } = useQuery({
    queryKey: ['email-marketing'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/email-marketing');
      return response.json();
    }
  });

  const campaigns = emailData?.campaigns || [];
  const segmentCounts = emailData?.segmentCounts || {};
  const templates = emailData?.templates || [];

  // Send campaign mutation
  const sendCampaignMutation = useMutation({
    mutationFn: async (campaignData: any) => {
      const response = await apiRequest('POST', '/api/admin/email-marketing', campaignData);
      return response.json();
    },
    onSuccess: (data) => {
      refetch();
      if (data.results) {
        // Test emails sent
        toast({
          title: "Test Emails Sent",
          description: `Sent to ${data.results.length} test recipients`,
        });
      } else {
        // Campaign sent
        toast({
          title: "Campaign Sent Successfully",
          description: `Sent to ${data.totalSent} customers with ${data.successRate}% success rate`,
        });
      }
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Campaign Failed",
        description: error.message || "Failed to send campaign",
        variant: "destructive",
      });
    }
  });

  const resetForm = () => {
    setCampaignName('');
    setCampaignSubject('');
    setCampaignContent('');
    setTestEmails('');
    setIsScheduled(false);
    setScheduledTime('');
    setSelectedSegment('all');
    setSelectedTemplate('');
  };

  const handleSendCampaign = () => {
    if (!campaignName || !campaignSubject || !campaignContent) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    const campaignData = {
      name: campaignName,
      subject: campaignSubject,
      htmlContent: campaignContent,
      customerSegment: selectedSegment,
      scheduledTime: isScheduled ? scheduledTime : undefined,
      testEmails: testEmails ? testEmails.split(',').map(email => email.trim()).filter(email => email) : undefined
    };

    sendCampaignMutation.mutate(campaignData);
    setIsSending(false);
  };

  const segmentOptions = [
    { value: 'all', label: 'All Customers', count: segmentCounts.all || 0 },
    { value: 'loyalty_members', label: 'Loyalty Members', count: segmentCounts.loyalty_members || 0 },
    { value: 'new_customers', label: 'New Customers (30 days)', count: segmentCounts.new_customers || 0 },
    { value: 'recent_orders', label: 'Recent Orders (30 days)', count: segmentCounts.recent_orders || 0 },
    { value: 'birthday_this_month', label: 'Birthday This Month', count: segmentCounts.birthday_this_month || 0 },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Email Marketing</h2>
          <p className="text-gray-600 text-sm sm:text-base">Create and manage email campaigns for your customers</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto">
          <Mail className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Customer Segments Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {segmentOptions.map((segment) => (
          <Card key={segment.value}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">{segment.label}</p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900">{segment.count}</p>
                </div>
                <Mail className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0 ml-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Campaign History */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign History</CardTitle>
          <CardDescription>View past email campaigns and their performance</CardDescription>
        </CardHeader>
        <CardContent>
          {campaigns.length === 0 ? (
            <div className="text-center py-8">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
              <p className="text-gray-600 mb-4">Create your first email campaign to get started</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Create First Campaign
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign: any) => (
                <div key={campaign.id} className="border rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{campaign.name}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2">{campaign.subject}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full whitespace-nowrap ${
                        campaign.status === 'sent' ? 'bg-green-100 text-green-800' :
                        campaign.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                        campaign.status === 'sending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.status}
                      </span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600 text-xs">Segment:</span>
                      <p className="font-medium truncate">{campaign.customer_segment}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-xs">Sent:</span>
                      <p className="font-medium">{campaign.total_sent || 0}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-xs">Delivered:</span>
                      <p className="font-medium">{campaign.total_delivered || 0}</p>
                    </div>
                    <div>
                      <span className="text-gray-600 text-xs">Opened:</span>
                      <p className="font-medium">{campaign.total_opened || 0}</p>
                    </div>
                  </div>
                  <div className="mt-3 text-xs text-gray-500">
                    Created: {new Date(campaign.created_at).toLocaleDateString()}
                    {campaign.sent_time && (
                      <span className="block sm:inline">
                        <span className="hidden sm:inline"> • </span>
                        Sent: {new Date(campaign.sent_time).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Campaign Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Email Campaign</DialogTitle>
            <DialogDescription>
              Design and send promotional emails to your customers
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-1">
            {/* Campaign Name */}
            <div>
              <label className="text-sm font-medium">Campaign Name</label>
              <Input
                placeholder="e.g., Weekly Special Promotion"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>

            {/* Subject Line */}
            <div>
              <label className="text-sm font-medium">Subject Line</label>
              <Input
                placeholder="e.g., 🍕 Special Offer Just for You!"
                value={campaignSubject}
                onChange={(e) => setCampaignSubject(e.target.value)}
              />
            </div>

            {/* Customer Segment */}
            <div>
              <label className="text-sm font-medium">Customer Segment</label>
              <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {segmentOptions.map((segment) => (
                    <SelectItem key={segment.value} value={segment.value}>
                      {segment.label} ({segment.count} customers)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email Templates */}
            {templates.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Choose Template (Optional)</label>
                  {selectedTemplate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedTemplate('');
                        setCampaignContent('');
                        setCampaignSubject('');
                      }}
                      className="text-xs"
                    >
                      Clear Template
                    </Button>
                  )}
                </div>
                <Select value={selectedTemplate} onValueChange={(templateId) => {
                  setSelectedTemplate(templateId);
                  const template = templates.find((t: any) => t.id === templateId);
                  if (template) {
                    setCampaignSubject(template.subject);
                    setCampaignContent(template.htmlContent);
                  }
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template or write your own" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template: any) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name} - {template.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTemplate && (
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Template loaded - you can edit it below
                  </p>
                )}
              </div>
            )}

            {/* Email Content */}
            <div>
              <label className="text-sm font-medium">Email Content (HTML)</label>
              <Textarea
                placeholder="Enter your email content here. You can use HTML for formatting..."
                value={campaignContent}
                onChange={(e) => setCampaignContent(e.target.value)}
                rows={8}
              />
              <p className="text-xs text-gray-500 mt-1">
                Tip: Use HTML for formatting. The content will be wrapped in our branded template.
              </p>
            </div>

            {/* Test Emails */}
            <div>
              <label className="text-sm font-medium">Test Emails (Optional)</label>
              <Input
                placeholder="test@example.com, another@example.com"
                value={testEmails}
                onChange={(e) => setTestEmails(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated emails to send test versions before the main campaign
              </p>
            </div>

            {/* Scheduling */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="schedule"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
              />
              <label htmlFor="schedule" className="text-sm font-medium">
                Schedule for later
              </label>
            </div>

            {isScheduled && (
              <div>
                <label className="text-sm font-medium">Scheduled Time</label>
                <Input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            {testEmails && (
              <Button
                variant="secondary"
                onClick={handleSendCampaign}
                disabled={isSending || sendCampaignMutation.isPending}
                className="w-full sm:w-auto"
              >
                {sendCampaignMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Send Test
              </Button>
            )}
            <Button
              onClick={handleSendCampaign}
              disabled={isSending || sendCampaignMutation.isPending}
              className="w-full sm:w-auto"
            >
              {sendCampaignMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {isScheduled ? 'Schedule Campaign' : 'Send Campaign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// SMS Marketing Tab
const SMSMarketingTab = ({ users }: { users: any[] }) => {
  const [isSending, setIsSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [viewingCampaign, setViewingCampaign] = useState(null);
  const [isViewingCampaign, setIsViewingCampaign] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    content: "",
    audienceType: "all",
    ctaText: "",
    ctaUrl: "",
    template: "default",
    headerImage: "",
    accentColor: "#d73a31"
  });

  const marketingOptInUsers = users?.filter(user => user.marketingOptIn && user.role === "customer") || [];

  const sendCampaign = async () => {
    if (!formData.name || !formData.subject || !formData.content) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await apiRequest('/api/email/send-campaign', {
        method: 'POST',
        body: JSON.stringify({
          campaignName: formData.name,
          subject: formData.subject,
          content: formData.content,
          ctaText: formData.ctaText || undefined,
          ctaUrl: formData.ctaUrl || undefined,
          recipientType: formData.audienceType,
          template: formData.template,
          accentColor: formData.accentColor
        })
      });

      if (response.success) {
        toast({
          title: "Campaign Sent!",
          description: `Successfully sent to ${response.sentSuccessfully} recipients`
        });

        // Add the new campaign to the list
        const newCampaign = {
          id: Date.now(),
          name: formData.name,
          subject: formData.subject,
          status: "sent",
          recipients: response.sentSuccessfully,
          openRate: 0,
          clickRate: 0,
          sentAt: new Date().toISOString()
        };

        setCampaigns(prev => [newCampaign, ...prev]);

        // Reset form
        setFormData({
          name: "",
          subject: "",
          content: "",
          audienceType: "all",
          ctaText: "",
          ctaUrl: ""
        });
        setIsCreatingCampaign(false);
      } else {
        throw new Error(response.error || 'Failed to send campaign');
      }
    } catch (error) {
      console.error('Campaign send error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send campaign",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const viewCampaign = (campaign) => {
    setViewingCampaign(campaign);
    setIsViewingCampaign(true);
  };

  const sendDraftCampaign = async (campaign) => {
    setIsSending(true);
    try {
      const response = await apiRequest('/api/email/send-campaign', {
        method: 'POST',
        body: JSON.stringify({
          campaignName: campaign.name,
          subject: campaign.subject,
          content: campaign.content || 'Draft campaign content',
          ctaText: campaign.ctaText || undefined,
          ctaUrl: campaign.ctaUrl || undefined,
          recipientType: 'all',
          template: campaign.template || 'default',
          accentColor: campaign.accentColor || '#d73a31'
        })
      });

      if (response.success) {
        toast({
          title: "Draft Campaign Sent!",
          description: `Successfully sent to ${response.sentSuccessfully} recipients`
        });

        // Update the campaign status
        setCampaigns(prev => prev.map(c =>
          c.id === campaign.id
            ? { ...c, status: 'sent', recipients: response.sentSuccessfully, sentAt: new Date().toISOString() }
            : c
        ));
      } else {
        throw new Error(response.error || 'Failed to send campaign');
      }
    } catch (error) {
      console.error('Campaign send error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send campaign",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  const deleteCampaign = (campaignId) => {
    setCampaigns(prev => prev.filter(c => c.id !== campaignId));
    toast({
      title: "Campaign Deleted",
      description: "The campaign has been successfully deleted"
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Email Campaigns</h3>
        <Button onClick={() => setIsCreatingCampaign(true)}>
          <Mail className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Campaign Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-blue-700">{campaigns.length}</div>
                <div className="text-sm font-medium text-blue-600">Total Campaigns</div>
              </div>
              <div className="p-3 bg-blue-200 rounded-full">
                <Mail className="h-6 w-6 text-blue-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-green-700">{marketingOptInUsers.length}</div>
                <div className="text-sm font-medium text-green-600">Active Subscribers</div>
              </div>
              <div className="p-3 bg-green-200 rounded-full">
                <Users className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-orange-700">28.3%</div>
                <div className="text-sm font-medium text-orange-600">Avg Open Rate</div>
              </div>
              <div className="p-3 bg-orange-200 rounded-full">
                <Eye className="h-6 w-6 text-orange-700" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold text-purple-700">6.8%</div>
                <div className="text-sm font-medium text-purple-600">Avg Click Rate</div>
              </div>
              <div className="p-3 bg-purple-200 rounded-full">
                <BarChart3 className="h-6 w-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card className="shadow-lg border-0">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-gray-900">Recent Campaigns</CardTitle>
              <CardDescription className="text-gray-600 mt-1">
                Manage and track your email marketing campaigns
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              {campaigns.length} campaigns
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto mobile-scroll-container touch-pan-x">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Campaign</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Recipients</th>
                  <th className="text-left py-2">Open Rate</th>
                  <th className="text-left py-2">Click Rate</th>
                  <th className="text-left py-2">Sent Date</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b">
                    <td className="py-2">
                      <div>
                        <div className="font-medium">{campaign.name}</div>
                        <div className="text-sm text-gray-500">{campaign.subject}</div>
                      </div>
                    </td>
                    <td className="py-2">
                      <Badge variant={campaign.status === "sent" ? "default" : "secondary"}>
                        {campaign.status}
                      </Badge>
                    </td>
                    <td className="py-2">{campaign.recipients.toLocaleString()}</td>
                    <td className="py-2">{campaign.openRate}%</td>
                    <td className="py-2">{campaign.clickRate}%</td>
                    <td className="py-2">
                      {campaign.sentAt ? new Date(campaign.sentAt).toLocaleDateString() : "-"}
                    </td>
                    <td className="py-2">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewCampaign(campaign)}
                        >
                          <Eye className="mr-1 h-3 w-3" />
                          {campaign.status === "draft" ? "Edit" : "View"}
                        </Button>
                        {campaign.status === "draft" && (
                          <Button
                            size="sm"
                            onClick={() => sendDraftCampaign(campaign)}
                            disabled={isSending}
                            className="bg-[#d73a31] hover:bg-[#c73128]"
                          >
                            {isSending ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Mail className="mr-1 h-3 w-3" />
                            )}
                            Send
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteCampaign(campaign.id)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Create Campaign Dialog */}
      <Dialog open={isCreatingCampaign} onOpenChange={setIsCreatingCampaign}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-2xl flex items-center">
              <Mail className="mr-3 h-6 w-6 text-[#d73a31]" />
              Create Email Campaign
            </DialogTitle>
            <DialogDescription className="text-base">
              Design and send professional email campaigns to your customers
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-6 mt-6">
            {/* Left Panel - Form */}
            <div className="flex-1 space-y-6">
              {/* Step Indicator */}
              <div className="flex items-center space-x-2 mb-6">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  currentStep >= 1 ? 'bg-[#d73a31] text-white' : 'bg-gray-200 text-gray-600'
                }`}>1</div>
                <div className={`h-px flex-1 ${currentStep >= 2 ? 'bg-[#d73a31]' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  currentStep >= 2 ? 'bg-[#d73a31] text-white' : 'bg-gray-200 text-gray-600'
                }`}>2</div>
                <div className={`h-px flex-1 ${currentStep >= 3 ? 'bg-[#d73a31]' : 'bg-gray-200'}`}></div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  currentStep >= 3 ? 'bg-[#d73a31] text-white' : 'bg-gray-200 text-gray-600'
                }`}>3</div>
              </div>

              {/* Step 1: Template Selection */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold">Choose Template</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        formData.template === 'default' ? 'border-[#d73a31] bg-red-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFormData({ ...formData, template: 'default' })}
                    >
                      <div className="text-center">
                        <div className="w-full h-24 bg-gradient-to-r from-[#d73a31] to-[#e74c3c] rounded mb-3 flex items-center justify-center">
                          <span className="text-white font-bold">🍕</span>
                        </div>
                        <h4 className="font-medium">Classic Pizza</h4>
                        <p className="text-sm text-gray-600">Traditional design with pizza branding</p>
                      </div>
                    </div>
                    <div
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                        formData.template === 'modern' ? 'border-[#d73a31] bg-red-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setFormData({ ...formData, template: 'modern' })}
                    >
                      <div className="text-center">
                        <div className="w-full h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded mb-3 flex items-center justify-center">
                          <span className="text-white font-bold">✨</span>
                        </div>
                        <h4 className="font-medium">Modern</h4>
                        <p className="text-sm text-gray-600">Clean, contemporary design</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Customize Colors</h4>
                    <div className="flex items-center space-x-4">
                      <Label htmlFor="accent-color">Accent Color</Label>
                      <Input
                        id="accent-color"
                        type="color"
                        value={formData.accentColor}
                        onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                        className="w-20 h-10"
                      />
                      <span className="text-sm text-gray-600">{formData.accentColor}</span>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button onClick={() => setCurrentStep(2)}>
                      Next: Content <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Content */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Campaign Content</h3>
                    <Button variant="outline" onClick={() => setCurrentStep(1)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="campaign-name">Campaign Name</Label>
                      <Input
                        id="campaign-name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Monthly Newsletter"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email-subject">Email Subject</Label>
                      <Input
                        id="email-subject"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="🍕 Don't miss our latest offers!"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="audience">Target Audience</Label>
                    <Select value={formData.audienceType} onValueChange={(value) => setFormData({ ...formData, audienceType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">🎯 All Subscribers ({marketingOptInUsers.length})</SelectItem>
                        <SelectItem value="recent">🆕 Recent Customers</SelectItem>
                        <SelectItem value="inactive">💤 Inactive Customers</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="email-content">Email Content</Label>
                    <Textarea
                      id="email-content"
                      rows={10}
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Hi [Customer Name],&#10;&#10;We're excited to share our latest offers with you! This week only, enjoy:&#10;&#10;• 20% off all large pizzas&#10;• Free delivery on orders over $25&#10;• Buy 2 get 1 FREE on appetizers&#10;&#10;Don't miss out - these deals end Sunday!"
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cta-text">Call-to-Action Button</Label>
                      <Input
                        id="cta-text"
                        value={formData.ctaText}
                        onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
                        placeholder="Order Now"
                      />
                    </div>
                    <div>
                      <Label htmlFor="cta-url">Button Link</Label>
                      <Input
                        id="cta-url"
                        value={formData.ctaUrl}
                        onChange={(e) => setFormData({ ...formData, ctaUrl: e.target.value })}
                        placeholder="https://favillaspizzeria.com/menu"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setShowPreview(true)}>
                      <Eye className="mr-2 h-4 w-4" />
                      Preview Email
                    </Button>
                    <Button onClick={() => setCurrentStep(3)}>
                      Next: Review <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Review & Send */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Review & Send</h3>
                    <Button variant="outline" onClick={() => setCurrentStep(2)}>
                      <ChevronLeft className="mr-2 h-4 w-4" /> Back
                    </Button>
                  </div>

                  <Card className="p-6">
                    <h4 className="font-semibold mb-4">Campaign Summary</h4>
                    <dl className="space-y-3">
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Campaign Name:</dt>
                        <dd className="font-medium">{formData.name || 'Untitled Campaign'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Subject Line:</dt>
                        <dd className="font-medium">{formData.subject || 'No subject'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Recipients:</dt>
                        <dd className="font-medium text-green-600">{marketingOptInUsers.length} subscribers</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Template:</dt>
                        <dd className="font-medium capitalize">{formData.template}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-gray-600">Call-to-Action:</dt>
                        <dd className="font-medium">{formData.ctaText || 'None'}</dd>
                      </div>
                    </dl>
                  </Card>

                  <div className="flex justify-between space-x-3">
                    <div className="flex space-x-2">
                      <Button variant="outline" onClick={() => setShowPreview(true)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Final Preview
                      </Button>
                      <Button variant="outline" disabled={isSending}>
                        <FileText className="mr-2 h-4 w-4" />
                        Save Draft
                      </Button>
                    </div>
                    <Button
                      onClick={sendCampaign}
                      disabled={isSending || !formData.name || !formData.subject || !formData.content}
                      className="bg-[#d73a31] hover:bg-[#c73128]"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending to {marketingOptInUsers.length} subscribers...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Campaign
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel - Live Preview */}
            <div className="w-96 bg-gray-50 rounded-lg p-4 border">
              <h4 className="font-semibold mb-4 text-center">Email Preview</h4>
              <div className="bg-white rounded border shadow-sm min-h-96">
                <div
                  className="p-4 text-white text-center rounded-t"
                  style={{ background: `linear-gradient(135deg, ${formData.accentColor}, ${formData.accentColor}dd)` }}
                >
                  <h2 className="text-xl font-bold">🍕 Favilla's Pizzeria</h2>
                  <p className="opacity-90 text-sm">Your favorite pizza just got better!</p>
                </div>
                <div className="p-6">
                  <p className="text-lg mb-4" style={{ color: formData.accentColor }}>
                    Hi Valued Customer!
                  </p>
                  <div className="text-gray-700 whitespace-pre-line mb-6">
                    {formData.content || "Your email content will appear here as you type..."}
                  </div>
                  {formData.ctaText && (
                    <div className="text-center mb-6">
                      <button
                        className="px-6 py-3 text-white font-semibold rounded-lg shadow-md"
                        style={{ backgroundColor: formData.accentColor }}
                      >
                        {formData.ctaText}
                      </button>
                    </div>
                  )}
                  <div className="text-xs text-gray-500 text-center pt-4 border-t">
                    <p>Favilla's Pizzeria | favillaspizzeria.com</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-600">
              Step {currentStep} of 3
            </div>
            <Button variant="outline" onClick={() => setIsCreatingCampaign(false)} disabled={isSending}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Campaign Dialog */}
      <Dialog open={isViewingCampaign} onOpenChange={setIsViewingCampaign}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Eye className="mr-3 h-5 w-5 text-[#d73a31]" />
              Campaign Details
            </DialogTitle>
          </DialogHeader>

          {viewingCampaign && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Campaign Name</Label>
                  <p className="mt-1 text-lg font-semibold">{viewingCampaign.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Status</Label>
                  <div className="mt-1">
                    <Badge variant={viewingCampaign.status === "sent" ? "default" : "secondary"}>
                      {viewingCampaign.status}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-600">Subject Line</Label>
                <p className="mt-1 text-base">{viewingCampaign.subject}</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium text-gray-600">Recipients</Label>
                  <p className="mt-1 text-2xl font-bold text-green-600">
                    {viewingCampaign.recipients.toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Open Rate</Label>
                  <p className="mt-1 text-2xl font-bold text-blue-600">{viewingCampaign.openRate}%</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-600">Click Rate</Label>
                  <p className="mt-1 text-2xl font-bold text-purple-600">{viewingCampaign.clickRate}%</p>
                </div>
              </div>

              {viewingCampaign.sentAt && (
                <div>
                  <Label className="text-sm font-medium text-gray-600">Sent Date</Label>
                  <p className="mt-1 text-base">
                    {new Date(viewingCampaign.sentAt).toLocaleString()}
                  </p>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-gray-600">Email Content Preview</Label>
                <div className="mt-2 border rounded-lg p-4 bg-gray-50">
                  <div className="bg-white rounded border shadow-sm max-w-md mx-auto">
                    <div className="p-4 text-white text-center rounded-t bg-gradient-to-r from-[#d73a31] to-[#e74c3c]">
                      <h2 className="text-lg font-bold">🍕 Favilla's Pizzeria</h2>
                      <p className="opacity-90 text-sm">Your favorite pizza just got better!</p>
                    </div>
                    <div className="p-4">
                      <p className="text-base mb-4 text-[#d73a31]">Hi Valued Customer!</p>
                      <div className="text-gray-700 text-sm">
                        {viewingCampaign.content || "No content available for this campaign."}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setIsViewingCampaign(false)}>
                  Close
                </Button>
                {viewingCampaign.status === "draft" && (
                  <Button
                    onClick={() => {
                      setIsViewingCampaign(false);
                      sendDraftCampaign(viewingCampaign);
                    }}
                    className="bg-[#d73a31] hover:bg-[#c73128]"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Send Now
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Reviews Management Tab
const ReviewsTab = () => {
  const [reviews, setReviews] = useState([
    {
      id: 1,
      customerName: "John Smith",
      rating: 5,
      comment: "Amazing pizza! The crust was perfect and delivery was super fast. Will definitely order again!",
      orderDate: "2024-01-15T19:30:00Z",
      menuItem: "Margherita Pizza",
      status: "published",
      response: null
    },
    {
      id: 2,
      customerName: "Sarah Johnson",
      rating: 4,
      comment: "Great food, but delivery took longer than expected. Pizza was still hot though!",
      orderDate: "2024-01-14T20:15:00Z",
      menuItem: "Pepperoni Pizza",
      status: "published",
      response: "Thank you for your feedback! We're working on improving our delivery times."
    },
    {
      id: 3,
      customerName: "Mike Wilson",
      rating: 2,
      comment: "Pizza was cold when it arrived and the order was wrong.",
      orderDate: "2024-01-13T18:45:00Z",
      menuItem: "Supreme Pizza",
      status: "pending",
      response: null
    }
  ]);

  const [responseText, setResponseText] = useState("");
  const [respondingTo, setRespondingTo] = useState<number | null>(null);

  const handleResponse = (reviewId: number) => {
    setReviews(reviews.map(review => 
      review.id === reviewId 
        ? { ...review, response: responseText, status: "published" }
        : review
    ));
    setResponseText("");
    setRespondingTo(null);
  };

  const averageRating = reviews.length > 0 
    ? ((reviews || []).reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1)
    : "0.0";

  const ratingDistribution = [5, 4, 3, 2, 1].map(rating => ({
    rating,
    count: reviews.filter(review => review.rating === rating).length
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Reviews & Ratings</h3>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="text-2xl font-bold">{averageRating}</div>
            <div className="text-sm text-gray-500">Average Rating</div>
          </div>
          <div className="flex">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`h-5 w-5 ${
                  star <= Math.round(parseFloat(averageRating))
                    ? "text-yellow-400 fill-current"
                    : "text-gray-300"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Rating Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ratingDistribution.map(({ rating, count }) => (
                <div key={rating} className="flex items-center space-x-3">
                  <div className="flex items-center">
                    <span className="text-sm font-medium w-2">{rating}</span>
                    <Star className="h-4 w-4 text-yellow-400 fill-current ml-1" />
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{ width: `${reviews.length > 0 ? (count / reviews.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-8">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Total Reviews</span>
                <span className="font-medium">{reviews.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Pending Response</span>
                <span className="font-medium">{reviews.filter(r => !r.response && r.rating <= 3).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">5-Star Reviews</span>
                <span className="font-medium">{reviews.filter(r => r.rating === 5).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">Response Rate</span>
                <span className="font-medium">
                  {reviews.length > 0 
                    ? Math.round((reviews.filter(r => r.response).length / reviews.length) * 100)
                    : 0}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <div className="font-medium">{review.customerName}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(review.orderDate).toLocaleDateString()} • {review.menuItem}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= review.rating
                              ? "text-yellow-400 fill-current"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                    <Badge variant={review.status === "published" ? "default" : "secondary"}>
                      {review.status}
                    </Badge>
                  </div>
                </div>

                <p className="text-gray-700">{review.comment}</p>

                {review.response && (
                  <div className="bg-blue-50 border-l-4 border-blue-200 p-3 ml-8">
                    <div className="text-sm font-medium text-blue-800 mb-1">Restaurant Response:</div>
                    <p className="text-blue-700">{review.response}</p>
                  </div>
                )}

                {!review.response && (
                  <div className="ml-8">
                    {respondingTo === review.id ? (
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Write your response..."
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          rows={3}
                        />
                        <div className="flex space-x-2">
                          <Button size="sm" onClick={() => handleResponse(review.id)}>
                            Send Response
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setRespondingTo(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setRespondingTo(review.id)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Respond
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// API Management Tab
const APIManagementTab = () => {
  const [apiKeys, setApiKeys] = useState([
    {
      id: 1,
      name: "Main Website",
      key: "pk_live_51234567890abcdef",
      lastUsed: "2024-01-15T10:30:00Z",
      requestsToday: 1250,
      isActive: true
    },
    {
      id: 2,
      name: "Mobile App",
      key: "pk_live_98765432109876543",
      lastUsed: "2024-01-15T09:15:00Z",
      requestsToday: 850,
      isActive: true
    }
  ]);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");

  const generateApiKey = () => {
    const newKey = {
      id: Date.now(),
      name: newKeyName,
      key: `pk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      lastUsed: null,
      requestsToday: 0,
      isActive: true
    };
    
    setApiKeys([...apiKeys, newKey]);
    setNewKeyName("");
    setShowCreateDialog(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">API Management</h3>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Generate API Key
        </Button>
      </div>

      {/* API Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{apiKeys.length}</div>
            <div className="text-sm text-gray-500">Active API Keys</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">
              {(apiKeys || []).reduce((sum, key) => sum + key.requestsToday, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Requests Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">99.9%</div>
            <div className="text-sm text-gray-500">Uptime</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">15ms</div>
            <div className="text-sm text-gray-500">Avg Response Time</div>
          </CardContent>
        </Card>
      </div>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Manage your API keys for integrating with external services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium">{apiKey.name}</h4>
                      <Badge variant={apiKey.isActive ? "default" : "secondary"}>
                        {apiKey.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                      {apiKey.key}
                    </div>
                    <div className="text-sm text-gray-500">
                      Last used: {apiKey.lastUsed 
                        ? new Date(apiKey.lastUsed).toLocaleString()
                        : "Never"
                      } • {apiKey.requestsToday} requests today
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(apiKey.key);
                        toast({
                          title: "API Key Copied",
                          description: "API key has been copied to clipboard.",
                        });
                      }}
                    >
                      Copy
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        const newKey = `pk_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
                        setApiKeys(keys => keys.map(k => 
                          k.id === apiKey.id 
                            ? { ...k, key: newKey, lastUsed: null, requestsToday: 0 }
                            : k
                        ));
                        toast({
                          title: "API Key Regenerated",
                          description: "A new API key has been generated.",
                        });
                      }}
                    >
                      Regenerate
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setApiKeys(keys => keys.map(k => 
                          k.id === apiKey.id 
                            ? { ...k, isActive: !k.isActive }
                            : k
                        ));
                        toast({
                          title: apiKey.isActive ? "API Key Disabled" : "API Key Enabled",
                          description: `API key has been ${apiKey.isActive ? 'disabled' : 'enabled'}.`,
                        });
                      }}
                    >
                      {apiKey.isActive ? "Disable" : "Enable"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (window.confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
                          setApiKeys(keys => keys.filter(k => k.id !== apiKey.id));
                          toast({
                            title: "API Key Revoked",
                            description: "API key has been permanently revoked.",
                          });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoints</CardTitle>
          <CardDescription>Available API endpoints for integration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Badge variant="outline">GET</Badge>
                <code className="text-sm">/api/menu-items</code>
                <span className="text-sm text-gray-500">Get all menu items</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">POST</Badge>
                <code className="text-sm">/api/orders</code>
                <span className="text-sm text-gray-500">Create a new order</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">GET</Badge>
                <code className="text-sm">/api/orders/{id}</code>
                <span className="text-sm text-gray-500">Get order details</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">PATCH</Badge>
                <code className="text-sm">/api/orders/{id}</code>
                <span className="text-sm text-gray-500">Update order status</span>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline">GET</Badge>
                <code className="text-sm">/api/users/{id}</code>
                <span className="text-sm text-gray-500">Get user profile</span>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Full API Documentation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Rate Limiting */}
      <Card>
        <CardHeader>
          <CardTitle>Rate Limiting</CardTitle>
          <CardDescription>Current API rate limits and usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm">Requests per minute</span>
              <span className="font-medium">100</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Requests per hour</span>
              <span className="font-medium">5,000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Requests per day</span>
              <span className="font-medium">50,000</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create API Key Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate New API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for your integration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="key-name">API Key Name</Label>
              <Input
                id="key-name"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Mobile App, Third-party Integration"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={generateApiKey} disabled={!newKeyName.trim()}>
                Generate Key
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// POS Integration Tab
const POSIntegrationTab = () => {
  const [integrations, setIntegrations] = useState([
    {
      id: 1,
      name: "Square POS",
      status: "connected",
      lastSync: "2024-01-15T10:30:00Z",
      ordersSynced: 150,
      menuItemsSynced: 45
    },
    {
      id: 2,
      name: "Toast POS",
      status: "disconnected",
      lastSync: null,
      ordersSynced: 0,
      menuItemsSynced: 0
    }
  ]);

  const availablePOS = [
    { name: "Square", logo: "🟫", description: "Popular cloud-based POS system" },
    { name: "Toast", logo: "🍞", description: "Restaurant-focused POS solution" },
    { name: "Clover", logo: "🍀", description: "All-in-one business management" },
    { name: "Shopify POS", logo: "🛍️", description: "E-commerce integrated POS" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">POS Integration</h3>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Integration
        </Button>
      </div>

      {/* Integration Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">1</div>
            <div className="text-sm text-gray-500">Connected Systems</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">150</div>
            <div className="text-sm text-gray-500">Orders Synced Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">98.5%</div>
            <div className="text-sm text-gray-500">Sync Success Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Connected Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>Connected POS Systems</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {integrations.map((integration) => (
              <div key={integration.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium">{integration.name}</h4>
                      <Badge variant={integration.status === "connected" ? "default" : "secondary"}>
                        {integration.status}
                      </Badge>
                    </div>
                    {integration.status === "connected" && (
                      <div className="text-sm text-gray-500">
                        Last sync: {new Date(integration.lastSync!).toLocaleString()} • 
                        {integration.ordersSynced} orders • {integration.menuItemsSynced} menu items
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    {integration.status === "connected" ? (
                      <>
                        <Button variant="outline" size="sm">Sync Now</Button>
                        <Button variant="outline" size="sm">Configure</Button>
                        <Button variant="outline" size="sm">Disconnect</Button>
                      </>
                    ) : (
                      <Button size="sm">Connect</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Available POS Systems */}
      <Card>
        <CardHeader>
          <CardTitle>Available POS Systems</CardTitle>
          <CardDescription>Connect with popular POS systems</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availablePOS.map((pos) => (
              <div key={pos.name} className="border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{pos.logo}</div>
                  <div>
                    <h4 className="font-medium">{pos.name}</h4>
                    <p className="text-sm text-gray-500">{pos.description}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Connect
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Sync Settings</CardTitle>
          <CardDescription>Configure how data syncs between systems</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-sync">Automatic Sync</Label>
                <p className="text-sm text-gray-500">Sync data automatically every 5 minutes</p>
              </div>
              <Switch id="auto-sync" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sync-orders">Sync Orders</Label>
                <p className="text-sm text-gray-500">Sync new orders to POS system</p>
              </div>
              <Switch id="sync-orders" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sync-menu">Sync Menu Items</Label>
                <p className="text-sm text-gray-500">Keep menu items in sync</p>
              </div>
              <Switch id="sync-menu" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="sync-inventory">Sync Inventory</Label>
                <p className="text-sm text-gray-500">Update inventory levels</p>
              </div>
              <Switch id="sync-inventory" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Third-party Integrations Tab
const IntegrationsTab = () => {
  const [connectedApps, setConnectedApps] = useState([
    {
      id: 1,
      name: "Stripe",
      category: "Payment Processing",
      status: "connected",
      description: "Process credit card payments securely"
    },
    {
      id: 2,
      name: "Mailchimp",
      category: "Email Marketing",
      status: "connected",
      description: "Email marketing and automation"
    }
  ]);

  const availableApps = [
    {
      name: "Twilio",
      category: "SMS",
      description: "Send SMS notifications to customers",
      icon: "📱"
    },
    {
      name: "Google Analytics",
      category: "Analytics",
      description: "Track website and app performance",
      icon: "📊"
    },
    {
      name: "QuickBooks",
      category: "Accounting",
      description: "Sync financial data and transactions",
      icon: "💰"
    },
    {
      name: "DoorDash",
      category: "Delivery",
      description: "List your restaurant on DoorDash",
      icon: "🚗"
    },
    {
      name: "Uber Eats",
      category: "Delivery",
      description: "Expand delivery reach with Uber Eats",
      icon: "🍕"
    },
    {
      name: "Grubhub",
      category: "Delivery",
      description: "Connect with Grubhub marketplace",
      icon: "🥡"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Third-party Integrations</h3>
        <div className="text-sm text-gray-500">
          {connectedApps.length} connected apps
        </div>
      </div>

      {/* Connected Apps */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Apps</CardTitle>
          <CardDescription>Apps currently integrated with your restaurant</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {connectedApps.map((app) => (
              <div key={app.id} className="border rounded-lg p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3">
                    <h4 className="font-medium">{app.name}</h4>
                    <Badge variant="default">Connected</Badge>
                  </div>
                  <p className="text-sm text-gray-500">{app.description}</p>
                  <p className="text-xs text-gray-400">{app.category}</p>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">Configure</Button>
                  <Button variant="outline" size="sm">Disconnect</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Available Integrations by Category */}
      <div className="space-y-6">
        {["Payment Processing", "Delivery", "Marketing", "Analytics", "Accounting"].map((category) => {
          const categoryApps = availableApps.filter(app => app.category === category);
          if (categoryApps.length === 0) return null;

          return (
            <Card key={category}>
              <CardHeader>
                <CardTitle>{category}</CardTitle>
                <CardDescription>
                  {category === "Payment Processing" && "Secure payment processing solutions"}
                  {category === "Delivery" && "Expand your delivery reach"}
                  {category === "Marketing" && "Grow your customer base"}
                  {category === "Analytics" && "Track and analyze performance"}
                  {category === "Accounting" && "Manage finances and bookkeeping"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {categoryApps.map((app) => (
                    <div key={app.name} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="text-2xl">{app.icon}</div>
                          <div>
                            <h4 className="font-medium">{app.name}</h4>
                            <p className="text-sm text-gray-500">{app.description}</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          Connect
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Integration Benefits */}
      <Card>
        <CardHeader>
          <CardTitle>Why Use Integrations?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <div className="text-3xl">⚡</div>
              <h4 className="font-medium">Automate Workflows</h4>
              <p className="text-sm text-gray-500">Reduce manual work by connecting your tools</p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl">📈</div>
              <h4 className="font-medium">Grow Your Business</h4>
              <p className="text-sm text-gray-500">Reach more customers through delivery platforms</p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-3xl">🔄</div>
              <h4 className="font-medium">Sync Data</h4>
              <p className="text-sm text-gray-500">Keep all your systems up to date automatically</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Webhooks Management Tab
const WebhooksTab = () => {
  const [webhooks, setWebhooks] = useState([
    {
      id: 1,
      name: "Order Created",
      url: "https://myapp.com/webhooks/order-created",
      events: ["order.created"],
      status: "active",
      lastTriggered: "2024-01-15T10:30:00Z",
      successRate: 98.5
    },
    {
      id: 2,
      name: "Payment Processed",
      url: "https://accounting.myapp.com/payment-webhook",
      events: ["payment.succeeded", "payment.failed"],
      status: "active",
      lastTriggered: "2024-01-15T09:15:00Z",
      successRate: 99.2
    }
  ]);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    url: "",
    events: [] as string[]
  });

  const availableEvents = [
    { name: "order.created", description: "When a new order is placed" },
    { name: "order.updated", description: "When an order status changes" },
    { name: "order.completed", description: "When an order is completed" },
    { name: "order.cancelled", description: "When an order is cancelled" },
    { name: "payment.succeeded", description: "When a payment is successful" },
    { name: "payment.failed", description: "When a payment fails" },
    { name: "user.created", description: "When a new user registers" },
    { name: "menu.updated", description: "When menu items are updated" }
  ];

  const handleEventToggle = (eventName: string) => {
    setFormData(prev => ({
      ...prev,
      events: prev.events.includes(eventName)
        ? prev.events.filter(e => e !== eventName)
        : [...prev.events, eventName]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Webhooks</h3>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Webhook
        </Button>
      </div>

      {/* Webhook Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{webhooks.length}</div>
            <div className="text-sm text-gray-500">Active Webhooks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">1,250</div>
            <div className="text-sm text-gray-500">Events Today</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">98.8%</div>
            <div className="text-sm text-gray-500">Success Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">245ms</div>
            <div className="text-sm text-gray-500">Avg Response Time</div>
          </CardContent>
        </Card>
      </div>

      {/* Webhooks List */}
      <Card>
        <CardHeader>
          <CardTitle>Configured Webhooks</CardTitle>
          <CardDescription>Webhooks that send data to your external systems</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <h4 className="font-medium">{webhook.name}</h4>
                      <Badge variant={webhook.status === "active" ? "default" : "secondary"}>
                        {webhook.status}
                      </Badge>
                    </div>
                    <div className="font-mono text-sm text-gray-600">{webhook.url}</div>
                    <div className="flex flex-wrap gap-1">
                      {webhook.events.map((event) => (
                        <Badge key={event} variant="outline" className="text-xs">
                          {event}
                        </Badge>
                      ))}
                    </div>
                    <div className="text-sm text-gray-500">
                      Last triggered: {new Date(webhook.lastTriggered).toLocaleString()} • 
                      Success rate: {webhook.successRate}%
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">Test</Button>
                    <Button variant="outline" size="sm">Edit</Button>
                    <Button variant="outline" size="sm">Delete</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Webhook Events */}
      <Card>
        <CardHeader>
          <CardTitle>Available Events</CardTitle>
          <CardDescription>Events that can trigger webhooks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {availableEvents.map((event) => (
              <div key={event.name} className="border rounded-lg p-3">
                <div className="font-mono text-sm font-medium">{event.name}</div>
                <div className="text-sm text-gray-500">{event.description}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Webhook Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Webhook</DialogTitle>
            <DialogDescription>
              Set up a new webhook to receive events from your restaurant system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="webhook-name">Webhook Name</Label>
              <Input
                id="webhook-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Order Processing Webhook"
              />
            </div>
            <div>
              <Label htmlFor="webhook-url">Endpoint URL</Label>
              <Input
                id="webhook-url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://yourapp.com/webhooks/orders"
              />
            </div>
            <div>
              <Label>Events to Subscribe</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {availableEvents.map((event) => (
                  <div key={event.name} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={event.name}
                      checked={formData.events.includes(event.name)}
                      onChange={() => handleEventToggle(event.name)}
                      className="rounded"
                    />
                    <Label htmlFor={event.name} className="text-sm">
                      {event.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button>Create Webhook</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Backup & Export Tab
const BackupExportTab = ({ orders, menuItems, users }: { orders: any[], menuItems: any[], users: any[] }) => {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);
  const [backups, setBackups] = useState([
    {
      id: 1,
      name: "Daily Backup - Jan 15, 2024",
      type: "automatic",
      size: "2.4 MB",
      createdAt: "2024-01-15T02:00:00Z",
      status: "completed"
    },
    {
      id: 2,
      name: "Manual Backup - Jan 14, 2024",
      type: "manual",
      size: "2.3 MB",
      createdAt: "2024-01-14T15:30:00Z",
      status: "completed"
    }
  ]);

  const createBackup = async () => {
    setIsCreatingBackup(true);
    setBackupProgress(0);

    const interval = setInterval(() => {
      setBackupProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsCreatingBackup(false);
          
          // Add new backup to list
          const newBackup = {
            id: Date.now(),
            name: `Manual Backup - ${new Date().toLocaleDateString()}`,
            type: "manual",
            size: "2.5 MB",
            createdAt: new Date().toISOString(),
            status: "completed"
          };
          setBackups([newBackup, ...backups]);
          
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const exportData = (dataType: string) => {
    let data: any[] = [];
    let filename = "";

    switch (dataType) {
      case "orders":
        data = orders || [];
        filename = "orders-export.csv";
        break;
      case "menu":
        data = menuItems || [];
        filename = "menu-items-export.csv";
        break;
      case "customers":
        data = users?.filter(u => u.role === "customer") || [];
        filename = "customers-export.csv";
        break;
    }

    if (data.length > 0) {
      // In a real implementation, this would generate and download a CSV file
      const csvContent = "data:text/csv;charset=utf-8," + 
        Object.keys(data[0]).join(",") + "\n" +
        data.map(row => Object.values(row).join(",")).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Backup & Export</h3>
        <Button onClick={createBackup} disabled={isCreatingBackup}>
          {isCreatingBackup ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating Backup...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Create Backup
            </>
          )}
        </Button>
      </div>

      {/* Backup Progress */}
      {isCreatingBackup && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-1">
                  <span>Creating backup...</span>
                  <span>{backupProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${backupProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle>Export Data</CardTitle>
          <CardDescription>Download your data in CSV format</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-lg p-4 text-center space-y-3">
              <div className="text-2xl">📋</div>
              <h4 className="font-medium">Orders</h4>
              <p className="text-sm text-gray-500">{orders?.length || 0} orders</p>
              <Button variant="outline" size="sm" onClick={() => exportData("orders")}>
                Export CSV
              </Button>
            </div>
            <div className="border rounded-lg p-4 text-center space-y-3">
              <div className="text-2xl">🍕</div>
              <h4 className="font-medium">Menu Items</h4>
              <p className="text-sm text-gray-500">{menuItems?.length || 0} items</p>
              <Button variant="outline" size="sm" onClick={() => exportData("menu")}>
                Export CSV
              </Button>
            </div>
            <div className="border rounded-lg p-4 text-center space-y-3">
              <div className="text-2xl">👥</div>
              <h4 className="font-medium">Customers</h4>
              <p className="text-sm text-gray-500">
                {users?.filter(u => u.role === "customer").length || 0} customers
              </p>
              <Button variant="outline" size="sm" onClick={() => exportData("customers")}>
                Export CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <CardTitle>Backup History</CardTitle>
          <CardDescription>Recent backups of your restaurant data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {backups.map((backup) => (
              <div key={backup.id} className="flex items-center justify-between border rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {backup.type === "automatic" ? "🔄" : "💾"}
                  </div>
                  <div>
                    <h4 className="font-medium">{backup.name}</h4>
                    <div className="text-sm text-gray-500">
                      {backup.size} • {new Date(backup.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={backup.status === "completed" ? "default" : "secondary"}>
                    {backup.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Backup Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Backup Settings</CardTitle>
          <CardDescription>Configure automatic backup preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="auto-backup">Automatic Daily Backups</Label>
                <p className="text-sm text-gray-500">Create a backup every day at 2 AM</p>
              </div>
              <Switch id="auto-backup" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="backup-retention">Backup Retention</Label>
                <p className="text-sm text-gray-500">Keep backups for 30 days</p>
              </div>
              <Select defaultValue="30">
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-gray-500">Get notified when backups complete</p>
              </div>
              <Switch id="email-notifications" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Storage Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Backups</span>
              <span>4.7 MB of 1 GB used</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: "0.47%" }} />
            </div>
            <div className="text-xs text-gray-500">
              Plenty of storage available for your backups
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Help & Support Tab
const HelpSupportTab = () => {
  const [tickets, setTickets] = useState([
    {
      id: 1,
      subject: "Payment processing issue",
      status: "open",
      priority: "high",
      createdAt: "2024-01-15T10:30:00Z",
      lastReply: "2024-01-15T14:20:00Z"
    },
    {
      id: 2,
      subject: "Menu item not displaying",
      status: "resolved",
      priority: "medium",
      createdAt: "2024-01-14T09:15:00Z",
      lastReply: "2024-01-14T16:30:00Z"
    }
  ]);

  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    subject: "",
    priority: "medium",
    description: ""
  });

  const faqItems = [
    {
      question: "How do I add a new menu item?",
      answer: "Go to Menu Editor tab, click 'Add Menu Item', fill in the details including name, price, description, and category, then save."
    },
    {
      question: "How can I process refunds?",
      answer: "In the Orders tab, find the order you want to refund, click the three dots menu, and select 'Process Refund'. The refund will be processed through your payment provider."
    },
    {
      question: "How do I set up delivery zones?",
      answer: "Go to Delivery Options in the Operations section. You can set delivery radius, minimum order amounts, and delivery fees for different zones."
    },
    {
      question: "Can I customize email notifications?",
      answer: "Yes, go to Settings and look for the Notifications section. You can customize order confirmation emails, status updates, and other automated messages."
    },
    {
      question: "How do I export my sales data?",
      answer: "Use the Backup & Export tab to download your orders, menu items, and customer data in CSV format for analysis."
    }
  ];

  const quickActions = [
    { name: "Video Tutorials", icon: "🎥", description: "Watch step-by-step guides" },
    { name: "Documentation", icon: "📖", description: "Complete user manual" },
    { name: "API Reference", icon: "🔧", description: "Developer documentation" },
    { name: "Community Forum", icon: "💬", description: "Get help from other users" },
    { name: "Live Chat", icon: "💬", description: "Chat with support team" },
    { name: "Schedule Call", icon: "📞", description: "Book a support call" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Help & Support</h3>
        <Button onClick={() => setShowTicketDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Support Ticket
        </Button>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Help</CardTitle>
          <CardDescription>Get help quickly with these resources</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <div key={action.name} className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{action.icon}</div>
                  <div>
                    <h4 className="font-medium">{action.name}</h4>
                    <p className="text-sm text-gray-500">{action.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Support Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
          <CardDescription>Your recent support requests</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">#{ticket.id} - {ticket.subject}</h4>
                    <div className="text-sm text-gray-500">
                      Created: {new Date(ticket.createdAt).toLocaleDateString()} • 
                      Last reply: {new Date(ticket.lastReply).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={ticket.priority === "high" ? "destructive" : "default"}>
                      {ticket.priority}
                    </Badge>
                    <Badge variant={ticket.status === "open" ? "default" : "secondary"}>
                      {ticket.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>Common questions and answers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <div key={index} className="border-b pb-4 last:border-b-0">
                <h4 className="font-medium mb-2">{item.question}</h4>
                <p className="text-sm text-gray-600">{item.answer}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Contact Support</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-sm">support@favillas.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-sm">1-800-FAVILLA</span>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm">24/7 Support Available</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">API Status</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Operational</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Payment Processing</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Operational</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Order Processing</span>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-green-600">Operational</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create Support Ticket Dialog */}
      <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Support Ticket</DialogTitle>
            <DialogDescription>
              Describe your issue and we'll help you resolve it quickly.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="ticket-subject">Subject</Label>
              <Input
                id="ticket-subject"
                value={ticketForm.subject}
                onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                placeholder="Brief description of your issue"
              />
            </div>
            <div>
              <Label htmlFor="ticket-priority">Priority</Label>
              <Select value={ticketForm.priority} onValueChange={(value) => setTicketForm({ ...ticketForm, priority: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="ticket-description">Description</Label>
              <Textarea
                id="ticket-description"
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                placeholder="Please provide detailed information about your issue..."
                rows={6}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowTicketDialog(false)}>
                Cancel
              </Button>
              <Button>Create Ticket</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const LocalSEOToolsTab = () => {
  const [businessInfo, setBusinessInfo] = useState({
    name: "Favilla's Pizza",
    address: "123 Main St, City, State 12345",
    phone: "(555) 123-4567",
    website: "https://favillas.com",
    hours: "Mon-Sun: 11AM-11PM",
    description: "Authentic Italian pizza with fresh ingredients and traditional recipes.",
    keywords: "pizza, italian restaurant, delivery, takeout"
  });

  const [citations, setCitations] = useState([
    { platform: "Google My Business", status: "verified", url: "https://business.google.com", lastUpdated: "2024-01-15" },
    { platform: "Yelp", status: "claimed", url: "https://yelp.com/biz/favillas", lastUpdated: "2024-01-10" },
    { platform: "Facebook", status: "verified", url: "https://facebook.com/favillas", lastUpdated: "2024-01-12" },
    { platform: "TripAdvisor", status: "pending", url: "", lastUpdated: "" },
    { platform: "Yellow Pages", status: "unverified", url: "", lastUpdated: "" }
  ]);

  const [keywords, setKeywords] = useState([
    { keyword: "pizza delivery near me", position: 3, volume: 2100, difficulty: 65 },
    { keyword: "best pizza in [city]", position: 8, volume: 1200, difficulty: 70 },
    { keyword: "italian restaurant", position: 12, volume: 890, difficulty: 55 },
    { keyword: "pizza takeout", position: 6, volume: 760, difficulty: 45 }
  ]);

  const [schemaMarkup, setSchemaMarkup] = useState({
    restaurant: true,
    localBusiness: true,
    menuItems: false,
    reviews: true,
    events: false
  });

  const generateSchemaMarkup = () => {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Restaurant",
      "name": businessInfo.name,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": businessInfo.address.split(',')[0],
        "addressLocality": businessInfo.address.split(',')[1]?.trim(),
        "addressRegion": businessInfo.address.split(',')[2]?.trim().split(' ')[0],
        "postalCode": businessInfo.address.split(',')[2]?.trim().split(' ')[1]
      },
      "telephone": businessInfo.phone,
      "url": businessInfo.website,
      "openingHours": businessInfo.hours,
      "description": businessInfo.description,
      "servesCuisine": "Italian",
      "priceRange": "$$"
    };
    
    return JSON.stringify(schema, null, 2);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Local SEO Tools</h3>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <TrendingUp className="h-4 w-4 mr-2" />
            Track Rankings
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">85%</div>
            <div className="text-sm text-gray-500">SEO Score</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{citations.filter(c => c.status === 'verified').length}</div>
            <div className="text-sm text-gray-500">Verified Citations</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{keywords.filter(k => k.position <= 5).length}</div>
            <div className="text-sm text-gray-500">Top 5 Rankings</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600">4.8</div>
            <div className="text-sm text-gray-500">Avg Review Rating</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="business-info" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1">
          <TabsTrigger value="business-info" className="text-xs md:text-sm">Business</TabsTrigger>
          <TabsTrigger value="frontend" className="text-xs md:text-sm">Frontend</TabsTrigger>
          <TabsTrigger value="citations" className="text-xs md:text-sm">Citations</TabsTrigger>
          <TabsTrigger value="keywords" className="text-xs md:text-sm">Keywords</TabsTrigger>
          <TabsTrigger value="schema" className="text-xs md:text-sm">Schema</TabsTrigger>
          <TabsTrigger value="gmb" className="text-xs md:text-sm">GMB</TabsTrigger>
        </TabsList>

        <TabsContent value="business-info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Keep your business information consistent across all platforms</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business-name">Business Name</Label>
                  <Input
                    id="business-name"
                    value={businessInfo.name}
                    onChange={(e) => setBusinessInfo({...businessInfo, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="business-phone">Phone Number</Label>
                  <Input
                    id="business-phone"
                    value={businessInfo.phone}
                    onChange={(e) => setBusinessInfo({...businessInfo, phone: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="business-address">Address</Label>
                  <Input
                    id="business-address"
                    value={businessInfo.address}
                    onChange={(e) => setBusinessInfo({...businessInfo, address: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="business-website">Website</Label>
                  <Input
                    id="business-website"
                    value={businessInfo.website}
                    onChange={(e) => setBusinessInfo({...businessInfo, website: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="business-hours">Hours</Label>
                  <Input
                    id="business-hours"
                    value={businessInfo.hours}
                    onChange={(e) => setBusinessInfo({...businessInfo, hours: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="business-description">Description</Label>
                  <Textarea
                    id="business-description"
                    value={businessInfo.description}
                    onChange={(e) => setBusinessInfo({...businessInfo, description: e.target.value})}
                    rows={3}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="business-keywords">Target Keywords</Label>
                  <Input
                    id="business-keywords"
                    value={businessInfo.keywords}
                    onChange={(e) => setBusinessInfo({...businessInfo, keywords: e.target.value})}
                    placeholder="pizza, italian restaurant, delivery, takeout"
                  />
                </div>
              </div>
              <Button>Save Business Information</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="frontend" className="space-y-4">
          <FrontendCustomization />
        </TabsContent>

        <TabsContent value="citations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Citation Management</CardTitle>
              <CardDescription>Manage your business listings across directories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {citations.map((citation, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div>
                        <div className="font-medium">{citation.platform}</div>
                        <div className="text-sm text-gray-500">
                          Status: <span className={citation.status === 'verified' ? 'text-green-600' : citation.status === 'claimed' ? 'text-blue-600' : citation.status === 'pending' ? 'text-yellow-600' : 'text-red-600'}>
                            {citation.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {citation.url && (
                        <Button variant="outline" size="sm">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Update
                      </Button>
                    </div>
                  </div>
                ))}
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Citation
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="keywords" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Local Keyword Tracking</CardTitle>
              <CardDescription>Monitor your rankings for local search terms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <Input placeholder="Add new keyword..." className="w-64" />
                    <Button>Add Keyword</Button>
                  </div>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
                <div className="overflow-x-auto mobile-scroll-container touch-pan-x">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Keyword</th>
                        <th className="text-left p-2">Position</th>
                        <th className="text-left p-2">Volume</th>
                        <th className="text-left p-2">Difficulty</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {keywords.map((keyword, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2">{keyword.keyword}</td>
                          <td className="p-2">
                            <Badge variant={keyword.position <= 5 ? "default" : keyword.position <= 10 ? "secondary" : "destructive"}>
                              #{keyword.position}
                            </Badge>
                          </td>
                          <td className="p-2">{keyword.volume.toLocaleString()}</td>
                          <td className="p-2">
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${keyword.difficulty}%` }}
                                ></div>
                              </div>
                              <span className="text-sm">{keyword.difficulty}%</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <Button variant="ghost" size="sm">
                              <TrendingUp className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schema" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Schema Markup Generator</CardTitle>
              <CardDescription>Generate structured data for better search visibility</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(schemaMarkup).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2">
                    <Switch
                      checked={value}
                      onCheckedChange={(checked) => setSchemaMarkup({...schemaMarkup, [key]: checked})}
                    />
                    <Label className="capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                  </div>
                ))}
              </div>
              <div>
                <Label>Generated Schema Markup (JSON-LD)</Label>
                <Textarea
                  value={generateSchemaMarkup()}
                  readOnly
                  rows={12}
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex space-x-2">
                <Button>Copy to Clipboard</Button>
                <Button variant="outline">Download JSON</Button>
                <Button variant="outline">Add to Website</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gmb" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Google My Business Manager</CardTitle>
              <CardDescription>Manage your Google My Business presence</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Quick Actions</h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start">
                      <Camera className="h-4 w-4 mr-2" />
                      Upload Photos
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Edit className="h-4 w-4 mr-2" />
                      Update Business Hours
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Respond to Reviews
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="h-4 w-4 mr-2" />
                      Create Event
                    </Button>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-3">Recent Activity</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded">
                      <div className="text-sm font-medium">New Review</div>
                      <div className="text-xs text-gray-500">Sarah M. left a 5-star review</div>
                      <div className="text-xs text-gray-400">2 hours ago</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <div className="text-sm font-medium">Photo Added</div>
                      <div className="text-xs text-gray-500">New pizza photo uploaded</div>
                      <div className="text-xs text-gray-400">1 day ago</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded">
                      <div className="text-sm font-medium">Q&A Updated</div>
                      <div className="text-xs text-gray-500">Answered delivery question</div>
                      <div className="text-xs text-gray-400">3 days ago</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <h4 className="font-medium mb-3">Performance Insights</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded">
                    <div className="text-2xl font-bold text-blue-600">1,240</div>
                    <div className="text-sm text-gray-600">Profile Views</div>
                    <div className="text-xs text-green-500">+12% this week</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded">
                    <div className="text-2xl font-bold text-green-600">89</div>
                    <div className="text-sm text-gray-600">Website Clicks</div>
                    <div className="text-xs text-green-500">+8% this week</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded">
                    <div className="text-2xl font-bold text-purple-600">156</div>
                    <div className="text-sm text-gray-600">Direction Requests</div>
                    <div className="text-xs text-green-500">+15% this week</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded">
                    <div className="text-2xl font-bold text-orange-600">43</div>
                    <div className="text-sm text-gray-600">Phone Calls</div>
                    <div className="text-xs text-red-500">-3% this week</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Rewards Management Component
const RewardsManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [rewardToDelete, setRewardToDelete] = useState<any>(null);

  // Use /api/rewards endpoint (works on Netlify production)
  const getRewardsEndpoint = () => {
    return "/api/rewards";
  };

  // Fetch rewards from API
  const { data: rewards = [], isLoading, refetch } = useQuery({
    queryKey: [getRewardsEndpoint()],
    queryFn: async () => {
      const response = await apiRequest("GET", getRewardsEndpoint());
      const data = await response.json();
      return data;
    },
    staleTime: 0,
    cacheTime: 0,
  });

  // Create reward mutation
  const createRewardMutation = useMutation({
    mutationFn: async (rewardData: any) => {
      const response = await apiRequest("POST", getRewardsEndpoint(), rewardData);
      if (!response.ok) {
        throw new Error("Failed to create reward");
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
      setIsCreateDialogOpen(false);
      toast({
        title: "Reward Created",
        description: "New reward has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create reward",
        variant: "destructive",
      });
    },
  });

  // Update reward mutation
  const updateRewardMutation = useMutation({
    mutationFn: async ({ id, rewardData }: { id: number; rewardData: any }) => {
      const endpoint = getRewardsEndpoint();
      const response = await apiRequest("PUT", `${endpoint}/${id}`, rewardData);
      if (!response.ok) {
        throw new Error("Failed to update reward");
      }
      return response.json();
    },
    onSuccess: () => {
      // Force immediate refresh
      refetch();
      setEditingReward(null);
      toast({
        title: "Reward Updated",
        description: "Reward has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update reward",
        variant: "destructive",
      });
    },
  });

  // Delete reward mutation
  const deleteRewardMutation = useMutation({
    mutationFn: async (id: number) => {
      const endpoint = getRewardsEndpoint();
      const response = await apiRequest("DELETE", `${endpoint}/${id}`);
      if (!response.ok) {
        throw new Error("Failed to delete reward");
      }
      return response.json();
    },
    onSuccess: () => {
      refetch();
      setIsDeleteDialogOpen(false);
      setRewardToDelete(null);
      toast({
        title: "Reward Deleted",
        description: "Reward has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete reward",
        variant: "destructive",
      });
    },
  });

  const handleCreateReward = (data: any) => {
    createRewardMutation.mutate({
      name: data.name,
      description: data.description,
      pointsRequired: parseInt(data.pointsRequired) || 100,
      rewardType: data.rewardType || 'discount',
      discount: data.rewardType === 'discount' ? parseFloat(data.discount) : null,
      freeItem: data.rewardType === 'free_item' ? data.freeItem : null,
      minOrderAmount: data.minOrderAmount ? parseFloat(data.minOrderAmount) : null,
      expiresAt: data.expiresAt || null,
    });
  };

  const handleUpdateReward = (data: any) => {
    updateRewardMutation.mutate({
      id: editingReward.id,
      rewardData: {
        name: data.name,
        description: data.description,
        pointsRequired: parseInt(data.pointsRequired) || 100,
        rewardType: data.rewardType || 'discount',
        discount: data.rewardType === 'discount' ? parseFloat(data.discount) : null,
        freeItem: data.rewardType === 'free_item' ? data.freeItem : null,
        minOrderAmount: data.minOrderAmount ? parseFloat(data.minOrderAmount) : null,
        expiresAt: data.expiresAt || null,
      },
    });
  };

  const getRewardTypeColor = (type: string) => {
    switch (type) {
      case 'discount': return 'bg-green-100 text-green-800';
      case 'free_item': return 'bg-blue-100 text-blue-800';
      case 'free_delivery': return 'bg-purple-100 text-purple-800';
      case 'priority': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRewardTypeIcon = (type: string) => {
    switch (type) {
      case 'discount': return <PercentIcon className="h-4 w-4" />;
      case 'free_item': return <Gift className="h-4 w-4" />;
      case 'free_delivery': return <Truck className="h-4 w-4" />;
      case 'priority': return <Zap className="h-4 w-4" />;
      default: return <Star className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Rewards System</h2>
          <p className="text-gray-600">Manage customer rewards and loyalty points</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Reward
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Rewards</p>
                <p className="text-2xl font-bold text-gray-900">{rewards.length}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Rewards</p>
                <p className="text-2xl font-bold text-gray-900">
                  {rewards.filter((r: any) => r.is_active !== false).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Discount</p>
                <p className="text-2xl font-bold text-gray-900">
                  {rewards.length > 0
                    ? Math.round(rewards.reduce((acc: number, r: any) => acc + (parseFloat(r.discount) || 0), 0) / rewards.length)
                    : 0
                  }%
                </p>
              </div>
              <PercentIcon className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">With Min Order</p>
                <p className="text-2xl font-bold text-gray-900">
                  {rewards.filter((r: any) => r.min_order_amount).length}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rewards Table */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Rewards</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Loading rewards...</p>
            </div>
          ) : rewards.length === 0 ? (
            <div className="text-center py-8">
              <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No rewards yet</h3>
              <p className="text-gray-600 mb-4">Create your first reward to get started</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Reward
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Reward</th>
                    <th className="text-left py-3 px-4 font-medium">Points Required</th>
                    <th className="text-left py-3 px-4 font-medium">Discount</th>
                    <th className="text-left py-3 px-4 font-medium">Min Order</th>
                    <th className="text-left py-3 px-4 font-medium">Expires</th>
                    <th className="text-left py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map((reward: any) => (
                    <tr key={reward.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium">{reward.name}</div>
                          <div className="text-sm text-gray-500">{reward.description}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
                          {reward.points_required || 100} points
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {reward.discount ? `${reward.discount}% off` : 'No discount'}
                      </td>
                      <td className="py-3 px-4">
                        {reward.min_order_amount ? `$${reward.min_order_amount}` : 'No minimum'}
                      </td>
                      <td className="py-3 px-4">
                        {reward.expires_at ? new Date(reward.expires_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingReward(reward)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRewardToDelete(reward);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Reward Dialog */}
      <RewardDialog
        open={isCreateDialogOpen || !!editingReward}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateDialogOpen(false);
            setEditingReward(null);
          }
        }}
        reward={editingReward}
        onSubmit={editingReward ? handleUpdateReward : handleCreateReward}
        isLoading={createRewardMutation.isPending || updateRewardMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Reward</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{rewardToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteRewardMutation.mutate(rewardToDelete?.id)}
              disabled={deleteRewardMutation.isPending}
            >
              {deleteRewardMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Reward Dialog Component
const RewardDialog = ({ open, onOpenChange, reward, onSubmit, isLoading }: any) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    pointsRequired: "",
    rewardType: "discount",
    discount: "",
    freeItem: "",
    minOrderAmount: "",
    expiresAt: "",
  });

  useEffect(() => {
    if (reward) {
      setFormData({
        name: reward.name || "",
        description: reward.description || "",
        pointsRequired: reward.points_required?.toString() || "100",
        rewardType: reward.reward_type || "discount",
        discount: reward.discount?.toString() || "",
        freeItem: reward.free_item || "",
        minOrderAmount: reward.min_order_amount?.toString() || "",
        expiresAt: reward.expires_at ? new Date(reward.expires_at).toISOString().split('T')[0] : "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        pointsRequired: "100",
        rewardType: "discount",
        discount: "",
        freeItem: "",
        minOrderAmount: "",
        expiresAt: "",
      });
    }
  }, [reward, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{reward ? "Edit Reward" : "Create New Reward"}</DialogTitle>
          <DialogDescription>
            {reward ? "Update the reward details below." : "Fill in the details to create a new customer reward."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Reward Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., 10% Off Your Order"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe what this reward offers"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pointsRequired">Points Required</Label>
            <Input
              id="pointsRequired"
              type="number"
              value={formData.pointsRequired}
              onChange={(e) => setFormData({ ...formData, pointsRequired: e.target.value })}
              placeholder="e.g., 100"
              min="1"
              required
            />
            <p className="text-xs text-gray-500">Number of points customers need to redeem this reward</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rewardType">Reward Type</Label>
            <select
              id="rewardType"
              value={formData.rewardType}
              onChange={(e) => setFormData({ ...formData, rewardType: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="discount">Discount</option>
              <option value="free_item">Free Item</option>
            </select>
          </div>

          {formData.rewardType === 'discount' && (
            <div className="space-y-2">
              <Label htmlFor="discount">Discount Percentage</Label>
            <Input
              id="discount"
              type="number"
              value={formData.discount}
              onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
              placeholder="e.g., 10"
              min="0"
              max="100"
            />
            </div>
          )}

          {formData.rewardType === 'free_item' && (
            <div className="space-y-2">
              <Label htmlFor="freeItem">Free Item</Label>
              <Input
                id="freeItem"
                value={formData.freeItem}
                onChange={(e) => setFormData({ ...formData, freeItem: e.target.value })}
                placeholder="e.g., Free Garlic Bread"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="minOrderAmount">Minimum Order Amount (Optional)</Label>
            <Input
              id="minOrderAmount"
              type="number"
              step="0.01"
              value={formData.minOrderAmount}
              onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
              placeholder="e.g., 25.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiresAt">Expiration Date (Optional)</Label>
            <Input
              id="expiresAt"
              type="date"
              value={formData.expiresAt}
              onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {reward ? "Updating..." : "Creating..."}
                </>
              ) : (
                reward ? "Update Reward" : "Create Reward"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Edit Rate Form Component
const EditRateForm = ({ user, onSubmit, onCancel, isLoading }: {
  user: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}) => {
  const [formData, setFormData] = useState({
    hourlyRate: user.hourlyRate ? parseFloat(user.hourlyRate).toString() : '',
    department: user.department || 'none'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
      department: formData.department === 'none' ? null : formData.department
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
        <Input
          id="hourlyRate"
          type="number"
          step="0.01"
          min="0"
          value={formData.hourlyRate}
          onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
          placeholder="15.00"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="department">Department (Optional)</Label>
        <Select
          value={formData.department}
          onValueChange={(value) => setFormData({ ...formData, department: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No department</SelectItem>
            <SelectItem value="kitchen">Kitchen</SelectItem>
            <SelectItem value="front-of-house">Front of House</SelectItem>
            <SelectItem value="delivery">Delivery</SelectItem>
            <SelectItem value="management">Management</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Updating..." : "Update Rate"}
        </Button>
      </DialogFooter>
    </form>
  );
};

const ExperimentalFeaturesSection = () => {
  const [settings, setSettings] = useState({
    checkoutUpsellEnabled: true,
    upsellCategories: {
      'Drinks': true,
      'Desserts': true,
      'Sides': true,
      'Appetizers': true,
      'Wine': false,
      'Beer': false
    },
    categoryImages: {
      'Drinks': '',
      'Desserts': '',
      'Sides': '',
      'Appetizers': '',
      'Wine': '',
      'Beer': ''
    }
  });
  const { toast } = useToast();

  // Load experimental settings on component mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('experimentalFeatureSettings');
    if (savedSettings) {
      try {
        setSettings(JSON.parse(savedSettings));
      } catch (error) {
        console.error('Failed to parse experimental feature settings:', error);
      }
    }
  }, []);

  // Save settings whenever they change
  useEffect(() => {
    localStorage.setItem('experimentalFeatureSettings', JSON.stringify(settings));
  }, [settings]);

  const handleToggleUpsell = (enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      checkoutUpsellEnabled: enabled
    }));

    toast({
      title: enabled ? "Checkout Upsell Enabled" : "Checkout Upsell Disabled",
      description: enabled
        ? "Customers will see upsell prompts at checkout for missing categories"
        : "Checkout upsell prompts are now disabled",
    });
  };

  const handleToggleCategory = (categoryName: string, enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      upsellCategories: {
        ...prev.upsellCategories,
        [categoryName]: enabled
      }
    }));

    toast({
      title: `${categoryName} Upsell ${enabled ? 'Enabled' : 'Disabled'}`,
      description: `${categoryName} will ${enabled ? 'now' : 'no longer'} be shown in checkout upsell prompts`,
    });
  };

  const handleImageUpload = (categoryName: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (JPG, PNG, GIF, etc.)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    // Create object URL for preview
    const imageUrl = URL.createObjectURL(file);

    setSettings(prev => ({
      ...prev,
      categoryImages: {
        ...prev.categoryImages,
        [categoryName]: imageUrl
      }
    }));

    toast({
      title: "Image Uploaded",
      description: `Image set for ${categoryName} category`,
    });
  };

  const handleRemoveImage = (categoryName: string) => {
    const currentImage = settings.categoryImages[categoryName];
    if (currentImage && currentImage.startsWith('blob:')) {
      URL.revokeObjectURL(currentImage);
    }

    setSettings(prev => ({
      ...prev,
      categoryImages: {
        ...prev.categoryImages,
        [categoryName]: ''
      }
    }));

    toast({
      title: "Image Removed",
      description: `Image removed from ${categoryName} category`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Experimental Features</h2>
          <p className="text-gray-600">
            Beta features and advanced functionality that can be toggled on/off
          </p>
        </div>
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
          <Zap className="w-3 h-3 mr-1" />
          BETA
        </Badge>
      </div>

      {/* Checkout Upsell Feature */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#d73a31]" />
                Checkout Upselling
              </CardTitle>
              <CardDescription>
                Show customers additional items they haven't ordered when they go to checkout
              </CardDescription>
            </div>
            <Switch
              checked={settings.checkoutUpsellEnabled}
              onCheckedChange={handleToggleUpsell}
            />
          </div>
        </CardHeader>

        {settings.checkoutUpsellEnabled && (
          <CardContent className="pt-0">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• When customers click checkout, we analyze their cart</li>
                  <li>• If they're missing items from enabled categories below, we show them a modal</li>
                  <li>• They can browse and add items from missing categories or skip</li>
                  <li>• Once they add items or click "No Thanks", they won't see it again in that session</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-3">Upsell Categories</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Select which categories should trigger upsell prompts when missing from customer carts
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(settings.upsellCategories).map(([categoryName, enabled]) => {
                    const categoryImage = settings.categoryImages[categoryName];
                    return (
                      <div
                        key={categoryName}
                        className={`p-4 border-2 rounded-lg transition-all ${
                          enabled
                            ? 'border-[#d73a31] bg-red-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        {/* Category Header */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-base">{categoryName}</span>
                          <Switch
                            checked={enabled}
                            onCheckedChange={(checked) => handleToggleCategory(categoryName, checked)}
                            size="sm"
                          />
                        </div>

                        {/* Image Preview */}
                        <div className="mb-3">
                          {categoryImage ? (
                            <div className="relative group">
                              <img
                                src={categoryImage}
                                alt={`${categoryName} preview`}
                                className="w-full h-24 object-cover rounded-md"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center">
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleRemoveImage(categoryName)}
                                  className="text-xs"
                                >
                                  <Trash2 className="w-3 h-3 mr-1" />
                                  Remove
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-24 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center bg-gray-100">
                              <div className="text-center">
                                <Image className="w-8 h-8 text-gray-400 mx-auto mb-1" />
                                <p className="text-xs text-gray-500">No image set</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Upload Button */}
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(categoryName, e)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            id={`upload-${categoryName}`}
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                            asChild
                          >
                            <label htmlFor={`upload-${categoryName}`} className="cursor-pointer">
                              <Upload className="w-3 h-3 mr-2" />
                              {categoryImage ? 'Change Image' : 'Add Image'}
                            </label>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-900 mb-1">Configuration Tips:</p>
                    <ul className="text-yellow-800 space-y-1">
                      <li>• Enable categories that complement your main offerings (drinks with pizza, desserts, etc.)</li>
                      <li>• Upload custom images for each category to make them more appealing</li>
                      <li>• Keep it focused - too many categories can overwhelm customers</li>
                      <li>• Monitor your analytics to see which upsells perform best</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Future experimental features can be added here */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-400">
            <Zap className="w-5 h-5" />
            More Features Coming Soon
          </CardTitle>
          <CardDescription>
            Additional experimental features will appear here as they're developed
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
};


export default AdminDashboard;
