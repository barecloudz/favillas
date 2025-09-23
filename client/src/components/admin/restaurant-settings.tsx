import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, Store, Mail, Phone, MapPin, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface RestaurantSettings {
  id?: number;
  restaurantName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  currency: string;
  timezone: string;
  deliveryFee: string;
  minimumOrder: string;
  autoAcceptOrders: boolean;
  sendOrderNotifications: boolean;
  sendCustomerNotifications: boolean;
  outOfStockEnabled: boolean;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  orderSchedulingEnabled: boolean;
  maxAdvanceOrderHours: number;
  createdAt?: string;
  updatedAt?: string;
}

export function RestaurantSettings() {
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  // Fetch restaurant settings - use working Express route for now
  const { data: settingsData, isLoading, error } = useQuery({
    queryKey: ['/api/restaurant-settings'],
    queryFn: async () => {
      console.log('🔄 Fetching restaurant settings...');
      const response = await apiRequest('GET', '/api/restaurant-settings');
      console.log('📡 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`Failed to fetch restaurant settings: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Settings data received:', data);
      return data;
    }
  });

  // Add error logging
  if (error) {
    console.error('❌ Query error:', error);
  }

  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData);
    }
  }, [settingsData]);

  // Update settings mutation - use working Express route for now
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<RestaurantSettings>) => {
      console.log('💾 Saving restaurant settings:', updatedSettings);
      const response = await apiRequest('PUT', '/api/restaurant-settings', updatedSettings);
      console.log('📡 Save response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Save error response:', errorText);
        throw new Error(`Failed to update restaurant settings: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Save successful, data returned:', data);
      return data;
    },
    onSuccess: (data) => {
      setSettings(data);
      setHasChanges(false);
      // Invalidate both the current query and the restaurant settings hook query
      queryClient.invalidateQueries({ queryKey: ['/api/restaurant-settings'] });
      console.log('🔄 Cache invalidated, footer should update now');
      toast({
        title: "Settings Updated",
        description: "Restaurant settings have been updated successfully.",
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

  const handleInputChange = (field: keyof RestaurantSettings, value: string | number | boolean) => {
    if (!settings) return;

    setSettings(prev => ({
      ...prev!,
      [field]: value
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!settings || !hasChanges) return;

    console.log('Saving settings:', settings);

    await updateSettingsMutation.mutateAsync({
      restaurantName: settings.restaurantName,
      address: settings.address,
      phone: settings.phone,
      email: settings.email,
      website: settings.website,
      currency: settings.currency,
      timezone: settings.timezone,
      deliveryFee: settings.deliveryFee,
      minimumOrder: settings.minimumOrder,
      autoAcceptOrders: settings.autoAcceptOrders,
      sendOrderNotifications: settings.sendOrderNotifications,
      sendCustomerNotifications: settings.sendCustomerNotifications,
      outOfStockEnabled: settings.outOfStockEnabled,
      deliveryEnabled: settings.deliveryEnabled,
      pickupEnabled: settings.pickupEnabled,
      orderSchedulingEnabled: settings.orderSchedulingEnabled,
      maxAdvanceOrderHours: settings.maxAdvanceOrderHours
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading restaurant settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-red-500">Error loading restaurant settings: {error.message}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-gray-500">Restaurant settings not found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Restaurant Settings</h2>
          <p className="text-gray-600">Manage your restaurant information and business settings</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="secondary" className="mr-2">
              Unsaved changes
            </Badge>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || updateSettingsMutation.isPending}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="h-5 w-5 text-blue-600" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Update your restaurant's basic details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="restaurantName">Restaurant Name</Label>
              <Input
                id="restaurantName"
                value={settings.restaurantName || ''}
                onChange={(e) => handleInputChange('restaurantName', e.target.value)}
                placeholder="Enter restaurant name..."
              />
            </div>

            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={settings.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://yourrestaurant.com"
              />
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                value={settings.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                placeholder="USD"
              />
            </div>

            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Input
                id="timezone"
                value={settings.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                placeholder="America/New_York"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-green-600" />
              Contact Information
            </CardTitle>
            <CardDescription>
              Update your restaurant's contact details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={settings.email || ''}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="Enter email address..."
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={settings.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="Enter phone number..."
              />
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={settings.address || ''}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter restaurant address..."
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-600" />
            Business Settings
          </CardTitle>
          <CardDescription>
            Configure your business operations and pricing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="deliveryFee">Delivery Fee ($)</Label>
              <Input
                id="deliveryFee"
                type="number"
                step="0.01"
                min="0"
                value={settings.deliveryFee}
                onChange={(e) => handleInputChange('deliveryFee', e.target.value)}
                placeholder="3.99"
              />
            </div>
            <div>
              <Label htmlFor="minimumOrder">Minimum Order ($)</Label>
              <Input
                id="minimumOrder"
                type="number"
                step="0.01"
                min="0"
                value={settings.minimumOrder}
                onChange={(e) => handleInputChange('minimumOrder', e.target.value)}
                placeholder="15.00"
              />
            </div>
            <div>
              <Label htmlFor="maxAdvanceOrderHours">Max Advance Order Hours</Label>
              <Input
                id="maxAdvanceOrderHours"
                type="number"
                min="1"
                value={settings.maxAdvanceOrderHours}
                onChange={(e) => handleInputChange('maxAdvanceOrderHours', parseInt(e.target.value) || 24)}
                placeholder="24"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium">Order Management</h4>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoAcceptOrders"
                  checked={settings.autoAcceptOrders}
                  onChange={(e) => handleInputChange('autoAcceptOrders', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="autoAcceptOrders">Auto accept orders</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="deliveryEnabled"
                  checked={settings.deliveryEnabled}
                  onChange={(e) => handleInputChange('deliveryEnabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="deliveryEnabled">Delivery enabled</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pickupEnabled"
                  checked={settings.pickupEnabled}
                  onChange={(e) => handleInputChange('pickupEnabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="pickupEnabled">Pickup enabled</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="orderSchedulingEnabled"
                  checked={settings.orderSchedulingEnabled}
                  onChange={(e) => handleInputChange('orderSchedulingEnabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="orderSchedulingEnabled">Order scheduling enabled</Label>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium">Notifications</h4>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendOrderNotifications"
                  checked={settings.sendOrderNotifications}
                  onChange={(e) => handleInputChange('sendOrderNotifications', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="sendOrderNotifications">Send order notifications</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="sendCustomerNotifications"
                  checked={settings.sendCustomerNotifications}
                  onChange={(e) => handleInputChange('sendCustomerNotifications', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="sendCustomerNotifications">Send customer notifications</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="outOfStockEnabled"
                  checked={settings.outOfStockEnabled}
                  onChange={(e) => handleInputChange('outOfStockEnabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <Label htmlFor="outOfStockEnabled">Out of stock tracking enabled</Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Information */}
      {settings.createdAt && (
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div>
                <span className="font-medium">Settings created:</span>{' '}
                {new Date(settings.createdAt).toLocaleDateString()}
              </div>
              {settings.updatedAt && (
                <div>
                  <span className="font-medium">Last updated:</span>{' '}
                  {new Date(settings.updatedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}