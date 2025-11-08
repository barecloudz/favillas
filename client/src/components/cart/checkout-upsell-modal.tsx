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

  // Fetch categories (use same format as menu page)
  const { data: categoriesData, isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          // Transform to ensure consistent field names (same as menu page)
          const categories = Array.isArray(data) ? data : data.categories || [];
          return {
            categories: categories.map((cat: any) => ({
              ...cat,
              imageUrl: cat.imageUrl ?? cat.image_url ?? null,
              is_upsell_enabled: cat.is_upsell_enabled ?? cat.isUpsellEnabled ?? true,
            }))
          };
        }
      } catch (error) {
        console.log('Categories API not available');
      }
      return { categories: [] };
    },
    enabled: isOpen,
    retry: 1,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const categories = categoriesData?.categories || [];

  // Fetch menu items (use same query as menu page - no transformation needed)
  const { data: menuItems = [] } = useQuery({
    queryKey: ['/api/menu'],
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
  const getCategoryItems = (categoryName: string): any[] => {
    if (!Array.isArray(menuItems) || !categoryName) {
      return [];
    }

    // Case-insensitive category matching
    const categoryLower = categoryName.toLowerCase().trim();

    const filtered = menuItems.filter((item: any) => {
      if (!item || !item.id || !item.name) return false;

      const itemCategoryLower = (item.category || '').toLowerCase().trim();
      const matchesCategory = itemCategoryLower === categoryLower;
      const isAvailable = item.isAvailable !== false; // Use isAvailable (camelCase)
      const hasValidPrice = item.basePrice && parseFloat(item.basePrice) >= 0; // Use basePrice

      return matchesCategory && isAvailable && hasValidPrice;
    }).slice(0, 6); // Limit to 6 items for better UX

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
  const handleAddItem = async (item: any, event: React.MouseEvent) => {
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

      // Parse price from basePrice (same as menu page does)
      let price = 0;
      if (item.basePrice) {
        if (typeof item.basePrice === 'string') {
          price = parseFloat(item.basePrice) || 0;
        } else if (typeof item.basePrice === 'number') {
          price = item.basePrice;
        }
      }

      const cartItem: CartItem = {
        id: item.id,
        name: item.name,
        price: price,
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
      <DialogContent className="max-w-6xl w-[95vw] max-h-[95vh] p-0 flex flex-col overflow-hidden bg-white">
        {/* Premium Header with elegant design */}
        <DialogHeader className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white px-6 sm:px-12 py-8 sm:py-12">
          {/* Subtle texture overlay */}
          <div className="absolute inset-0 opacity-5 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC04LjI4NC02LjcxNi0xNS0xNS0xNXMtMTUgNi43MTYtMTUgMTUgNi43MTYgMTUgMTUgMTUgMTUtNi43MTYgMTUtMTV6Ii8+PC9nPjwvZz48L3N2Zz4=')] pointer-events-none"></div>

          {/* Accent line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#d73a31] to-transparent"></div>

          <div className="relative z-10 text-center max-w-3xl mx-auto">
            {!selectedCategory && (
              <div className="mb-4">
                <span className="inline-block px-4 py-1.5 bg-white/10 backdrop-blur-sm text-xs tracking-widest uppercase font-semibold text-white/90 rounded-full border border-white/20">
                  Recommended For You
                </span>
              </div>
            )}

            <DialogTitle className="text-3xl sm:text-5xl font-serif font-light mb-3 sm:mb-4 leading-tight tracking-tight text-white">
              {selectedCategory ? (
                <span className="font-sans font-medium">{selectedCategory}</span>
              ) : (
                <>Perfect Your <span className="font-serif italic text-[#d73a31]">Experience</span></>
              )}
            </DialogTitle>

            {!selectedCategory && (
              <p className="text-white/70 text-base sm:text-lg font-light leading-relaxed max-w-2xl mx-auto">
                Elevate your meal with our handpicked selections
              </p>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 sm:px-12 py-8 sm:py-12 bg-gray-50">
          {!selectedCategory ? (
            // Category selection view - premium design
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
                {missingCategories.map((category) => {
                  const IconComponent = getCategoryIcon(category);
                  const customImage = getCategoryImage(category.name);
                  const displayImage = customImage || (category as any).imageUrl;

                  return (
                    <Card
                      key={category.id}
                      className="group cursor-pointer border border-gray-200/80 hover:border-[#d73a31] bg-white overflow-hidden transition-all duration-500 hover:shadow-xl hover:-translate-y-1"
                      onClick={() => setSelectedCategory(category.name)}
                    >
                      <CardContent className="p-0">
                        {/* Image Section */}
                        <div className="relative h-40 sm:h-48 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-50">
                          {displayImage ? (
                            <>
                              <img
                                src={displayImage}
                                alt={category.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white shadow-lg flex items-center justify-center transition-transform duration-500 group-hover:scale-110">
                                <IconComponent className="w-8 h-8 sm:w-10 sm:h-10 text-[#d73a31]" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Content Section */}
                        <div className="p-5 text-center">
                          <h3 className="font-semibold text-base sm:text-lg text-gray-900 mb-2 tracking-tight group-hover:text-[#d73a31] transition-colors duration-300">
                            {category.name}
                          </h3>

                          <div className="text-xs sm:text-sm text-gray-500 font-light mb-4">
                            Premium Selection
                          </div>

                          <div className="inline-flex items-center text-[#d73a31] font-medium text-sm group-hover:gap-2 transition-all duration-300">
                            <span>Explore</span>
                            <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ) : (
            // Items listing view - premium design
            <div className="max-w-5xl mx-auto">
              <Button
                onClick={() => setSelectedCategory(null)}
                variant="ghost"
                className="mb-8 text-gray-600 hover:text-gray-900 hover:bg-transparent font-medium px-0"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Categories
              </Button>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryItems.map((item) => (
                  <Card key={item.id} className="group border border-gray-200/80 hover:border-[#d73a31] bg-white overflow-hidden transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
                    <CardContent className="p-0">
                      {/* Premium Image Section */}
                      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                        {item.imageUrl ? (
                          <>
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center">
                              <Utensils className="w-10 h-10 text-[#d73a31]" />
                            </div>
                          </div>
                        )}

                        {/* Price Badge - Elegant Design */}
                        <div className="absolute bottom-3 right-3">
                          <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
                            <span className="text-[#d73a31] font-semibold text-sm">
                              ${item.basePrice ? Number(item.basePrice).toFixed(2) : '0.00'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Item Content */}
                      <div className="p-5">
                        <h4 className="font-semibold text-lg mb-2 text-gray-900 group-hover:text-[#d73a31] transition-colors duration-300 tracking-tight">
                          {item.name}
                        </h4>

                        {item.description && (
                          <p className="text-sm text-gray-500 mb-5 line-clamp-2 font-light leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        <Button
                          className="w-full bg-slate-900 hover:bg-[#d73a31] text-white font-medium py-2.5 transition-all duration-300 shadow-sm hover:shadow-md"
                          onClick={(e) => handleAddItem(item, e)}
                          disabled={isAddingItem}
                        >
                          {isAddingItem ? (
                            <div className="flex items-center justify-center">
                              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                              <span>Adding...</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center">
                              <Plus className="h-4 w-4 mr-2" />
                              <span>Add to Cart</span>
                            </div>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {categoryItems.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Coffee className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="text-gray-600 text-lg font-light mb-2">No items available</p>
                  <p className="text-gray-400 text-sm mb-6">Check back soon for new additions</p>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedCategory(null)}
                    className="border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-900"
                  >
                    Browse Other Categories
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Premium Footer */}
        <div className="border-t border-gray-200 bg-white px-6 sm:px-12 py-6 sm:py-8 flex-shrink-0">
          <div className="max-w-3xl mx-auto text-center space-y-5">
            <Button
              onClick={handleProceedToCheckout}
              variant="outline"
              className="px-10 py-3 border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 font-medium transition-all duration-300 hover:shadow-md"
            >
              {hasAddedItems ? "Continue to Checkout" : "Skip and Continue"}
            </Button>

            <p className="text-xs text-gray-500 font-light">
              You can always add more items later
            </p>
          </div>
        </div>

        {/* Premium Keep Looking Overlay Modal */}
        {showKeepLookingModal && (
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowKeepLookingModal(false);
              }
            }}
          >
            <div className="bg-white shadow-2xl max-w-md w-full mx-4 overflow-hidden">
              <div className="p-8 text-center space-y-6">
                {/* Success Icon */}
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-semibold text-gray-900">Added to Cart</h3>
                  <p className="text-gray-600 font-light leading-relaxed">
                    Continue browsing or proceed to checkout
                  </p>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowKeepLookingModal(false);
                    }}
                    className="w-full bg-slate-900 hover:bg-[#d73a31] text-white font-medium py-3 transition-all duration-300"
                  >
                    Keep Browsing
                  </Button>

                  <Button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowKeepLookingModal(false);
                      handleProceedToCheckout();
                    }}
                    variant="outline"
                    className="w-full border border-gray-300 hover:border-gray-400 text-gray-700 hover:text-gray-900 font-medium py-3 transition-all duration-300"
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