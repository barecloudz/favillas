import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  Star, 
  Trophy, 
  Edit, 
  Save, 
  RefreshCw,
  Home,
  Eye,
  ImageIcon,
  Type
} from "lucide-react";

const FrontendCustomization: React.FC = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch menu items
  const { data: menuItems = [], isLoading: itemsLoading, refetch: refetchMenu } = useQuery({
    queryKey: ["/api/menu"],
  });

  // Fetch current featured items
  const { data: featuredItems = [], refetch: refetchFeatured } = useQuery({
    queryKey: ["/api/featured"],
  });

  // Update featured item mutation
  const updateFeaturedMutation = useMutation({
    mutationFn: async ({ itemId, field, value }: { itemId: number; field: string; value: boolean }) => {
      return apiRequest("PATCH", `/api/menu/${itemId}`, { [field]: value });
    },
    onSuccess: () => {
      // Force fresh data fetch
      queryClient.invalidateQueries({ queryKey: ["/api/menu"] });
      queryClient.invalidateQueries({ queryKey: ["/api/featured"] });
      
      // Refetch both queries
      setTimeout(async () => {
        try {
          await Promise.all([refetchMenu(), refetchFeatured()]);
        } catch (error) {
          console.error('Error refreshing data:', error);
        }
      }, 100);
      
      toast({
        title: "Success",
        description: "Featured items updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update featured items",
        variant: "destructive",
      });
    },
  });

  // Clear all featured items
  const clearAllFeatured = async () => {
    setIsLoading(true);
    try {
      for (const item of menuItems) {
        // Clear both isPopular and isBestSeller if they exist
        if (item.isPopular) {
          await updateFeaturedMutation.mutateAsync({
            itemId: item.id,
            field: 'isPopular',
            value: false
          });
        }
        if (item.isBestSeller) {
          await updateFeaturedMutation.mutateAsync({
            itemId: item.id,
            field: 'isBestSeller',
            value: false
          });
        }
      }
      toast({
        title: "Success", 
        description: "All featured items cleared"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear featured items",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Set auto featured (first 3 items)
  const setAutoFeatured = async () => {
    setIsLoading(true);
    try {
      // Clear all first
      await clearAllFeatured();
      
      // Set first 3 items as featured
      const itemsToFeature = menuItems.slice(0, 3);
      for (let i = 0; i < itemsToFeature.length; i++) {
        const item = itemsToFeature[i];
        const field = i === 0 ? 'isBestSeller' : 'isPopular';
        await updateFeaturedMutation.mutateAsync({
          itemId: item.id,
          field,
          value: true
        });
      }
      toast({
        title: "Success",
        description: "Auto-featured items set successfully"
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to set auto featured items",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFeatured = (item: any, type: 'popular' | 'bestSeller') => {
    const field = type === 'popular' ? 'isPopular' : 'isBestSeller';
    const currentValue = type === 'popular' ? item.isPopular : item.isBestSeller;
    const newValue = !currentValue;
    
    console.log(`Toggling ${field} for item ${item.id}: ${currentValue} -> ${newValue}`);
    
    updateFeaturedMutation.mutate({
      itemId: item.id,
      field,
      value: newValue
    });
  };

  if (itemsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin mr-2" />
        <span>Loading menu items...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Homepage Featured Items Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Homepage Featured Items
          </CardTitle>
          <CardDescription>
            Manage which items appear in the "Customer Favorites" section on your homepage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Featured Items Preview */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold">Currently Featured ({featuredItems.length}/3)</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setIsRefreshing(true);
                  try {
                    await Promise.all([refetchMenu(), refetchFeatured()]);
                    toast({
                      title: "Refreshed",
                      description: "Data refreshed successfully",
                    });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Failed to refresh data",
                      variant: "destructive",
                    });
                  } finally {
                    setIsRefreshing(false);
                  }
                }}
                disabled={isRefreshing}
                className="text-xs"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            
            {featuredItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {featuredItems.map((item: any) => (
                  <Card key={item.id} className="relative">
                    <CardContent className="p-4">
                      <div className="aspect-video bg-gray-100 rounded-lg mb-3 overflow-hidden">
                        {item.imageUrl ? (
                          <img 
                            src={item.imageUrl} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <h4 className="font-semibold text-sm mb-1">{item.name}</h4>
                      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{item.description}</p>
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-sm">${item.basePrice}</span>
                        <Badge variant={item.isBestSeller ? "default" : "secondary"} className="text-xs">
                          {item.isBestSeller ? (
                            <>
                              <Trophy className="h-3 w-3 mr-1" />
                              Best Seller
                            </>
                          ) : (
                            <>
                              <Star className="h-3 w-3 mr-1" />
                              Popular
                            </>
                          )}
                        </Badge>
                      </div>
                      
                      {/* Edit Actions for Featured Items */}
                      <div className="flex gap-1">
                        <Button
                          variant={item.isBestSeller ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleFeatured(item, 'bestSeller')}
                          disabled={updateFeaturedMutation.isPending}
                          className="text-xs flex-1"
                        >
                          <Trophy className="h-3 w-3 mr-1" />
                          {item.isBestSeller ? "Remove" : "Best Seller"}
                        </Button>
                        <Button
                          variant={item.isPopular ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => toggleFeatured(item, 'popular')}
                          disabled={updateFeaturedMutation.isPending}
                          className="text-xs flex-1"
                        >
                          <Star className="h-3 w-3 mr-1" />
                          {item.isPopular ? "Remove" : "Popular"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Home className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No featured items set</p>
                <p className="text-sm">Select items below to feature on your homepage</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3 p-4 bg-gray-50 rounded-lg">
            <Button
              onClick={setAutoFeatured}
              disabled={isLoading || updateFeaturedMutation.isPending}
              className="flex-1"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Star className="h-4 w-4 mr-2" />
              )}
              Auto-Set Featured (First 3)
            </Button>
            <Button
              variant="outline"
              onClick={clearAllFeatured}
              disabled={isLoading || updateFeaturedMutation.isPending}
            >
              Clear All Featured
            </Button>
            <Button
              variant="outline"
              onClick={() => window.open("/", "_blank")}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Homepage
            </Button>
          </div>

          <Separator />

          {/* All Menu Items Management */}
          <div>
            <Label className="text-base font-semibold mb-4 block">All Menu Items ({menuItems.length})</Label>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {menuItems.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-600">${item.basePrice} • {item.category}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{item.description}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant={item.isBestSeller ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleFeatured(item, 'bestSeller')}
                      disabled={updateFeaturedMutation.isPending}
                      className="text-xs"
                    >
                      <Trophy className="h-3 w-3 mr-1" />
                      {item.isBestSeller ? "Best Seller" : "Set Best Seller"}
                    </Button>
                    <Button
                      variant={item.isPopular ? "secondary" : "outline"}
                      size="sm"
                      onClick={() => toggleFeatured(item, 'popular')}
                      disabled={updateFeaturedMutation.isPending}
                      className="text-xs"
                    >
                      <Star className="h-3 w-3 mr-1" />
                      {item.isPopular ? "Popular" : "Set Popular"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Future Homepage Customization Options */}
      <Card className="opacity-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="h-5 w-5" />
            Homepage Content (Coming Soon)
          </CardTitle>
          <CardDescription>
            Future features to customize homepage text, images, and sections
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm">Hero Section Title</Label>
              <Input disabled placeholder="AUTHENTIC ITALIAN PIZZA" />
            </div>
            <div>
              <Label className="text-sm">Hero Section Subtitle</Label>
              <Input disabled placeholder="Made with love by a real Italian family" />
            </div>
          </div>
          <div>
            <Label className="text-sm">About Section Text</Label>
            <Textarea disabled placeholder="Your restaurant's story..." />
          </div>
          <Button disabled>Save Changes</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default FrontendCustomization;