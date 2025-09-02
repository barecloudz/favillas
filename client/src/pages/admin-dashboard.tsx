import React, { useState, useEffect, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Helmet } from "react-helmet";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
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
  Upload,
  Link,
  Share2,
  Bell,
  Shield,
  Truck,
  Store,
  TrendingUp,
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
  Grid,
  List,
  PieChart,
  Activity,
  Home,
  Menu,
  ShoppingBag,
  User,
  LogOut,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  ChevronLeft,
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
  CheckCircle,
  Save,
  MoreVertical,
  Printer,
  Wifi,
  ArrowLeft,
  Pause,
  ImageIcon,
  ExternalLink,
  AlertTriangle
} from "lucide-react";
import PayrollDashboard from "@/components/admin/payroll-dashboard";
import ScheduleCreator from "@/components/admin/schedule-creator";
import { TemplateEditor } from "@/components/admin/template-editor";
import { SystemSettings } from "@/components/admin/system-settings";
import FrontendCustomization from "@/components/admin/frontend-customization";

const AdminDashboard = () => {
  const { user, logoutMutation, isLoading } = useAuth();
  const { toast } = useToast();
  
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

    const [formData, setFormData] = useState({
      taxApplication: taxSettings.taxApplication || 'on_top',
      taxName: taxSettings.taxName || 'Sales Tax',
      deliveryFeeTaxRate: taxSettings.deliveryFeeTaxRate || '0',
      tipsTaxRate: taxSettings.tipsTaxRate || '0',
      serviceFeeTaxRate: taxSettings.serviceFeeTaxRate || '4.75',
      currency: taxSettings.currency || 'USD'
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

    const handleSaveSettings = () => {
      updateTaxSettingsMutation.mutate(formData);
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
  


  
  // Queries for different data
  const { data: orders, isLoading: ordersLoading } = useQuery({
    queryKey: ["/api/kitchen/orders"],
    refetchInterval: 30000,
  });

  const { data: menuItems, isLoading: menuLoading } = useQuery({
    queryKey: ["/api/menu"],
  });

  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useQuery({
    queryKey: ["/api/orders/analytics"],
    enabled: user?.isAdmin,
    retry: 3,
    onError: (error) => {
      console.error('Analytics query failed:', error);
    }
  });

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: user?.isAdmin,
  });

  const { data: printerStatus, isLoading: printerLoading } = useQuery({
    queryKey: ["/api/printer/status"],
    enabled: user?.isAdmin,
    refetchInterval: false, // Disabled polling to prevent backend refresh
  });

  // Scroll to top when activeTab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  // Validate activeTab - moved to after queries to prevent hook violations
  useEffect(() => {
    // Define tabs inline to avoid dependency issues
    const primaryTabsHrefs = ["dashboard", "orders"];
    const categoryTabsHrefs = [
      "analytics", "reports", 
      "menu-editor", "menu-images", "pricing", "out-of-stock", "multi-location",
      "frontend", "qr-codes", "widget", "smart-links", "printer", "receipt-templates", "scheduling", "reservations", 
      "vacation-mode", "delivery", "taxation",
      "promotions", "coupons", "promo-codes", "kickstarter", "email-campaigns", "sms-marketing", "local-seo",
      "customers", "users", "reviews",
      "employee-schedules", "payroll", "tip-settings",
      "api", "pos-integration", "integrations", "webhooks",
      "settings", "backup", "help"
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
      await apiRequest("PATCH", `/api/orders/${orderId}/status`, { status });
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

  // Redirect if not admin after authentication is complete
  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  // Only block loading for essential data, not analytics
  if (ordersLoading || menuLoading || usersLoading || printerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calculate statistics
  const totalOrders = (analytics as any)?.totalOrders || (orders as any[])?.length || 0;
  const pendingOrders = (orders as any[])?.filter((o: any) => o.status === "pending").length || 0;
  const processingOrders = (orders as any[])?.filter((o: any) => o.status === "processing").length || 0;
  const completedOrders = (orders as any[])?.filter((o: any) => o.status === "completed").length || 0;
  const totalMenuItems = (menuItems as any[])?.length || 0;
  const totalRevenue = (analytics as any)?.totalRevenue || "0.00";
  const averageOrderValue = (analytics as any)?.averageOrderValue || "0.00";
  const totalCustomers = (users as any[])?.filter((u: any) => u.role === "customer").length || 0;
  const totalEmployees = (users as any[])?.filter((u: any) => u.role === "employee").length || 0;

  // Primary tabs always visible
  const primaryTabs = [
    { name: "Overview", icon: Home, href: "dashboard" },
    { name: "Orders", icon: ShoppingCart, href: "orders" },
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
        { name: "Menu Images", icon: Image, href: "menu-images" },
        { name: "Pricing", icon: DollarSign, href: "pricing" },
        { name: "Out of Stock", icon: Package, href: "out-of-stock" },
        { name: "Multi-location", icon: Store, href: "multi-location" },
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
        { name: "Promotions", icon: Gift, href: "promotions" },
        { name: "Coupons", icon: Tag, href: "coupons" },
        { name: "Promo Codes", icon: Tag, href: "promo-codes" },
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
        { name: "Settings", icon: Settings, href: "settings" },
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
        <div className={`bg-white shadow-lg transition-all duration-300 z-50 ${
          sidebarCollapsed 
            ? 'w-16 md:w-16' 
            : 'w-64 md:w-64 fixed md:relative h-full md:h-auto'
        } ${sidebarCollapsed ? '' : 'md:translate-x-0'}`}>
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

          <nav className="p-4 space-y-3">
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
        <div className="flex-1 flex flex-col">
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
                    <Button variant="ghost" size="sm" onClick={handleLogout}>
                      <LogOut className="h-4 w-4" />
                    </Button>
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
                totalRevenue={(analytics as any)?.totalRevenue || 0}
                averageOrderValue={(analytics as any)?.averageOrderValue || 0}
                totalCustomers={(users as any[])?.filter((u: any) => u.role === "customer").length || 0}
                totalEmployees={(users as any[])?.filter((u: any) => u.role === "employee").length || 0}
                analytics={analytics}
                orders={orders}
              />
            )}
            
            {activeTab === "orders" && (
              <OrdersManagement orders={orders} onUpdateStatus={updateOrderStatus} />
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
            
            {activeTab === "promotions" && (
              <PromotionsManagement />
            )}
            
            {activeTab === "coupons" && (
              <CouponsManagement />
            )}
            
            {activeTab === "promo-codes" && (
              <PromoCodesManagement />
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

            {activeTab === "settings" && (
              <SystemSettings />
            )}
            

            
            {activeTab === "menu-images" && (
              <MenuImagesTab menuItems={menuItems} />
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

            {activeTab === "settings" && (
              <SettingsPanel />
            )}
          </main>
        </div>
      </div>
    </>
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
  orders 
}: any) => {
  // Use real analytics data or fallback to default
  const analyticsData = React.useMemo(() => {
    if (!analytics || !orders) {
      return {
        revenue: { total: 0, change: 0, trend: "up", daily: [100,200,150,300,250,400,350] },
        orders: { total: 0, change: 0, trend: "up", daily: [10,20,15,30,25,40,35] },
        customers: { total: 0, change: 0, trend: "up", daily: [5,8,6,12,10,15,14] },
        averageOrder: { total: 0, change: 0, trend: "up", daily: [10,25,25,25,25,27,25] }
      };
    }

    // Use real analytics data if available
    return analytics.dailyData || {
      revenue: { total: analytics.totalRevenue || 0, change: 5, trend: "up", daily: [100,200,150,300,250,400,350] },
      orders: { total: orders.length || 0, change: 8, trend: "up", daily: [10,20,15,30,25,40,35] },
      customers: { total: totalCustomers || 0, change: 3, trend: "up", daily: [5,8,6,12,10,15,14] },
      averageOrder: { total: averageOrderValue || 0, change: 2, trend: "up", daily: [10,25,25,25,25,27,25] }
    };
  }, [analytics, orders, totalCustomers, averageOrderValue]);

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
            <CardTitle className="text-sm font-medium">PERFORMANCE</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">49.65%</div>
            <p className="text-xs text-green-600 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              +12% Since last month
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
const OrdersManagement = ({ orders, onUpdateStatus }: any) => {
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
  const { toast } = useToast();

  const filteredOrders = (orders as any[])?.filter((order: any) => {
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    const matchesSearch = order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id?.toString().includes(searchTerm) ||
                         order.items?.some((item: any) => item.name?.toLowerCase().includes(searchTerm.toLowerCase()));
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <th className="text-left py-3 px-4 font-medium">Time</th>
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
                          {order.items?.slice(0, 2).map((item: any) => item.name).join(", ")}
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
                      {new Date(order.createdAt).toLocaleTimeString()}
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
                        <p className="font-medium">{item.name}</p>
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
    if (!analytics || !orders) {
      return {
        revenue: { total: 0, change: 0, trend: "up", daily: [0,0,0,0,0,0,0] },
        orders: { total: 0, change: 0, trend: "up", daily: [0,0,0,0,0,0,0] },
        customers: { total: 0, change: 0, trend: "up", daily: [0,0,0,0,0,0,0] },
        averageOrder: { total: 0, change: 0, trend: "up", daily: [0,0,0,0,0,0,0] }
      };
    }

    // Calculate daily data from orders
    const now = new Date();
    const dailyData = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      
      const dayOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= dayStart && orderDate < dayEnd;
      });
      
      return {
        orders: dayOrders.length,
        revenue: (dayOrders || []).reduce((sum: number, order: any) => sum + parseFloat(order.total || 0), 0),
        customers: new Set(dayOrders.map((order: any) => order.userId)).size
      };
    });

    const totalRevenue = parseFloat(analytics.totalRevenue || 0);
    const totalOrders = parseInt(analytics.totalOrders || 0);
    const avgOrderValue = parseFloat(analytics.averageOrderValue || 0);
    const uniqueCustomers = new Set(orders.map((order: any) => order.userId)).size;

    return {
      revenue: {
        total: totalRevenue,
        change: 0, // TODO: Calculate change from previous period
        trend: "up",
        daily: dailyData.map(d => d.revenue)
      },
      orders: {
        total: totalOrders,
        change: 0, // TODO: Calculate change from previous period
        trend: "up",
        daily: dailyData.map(d => d.orders)
      },
      customers: {
        total: uniqueCustomers,
        change: 0, // TODO: Calculate change from previous period
        trend: "up",
        daily: dailyData.map(d => d.customers)
      },
      averageOrder: {
        total: avgOrderValue,
        change: 0, // TODO: Calculate change from previous period
        trend: "up",
        daily: dailyData.map(d => d.orders > 0 ? d.revenue / d.orders : 0)
      }
    };
  }, [analytics, orders]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getTrendIcon = (trend: string) => {
    return trend === "up" ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
  };

  const getTrendColor = (trend: string) => {
    return trend === "up" ? "text-green-600" : "text-red-600";
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
          
          <Button variant="outline">
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

        {/* Orders Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Orders Trend</CardTitle>
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

      {/* Top Items and Customer Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Items */}
        <Card>
          <CardHeader>
            <CardTitle>Top Selling Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics?.topSellingItems && analytics.topSellingItems.length > 0 ? (
                analytics.topSellingItems.map((item: any, index: number) => (
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
            {analytics?.customerInsights && analytics.customerInsights.totalCustomers > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                  <div>
                    <p className="font-medium">Repeat Customers</p>
                    <p className="text-sm text-gray-600">Customers who ordered more than once</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">{analytics.customerInsights.repeatCustomerPercentage}%</p>
                    <p className="text-sm text-gray-500">of total customers</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded">
                  <div>
                    <p className="font-medium">Total Customers</p>
                    <p className="text-sm text-gray-600">Unique customers who have ordered</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-600">{analytics.customerInsights.totalCustomers}</p>
                    <p className="text-sm text-gray-500">customers</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded">
                  <div>
                    <p className="font-medium">Average Orders per Customer</p>
                    <p className="text-sm text-gray-600">Average orders placed per customer</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-purple-600">{analytics.customerInsights.avgOrdersPerCustomer}</p>
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
  const [expandedChoices, setExpandedChoices] = useState<Set<number>>(new Set());
  const [isCreateChoiceOpen, setIsCreateChoiceOpen] = useState(false);
  const [editingChoice, setEditingChoice] = useState<any>(null);
  const [newChoiceData, setNewChoiceData] = useState({ name: '', description: '' });
  const [editingChoiceData, setEditingChoiceData] = useState({ name: '', description: '' });
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
    isDefault: false 
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      refetchCategories(); // Explicit refetch
      toast({ title: "Success", description: "Category updated successfully!" });
      setEditingCategory(null);
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
    setItemChoices(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), choiceId]
    }));
  };

  const removeChoiceFromItem = (itemId: number, choiceId: number) => {
    setItemChoices(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || []).filter(id => id !== choiceId)
    }));
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
      data: { order: targetOrder } 
    });

    // Update target category with dragged category's order
    updateCategoryMutation.mutate({ 
      id: targetCategoryId, 
      data: { order: draggedOrder } 
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
    deleteCategoryMutation.mutate(id);
  };

  const toggleCategoryStatus = (id: number) => {
    const category = categories.find(cat => cat.id === id);
    if (category) {
      updateCategoryMutation.mutate({ 
        id, 
        data: { isActive: !category.isActive } 
      });
    }
  };

  // Choices & Addons management with API
  const { data: choiceGroups = [], refetch: refetchChoiceGroups } = useQuery({
    queryKey: ['choice-groups'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/choice-groups');
      return response.json();
    }
  });

  const { data: choiceItems = [], refetch: refetchChoiceItems } = useQuery({
    queryKey: ['choice-items'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/choice-items');
      return response.json();
    }
  });

  const { data: categoryChoiceGroups = [] } = useQuery({
    queryKey: ['category-choice-groups'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/category-choice-groups');
      return response.json();
    }
  });

  // Load existing category choice group assignments
  React.useEffect(() => {
    const groupedChoices: {[key: string]: number[]} = {};
    categoryChoiceGroups.forEach((ccg: any) => {
      if (!groupedChoices[ccg.categoryName]) {
        groupedChoices[ccg.categoryName] = [];
      }
      groupedChoices[ccg.categoryName].push(ccg.choiceGroupId);
    });
    setCategoryChoices(groupedChoices);
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
        ccg.categoryName === data.categoryName && ccg.choiceGroupId === data.choiceGroupId
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
      updateChoiceGroupMutation.mutate({ 
        id, 
        data: { isActive: !choice.isActive } 
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

  const handleUpdateChoiceItem = (id: number, data: any) => {
    updateChoiceItemMutation.mutate({ id, data });
    setEditingChoiceItem(null);
    setEditingChoiceItemData({ name: '', description: '', price: '0.00', isDefault: false });
  };

  const handleEditChoiceItem = (item: any) => {
    setEditingChoiceItem(item);
    setEditingChoiceItemData({
      name: item.name,
      description: item.description || '',
      price: item.price || '0.00',
      isDefault: item.isDefault || false
    });
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
    .filter((choice: any) => choice.isActive)
    .sort((a: any, b: any) => a.order - b.order);

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
                    ? formatCurrency((menuItems || []).reduce((sum: number, item: any) => sum + (item.basePrice || 0), 0) / menuItems.length)
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

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Menu Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {sortedCategories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>{category.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item: any) => (
              <Card key={item.id} className="overflow-hidden">
                <div className="aspect-video bg-gray-200 flex items-center justify-center">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Pizza className="h-12 w-12 text-gray-400" />
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{item.name}</h3>
                    <Badge variant={item.isAvailable !== false ? "default" : "secondary"}>
                      {item.isAvailable !== false ? "Available" : "Unavailable"}
                    </Badge>
                  </div>
                  <p className="text-gray-600 text-sm mb-2">{item.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">{formatCurrency(item.basePrice || 0)}</span>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingItem(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteMenuItemMutation.mutate(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No menu items found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>

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
                              className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => handleItemDrop(e, item.id)}
                            >
                                                              <div className="flex items-center space-x-3">
                                  <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
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
                                  <div className="flex-1">
                                    <h4 className="font-medium">{item.name}</h4>
                                    {item.description && (
                                      <p className="text-sm text-gray-500">{item.description}</p>
                                    )}
                                    <AssignedChoices 
                                      choiceIds={itemChoices[item.id] || []}
                                      onRemove={(choiceId) => removeChoiceFromItem(item.id, choiceId)}
                                    />
                                  </div>
                                </div>
                              <div className="flex items-center space-x-3">
                                <span className="font-semibold">{formatCurrency(item.basePrice || 0)}</span>
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
                            {choice.isActive ? "Deactivate" : "Activate"}
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
                                          setEditingChoiceItemData({ name: '', description: '', price: '0.00', isDefault: false });
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Manage Menu Categories</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">Drag and drop categories to reorder them</p>
              <Button onClick={() => setIsCreateCategoryOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            </div>
            
            <div className="space-y-2">
              {categories.map((category) => (
                <div
                  key={category.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, category.id)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, category.id)}
                  className="flex items-center justify-between p-4 border rounded-lg bg-white hover:bg-gray-50 cursor-move transition-opacity duration-200"
                >
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
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleCategoryStatus(category.id)}
                    >
                      {category.isActive ? "Deactivate" : "Activate"}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteCategory(category.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
            <div className="flex space-x-2">
              <Button 
                onClick={() => {
                  if (newChoiceData.name) {
                    handleCreateChoice(newChoiceData);
                    setNewChoiceData({ name: '', description: '' });
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
              <div className="flex space-x-2">
                <Button 
                  onClick={() => {
                    if (editingChoiceData.name) {
                      handleUpdateChoice(editingChoice.id, editingChoiceData);
                      setEditingChoiceData({ name: '', description: '' });
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
  const [qrCodes, setQrCodes] = useState([
    { id: 1, name: "Table 1", code: "table-1", url: "https://favillas.com/order?table=1", isActive: true },
    { id: 2, name: "Table 2", code: "table-2", url: "https://favillas.com/order?table=2", isActive: true },
    { id: 3, name: "Table 3", code: "table-3", url: "https://favillas.com/order?table=3", isActive: false },
    { id: 4, name: "Bar Counter", code: "bar-1", url: "https://favillas.com/order?table=bar", isActive: true },
  ]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingQR, setEditingQR] = useState<any>(null);

  const generateQRCode = (url: string) => {
    // In a real implementation, this would generate an actual QR code
    // For now, we'll use a placeholder
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
  };

  const handleCreateQR = (data: any) => {
    const newQR = {
      id: Date.now(),
      ...data,
      url: `https://favillas.com/order?table=${data.code}`,
      isActive: true
    };
    setQrCodes([...qrCodes, newQR]);
    setIsCreateDialogOpen(false);
  };

  const handleUpdateQR = (id: number, data: any) => {
    setQrCodes(qrCodes.map(qr => 
      qr.id === id 
        ? { ...qr, ...data, url: `https://favillas.com/order?table=${data.code}` }
        : qr
    ));
    setEditingQR(null);
  };

  const handleDeleteQR = (id: number) => {
    setQrCodes(qrCodes.filter(qr => qr.id !== id));
  };

  const toggleQRStatus = (id: number) => {
    setQrCodes(qrCodes.map(qr => 
      qr.id === id ? { ...qr, isActive: !qr.isActive } : qr
    ));
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
                  {qrCodes.filter(qr => qr.isActive).length}
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
                  {qrCodes.filter(qr => !qr.isActive).length}
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
                <p className="text-sm font-medium text-gray-600">Scans Today</p>
                <p className="text-2xl font-bold text-purple-600">24</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {qrCodes.map((qr) => (
              <Card key={qr.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="mb-4">
                      <img 
                        src={generateQRCode(qr.url)} 
                        alt={`QR Code for ${qr.name}`}
                        className="w-32 h-32 mx-auto border rounded"
                      />
                    </div>
                    
                    <h3 className="font-semibold text-lg mb-2">{qr.name}</h3>
                    <p className="text-sm text-gray-600 mb-2">Code: {qr.code}</p>
                    
                    <Badge variant={qr.isActive ? "default" : "secondary"} className="mb-4">
                      {qr.isActive ? "Active" : "Inactive"}
                    </Badge>
                    
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
                        onClick={() => toggleQRStatus(qr.id)}
                      >
                        {qr.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          navigator.clipboard.writeText(qr.url);
                          // Show toast notification
                        }}
                      >
                        <Link className="h-4 w-4 mr-2" />
                        Copy URL
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDeleteQR(qr.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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

const SmartLinks = () => (
  <Card>
    <CardHeader>
      <CardTitle>Smart Links for Social & Google</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-gray-500">Create embeddable ordering links for Facebook, Instagram, Yelp, and Google Business Profile.</p>
    </CardContent>
  </Card>
);

const OrderScheduling = () => (
  <Card>
    <CardHeader>
      <CardTitle>Order Scheduling ("Order for Later")</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-gray-500">Allow customers to choose fulfillment time for pickup or delivery.</p>
    </CardContent>
  </Card>
);

const TableReservations = () => (
  <Card>
    <CardHeader>
      <CardTitle>Table Reservations & Pre-ordering</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-gray-500">Integrate booking with ordering features for complete restaurant management.</p>
    </CardContent>
  </Card>
);

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

const OutOfStockManagement = ({ menuItems }: any) => (
  <Card>
    <CardHeader>
      <CardTitle>Out-of-Stock Management</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-gray-500">Mark menu items or add-ons as unavailable for a set period.</p>
    </CardContent>
  </Card>
);

const DeliveryOptions = () => (
  <Card>
    <CardHeader>
      <CardTitle>Contactless Delivery & Curbside Pickup</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-gray-500">Offer safe fulfillment modes with contactless delivery and curbside pickup options.</p>
    </CardContent>
  </Card>
);

const PromotionsManagement = () => {
  const { toast } = useToast();
  
  // Fetch promo codes from API
  const { data: promoCodes = [], isLoading, refetch } = useQuery({
    queryKey: ["/api/promo-codes"],
    queryFn: async () => {
      const response = await fetch("/api/promo-codes", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch promo codes");
      }
      return response.json();
    },
  });

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<any>(null);

  const createPromotionMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/promo-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log("Server error response:", errorData);
        
        // Handle different error response formats
        let errorMessage = "Failed to create promo code";
        if (errorData.message) {
          if (typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          } else if (Array.isArray(errorData.message)) {
            errorMessage = errorData.message.map((err: any) => 
              typeof err === 'string' ? err : err.message || JSON.stringify(err)
            ).join(', ');
          } else {
            errorMessage = errorData.message.message || JSON.stringify(errorData.message);
          }
        }
        
        throw new Error(errorMessage);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Promo code created",
        description: "Promo code has been created successfully.",
      });
      refetch();
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      console.log("Error object:", error);
      console.log("Error message:", error.message);
      console.log("Error message type:", typeof error.message);
      console.log("Error message stringified:", JSON.stringify(error.message));
      
      let errorMessage = "Failed to create promo code";
      
      // Extract error message from various possible formats
      if (error?.message) {
        if (typeof error.message === 'string') {
          errorMessage = error.message;
        } else if (Array.isArray(error.message)) {
          // Handle array of validation errors
          errorMessage = error.message.map((err: any) => 
            typeof err === 'string' ? err : err.message || JSON.stringify(err)
          ).join(', ');
        } else {
          // If it's an object, try to get the message property or stringify it
          errorMessage = error.message.message || JSON.stringify(error.message);
        }
      }
      
      // Clean up the error message - remove any [object Object] patterns
      errorMessage = errorMessage.replace(/\[object Object\]/g, 'Invalid data');
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const updatePromotionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(`/api/promo-codes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.log("Server error response (update):", errorData);
        
        // Handle different error response formats
        let errorMessage = "Failed to update promo code";
        if (errorData.message) {
          if (typeof errorData.message === 'string') {
            errorMessage = errorData.message;
          } else if (Array.isArray(errorData.message)) {
            errorMessage = errorData.message.map((err: any) => 
              typeof err === 'string' ? err : err.message || JSON.stringify(err)
            ).join(', ');
          } else {
            errorMessage = errorData.message.message || JSON.stringify(errorData.message);
          }
        }
        
        throw new Error(errorMessage);
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Promo code updated",
        description: "Promo code has been updated successfully.",
      });
      refetch();
      setEditingPromotion(null);
    },
    onError: (error: any) => {
      console.log("Update error object:", error);
      console.log("Update error message:", error.message);
      
      let errorMessage = "Failed to update promo code";
      
      // Extract error message from various possible formats
      if (error?.message) {
        if (typeof error.message === 'string') {
          errorMessage = error.message;
        } else if (Array.isArray(error.message)) {
          // Handle array of validation errors
          errorMessage = error.message.map((err: any) => 
            typeof err === 'string' ? err : err.message || JSON.stringify(err)
          ).join(', ');
        } else {
          // If it's an object, try to get the message property or stringify it
          errorMessage = error.message.message || JSON.stringify(error.message);
        }
      }
      
      // Clean up the error message - remove any [object Object] patterns
      errorMessage = errorMessage.replace(/\[object Object\]/g, 'Invalid data');
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const deletePromotionMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/promo-codes/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete promo code");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Promo code deleted",
        description: "Promo code has been deleted successfully.",
      });
      refetch();
    },
    onError: (error: any) => {
      let errorMessage = "Failed to delete promo code";
      
      // Extract error message from various possible formats
      if (error?.message) {
        if (typeof error.message === 'string') {
          errorMessage = error.message;
        } else {
          // If it's an object, try to get the message property or stringify it
          errorMessage = error.message.message || error.message.toString();
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleCreatePromotion = (data: any) => {
    createPromotionMutation.mutate(data);
  };

  const handleUpdatePromotion = (id: number, data: any) => {
    updatePromotionMutation.mutate({ id, data });
  };

  const handleDeletePromotion = (id: number) => {
    deletePromotionMutation.mutate(id);
  };

  const togglePromotionStatus = (id: number) => {
    const promo = promoCodes.find((p: any) => p.id === id);
    if (promo) {
      updatePromotionMutation.mutate({ 
        id, 
        data: { isActive: !promo.isActive } 
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Promotions & Coupons</h2>
          <p className="text-gray-600">Create and manage promotional offers to drive sales</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Promotion
        </Button>
      </div>          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Promotions</p>
                    <p className="text-2xl font-bold text-gray-900">{promoCodes.length}</p>
                  </div>
                  <Gift className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active</p>
                    <p className="text-2xl font-bold text-green-600">
                      {promoCodes.filter((p: any) => p.isActive).length}
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
                    <p className="text-sm font-medium text-gray-600">Total Usage</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {(promoCodes || []).reduce((sum: number, p: any) => sum + (p.currentUses || 0), 0)}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Revenue Impact</p>
                    <p className="text-2xl font-bold text-orange-600">$2,450</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Promotions Table */}
          <Card>
            <CardHeader className="flex justify-between items-center">
              <CardTitle>Active Promotions</CardTitle>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Promotion
              </Button>
            </CardHeader>
            <CardContent>
              {promoCodes.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No promotions yet</h3>
                  <p className="text-gray-500 mb-6">Create your first promotion to start driving sales and attracting customers.</p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Promotion
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto mobile-scroll-container touch-pan-x">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Name</th>
                        <th className="text-left py-3 px-4 font-medium">Code</th>
                        <th className="text-left py-3 px-4 font-medium">Discount</th>
                        <th className="text-left py-3 px-4 font-medium">Min Order</th>
                        <th className="text-left py-3 px-4 font-medium">Usage</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-left py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promoCodes.map((promotion: any) => (
                        <tr key={promotion.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium">{promotion.name}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(promotion.startDate).toLocaleDateString()} - {new Date(promotion.endDate).toLocaleDateString()}
                              </p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <code className="bg-gray-100 px-2 py-1 rounded text-sm">{promotion.code}</code>
                          </td>
                                                  <td className="py-3 px-4">
                          <span className="font-medium">
                            {promotion.discountType === "percentage" ? `${promotion.discount}%` : formatCurrency(Number(promotion.discount))}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {formatCurrency(Number(promotion.minOrderAmount))}
                        </td>
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium">{promotion.currentUses || 0}/{promotion.maxUses}</p>
                            <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                              <div 
                                className="bg-blue-600 h-2 rounded-full" 
                                style={{ width: `${((promotion.currentUses || 0) / promotion.maxUses) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                          <td className="py-3 px-4">
                            <Badge variant={promotion.isActive ? "default" : "secondary"}>
                              {promotion.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingPromotion(promotion)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => togglePromotionStatus(promotion.id)}
                              >
                                {promotion.isActive ? "Deactivate" : "Activate"}
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeletePromotion(promotion.id)}
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


      {/* Create Promotion Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Promotion</DialogTitle>
          </DialogHeader>
          
          <CreatePromotionForm
            onSubmit={handleCreatePromotion}
            onCancel={() => setIsCreateDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Promotion Dialog */}
      <Dialog open={!!editingPromotion} onOpenChange={() => setEditingPromotion(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Promotion</DialogTitle>
          </DialogHeader>
          
          {editingPromotion && (
            <EditPromotionForm
              promotion={editingPromotion}
              onSubmit={(data) => handleUpdatePromotion(editingPromotion.id, data)}
              onCancel={() => setEditingPromotion(null)}
            />
          )}
        </DialogContent>
      </Dialog>


    </div>
  );
};

const CouponsManagement = () => (
  <Card>
    <CardHeader>
      <CardTitle>Coupons & Discounts</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-gray-500">Manage coupon codes, percentage discounts, and promotional offers.</p>
    </CardContent>
  </Card>
);

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
                          {printer.isPrimary && (
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
                      {!printer.isPrimary && (
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

  const [activeSection, setActiveSection] = useState("general");

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    // In a real app, this would save to the backend
    console.log("Saving settings:", settings);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
          <p className="text-gray-600">Configure your restaurant settings and preferences</p>
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
                          </div>
                          <Badge variant="default">Connected</Badge>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Google Business Profile</h4>
                            <p className="text-sm text-gray-600">Sync with Google Business Profile</p>
                          </div>
                          <Button variant="outline" size="sm">Connect</Button>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Facebook Business</h4>
                            <p className="text-sm text-gray-600">Connect Facebook Business account</p>
                          </div>
                          <Button variant="outline" size="sm">Connect</Button>
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

  // Discover printers mutation
  const discoverMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/printer/discover');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to discover printers');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      const foundCount = data.printers?.length || 0;
      toast({
        title: "Discovery Complete",
        description: `Found ${foundCount} printer(s) on the network.`,
      });
      
      if (foundCount > 0) {
        // Show discovered printers in toast or modal
        console.log('Discovered printers:', data.printers);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Discovery Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleDiscoverPrinters = () => {
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
    options: item.options || {
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
      
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="edit-isAvailable"
          checked={formData.isAvailable}
          onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
        />
        <Label htmlFor="edit-isAvailable">Available for ordering</Label>
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
    code: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="qr-name">Name</Label>
        <Input
          id="qr-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Table 1, Bar Counter"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="qr-code">Code</Label>
        <Input
          id="qr-code"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          placeholder="e.g., table-1, bar-counter"
          required
        />
      </div>
      
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
    code: qrCode.code || ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="edit-qr-name">Name</Label>
        <Input
          id="edit-qr-name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Table 1, Bar Counter"
          required
        />
      </div>
      
      <div>
        <Label htmlFor="edit-qr-code">Code</Label>
        <Input
          id="edit-qr-code"
          value={formData.code}
          onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          placeholder="e.g., table-1, bar-counter"
          required
        />
      </div>
      
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
    name: category.name || ""
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

// User Management Tab Component (keeping the existing implementation)
const UserManagementTab = () => {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

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

  // Filter users
  const filteredUsers = (users as any[])?.filter((user: any) => {
    const matchesSearch = 
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase());
    
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
                        <div className="text-sm text-gray-500">@{user.username}</div>
                      </div>
                    </td>
                    <td className="p-2">{user.email}</td>
                    <td className="p-2">
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role?.replace('_', ' ').toUpperCase()}
                      </Badge>
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
    </div>
  );
};

// Create User Form Component
const CreateUserForm = ({ onSubmit }: { onSubmit: (data: any) => void }) => {
  const [formData, setFormData] = useState({
    username: "",
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
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
          required
        />
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
      currentUses: 150,
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
      currentUses: 75,
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
      currentUses: 45,
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

  if (!analytics || !orders) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-500">Loading analytics data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Calculate order status breakdown
  const statusBreakdown = (orders || []).reduce((acc: any, order: any) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {});

  // Calculate order type breakdown
  const typeBreakdown = (orders || []).reduce((acc: any, order: any) => {
    acc[order.orderType] = (acc[order.orderType] || 0) + 1;
    return acc;
  }, {});

  // Calculate revenue by day
  const revenueByDay = (orders || []).reduce((acc: any, order: any) => {
    const date = new Date(order.createdAt).toDateString();
    acc[date] = (acc[date] || 0) + parseFloat(order.total || 0);
    return acc;
  }, {});

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
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Total Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analytics.totalOrders || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(parseFloat(analytics.totalRevenue || 0))}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Average Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(parseFloat(analytics.averageOrderValue || 0))}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-500">Unique Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{new Set(orders.map((o: any) => o.userId)).size}</p>
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
                        style={{ width: `${(count as number / orders.length) * 100}%` }}
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
                        style={{ width: `${(count as number / orders.length) * 100}%` }}
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
                  {orders.slice(0, 10).map((order: any) => (
                    <tr key={order.id} className="border-b">
                      <td className="py-2">#{order.id}</td>
                      <td className="py-2">{formatDate(order.createdAt)}</td>
                      <td className="py-2 capitalize">{order.orderType}</td>
                      <td className="py-2">
                        <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-2">{formatCurrency(parseFloat(order.total || 0))}</td>
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

// Menu Images Management Tab
const MenuImagesTab = ({ menuItems }: { menuItems: any[] }) => {
  const [selectedImages, setSelectedImages] = useState<{ [key: number]: File }>({});
  const [uploadProgress, setUploadProgress] = useState<{ [key: number]: number }>({});
  const { toast } = useToast();

  const handleImageUpload = async (menuItemId: number, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      setUploadProgress(prev => ({ ...prev, [menuItemId]: 0 }));
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => ({
          ...prev,
          [menuItemId]: Math.min((prev[menuItemId] || 0) + 10, 90)
        }));
      }, 100);

      // In a real implementation, this would upload to your image storage service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearInterval(progressInterval);
      setUploadProgress(prev => ({ ...prev, [menuItemId]: 100 }));
      
      // Update menu item with new image URL
      await apiRequest("PATCH", `/api/menu-items/${menuItemId}`, {
        imageUrl: URL.createObjectURL(file)
      });

      toast({
        title: "Image Uploaded",
        description: "Menu item image has been updated successfully.",
      });

      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[menuItemId];
          return newProgress;
        });
      }, 1000);

    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Menu Images Management</h3>
        <div className="text-sm text-gray-500">
          {menuItems?.length || 0} menu items
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems?.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <div className="relative h-48 bg-gray-100">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <ImageIcon className="h-12 w-12" />
                </div>
              )}
              {uploadProgress[item.id] !== undefined && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="text-lg font-medium">{uploadProgress[item.id]}%</div>
                    <div className="w-32 h-2 bg-gray-700 rounded-full mt-2">
                      <div 
                        className="h-full bg-white rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress[item.id]}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <h4 className="font-medium text-lg truncate">{item.name}</h4>
              <p className="text-sm text-gray-500 mb-3">{item.category}</p>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedImages(prev => ({ ...prev, [item.id]: file }));
                      handleImageUpload(item.id, file);
                    }
                  }}
                  className="text-sm"
                />
                {item.imageUrl && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => window.open(item.imageUrl, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Full Size
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!menuItems?.length && (
        <div className="text-center py-12">
          <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No menu items found</h3>
          <p className="text-gray-500">Add menu items first to manage their images.</p>
        </div>
      )}
    </div>
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
  const [locations, setLocations] = useState([
    {
      id: 1,
      name: "Main Location",
      address: "123 Main Street, New York, NY 10001",
      phone: "(555) 123-4567",
      isActive: true,
      deliveryRadius: 5,
      minOrder: 15.00
    }
  ]);
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    deliveryRadius: "",
    minOrder: ""
  });

  const handleAddLocation = () => {
    const newLocation = {
      id: Date.now(),
      name: formData.name,
      address: formData.address,
      phone: formData.phone,
      isActive: true,
      deliveryRadius: parseFloat(formData.deliveryRadius),
      minOrder: parseFloat(formData.minOrder)
    };

    setLocations([...locations, newLocation]);
    setFormData({ name: "", address: "", phone: "", deliveryRadius: "", minOrder: "" });
    setIsAddingLocation(false);
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
                <Button variant="outline" size="sm" className="flex-1">
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

      {/* Add Location Dialog */}
      <Dialog open={isAddingLocation} onOpenChange={setIsAddingLocation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Location</DialogTitle>
            <DialogDescription>
              Enter the details for your new restaurant location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="location-name">Location Name</Label>
              <Input
                id="location-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Downtown Branch"
              />
            </div>
            <div>
              <Label htmlFor="location-address">Address</Label>
              <Input
                id="location-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="456 Downtown Ave, City, State 12345"
              />
            </div>
            <div>
              <Label htmlFor="location-phone">Phone</Label>
              <Input
                id="location-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 987-6543"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="delivery-radius">Delivery Radius (miles)</Label>
                <Input
                  id="delivery-radius"
                  type="number"
                  value={formData.deliveryRadius}
                  onChange={(e) => setFormData({ ...formData, deliveryRadius: e.target.value })}
                  placeholder="5"
                />
              </div>
              <div>
                <Label htmlFor="min-order">Minimum Order ($)</Label>
                <Input
                  id="min-order"
                  type="number"
                  step="0.01"
                  value={formData.minOrder}
                  onChange={(e) => setFormData({ ...formData, minOrder: e.target.value })}
                  placeholder="15.00"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddingLocation(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddLocation}>
                Add Location
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
  const [campaigns, setCampaigns] = useState([
    {
      id: 1,
      name: "Weekly Specials",
      subject: "Don't Miss This Week's Pizza Specials!",
      status: "sent",
      recipients: 1250,
      openRate: 32.5,
      clickRate: 8.2,
      sentAt: "2024-01-15T10:00:00Z"
    },
    {
      id: 2,
      name: "New Menu Items",
      subject: "Try Our New Gourmet Pizza Collection",
      status: "draft",
      recipients: 0,
      openRate: 0,
      clickRate: 0,
      sentAt: null
    }
  ]);

  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    subject: "",
    content: "",
    audienceType: "all"
  });

  const marketingOptInUsers = users?.filter(user => user.marketingOptIn && user.role === "customer") || [];

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <div className="text-sm text-gray-500">Total Campaigns</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{marketingOptInUsers.length}</div>
            <div className="text-sm text-gray-500">Subscribers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">28.3%</div>
            <div className="text-sm text-gray-500">Avg Open Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">6.8%</div>
            <div className="text-sm text-gray-500">Avg Click Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Campaigns List */}
      <Card>
        <CardHeader>
          <CardTitle>Email Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
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
                        <Button variant="outline" size="sm">
                          {campaign.status === "draft" ? "Edit" : "View"}
                        </Button>
                        {campaign.status === "draft" && (
                          <Button size="sm">Send</Button>
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

      {/* Create Campaign Dialog */}
      <Dialog open={isCreatingCampaign} onOpenChange={setIsCreatingCampaign}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Email Campaign</DialogTitle>
            <DialogDescription>
              Create a new email campaign to send to your customers.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
                placeholder="Check out our latest offers!"
              />
            </div>
            <div>
              <Label htmlFor="audience">Audience</Label>
              <Select value={formData.audienceType} onValueChange={(value) => setFormData({ ...formData, audienceType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subscribers ({marketingOptInUsers.length})</SelectItem>
                  <SelectItem value="recent">Recent Customers</SelectItem>
                  <SelectItem value="inactive">Inactive Customers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="email-content">Email Content</Label>
              <Textarea
                id="email-content"
                rows={8}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your email content here..."
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsCreatingCampaign(false)}>
                Cancel
              </Button>
              <Button variant="outline">Save as Draft</Button>
              <Button>Send Campaign</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// SMS Marketing Tab
const SMSMarketingTab = ({ users }: { users: any[] }) => {
  const [campaigns, setCampaigns] = useState([
    {
      id: 1,
      name: "Flash Sale Alert",
      message: "🍕 FLASH SALE: 20% off all pizzas today only! Order now: favillas.com/order",
      status: "sent",
      recipients: 850,
      deliveryRate: 98.2,
      responseRate: 12.5,
      sentAt: "2024-01-15T15:30:00Z"
    }
  ]);

  const usersWithPhone = users?.filter(user => user.phone && user.marketingOptIn && user.role === "customer") || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">SMS Marketing</h3>
        <Button>
          <MessageSquare className="h-4 w-4 mr-2" />
          Create SMS Campaign
        </Button>
      </div>

      {/* SMS Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <div className="text-sm text-gray-500">SMS Campaigns</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{usersWithPhone.length}</div>
            <div className="text-sm text-gray-500">Phone Subscribers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">98.2%</div>
            <div className="text-sm text-gray-500">Delivery Rate</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">12.5%</div>
            <div className="text-sm text-gray-500">Response Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick SMS Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick SMS Templates</CardTitle>
          <CardDescription>Pre-built templates for common campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-medium">Flash Sale</h4>
              <p className="text-sm text-gray-600">🍕 FLASH SALE: [X]% off all pizzas today only! Order: [link]</p>
              <Button variant="outline" size="sm">Use Template</Button>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-medium">New Menu Item</h4>
              <p className="text-sm text-gray-600">🆕 Try our new [item name]! Limited time offer: [link]</p>
              <Button variant="outline" size="sm">Use Template</Button>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-medium">Order Ready</h4>
              <p className="text-sm text-gray-600">✅ Your order #[order] is ready for pickup!</p>
              <Button variant="outline" size="sm">Use Template</Button>
            </div>
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-medium">Loyalty Reward</h4>
              <p className="text-sm text-gray-600">🎉 You've earned a reward! Get [reward] on your next order: [link]</p>
              <Button variant="outline" size="sm">Use Template</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SMS Campaigns List */}
      <Card>
        <CardHeader>
          <CardTitle>SMS Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto mobile-scroll-container touch-pan-x">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Campaign</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Recipients</th>
                  <th className="text-left py-2">Delivery Rate</th>
                  <th className="text-left py-2">Response Rate</th>
                  <th className="text-left py-2">Sent Date</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b">
                    <td className="py-2">
                      <div>
                        <div className="font-medium">{campaign.name}</div>
                        <div className="text-sm text-gray-500 max-w-md truncate">{campaign.message}</div>
                      </div>
                    </td>
                    <td className="py-2">
                      <Badge variant="default">{campaign.status}</Badge>
                    </td>
                    <td className="py-2">{campaign.recipients.toLocaleString()}</td>
                    <td className="py-2">{campaign.deliveryRate}%</td>
                    <td className="py-2">{campaign.responseRate}%</td>
                    <td className="py-2">
                      {new Date(campaign.sentAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* SMS Compliance Notice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
            SMS Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• Always include your business name in SMS messages</p>
            <p>• Provide clear opt-out instructions (Reply STOP to unsubscribe)</p>
            <p>• Only send to customers who have explicitly opted in</p>
            <p>• Respect quiet hours (typically 8 AM - 9 PM local time)</p>
            <p>• Keep messages under 160 characters when possible</p>
          </div>
        </CardContent>
      </Card>
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
                <code className="text-sm">/api/orders/{id}/status</code>
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

export default AdminDashboard;
