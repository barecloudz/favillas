import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet";
import { Search, Plus, ShoppingCart, X, ChevronDown, Minus, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCart } from "@/hooks/use-cart";
import { useVacationMode } from "@/hooks/use-vacation-mode";
import { useStoreStatus } from "@/hooks/use-store-status";
import MenuItemSimple from "@/components/menu/menu-item-simple";
import MenuItemWithChoices from "@/components/menu/menu-item-with-choices";

const MenuPage = () => {
  const [location, navigate] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isChoiceModalOpen, setIsChoiceModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedChoices, setSelectedChoices] = useState<{[key: number]: string[]}>({});
  const [quantity, setQuantity] = useState(1);
  const [animatingItem, setAnimatingItem] = useState<number | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { addItem, items } = useCart();
  const { isOrderingPaused, displayMessage } = useVacationMode();
  const { isPastCutoff, canPlaceAsapOrders, cutoffMessage, storeStatus } = useStoreStatus();

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice) || numPrice === null || numPrice === undefined) {
      return "0.00";
    }
    return numPrice.toFixed(2);
  };

  const { data: menuItems, isLoading, error } = useQuery({
    queryKey: ["/api/menu"],
    queryFn: async () => {
      const response = await fetch('/api/menu');
      if (response.ok) {
        return await response.json();
      }
      throw new Error('Failed to load menu');
    }
  });

  // Re-enabled: Choice groups system
  const { data: choiceGroups = [] } = useQuery({
    queryKey: ['choice-groups'],
    queryFn: async () => {
      const response = await fetch('/api/choice-groups');
      if (response.ok) {
        return await response.json();
      }
      return [];
    }
  });

  const { data: choiceItems = [] } = useQuery({
    queryKey: ['choice-items'],
    queryFn: async () => {
      const response = await fetch('/api/choice-items');
      if (response.ok) {
        return await response.json();
      }
      return [];
    }
  });

  const { data: categoryChoiceGroups = [] } = useQuery({
    queryKey: ['category-choice-groups'],
    queryFn: async () => {
      const response = await fetch('/api/category-choice-groups');
      if (response.ok) {
        return await response.json();
      }
      return [];
    }
  });

  const { data: menuItemChoiceGroups = [] } = useQuery({
    queryKey: ['menu-item-choice-groups'],
    queryFn: async () => {
      const response = await fetch('/api/menu-item-choice-groups');
      if (response.ok) {
        return await response.json();
      }
      return [];
    }
  });

  // Fetch categories from backend (or use default if not available)
  const { data: categoriesData } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          // Transform to ensure consistent field names
          const categories = Array.isArray(data) ? data : data.categories || [];
          return {
            categories: categories.map((cat: any) => ({
              ...cat,
              isActive: cat.isActive ?? cat.is_active ?? true,
              imageUrl: cat.imageUrl ?? cat.image_url ?? null,
              isTemporarilyUnavailable: cat.isTemporarilyUnavailable ?? false,
              unavailabilityReason: cat.unavailabilityReason ?? null,
            }))
          };
        }
      } catch (error) {
        console.log('Categories API not available, using defaults');
      }
      // Return default categories if API is not available
      return {
        categories: [
          { id: 1, name: "Traditional Pizza", order: 1, isActive: true, imageUrl: null },
          { id: 2, name: "10\" Specialty Gourmet Pizzas", order: 2, isActive: true, imageUrl: null },
          { id: 3, name: "14\" Specialty Gourmet Pizzas", order: 3, isActive: true, imageUrl: null },
          { id: 4, name: "16\" Specialty Gourmet Pizzas", order: 4, isActive: true, imageUrl: null },
          { id: 5, name: "Sicilian Pizzas", order: 5, isActive: true, imageUrl: null },
          { id: 6, name: "Appetizers", order: 6, isActive: true, imageUrl: null },
          { id: 7, name: "Sides", order: 7, isActive: true, imageUrl: null },
          { id: 8, name: "Desserts", order: 8, isActive: true, imageUrl: null },
          { id: 9, name: "Beverages", order: 9, isActive: true, imageUrl: null },
        ]
      };
    },
    placeholderData: {
      categories: [
        { id: 1, name: "Traditional Pizza", order: 1, isActive: true },
        { id: 2, name: "10\" Specialty Gourmet Pizzas", order: 2, isActive: true },
        { id: 3, name: "14\" Specialty Gourmet Pizzas", order: 3, isActive: true },
        { id: 4, name: "16\" Specialty Gourmet Pizzas", order: 4, isActive: true },
        { id: 5, name: "Sicilian Pizzas", order: 5, isActive: true },
        { id: 6, name: "Appetizers", order: 6, isActive: true },
        { id: 7, name: "Sides", order: 7, isActive: true },
        { id: 8, name: "Desserts", order: 8, isActive: true },
        { id: 9, name: "Beverages", order: 9, isActive: true },
      ]
    }
  });

  // Get category and item from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const categoryFromUrl = urlParams.get('category');
  const itemIdFromUrl = urlParams.get('item');

  // Set initial category from URL
  React.useEffect(() => {
    if (categoryFromUrl && !selectedCategory) {
      setSelectedCategory(categoryFromUrl);
    }
  }, [categoryFromUrl, selectedCategory]);

  // Handle direct link to specific item from homepage
  const hasScrolledToItem = React.useRef(false);

  React.useEffect(() => {
    if (itemIdFromUrl && menuItems && menuItems.length > 0 && !hasScrolledToItem.current) {
      const targetItem = menuItems.find((item: any) => item.id === parseInt(itemIdFromUrl));

      if (targetItem) {
        // Mark that we've handled this scroll
        hasScrolledToItem.current = true;

        // Expand the category containing this item
        setExpandedCategories(prev => {
          const newExpanded = new Set(prev);
          newExpanded.add(targetItem.category);
          return newExpanded;
        });

        // Scroll to the item after a short delay to allow rendering
        setTimeout(() => {
          const itemElement = document.getElementById(`menu-item-${targetItem.id}`);
          if (itemElement) {
            itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a highlight effect
            itemElement.classList.add('ring-4', 'ring-red-500', 'ring-offset-2');
            setTimeout(() => {
              itemElement.classList.remove('ring-4', 'ring-red-500', 'ring-offset-2');
            }, 3000);
          }
        }, 300);
      }
    }
  }, [itemIdFromUrl, menuItems]);

  // Create categories array with counts (filter out inactive and temporarily unavailable)
  const categories = [
    { id: null, name: "All", count: (menuItems || []).length },
    ...(categoriesData?.categories || [])
      .filter((cat: any) => cat.isActive && !cat.isTemporarilyUnavailable)
      .sort((a: any, b: any) => a.order - b.order)
      .map((cat: any) => ({
        id: cat.name,
        name: cat.name,
        count: (menuItems || []).filter((item: any) => item.category === cat.name).length
      }))
  ];

  const filteredItems = (menuItems || []).filter((item: any) => {
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    const matchesSearch = item?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch && item.isAvailable !== false;
  });

  // Group items by category for display
  const itemsByCategory = (filteredItems || []).reduce((acc: any, item: any) => {
    const category = item.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  // Handle clicking on item card to open modal
  const handleItemClick = (item: any) => {
    setSelectedItem(item);
    setSelectedChoices({});
    setQuantity(1);
    setIsChoiceModalOpen(true);
  };


  // Get choice groups for a specific item
  const getItemChoiceGroups = (item: any) => {
    const relevantGroups: any[] = [];

    // Get choice groups assigned directly to this menu item
    const directGroups = menuItemChoiceGroups
      .filter((micg: any) => micg.menu_item_id === item.id)
      .map((micg: any) => micg.choice_group_id);

    // Get choice groups assigned to this item's category
    const categoryGroups = categoryChoiceGroups
      .filter((ccg: any) => ccg.category_name === item.category)
      .map((ccg: any) => ccg.choice_group_id);

    // Combine and deduplicate
    const allGroupIds = [...new Set([...directGroups, ...categoryGroups])];

    console.log(`🔍 Debug for item "${item.name}" (category: ${item.category}):`, {
      menuItemChoiceGroups: menuItemChoiceGroups.length,
      categoryChoiceGroups: categoryChoiceGroups.length,
      directGroups,
      categoryGroups,
      allGroupIds,
      choiceGroups: choiceGroups.length,
      choiceItems: choiceItems.length
    });
    
    // Get the actual choice group objects
    allGroupIds.forEach(groupId => {
      const group = choiceGroups.find((cg: any) => cg.id === groupId && cg.isActive);
      if (group) {
        // Include ALL active items, even if temporarily unavailable (we'll show them as "Out of Stock")
        const groupItems = choiceItems.filter((ci: any) =>
          ci.choiceGroupId === groupId &&
          ci.isActive
        );
        relevantGroups.push({
          ...group,
          items: groupItems.sort((a: any, b: any) => a.order - b.order)
        });
      }
    });
    
    return relevantGroups.sort((a: any, b: any) => a.order - b.order);
  };

  // Pizza animation function
  const createPizzaAnimation = (buttonId: string) => {
    const button = document.getElementById(buttonId);
    
    // Detect if we're on mobile by checking screen width and device characteristics
    const isMobile = window.innerWidth < 768 || 
                     ('ontouchstart' in window && window.innerWidth < 1024);
    
    // Find the appropriate cart button based on screen size
    let cartButton;
    if (isMobile) {
      // On mobile, target the bottom navigation cart button
      cartButton = document.querySelector('[data-mobile-cart="true"]');
      
      // Additional fallback for mobile - look for visible cart button in bottom nav
      if (!cartButton) {
        const bottomNav = document.querySelector('nav.fixed.bottom-0');
        if (bottomNav) {
          cartButton = bottomNav.querySelector('[data-cart-button]');
        }
      }
    } else {
      // On desktop, target the desktop cart button
      cartButton = document.querySelector('[data-desktop-cart="true"]');
      
      // Additional fallback for desktop - look for header cart button
      if (!cartButton) {
        const header = document.querySelector('header');
        if (header) {
          cartButton = header.querySelector('[data-cart-button]');
        }
      }
    }
    
    // Final fallback to any visible cart button
    if (!cartButton) {
      const allCartButtons = document.querySelectorAll('[data-cart-button]');
      // Find the first visible cart button
      for (let i = 0; i < allCartButtons.length; i++) {
        const btn = allCartButtons[i] as HTMLElement;
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          cartButton = btn;
          break;
        }
      }
    }
    
    if (!button || !cartButton) {
      console.log('Pizza animation failed: missing button or cart target', { 
        button: !!button, 
        cartButton: !!cartButton,
        isMobile,
        screenWidth: window.innerWidth 
      });
      return;
    }
    
    // Create animated pizza element
    const pizza = document.createElement('div');
    pizza.innerHTML = '🍕';
    pizza.style.cssText = `
      position: fixed;
      font-size: 24px;
      z-index: 1000;
      pointer-events: none;
      transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    `;
    
    // Get starting position from button
    const buttonRect = button.getBoundingClientRect();
    const cartRect = cartButton.getBoundingClientRect();
    
    pizza.style.left = `${buttonRect.left + buttonRect.width / 2}px`;
    pizza.style.top = `${buttonRect.top + buttonRect.height / 2}px`;
    
    document.body.appendChild(pizza);
    
    // Animate to cart
    requestAnimationFrame(() => {
      pizza.style.left = `${cartRect.left + cartRect.width / 2}px`;
      pizza.style.top = `${cartRect.top + cartRect.height / 2}px`;
      pizza.style.transform = 'scale(0.5) rotate(360deg)';
      pizza.style.opacity = '0.8';
    });
    
    // Remove element after animation
    setTimeout(() => {
      pizza.remove();
    }, 800);
  };


  const handleAddToCart = (item: any) => {
    const itemChoiceGroups = getItemChoiceGroups(item);
    
    // If item has choice groups, show selection modal
    if (itemChoiceGroups.length > 0) {
      setSelectedItem(item);
      setSelectedChoices({});
      setQuantity(1);
      setIsChoiceModalOpen(true);
      return;
    }
    
    // Create pizza animation
    createPizzaAnimation(`add-to-cart-${item.id}`);
    
    // If no choice groups, add directly to cart
    // Ensure we have a valid price
    let price = 0;
    if (item.basePrice) {
      if (typeof item.basePrice === 'string') {
        price = parseFloat(item.basePrice) || 0;
      } else if (typeof item.basePrice === 'number') {
        price = item.basePrice;
      }
    }
    
    addItem({
      id: item.id,
      name: item?.name || 'Unknown Item',
      price: price,
      quantity: 1
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 text-lg mb-2">Failed to load menu</p>
          <p className="text-gray-600">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Menu - Order Pizza Online in Asheville NC | Favilla's NY Pizza</title>
        <meta name="description" content="Order authentic NY style pizza online in Asheville, NC. Browse our menu of pizzas, calzones, stromboli & more. Fast delivery & pickup available. Order now!" />
        <meta name="keywords" content="pizza menu asheville, order pizza online asheville, ny pizza delivery asheville, pizza pickup asheville nc, italian food menu asheville" />
      </Helmet>

      <div className="min-h-screen bg-gray-50 lg:pt-20 pt-0">
        {/* Vacation Mode Banner */}
        {isOrderingPaused && (
          <div className="bg-yellow-500 border-b-4 border-yellow-600 px-4 sm:px-6 lg:px-8 py-4">
            <div className="max-w-7xl mx-auto flex items-center gap-3 text-white">
              <AlertCircle className="h-6 w-6 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-lg">ASAP Orders Temporarily Paused</p>
                <p className="text-sm mb-1">{displayMessage}</p>
                <p className="text-sm font-medium bg-yellow-600 bg-opacity-50 px-2 py-1 rounded inline-block">
                  💡 Scheduled orders for later pickup/delivery are still available!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Store Hours Cutoff Banner */}
        {!isOrderingPaused && isPastCutoff && (
          <div className="bg-yellow-500 border-b-4 border-yellow-600 px-4 sm:px-6 lg:px-8 py-4">
            <div className="max-w-7xl mx-auto flex items-center gap-3 text-white">
              <AlertCircle className="h-6 w-6 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-lg">ASAP Orders Closed</p>
                <p className="text-sm mb-1">{cutoffMessage}</p>
                <p className="text-sm font-medium bg-yellow-600 bg-opacity-50 px-2 py-1 rounded inline-block">
                  💡 You can still schedule an order for when we open{storeStatus?.nextOpenTime ? ` at ${storeStatus.nextOpenTime}` : ''}!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/checkout")}
              className="relative"
              data-cart-button="true"
              data-desktop-cart="true"
              disabled={isOrderingPaused || isPastCutoff}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Cart
              {items.length > 0 && (
                <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-600 text-xs">
                  {items.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="max-w-7xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white shadow-sm"
            />
          </div>
        </div>

        {/* Category Cards - Only show when no search query */}
        {!searchQuery && (
          <div className="px-4 sm:px-6 lg:px-8 pb-6">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Browse by Category</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {categoriesData?.categories
                  ?.filter((cat: any) => cat.isActive)
                  .sort((a: any, b: any) => a.order - b.order)
                  .map((category: any) => {
                    const itemCount = (menuItems || []).filter((item: any) => item.category === category.name).length;
                    const isExpanded = expandedCategories.has(category.name);

                    if (itemCount === 0) return null;

                    return (
                      <Card
                        key={category.id}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                          isExpanded ? 'border-red-500 shadow-md' : 'border-transparent'
                        }`}
                        onClick={() => {
                          const newExpanded = new Set(expandedCategories);
                          if (isExpanded) {
                            newExpanded.delete(category.name);
                          } else {
                            newExpanded.add(category.name);
                          }
                          setExpandedCategories(newExpanded);

                          // Scroll to category section
                          setTimeout(() => {
                            const element = document.getElementById(`category-${category.name}`);
                            if (element) {
                              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                          }, 100);
                        }}
                      >
                        <CardContent className="p-4">
                          {category.imageUrl || category.image_url ? (
                            <div className="aspect-square rounded-lg overflow-hidden mb-3">
                              <img
                                src={category.imageUrl || category.image_url}
                                alt={category.name}
                                className={`w-full h-full object-cover transition-all duration-200 ${
                                  !['Specialty Gourmet Pizzas', 'Salads', 'Drinks'].includes(category.name)
                                    ? 'brightness-110 hover:brightness-125'
                                    : 'hover:brightness-110'
                                }`}
                              />
                            </div>
                          ) : (
                            <div className="aspect-square rounded-lg bg-gradient-to-br from-red-100 to-red-200 flex items-center justify-center mb-3">
                              <ChevronDown className={`h-12 w-12 text-red-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          )}
                          <h3 className="font-semibold text-center text-sm mb-1">{category.name}</h3>
                          <p className="text-xs text-gray-500 text-center">{itemCount} items</p>
                          {isExpanded && (
                            <Badge className="mt-2 w-full justify-center bg-red-600">
                              Viewing
                            </Badge>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            </div>
          </div>
        )}

        {/* Menu Items */}
        <div className="px-4 sm:px-6 lg:px-8 pb-32">
          <div className="max-w-7xl mx-auto">
            {Object.keys(itemsByCategory).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No items found</p>
              <p className="text-gray-400">Try adjusting your search or category filter</p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(itemsByCategory)
                .sort(([categoryA], [categoryB]) => {
                  // Sort categories by their order value
                  const catA = categoriesData?.categories?.find((c: any) => c.name === categoryA);
                  const catB = categoriesData?.categories?.find((c: any) => c.name === categoryB);
                  return (catA?.order || 999) - (catB?.order || 999);
                })
                .map(([categoryName, items]: [string, any]) => {
                  // Only show categories that are expanded OR if search is active
                  const isExpanded = expandedCategories.has(categoryName);
                  if (!searchQuery && !isExpanded && expandedCategories.size > 0) {
                    return null;
                  }

                  return (
                    <div key={categoryName} id={`category-${categoryName}`} className="scroll-mt-24">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-bold text-gray-900">{categoryName}</h2>
                        {!searchQuery && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newExpanded = new Set(expandedCategories);
                              if (isExpanded) {
                                newExpanded.delete(categoryName);
                              } else {
                                newExpanded.add(categoryName);
                              }
                              setExpandedCategories(newExpanded);
                            }}
                          >
                            {isExpanded ? 'Collapse' : 'Expand'}
                            <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
                        {items.map((item: any) => (
                          <div key={item.id} id={`menu-item-${item.id}`} className="transition-all duration-300">
                            <MenuItemWithChoices
                              item={item}
                              choiceGroups={choiceGroups}
                              choiceItems={choiceItems}
                              menuItemChoiceGroups={menuItemChoiceGroups}
                              isOrderingPaused={isOrderingPaused}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Choice Selection Modal */}
      <Dialog open={isChoiceModalOpen} onOpenChange={setIsChoiceModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-2xl">🍕</span>
              {selectedItem?.name}
            </DialogTitle>
            {selectedItem?.description && (
              <p className="text-gray-600 text-sm mt-2">{selectedItem.description}</p>
            )}
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-6">
              {/* Item image */}
              {selectedItem.imageUrl && (
                <div className="w-full h-48 rounded-lg overflow-hidden">
                  <img 
                    src={selectedItem.imageUrl} 
                    alt={selectedItem.name} 
                    className="w-full h-full object-cover" 
                  />
                </div>
              )}

              {/* Quantity selector */}
              <div className="flex items-center justify-center space-x-4">
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-8 w-8 rounded-full"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Quantity</div>
                  <div className="text-lg font-semibold">{quantity}</div>
                </div>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-8 w-8 rounded-full"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {getItemChoiceGroups(selectedItem).map((group: any) => (
                <div key={group.id} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-base font-semibold">
                      {group.name}
                      {group.isRequired && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    <Badge variant="outline" className="text-xs">
                      {group.isRequired ? 'Required' : 'Optional'}
                    </Badge>
                  </div>
                  
                  {group.description && (
                    <p className="text-sm text-gray-600">{group.description}</p>
                  )}

                  {group.maxSelections === 1 ? (
                    // Radio group for single selection
                    <RadioGroup
                      value={selectedChoices[group.id]?.[0] || ""}
                      onValueChange={(value) => {
                        setSelectedChoices(prev => ({
                          ...prev,
                          [group.id]: value ? [value] : []
                        }));
                      }}
                    >
                      {group.items.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value={item.id.toString()} id={`choice-${item.id}`} />
                            <Label htmlFor={`choice-${item.id}`} className="font-normal">
                              {item.name}
                              {item.description && (
                                <span className="text-sm text-gray-500 block">{item.description}</span>
                              )}
                            </Label>
                          </div>
                          {parseFloat(item.price) > 0 && (
                            <Badge variant="secondary">+${formatPrice(item.price)}</Badge>
                          )}
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    // Checkbox group for multiple selection
                    <div className="space-y-2">
                      {group.items.map((item: any) => (
                        <div key={item.id} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`choice-${item.id}`}
                              checked={selectedChoices[group.id]?.includes(item.id.toString()) || false}
                              onCheckedChange={(checked) => {
                                setSelectedChoices(prev => {
                                  const currentSelections = prev[group.id] || [];
                                  if (checked) {
                                    // Check max selections limit
                                    if (group.maxSelections && currentSelections.length >= group.maxSelections) {
                                      return prev; // Don't add if limit reached
                                    }
                                    return {
                                      ...prev,
                                      [group.id]: [...currentSelections, item.id.toString()]
                                    };
                                  } else {
                                    return {
                                      ...prev,
                                      [group.id]: currentSelections.filter((id: string) => id !== item.id.toString())
                                    };
                                  }
                                });
                              }}
                            />
                            <Label htmlFor={`choice-${item.id}`} className="font-normal">
                              {item.name}
                              {item.description && (
                                <span className="text-sm text-gray-500 block">{item.description}</span>
                              )}
                            </Label>
                          </div>
                          {parseFloat(item.price) > 0 && (
                            <Badge variant="secondary">+${formatPrice(item.price)}</Badge>
                          )}
                        </div>
                      ))}
                      {group.maxSelections && (
                        <p className="text-xs text-gray-500">
                          Max {group.maxSelections} selections
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setIsChoiceModalOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  id={`modal-add-to-cart-${selectedItem.id}`}
                  onClick={() => {
                    // Validate required selections
                    const itemChoiceGroups = getItemChoiceGroups(selectedItem);
                    const missingRequired = itemChoiceGroups.filter((group: any) => 
                      group.isRequired && 
                      (!selectedChoices[group.id] || selectedChoices[group.id].length === 0)
                    );

                    if (missingRequired.length > 0) {
                      alert(`Please select ${missingRequired.map((g: any) => g?.name || 'Unknown').join(', ')}`);
                      return;
                    }

                    // Calculate total price with selections
                    let totalPrice = parseFloat(selectedItem.basePrice) || 0;
                    const selectedOptions: any[] = [];

                    Object.entries(selectedChoices).forEach(([groupId, selections]) => {
                      const group = itemChoiceGroups.find((g: any) => g.id === parseInt(groupId));
                      if (group) {
                        selections.forEach((selectionId: string) => {
                          const choiceItem = group.items.find((item: any) => item.id === parseInt(selectionId));
                          if (choiceItem) {
                            totalPrice += parseFloat(choiceItem.price) || 0;
                            selectedOptions.push({
                              groupName: group.name,
                              itemName: choiceItem.name,
                              price: parseFloat(choiceItem.price) || 0
                            });
                          }
                        });
                      }
                    });

                    // Create pizza animation before closing modal
                    createPizzaAnimation(`modal-add-to-cart-${selectedItem.id}`);

                    // Add to cart with selections and quantity
                    addItem({
                      id: selectedItem.id,
                      name: selectedItem?.name || 'Unknown Item',
                      price: totalPrice,
                      quantity: quantity,
                      options: selectedOptions
                    });

                    setIsChoiceModalOpen(false);
                    setSelectedItem(null);
                    setSelectedChoices({});
                    setQuantity(1);
                  }}
                  className="bg-[#d73a31] hover:bg-[#c73128] text-white"
                >
                  Add {quantity > 1 ? `${quantity} ` : ''}to Cart
                  {quantity > 1 && (
                    <Badge variant="secondary" className="ml-2 bg-white text-[#d73a31]">
                      ${formatPrice((parseFloat(selectedItem.basePrice) || 0) * quantity)}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </>
  );
};

export default MenuPage;
