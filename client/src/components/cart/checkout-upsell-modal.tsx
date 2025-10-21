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

// Category color schemes
const CATEGORY_COLORS = {
  'Drinks': {
    gradient: 'from-blue-500 to-cyan-500',
    hoverGradient: 'hover:from-blue-600 hover:to-cyan-600',
    cardBg: 'hover:from-blue-50 hover:to-cyan-50',
    border: 'hover:border-blue-400',
    badge: 'bg-blue-500',
    text: 'group-hover:text-blue-600'
  },
  'Desserts': {
    gradient: 'from-pink-500 to-rose-500',
    hoverGradient: 'hover:from-pink-600 hover:to-rose-600',
    cardBg: 'hover:from-pink-50 hover:to-rose-50',
    border: 'hover:border-pink-400',
    badge: 'bg-pink-500',
    text: 'group-hover:text-pink-600'
  },
  'Sides': {
    gradient: 'from-orange-500 to-amber-500',
    hoverGradient: 'hover:from-orange-600 hover:to-amber-600',
    cardBg: 'hover:from-orange-50 hover:to-amber-50',
    border: 'hover:border-orange-400',
    badge: 'bg-orange-500',
    text: 'group-hover:text-orange-600'
  },
  'Appetizers': {
    gradient: 'from-green-500 to-emerald-500',
    hoverGradient: 'hover:from-green-600 hover:to-emerald-600',
    cardBg: 'hover:from-green-50 hover:to-emerald-50',
    border: 'hover:border-green-400',
    badge: 'bg-green-500',
    text: 'group-hover:text-green-600'
  },
  // Fallback for other categories
  'Wine': {
    gradient: 'from-purple-500 to-violet-500',
    hoverGradient: 'hover:from-purple-600 hover:to-violet-600',
    cardBg: 'hover:from-purple-50 hover:to-violet-50',
    border: 'hover:border-purple-400',
    badge: 'bg-purple-500',
    text: 'group-hover:text-purple-600'
  },
  'Beer': {
    gradient: 'from-yellow-500 to-orange-500',
    hoverGradient: 'hover:from-yellow-600 hover:to-orange-600',
    cardBg: 'hover:from-yellow-50 hover:to-orange-50',
    border: 'hover:border-yellow-400',
    badge: 'bg-yellow-500',
    text: 'group-hover:text-yellow-600'
  }
};

const CheckoutUpsellModal: React.FC<CheckoutUpsellModalProps> = ({
  isOpen,
  onClose,
  onContinueToCheckout,
  cartItems
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [hasAddedItems, setHasAddedItems] = useState(false);
  const [showKeepLookingModal, setShowKeepLookingModal] = useState(false);
  const { addItem, triggerPizzaAnimation } = useCart();
  const { toast } = useToast();

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          return data;
        }
      }
      return [];
    },
    enabled: isOpen,
    retry: 1,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Fetch menu items
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu'],
    queryFn: async () => {
      const response = await fetch('/api/menu');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          // Transform API data to match component interface
          return data.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description || '',
            price: parseFloat(item.basePrice) || 0,
            category: item.category,
            image_url: item.imageUrl || item.image_url,
            is_available: item.isAvailable !== false
          }));
        }
        return [];
      }
      return [];
    },
    enabled: isOpen
  });

  // Detect missing categories based on cart contents
  const getMissingCategories = (): Category[] => {

    // If we have menu items but no categories from API, build categories from menu items
    let workingCategories: Category[] = [];

    if (Array.isArray(categories) && categories.length > 0) {
      // Use API categories
      workingCategories = categories;
    } else if (Array.isArray(menuItems) && menuItems.length > 0) {
      // Build categories from menu items
      const uniqueCategories = [...new Set(menuItems.map(item => item.category).filter(Boolean))];
      workingCategories = uniqueCategories.map((cat, index) => ({
        id: index + 1,
        name: cat,
        is_upsell_enabled: true
      }));
      console.log('[Upsell] Built categories from menu items:', workingCategories);
    } else {
      // Fallback categories
      workingCategories = [
        { id: 1, name: 'Drinks', is_upsell_enabled: true },
        { id: 2, name: 'Desserts', is_upsell_enabled: true },
        { id: 3, name: 'Sides', is_upsell_enabled: true },
        { id: 4, name: 'Appetizers', is_upsell_enabled: true },
      ];
    }

    // Ensure we have arrays to work with
    if (!Array.isArray(workingCategories) || !Array.isArray(menuItems) || !Array.isArray(cartItems)) {
      return [];
    }


    // Get categories from cart items
    const cartCategories = new Set(
      cartItems.map(item => {
        // Try to find the category from menu items or use a fallback
        const menuItem = menuItems.find(mi => mi.id === item.id);
        const category = menuItem?.category || 'Pizza'; // Default to Pizza if not found
        return category;
      })
    );


    // Get admin settings for enabled categories
    const savedSettings = localStorage.getItem('experimentalFeatureSettings');
    let enabledUpsellCategories: string[] = ['Drinks', 'Desserts', 'Sides', 'Appetizers']; // Default

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


    // Filter categories that are enabled for upselling and not in cart
    const missingCategories = workingCategories.filter(category => {
      const isEnabled = enabledUpsellCategories.includes(category.name);
      const notInCart = !cartCategories.has(category.name);
      const upsellEnabled = category.is_upsell_enabled !== false;


      return isEnabled && notInCart && upsellEnabled;
    });

    return missingCategories;
  };

  // Get category-specific menu items
  const getCategoryItems = (categoryName: string): MenuItem[] => {
    if (!Array.isArray(menuItems) || !categoryName) {
      console.log('[Upsell] No items or category:', { hasItems: Array.isArray(menuItems), itemCount: menuItems?.length, categoryName });
      return [];
    }

    // Case-insensitive category matching
    const categoryLower = categoryName.toLowerCase().trim();

    // Log what we're working with
    console.log('[Upsell] Filtering for category:', categoryName);
    console.log('[Upsell] Available categories:', [...new Set(menuItems.map(i => i.category))]);

    // Find drinks items for debugging
    const drinksItems = menuItems.filter(i => (i.category || '').toLowerCase().includes('drink'));
    console.log('[Upsell] Sample items for drinks:', drinksItems.slice(0, 2).map(i => ({
      name: i.name,
      category: i.category,
      price: i.price,
      priceType: typeof i.price,
      is_available: i.is_available
    })));

    const filtered = menuItems.filter(item => {
      if (!item || !item.id || !item.name) return false;

      const itemCategoryLower = (item.category || '').toLowerCase().trim();
      const matchesCategory = itemCategoryLower === categoryLower;
      const isAvailable = item.is_available !== false;
      const hasValidPrice = typeof item.price === 'number' && item.price >= 0;

      return matchesCategory && isAvailable && hasValidPrice;
    }).slice(0, 6); // Limit to 6 items for better UX

    console.log('[Upsell] Found items:', filtered.length);
    return filtered;
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

  // Get category colors
  const getCategoryColors = (categoryName: string) => {
    return CATEGORY_COLORS[categoryName as keyof typeof CATEGORY_COLORS] || {
      gradient: 'from-gray-500 to-slate-500',
      hoverGradient: 'hover:from-gray-600 hover:to-slate-600',
      cardBg: 'hover:from-gray-50 hover:to-slate-50',
      border: 'hover:border-gray-400',
      badge: 'bg-gray-500',
      text: 'group-hover:text-gray-600'
    };
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

      // Mark that items have been added
      setHasAddedItems(true);

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

      // Show the keep looking modal after a brief delay
      setTimeout(() => {
        setShowKeepLookingModal(true);
      }, 500);
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

  // Handle proceeding to checkout (used by X button and No Thanks button)
  const handleProceedToCheckout = () => {
    sessionStorage.setItem('upsellShown', 'true');
    onContinueToCheckout();
  };

  const missingCategories = getMissingCategories();
  const categoryItems = selectedCategory ? getCategoryItems(selectedCategory) : [];


  // Don't show modal if no missing categories or already shown this session
  if (!isOpen) {
    return null;
  }

  // Wait for categories to load before determining if we have missing categories
  if (categoriesLoading) {
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
    return null;
  }

  if (sessionStorage.getItem('upsellShown') === 'true') {
    return null;
  }


  return (
    <Dialog open={isOpen} onOpenChange={() => handleProceedToCheckout()}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] p-0 flex flex-col rounded-3xl overflow-hidden shadow-2xl">
        {/* Header with modern gradient background and pattern */}
        <DialogHeader className="relative bg-gradient-to-br from-[#d73a31] via-[#e84c3d] to-[#ff6b5b] text-white p-6 sm:p-10 pb-6 sm:pb-8">
          {/* Animated gradient overlay */}
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzAtOS45NC04LjA2LTE4LTE4LTE4UzAgOC4wNiAwIDE4czguMDYgMTggMTggMTggMTgtOC4wNiAxOC0xOHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30"></div>

          <div className="relative z-10">
            <div className="text-center">
              {/* Icon/Emoji header */}
              <div className="mb-4">
                <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-white/20 backdrop-blur-sm rounded-full border-4 border-white/30 shadow-lg">
                  <span className="text-3xl sm:text-4xl">{selectedCategory ? '✨' : '🎉'}</span>
                </div>
              </div>

              <DialogTitle className="text-2xl sm:text-5xl font-black mb-3 sm:mb-4 leading-tight tracking-tight drop-shadow-lg">
                {selectedCategory ? `${selectedCategory} Selection` : 'Complete Your Feast!'}
              </DialogTitle>
              {!selectedCategory && (
                <p className="text-white/95 text-lg sm:text-2xl font-semibold drop-shadow-md max-w-2xl mx-auto">
                  Add the perfect sides to make your meal unforgettable! 🌟
                </p>
              )}
            </div>
          </div>

          {/* Decorative wave at bottom */}
          <svg className="absolute bottom-0 left-0 right-0 w-full" viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 48h1440V0c-240 48-480 48-720 24C480 0 240 0 0 0v48z" fill="white"/>
          </svg>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-8 bg-gradient-to-b from-white to-gray-50">
          {!selectedCategory ? (
            // Category selection view - modern mobile app design
            <div className="space-y-8 max-w-5xl mx-auto">
              <div className="text-center">
                <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-base font-bold shadow-lg">
                  <span className="mr-2">⭐</span>
                  Most Popular Add-Ons
                  <span className="ml-2">⭐</span>
                </div>
                <p className="mt-4 text-gray-600 text-sm sm:text-base">Tap a category to see delicious options</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                {missingCategories.map((category) => {
                  const IconComponent = getCategoryIcon(category);
                  const customImage = getCategoryImage(category.name);
                  const displayImage = customImage || category.image_url;
                  const colors = getCategoryColors(category.name);

                  return (
                    <Card
                      key={category.id}
                      className="group cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-105 active:scale-95 border-0 bg-white rounded-3xl overflow-hidden relative"
                      onClick={() => setSelectedCategory(category.name)}
                    >
                      {/* Gradient background effect */}
                      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>

                      <CardContent className="relative p-4 sm:p-6 text-center">
                        <div className="mb-3 sm:mb-4">
                          {displayImage ? (
                            <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24">
                              <img
                                src={displayImage}
                                alt={category.name}
                                className="w-full h-full rounded-2xl object-cover shadow-lg ring-4 ring-white group-hover:ring-0 transition-all duration-300"
                              />
                              <div className="absolute -top-1 -right-1 bg-gradient-to-br from-orange-400 to-red-500 text-white text-xs font-black px-2 py-1 rounded-full shadow-md transform group-hover:scale-110 transition-transform">
                                HOT
                              </div>
                            </div>
                          ) : (
                            <div className="relative mx-auto w-20 h-20 sm:w-24 sm:h-24">
                              <div className={`w-full h-full bg-gradient-to-br ${colors.gradient} rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 transform group-hover:rotate-3`}>
                                <IconComponent className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
                              </div>
                              <div className="absolute -top-1 -right-1 bg-gradient-to-br from-yellow-400 to-orange-500 text-white text-xs font-black px-2 py-1 rounded-full shadow-md animate-pulse">
                                NEW
                              </div>
                            </div>
                          )}
                        </div>

                        <h3 className="font-black text-base sm:text-lg text-gray-900 mb-1 sm:mb-2 group-hover:text-[#d73a31] transition-colors">
                          {category.name}
                        </h3>

                        <div className="flex items-center justify-center gap-1 text-xs text-gray-500 mb-3">
                          <span>🔥</span>
                          <span className="font-semibold">Popular Choice</span>
                        </div>

                        <div className={`${colors.badge} text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md group-hover:shadow-lg transition-all transform group-hover:-translate-y-0.5`}>
                          Explore →
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            // Items listing view - improved design with better back button
            <div className="pb-6">
              <Button
                onClick={() => setSelectedCategory(null)}
                className="mb-6 bg-white hover:bg-gray-50 text-[#d73a31] border-2 border-[#d73a31] rounded-xl shadow-md hover:shadow-lg transition-all duration-200 font-semibold px-6 py-2"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Categories
                </span>
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
        </div>

        {/* Footer with centered button - now fixed at bottom */}
        <div className="border-t bg-gradient-to-r from-gray-50 to-white p-6 sm:p-8 flex-shrink-0">
          <div className="text-center space-y-4">
            <p className="text-xs sm:text-sm text-gray-600">
              ✨ <span className="font-semibold">89% of customers</span> who add these items say it made their meal complete!
            </p>

            <Button
              onClick={handleProceedToCheckout}
              variant="outline"
              className="px-8 sm:px-12 py-3 border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-800 text-base font-medium rounded-full shadow-sm hover:shadow-md transition-all duration-200"
            >
              {hasAddedItems ? "Proceed to Checkout" : "No Thanks, Continue to Checkout"}
            </Button>
          </div>
        </div>

        {/* Keep Looking Overlay Modal - Inside main dialog */}
        {showKeepLookingModal && (
          <div
            className="absolute inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowKeepLookingModal(false);
                console.log('Backdrop clicked - closing overlay modal');
              }
            }}
          >
            <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 max-w-md w-[90vw] mx-4">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900">Item Added!</h3>
                <p className="text-gray-600">Would you like to keep looking for more items to add to your order?</p>

                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowKeepLookingModal(false);
                      console.log('Keep looking button clicked - modal should close');
                    }}
                    className="flex-1 bg-[#d73a31] hover:bg-[#c73128] text-white font-semibold py-3"
                  >
                    Yes Please!
                  </Button>

                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Proceed to checkout button clicked from overlay');
                      setShowKeepLookingModal(false);
                      handleProceedToCheckout();
                    }}
                    variant="outline"
                    className="flex-1 border-2 border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-800 font-semibold py-3"
                  >
                    Proceed to Checkout
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutUpsellModal;