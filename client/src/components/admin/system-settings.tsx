import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Eye, EyeOff, AlertTriangle, Settings, Key, CreditCard, Truck, Printer, Zap, Palette, Upload, Image } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface SystemSetting {
  id: number;
  setting_key: string;
  setting_value: string;
  setting_type: 'text' | 'password' | 'number' | 'boolean' | 'select';
  category: string;
  display_name: string;
  description: string;
  is_sensitive: boolean;
  options?: string[];
  validation_pattern?: string;
}

const categoryConfig = {
  branding: {
    title: 'Branding & Identity',
    description: 'Customize your company name, logo, and contact information',
    icon: Palette,
    color: 'text-pink-600'
  },
  payment: {
    title: 'Payment Settings',
    description: 'Configure Stripe and payment processing',
    icon: CreditCard,
    color: 'text-green-600'
  },
  delivery: {
    title: 'Delivery Settings', 
    description: 'ShipDay integration and delivery options',
    icon: Truck,
    color: 'text-blue-600'
  },
  printer: {
    title: 'Printer Settings',
    description: 'Thermal printer configuration',
    icon: Printer,
    color: 'text-purple-600'
  },
  general: {
    title: 'General Settings',
    description: 'Application and system configuration',
    icon: Settings,
    color: 'text-gray-600'
  },
  api: {
    title: 'API Settings',
    description: 'External API keys and integrations',
    icon: Zap,
    color: 'text-orange-600'
  }
};

export function SystemSettings() {
  const [settings, setSettings] = useState<Record<string, SystemSetting[]>>({});
  const [modifiedSettings, setModifiedSettings] = useState<Set<string>>(new Set());
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Fetch system settings
  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['/api/admin/system-settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/system-settings');
      return await response.json();
    }
  });

  useEffect(() => {
    if (settingsData) {
      setSettings(settingsData);
    }
  }, [settingsData]);

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settingsToUpdate: SystemSetting[]) => {
      const response = await apiRequest('POST', '/api/admin/system-settings', {
        settings: settingsToUpdate
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update settings');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      setModifiedSettings(new Set());
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-settings'] });
      toast({
        title: "Settings Updated",
        description: "System settings have been updated successfully.",
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

  const handleSettingChange = (key: string, value: string, category: string) => {
    setSettings(prev => ({
      ...prev,
      [category]: prev[category]?.map(setting => 
        setting.setting_key === key 
          ? { ...setting, setting_value: value }
          : setting
      ) || []
    }));
    
    setModifiedSettings(prev => new Set([...prev, key]));
  };

  const handleSave = async () => {
    setIsSaving(true);
    
    try {
      const settingsToUpdate: SystemSetting[] = [];
      
      Object.values(settings).flat().forEach(setting => {
        if (modifiedSettings.has(setting.setting_key)) {
          settingsToUpdate.push({
            setting_key: setting.setting_key,
            setting_value: setting.setting_value
          } as SystemSetting);
        }
      });

      if (settingsToUpdate.length === 0) {
        toast({
          title: "No Changes",
          description: "No settings have been modified.",
        });
        return;
      }

      await updateSettingsMutation.mutateAsync(settingsToUpdate);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSensitiveVisibility = (key: string) => {
    setShowSensitive(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleLogoUpload = (setting: SystemSetting, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      // Create a data URL for immediate preview
      handleSettingChange(setting.setting_key, result, setting.category);
    };
    reader.readAsDataURL(file);
  };

  const renderSettingInput = (setting: SystemSetting) => {
    const isModified = modifiedSettings.has(setting.setting_key);
    const showValue = !setting.is_sensitive || showSensitive[setting.setting_key];
    const displayValue = showValue ? setting.setting_value : '***';

    // Special handling for logo uploads
    if (setting.setting_key === 'LOGO_URL') {
      return (
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <Input
              type="text"
              value={setting.setting_value}
              onChange={(e) => handleSettingChange(setting.setting_key, e.target.value, setting.category)}
              placeholder="Enter logo URL or upload file..."
              className={isModified ? 'border-orange-500' : ''}
            />
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleLogoUpload(setting, file);
                }
              }}
              className="hidden"
              id={`upload-${setting.setting_key}`}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => document.getElementById(`upload-${setting.setting_key}`)?.click()}
              className="shrink-0"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload
            </Button>
          </div>
          {setting.setting_value && (
            <div className="flex items-center space-x-2 p-2 border rounded">
              <Image className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Current logo: {setting.setting_value.length > 50 ? 'Custom uploaded image' : setting.setting_value}
              </span>
              {setting.setting_value.startsWith('data:') ? (
                <img src={setting.setting_value} alt="Logo preview" className="h-8 w-8 object-contain" />
              ) : (
                <img src={setting.setting_value} alt="Logo preview" className="h-8 w-8 object-contain" onError={(e) => e.currentTarget.style.display = 'none'} />
              )}
            </div>
          )}
        </div>
      );
    }

    switch (setting.setting_type) {
      case 'password':
        return (
          <div className="relative">
            <Input
              type={showValue ? 'text' : 'password'}
              value={setting.setting_value}
              onChange={(e) => handleSettingChange(setting.setting_key, e.target.value, setting.category)}
              placeholder="Enter value..."
              className={isModified ? 'border-orange-500' : ''}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              onClick={() => toggleSensitiveVisibility(setting.setting_key)}
            >
              {showValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        );
      
      case 'select':
        const options = setting.options ? JSON.parse(setting.options as any) : [];
        return (
          <Select
            value={setting.setting_value}
            onValueChange={(value) => handleSettingChange(setting.setting_key, value, setting.category)}
          >
            <SelectTrigger className={isModified ? 'border-orange-500' : ''}>
              <SelectValue placeholder="Select value..." />
            </SelectTrigger>
            <SelectContent>
              {options.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={setting.setting_value === 'true'}
              onCheckedChange={(checked) => 
                handleSettingChange(setting.setting_key, checked.toString(), setting.category)
              }
            />
            <span className="text-sm text-gray-600">
              {setting.setting_value === 'true' ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={setting.setting_value}
            onChange={(e) => handleSettingChange(setting.setting_key, e.target.value, setting.category)}
            placeholder="Enter number..."
            className={isModified ? 'border-orange-500' : ''}
          />
        );
      
      default:
        return (
          <Input
            type="text"
            value={setting.setting_value}
            onChange={(e) => handleSettingChange(setting.setting_key, e.target.value, setting.category)}
            placeholder="Enter value..."
            className={isModified ? 'border-orange-500' : ''}
          />
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading system settings...</p>
        </div>
      </div>
    );
  }

  const categories = Object.keys(settings);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
          <p className="text-gray-600">Manage environment variables and system configuration</p>
        </div>
        <div className="flex items-center gap-2">
          {modifiedSettings.size > 0 && (
            <Badge variant="secondary" className="mr-2">
              {modifiedSettings.size} unsaved changes
            </Badge>
          )}
          <Button 
            onClick={handleSave} 
            disabled={modifiedSettings.size === 0 || isSaving}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No system settings found.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={categories[0]} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            {categories.map(category => {
              const config = categoryConfig[category as keyof typeof categoryConfig];
              const Icon = config?.icon || Settings;
              return (
                <TabsTrigger key={category} value={category} className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  {config?.title || category}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {categories.map(category => {
            const config = categoryConfig[category as keyof typeof categoryConfig];
            const categorySettings = settings[category] || [];
            
            return (
              <TabsContent key={category} value={category}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {config?.icon && <config.icon className={`h-5 w-5 ${config.color}`} />}
                      {config?.title || category}
                    </CardTitle>
                    <CardDescription>
                      {config?.description || `Configure ${category} settings`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {categorySettings.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">
                        No settings available in this category.
                      </p>
                    ) : (
                      categorySettings.map(setting => (
                        <div key={setting.setting_key} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label 
                              htmlFor={setting.setting_key}
                              className="text-sm font-medium flex items-center gap-2"
                            >
                              {setting.display_name}
                              {setting.is_sensitive && (
                                <Key className="h-3 w-3 text-orange-500" title="Sensitive setting" />
                              )}
                              {modifiedSettings.has(setting.setting_key) && (
                                <Badge variant="outline" className="text-xs">Modified</Badge>
                              )}
                            </Label>
                            {setting.validation_pattern && (
                              <AlertTriangle className="h-4 w-4 text-yellow-500" title="Has validation rules" />
                            )}
                          </div>
                          
                          {renderSettingInput(setting)}
                          
                          {setting.description && (
                            <p className="text-xs text-gray-500">{setting.description}</p>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
            <div>
              <h4 className="font-semibold text-orange-800">Important Security Notice</h4>
              <p className="text-sm text-orange-700 mt-1">
                Changes to sensitive settings like API keys will take effect immediately. 
                Make sure to test integrations after updating credentials. 
                Some settings may require an application restart to fully apply.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}