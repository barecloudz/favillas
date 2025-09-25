import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Plus, Coffee, Utensils, Cookie, Wine, Pizza, Sandwich } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useCart, CartItem } from '@/hooks/use-cart';
import { useToast } from '@/hooks/use-toast';

interface CheckoutUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinueToCheckout: () => void;
  cartItems: CartItem[];
}

interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
  is_available: boolean;
}

interface Category {
  id: number;
  name: string;
  is_upsell_enabled?: boolean;
  upsell_icon?: string;
  image_url?: string;
}

// Default category icons
const DEFAULT_CATEGORY_ICONS = {
  'Appetizers': Utensils,
  'Drinks': Coffee,
  'Beverages': Coffee,
  'Sides': Utensils,
  'Desserts': Cookie,
  'Wine': Wine,
  'Beer': Wine,
  'Alcohol': Wine,
  'Sandwiches': Sandwich,
  'Subs': Sandwich,
  'Pizza': Pizza,
  'Salads': Utensils,
};

const CheckoutUpsellModal: React.FC<CheckoutUpsellModalProps> = ({
  isOpen,
  onClose,
  onContinueToCheckout,
  cartItems
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const { addItem, triggerPizzaAnimation } = useCart();
  const { toast } = useToast();

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      console.log('🔍 [Categories API] Fetching categories...');
      const response = await fetch('/api/categories');
      console.log('🔍 [Categories API] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('🔍 [Categories API] Raw data:', data);

        if (Array.isArray(data)) {
          console.log('🔍 [Categories API] Valid array with', data.length, 'items');
          return data;
        } else {
          console.error('🔍 [Categories API] Data is not an array:', typeof data);
          return [];
        }
      } else {
        console.error('🔍 [Categories API] Request failed:', response.statusText);
        return [];
      }
    },
    enabled: isOpen,
    retry: 1,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Log categories loading state
  React.useEffect(() => {
    console.log('🔍 [Categories State] Loading:', categoriesLoading, 'Error:', categoriesError, 'Data:', categories);
  }, [categoriesLoading, categoriesError, categories]);

  // Fetch menu items
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu'],
    queryFn: async () => {
      const response = await fetch('/api/menu');
      if (response.ok) {
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      }
      return [];
    },
    enabled: isOpen
  });

  // Detect missing categories based on cart contents
  const getMissingCategories = (): Category[] => {
    console.log('🔍 [Category Analysis] Starting analysis...');

    // Create fallback categories if API fails
    const fallbackCategories: Category[] = [
      { id: 1, name: 'Appetizers', is_upsell_enabled: true },
      { id: 2, name: 'Drinks', is_upsell_enabled: true },
      { id: 3, name: 'Beverages', is_upsell_enabled: true },
      { id: 4, name: 'Sides', is_upsell_enabled: true },
      { id: 5, name: 'Desserts', is_upsell_enabled: true },
    ];

    // Use API categories or fallback
    const workingCategories = Array.isArray(categories) && categories.length > 0 ? categories : fallbackCategories;
    console.log('🔍 [Category Analysis] Using categories:', workingCategories.map(c => c.name));

    // Ensure we have arrays to work with
    if (!Array.isArray(workingCategories) || !Array.isArray(menuItems) || !Array.isArray(cartItems)) {
      console.log('🔍 [Category Analysis] Invalid data types:', {
        categories: Array.isArray(workingCategories),
        menuItems: Array.isArray(menuItems),
        cartItems: Array.isArray(cartItems)
      });
      return [];
    }

    console.log('🔍 [Category Analysis] Data available:', {
      categories: workingCategories.length,
      menuItems: menuItems.length,
      cartItems: cartItems.length
    });

    // Get categories from cart items
    const cartCategories = new Set(
      cartItems.map(item => {
        // Try to find the category from menu items or use a fallback
        const menuItem = menuItems.find(mi => mi.id === item.id);
        const category = menuItem?.category || 'Pizza'; // Default to Pizza if not found
        console.log('🔍 [Category Analysis] Cart item:', item.name, '→ Category:', category);
        return category;
      })
    );

    console.log('🔍 [Category Analysis] Cart categories found:', Array.from(cartCategories));

    // Get admin settings for enabled categories
    const savedSettings = localStorage.getItem('experimentalFeatureSettings');
    let enabledUpsellCategories: string[] = ['Appetizers', 'Drinks', 'Beverages', 'Sides', 'Desserts']; // Default

    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.upsellCategories) {
          enabledUpsellCategories = Object.keys(settings.upsellCategories).filter(
            categoryName => settings.upsellCategories[categoryName] === true
          );
        }
      } catch (error) {
        console.error('Failed to parse experimental feature settings:', error);
      }
    }

    console.log('🔍 [Category Analysis] Enabled upsell categories:', enabledUpsellCategories);
    console.log('🔍 [Category Analysis] Available categories from API:', workingCategories.map(c => c.name));

    // Filter categories that are enabled for upselling and not in cart
    const missingCategories = workingCategories.filter(category => {
      const isEnabled = enabledUpsellCategories.includes(category.name);
      const notInCart = !cartCategories.has(category.name);
      const upsellEnabled = category.is_upsell_enabled !== false;

      console.log('🔍 [Category Analysis] Category check:', {
        name: category.name,
        isEnabled,
        notInCart,
        upsellEnabled,
        shouldInclude: isEnabled && notInCart && upsellEnabled
      });

      return isEnabled && notInCart && upsellEnabled;
    });

    console.log('🔍 [Category Analysis] Final missing categories:', missingCategories.map(c => c.name));
    return missingCategories;
  };

  // Get category-specific menu items
  const getCategoryItems = (categoryName: string): MenuItem[] => {
    if (!Array.isArray(menuItems) || !categoryName) {
      return [];
    }
    return menuItems.filter(item =>
      item &&
      item.id &&
      item.name &&
      item.category === categoryName &&
      item.is_available !== false // Default to available if not set
    ).slice(0, 6); // Limit to 6 items for better UX
  };

  // Get category icon
  const getCategoryIcon = (category: Category) => {
    const iconName = category.upsell_icon || category.name;
    return DEFAULT_CATEGORY_ICONS[iconName as keyof typeof DEFAULT_CATEGORY_ICONS] || Utensils;
  };

  // Get category image from experimental settings
  const getCategoryImage = (categoryName: string): string | null => {
    const savedSettings = localStorage.getItem('experimentalFeatureSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        const image = settings.categoryImages?.[categoryName];
        return image || null;
      } catch (error) {
        console.error('Failed to parse experimental feature settings for images:', error);
      }
    }
    return null;
  };

  // Handle adding item to cart
  const handleAddItem = async (item: MenuItem, event: React.MouseEvent) => {
    try {
      setIsAddingItem(true);

      // Validate item data
      if (!item || !item.id || !item.name) {
        console.error('Invalid item data:', item);
        toast({
          title: "Error",
          description: "Unable to add item to cart. Please try again.",
          variant: "destructive"
        });
        return;
      }

      const cartItem: CartItem = {
        id: item.id,
        name: item.name,
        price: item.price || 0, // Default to 0 if price is undefined
        quantity: 1,
        selectedOptions: {},
      };

      addItem(cartItem);

      // Show success feedback
      toast({
        title: "Added to Cart!",
        description: `${item.name} has been added to your cart.`,
      });

      // Trigger animation if possible
      try {
        if (event.currentTarget) {
          triggerPizzaAnimation(event.currentTarget as HTMLElement);
        }
      } catch (animError) {
        console.warn('Animation failed:', animError);
      }
    } catch (error) {
      console.error('Error adding item to cart:', error);
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive"
      });
    } finally {
      setTimeout(() => setIsAddingItem(false), 300);
    }
  };

  // Handle continuing to checkout without upselling
  const handleNoThanks = () => {
    // Set session flag to prevent showing again during this session
    sessionStorage.setItem('upsellShown', 'true');
    onContinueToCheckout();
  };

  // Handle continuing after adding items
  const handleContinueAfterAdd = () => {
    sessionStorage.setItem('upsellShown', 'true');
    onContinueToCheckout();
  };

  const missingCategories = getMissingCategories();
  const categoryItems = selectedCategory ? getCategoryItems(selectedCategory) : [];

  console.log('🎯 [Upsell Modal Debug] Props and state:', {
    isOpen,
    missingCategories: missingCategories.length,
    upsellShown: sessionStorage.getItem('upsellShown'),
    cartItems: cartItems.length
  });

  // Don't show modal if no missing categories or already shown this session
  if (!isOpen) {
    console.log('🎯 [Upsell Modal Debug] Modal not open, returning null');
    return null;
  }

  // Wait for categories to load before determining if we have missing categories
  if (categoriesLoading) {
    console.log('🎯 [Upsell Modal Debug] Categories still loading, showing loading state');
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#d73a31] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p>Loading recommendations...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (missingCategories.length === 0) {
    console.log('🎯 [Upsell Modal Debug] No missing categories, returning null');
    return null;
  }

  if (sessionStorage.getItem('upsellShown') === 'true') {
    console.log('🎯 [Upsell Modal Debug] Already shown this session, returning null');
    return null;
  }

  console.log('🎯 [Upsell Modal Debug] All conditions met, showing modal!');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] h-auto p-0 overflow-hidden">
        {/* Header with gradient background */}
        <DialogHeader className="relative bg-gradient-to-r from-[#d73a31] to-[#ff6b5b] text-white p-4 sm:p-8 pb-4 sm:pb-6">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl sm:text-3xl font-bold mb-2 leading-tight">
                {selectedCategory ? `Perfect ${selectedCategory} Pairings!` : '🍕 Make Your Order Complete!'}
              </DialogTitle>
              {!selectedCategory && (
                <p className="text-white/90 text-sm sm:text-lg">
                  Save more and get the full experience - these popular items pair perfectly with your order!
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 sm:h-10 sm:w-10 text-white hover:bg-white/20 hover:text-white flex-shrink-0"
            >
              <X className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-4 sm:px-8 py-4 sm:py-6">
          {!selectedCategory ? (
            // Category selection view - improved design
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                  💰 Popular Add-Ons - Most Customers Love These!
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {missingCategories.map((category) => {
                  const IconComponent = getCategoryIcon(category);
                  const customImage = getCategoryImage(category.name);
                  const displayImage = customImage || category.image_url;

                  return (
                    <Card
                      key={category.id}
                      className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 hover:border-[#d73a31] bg-gradient-to-br from-white to-gray-50 hover:from-[#fff5f4] hover:to-[#ffeeed] relative overflow-hidden"
                      onClick={() => setSelectedCategory(category.name)}
                    >
                      {/* Subtle pattern overlay */}
                      <div className="absolute inset-0 bg-white/50 group-hover:bg-[#d73a31]/5 transition-colors duration-300"></div>

                      <CardContent className="relative p-6 text-center">
                        <div className="mb-4">
                          {displayImage ? (
                            <div className="relative">
                              <img
                                src={displayImage}
                                alt={category.name}
                                className="w-20 h-20 mx-auto rounded-xl object-cover shadow-md group-hover:shadow-lg transition-shadow duration-300"
                              />
                              <div className="absolute -top-2 -right-2 bg-[#d73a31] text-white text-xs font-bold px-2 py-1 rounded-full">
                                {customImage ? 'CUSTOM' : 'HOT!'}
                              </div>
                            </div>
                          ) : (
                            <div className="relative">
                              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-[#d73a31] to-[#ff6b5b] rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300">
                                <IconComponent className="w-10 h-10 text-white" />
                              </div>
                              <div className="absolute -top-2 -right-2 bg-[#d73a31] text-white text-xs font-bold px-2 py-1 rounded-full">
                                NEW!
                              </div>
                            </div>
                          )}
                        </div>

                        <h3 className="font-bold text-xl text-gray-800 mb-2 group-hover:text-[#d73a31] transition-colors duration-300">
                          {category.name}
                        </h3>

                        <p className="text-sm text-gray-600 mb-3">
                          Perfect complement to your meal
                        </p>

                        <div className="bg-[#d73a31] text-white px-4 py-2 rounded-full text-sm font-semibold group-hover:bg-[#c73128] transition-colors duration-300">
                          Browse {category.name} →
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            // Items listing view - improved design
            <div className="pb-6">
              <Button
                variant="ghost"
                onClick={() => setSelectedCategory(null)}
                className="mb-6 text-[#d73a31] hover:text-[#c73128] hover:bg-[#d73a31]/10 px-0"
              >
                ← Back to All Categories
              </Button>

              <div className="text-center mb-6">
                <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                  🔥 Handpicked favorites from our {selectedCategory} menu!
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {categoryItems.map((item) => (
                  <Card key={item.id} className="group hover:shadow-xl transition-all duration-300 hover:scale-[1.02] border-2 hover:border-[#d73a31] overflow-hidden">
                    <CardContent className="p-0">
                      <div className="relative">
                        {/* Item image or placeholder */}
                        <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-32 object-cover"
                            />
                          ) : (
                            <div className="w-full h-32 bg-gradient-to-br from-[#d73a31]/20 to-[#ff6b5b]/20 flex items-center justify-center">
                              <div className="w-16 h-16 bg-[#d73a31] rounded-full flex items-center justify-center">
                                <Utensils className="w-8 h-8 text-white" />
                              </div>
                            </div>
                          )}

                          {/* Price badge */}
                          <div className="absolute top-3 right-3">
                            <Badge className="bg-green-500 hover:bg-green-500 text-white font-bold text-sm shadow-lg">
                              ${item.price ? Number(item.price).toFixed(2) : '0.00'}
                            </Badge>
                          </div>

                          {/* Popular badge for some items */}
                          {item.price && Number(item.price) < 5 && (
                            <div className="absolute top-3 left-3">
                              <Badge className="bg-orange-500 hover:bg-orange-500 text-white font-bold text-xs">
                                POPULAR
                              </Badge>
                            </div>
                          )}
                        </div>

                        {/* Item details */}
                        <div className="p-4">
                          <h4 className="font-bold text-lg mb-2 text-gray-800 group-hover:text-[#d73a31] transition-colors">
                            {item.name}
                          </h4>

                          {item.description && (
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                              {item.description}
                            </p>
                          )}

                          <Button
                            className="w-full bg-[#d73a31] hover:bg-[#c73128] text-white font-semibold py-3 text-sm group-hover:shadow-lg transition-all duration-300"
                            onClick={(e) => handleAddItem(item, e)}
                            disabled={isAddingItem}
                          >
                            {isAddingItem ? (
                              <div className="flex items-center">
                                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                                Adding...
                              </div>
                            ) : (
                              <div className="flex items-center justify-center">
                                <Plus className="h-4 w-4 mr-2" />
                                Add to Cart
                              </div>
                            )}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {categoryItems.length === 0 && (
                <div className="text-center py-8 sm:py-12">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Coffee className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-base sm:text-lg">No items available in this category right now.</p>
                  <p className="text-gray-400 text-xs sm:text-sm mt-2">Check back soon for new additions!</p>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedCategory(null)}
                    className="mt-4 text-sm"
                  >
                    ← Browse Other Categories
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer buttons - improved design */}
        <div className="border-t bg-gradient-to-r from-gray-50 to-white p-4 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="text-center">
              {!selectedCategory && (
                <p className="text-xs sm:text-sm text-gray-600">
                  ✨ <span className="font-semibold">89% of customers</span> who add these items say it made their meal complete!
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button
                variant="outline"
                onClick={handleNoThanks}
                className="flex-1 sm:flex-none px-4 sm:px-6 border-gray-300 hover:border-gray-400 text-gray-600 hover:text-gray-700 text-sm"
              >
                {selectedCategory ? 'Maybe Later' : 'Skip This Time'}
              </Button>

              {selectedCategory && categoryItems.length > 0 ? (
                <Button
                  onClick={handleContinueAfterAdd}
                  className="flex-1 sm:flex-none bg-gradient-to-r from-[#d73a31] to-[#ff6b5b] hover:from-[#c73128] hover:to-[#e55a4f] text-white px-4 sm:px-8 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 text-sm"
                >
                  Continue to Checkout →
                </Button>
              ) : (
                !selectedCategory && (
                  <Button
                    onClick={handleNoThanks}
                    className="flex-1 sm:flex-none bg-gradient-to-r from-[#d73a31] to-[#ff6b5b] hover:from-[#c73128] hover:to-[#e55a4f] text-white px-4 sm:px-8 font-semibold shadow-lg hover:shadow-xl transition-all duration-300 text-sm"
                  >
                    🛒 Proceed to Checkout
                  </Button>
                )
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutUpsellModal;