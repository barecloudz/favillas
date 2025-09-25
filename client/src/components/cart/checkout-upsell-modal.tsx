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
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories');
      if (response.ok) {
        return await response.json();
      }
      return [];
    },
    enabled: isOpen
  });

  // Fetch menu items
  const { data: menuItems = [] } = useQuery<MenuItem[]>({
    queryKey: ['/api/menu-items'],
    queryFn: async () => {
      const response = await fetch('/api/menu-items');
      if (response.ok) {
        return await response.json();
      }
      return [];
    },
    enabled: isOpen && selectedCategory !== null
  });

  // Detect missing categories based on cart contents
  const getMissingCategories = (): Category[] => {
    // Get categories from cart items
    const cartCategories = new Set(
      cartItems.map(item => {
        // Try to find the category from menu items or use a fallback
        const menuItem = menuItems.find(mi => mi.id === item.id);
        return menuItem?.category || 'Pizza'; // Default to Pizza if not found
      })
    );

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

    // Filter categories that are enabled for upselling and not in cart
    return categories.filter(category =>
      enabledUpsellCategories.includes(category.name) &&
      category.is_upsell_enabled !== false && // Default to enabled if not set
      !cartCategories.has(category.name)
    );
  };

  // Get category-specific menu items
  const getCategoryItems = (categoryName: string): MenuItem[] => {
    return menuItems.filter(item =>
      item.category === categoryName &&
      item.is_available
    ).slice(0, 6); // Limit to 6 items for better UX
  };

  // Get category icon
  const getCategoryIcon = (category: Category) => {
    const iconName = category.upsell_icon || category.name;
    return DEFAULT_CATEGORY_ICONS[iconName as keyof typeof DEFAULT_CATEGORY_ICONS] || Utensils;
  };

  // Handle adding item to cart
  const handleAddItem = async (item: MenuItem, event: React.MouseEvent) => {
    setIsAddingItem(true);

    const cartItem: CartItem = {
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      selectedOptions: {},
    };

    addItem(cartItem);

    // Trigger animation
    triggerPizzaAnimation(event.currentTarget as HTMLElement);

    setTimeout(() => setIsAddingItem(false), 300);
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

  // Don't show modal if no missing categories or already shown this session
  if (!isOpen || missingCategories.length === 0 || sessionStorage.getItem('upsellShown') === 'true') {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold text-[#d73a31]">
              {selectedCategory ? `Add ${selectedCategory}` : 'Complete Your Order'}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {!selectedCategory && (
            <p className="text-gray-600 mt-2">
              Would you like to add any of these to your order?
            </p>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] px-6">
          {!selectedCategory ? (
            // Category selection view
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-6">
              {missingCategories.map((category) => {
                const IconComponent = getCategoryIcon(category);
                return (
                  <Card
                    key={category.id}
                    className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-105 border-2 hover:border-[#d73a31]"
                    onClick={() => setSelectedCategory(category.name)}
                  >
                    <CardContent className="p-6 text-center">
                      {category.image_url ? (
                        <img
                          src={category.image_url}
                          alt={category.name}
                          className="w-16 h-16 mx-auto mb-3 rounded-lg object-cover"
                        />
                      ) : (
                        <IconComponent className="w-16 h-16 mx-auto mb-3 text-[#d73a31]" />
                      )}
                      <h3 className="font-semibold text-lg">{category.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Tap to browse {category.name.toLowerCase()}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            // Items listing view
            <div className="pb-6">
              <Button
                variant="ghost"
                onClick={() => setSelectedCategory(null)}
                className="mb-4 text-[#d73a31] hover:text-[#c73128]"
              >
                ← Back to Categories
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryItems.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-grow">
                          <h4 className="font-semibold text-lg">{item.name}</h4>
                          {item.description && (
                            <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              ${item.price.toFixed(2)}
                            </Badge>
                            <Button
                              size="sm"
                              className="bg-[#d73a31] hover:bg-[#c73128] text-white"
                              onClick={(e) => handleAddItem(item, e)}
                              disabled={isAddingItem}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add
                            </Button>
                          </div>
                        </div>
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-20 h-20 ml-4 rounded-lg object-cover"
                          />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {categoryItems.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No items available in this category right now.</p>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Footer buttons */}
        <div className="border-t bg-gray-50 p-6 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handleNoThanks}
            className="px-6"
          >
            No Thanks
          </Button>

          {selectedCategory && categoryItems.length > 0 && (
            <Button
              onClick={handleContinueAfterAdd}
              className="bg-[#d73a31] hover:bg-[#c73128] text-white px-8"
            >
              Continue to Checkout
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutUpsellModal;