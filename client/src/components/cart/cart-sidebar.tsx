import React, { useState, useEffect } from "react";
import { useCart, CartItem } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-supabase-auth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingCart, X, Trash2, Plus, Minus, Pizza, Edit } from "lucide-react";
import { Link } from "wouter";
import CheckoutPromptModal from "@/components/auth/checkout-prompt-modal";
import LoginModal from "@/components/auth/login-modal";
import CheckoutUpsellModal from "@/components/cart/checkout-upsell-modal";

const CartSidebar: React.FC = () => {
  const {
    isOpen,
    toggleCart,
    closeCart,
    items,
    total,
    tax,
    updateItemQuantity,
    removeItem,
    clearCart,
    addItem
  } = useCart();

  // Fetch choice groups data for editing
  const { data: choiceGroups = [] } = useQuery({
    queryKey: ['choice-groups'],
    queryFn: async () => {
      const response = await fetch('/api/choice-groups');
      if (response.ok) return await response.json();
      return [];
    }
  });

  const { data: choiceItems = [] } = useQuery({
    queryKey: ['choice-items'],
    queryFn: async () => {
      const response = await fetch('/api/choice-items');
      if (response.ok) return await response.json();
      return [];
    }
  });

  const { data: menuItemChoiceGroups = [] } = useQuery({
    queryKey: ['menu-item-choice-groups'],
    queryFn: async () => {
      const response = await fetch('/api/menu-item-choice-groups');
      if (response.ok) return await response.json();
      return [];
    }
  });

  // Clean up corrupted items when cart opens
  useEffect(() => {
    if (isOpen) {
      const validItems = items.filter(item =>
        item &&
        typeof item === 'object' &&
        item.id &&
        item.name &&
        typeof item.name === 'string' &&
        item.name.trim() !== '' &&
        item.price !== undefined &&
        item.quantity !== undefined &&
        !isNaN(parseFloat(String(item.price))) &&
        parseInt(String(item.quantity)) > 0
      );

      if (validItems.length !== items.length) {
        console.warn(`Cart had ${items.length - validItems.length} corrupted items, cleaning up...`);
        // Clear cart if there are corrupted items
        clearCart();
      }
    }
  }, [isOpen, items, clearCart]);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  
  const formatPrice = (price: number) => {
    if (isNaN(price) || price === null || price === undefined) {
      return "0.00";
    }
    return price.toFixed(2);
  };
  
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [editedOptions, setEditedOptions] = useState<Array<{
    groupName: string;
    itemName: string;
    price: number;
  }>>([]);
  const [editedInstructions, setEditedInstructions] = useState("");
  const [selectedChoices, setSelectedChoices] = useState<{ [key: string]: string[] }>({});
  const [showCheckoutPrompt, setShowCheckoutPrompt] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [showUpsellModal, setShowUpsellModal] = useState(false);

  // Temporary debug function - remove in production
  useEffect(() => {
    (window as any).clearUpsellSession = () => {
      sessionStorage.removeItem('upsellShown');
      console.log('🧹 Cleared upsell session flag - upsell will show again');
    };
  }, []);

  // Close cart when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isOpen && 
          !target.closest('#cart-sidebar') && 
          !target.closest('button[aria-label="Toggle Cart"]') &&
          !target.closest('[data-radix-dialog-content]') &&
          !target.closest('[data-radix-dialog-overlay]') &&
          !editingItem) {
        toggleCart();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, toggleCart, editingItem]);
  
  // Prevent body scroll when cart is open (only on mobile to prevent issues with desktop backend scrolling)
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    
    if (isOpen && isMobile) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Get available choice groups for an item
  const getItemChoiceGroups = (itemId: number) => {
    const itemGroups = menuItemChoiceGroups
      .filter((micg: any) => micg.menu_item_id === itemId)
      .map((micg: any) => {
        const group = choiceGroups.find((cg: any) => cg.id === micg.choice_group_id);
        if (!group) return null;

        const items = choiceItems
          .filter((ci: any) => ci.choiceGroupId === group.id)
          .sort((a: any, b: any) => a.order - b.order);

        return {
          ...group,
          items,
          isRequired: micg.is_required,
          displayOrder: micg.order || 0
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.displayOrder - b.displayOrder);

    return itemGroups;
  };

  // Handle opening edit modal
  const handleEditItem = (item: CartItem, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    setEditingItem(item);
    setEditedOptions(item.options || []);
    setEditedInstructions(item.specialInstructions || "");

    // Initialize selectedChoices from existing options
    const initialSelections: { [key: string]: string[] } = {};
    const availableGroups = getItemChoiceGroups(item.id);

    if (item.options && item.options.length > 0) {
      item.options.forEach(option => {
        // Find the group and choice item IDs
        const group = availableGroups.find((g: any) => g.name === option.groupName);
        if (group) {
          const choiceItem = group.items.find((ci: any) => ci.name === option.itemName);
          if (choiceItem) {
            if (!initialSelections[group.id]) {
              initialSelections[group.id] = [];
            }
            initialSelections[group.id].push(choiceItem.id.toString());
          }
        }
      });
    }

    setSelectedChoices(initialSelections);
  };

  // Handle removing an addon
  const handleRemoveAddon = (index: number) => {
    setEditedOptions(prev => prev.filter((_, i) => i !== index));
  };

  // Handle saving edited item
  const handleSaveEdit = () => {
    if (!editingItem) return;

    const availableGroups = getItemChoiceGroups(editingItem.id);

    // Build options array from selectedChoices
    const newOptions: Array<{ groupName: string; itemName: string; price: number }> = [];
    Object.entries(selectedChoices).forEach(([groupId, selections]) => {
      const group = availableGroups.find((g: any) => g.id === parseInt(groupId));
      if (group) {
        selections.forEach(selectionId => {
          const choiceItem = group.items.find((item: any) => item.id === parseInt(selectionId));
          if (choiceItem) {
            newOptions.push({
              groupName: group.name,
              itemName: choiceItem.name,
              price: parseFloat(choiceItem.price) || 0
            });
          }
        });
      }
    });

    // Calculate new price
    const basePrice = parseFloat(String(editingItem.basePrice || editingItem.price)) || 0;
    const addonPrice = newOptions.reduce((sum, opt) => sum + opt.price, 0);
    const newPrice = basePrice + addonPrice;

    // Remove the original item
    removeItem(editingItem);

    // Add the updated item
    const updatedItem: CartItem = {
      ...editingItem,
      price: newPrice,
      options: newOptions,
      specialInstructions: editedInstructions
    };

    addItem(updatedItem);

    // Close modal
    setEditingItem(null);
    setEditedOptions([]);
    setSelectedChoices({});
    setEditedInstructions("");
  };

  // Handle canceling edit
  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditedOptions([]);
    setSelectedChoices({});
    setEditedInstructions("");
  };

  // Handle choice selection in edit modal
  const handleChoiceSelection = (groupId: string, itemId: string, isRadio: boolean) => {
    setSelectedChoices(prev => {
      if (isRadio) {
        return { ...prev, [groupId]: [itemId] };
      } else {
        const currentSelections = prev[groupId] || [];
        const isSelected = currentSelections.includes(itemId);
        return {
          ...prev,
          [groupId]: isSelected
            ? currentSelections.filter(id => id !== itemId)
            : [...currentSelections, itemId]
        };
      }
    });
  };

  // Check if upselling should be shown
  const shouldShowUpsell = () => {
    console.log('🔍 [Upsell Debug] Checking if upsell should show...');

    // Check if already shown this session
    const upsellShown = sessionStorage.getItem('upsellShown');
    console.log('🔍 [Upsell Debug] upsellShown session storage:', upsellShown);
    if (upsellShown === 'true') {
      console.log('🔍 [Upsell Debug] Upsell already shown this session, skipping');
      return false;
    }

    // Check if experimental feature is enabled
    const savedSettings = localStorage.getItem('experimentalFeatureSettings');
    console.log('🔍 [Upsell Debug] experimentalFeatureSettings:', savedSettings);

    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        console.log('🔍 [Upsell Debug] Parsed settings:', settings);
        console.log('🔍 [Upsell Debug] checkoutUpsellEnabled:', settings.checkoutUpsellEnabled);
        return settings.checkoutUpsellEnabled === true;
      } catch (error) {
        console.error('Failed to parse experimental feature settings:', error);
      }
    }

    // Default to enabled for better upselling (can be changed via admin panel)
    console.log('🔍 [Upsell Debug] No settings found, defaulting to enabled');
    return true;
  };

  // Handle checkout button click
  const handleCheckoutClick = () => {
    console.log('🛒 [Checkout Debug] Checkout button clicked');
    console.log('🛒 [Checkout Debug] User:', user ? 'logged in' : 'not logged in');
    console.log('🛒 [Checkout Debug] Cart items:', items);

    if (user) {
      // User is logged in, check if we should show upsell
      const shouldUpsell = shouldShowUpsell();
      console.log('🛒 [Checkout Debug] Should show upsell:', shouldUpsell);

      if (shouldUpsell) {
        console.log('🛒 [Checkout Debug] Showing upsell modal');
        setShowUpsellModal(true);
      } else {
        console.log('🛒 [Checkout Debug] Proceeding directly to checkout');
        // Proceed directly to checkout
        toggleCart();
        navigate("/checkout");
      }
    } else {
      console.log('🛒 [Checkout Debug] User not logged in, showing checkout prompt');
      // User is not logged in, show checkout prompt
      setShowCheckoutPrompt(true);
    }
  };

  // Handle checkout prompt modal actions
  const handleSignIn = () => {
    setShowCheckoutPrompt(false);
    setAuthMode("login");
    setShowAuthModal(true);
  };

  const handleSignUp = () => {
    setShowCheckoutPrompt(false);
    setAuthMode("register");
    setShowAuthModal(true);
  };

  const handleContinueAsGuest = () => {
    setShowCheckoutPrompt(false);
    // Check if we should show upsell for guest users too
    if (shouldShowUpsell()) {
      setShowUpsellModal(true);
    } else {
      closeCart();
      navigate("/checkout");
    }
  };

  // Handle upsell modal actions
  const handleUpsellClose = () => {
    setShowUpsellModal(false);
  };

  const handleContinueToCheckout = () => {
    setShowUpsellModal(false);
    toggleCart();
    navigate("/checkout");
  };

  const handleLoginSuccess = () => {
    setShowAuthModal(false);
    closeCart();
    navigate("/checkout");
  };
  
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
          aria-hidden="true"
        />
      )}
      
      {/* Cart Sidebar */}
      <div 
        id="cart-sidebar"
        className={`fixed top-0 right-0 bottom-0 w-full md:w-96 bg-white shadow-xl z-50 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b border-neutral-mid flex justify-between items-center">
            <h3 className="text-xl font-bold">Your Cart</h3>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleCart}
              aria-label="Close Cart"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <ScrollArea className="flex-grow">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <ShoppingCart className="text-gray-300 h-16 w-16 mb-4" />
                <p className="text-lg text-gray-700 mb-2">Your cart is empty</p>
                <p className="text-gray-500 mb-6">Add some delicious items from our menu</p>
                <Link href="/menu">
                  <Button 
                    className="bg-[#d73a31] hover:bg-[#c73128] text-white"
                    onClick={toggleCart}
                  >
                    <Pizza className="mr-2 h-4 w-4" />
                    Browse Menu
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {items.filter(item => item && item.id && item.name && typeof item.name === 'string').map((item) => (
                  <div 
                    key={`${item?.id || 'unknown'}-${JSON.stringify(item?.selectedOptions || item?.options)}`} 
                    className="flex items-start p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex-grow ml-3">
                      <h4 className="font-bold">{item?.name || 'Unknown Item'}</h4>
                      
                      {/* Half & Half Pizza Special Display */}
                      {item?.selectedOptions?.halfAndHalf ? (
                        <div className="mt-2 space-y-2">
                          <div className="bg-gradient-to-r from-red-50 to-blue-50 p-2 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs">🍕</span>
                              <span className="text-xs font-semibold text-gray-700">Half & Half Pizza</span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-red-100 p-2 rounded border-l-2 border-red-400">
                                <div className="font-medium text-red-700 mb-1">Left Half:</div>
                                {item?.selectedOptions?.leftToppings && item.selectedOptions.leftToppings.length > 0 ? (
                                  <ul className="space-y-1">
                                    {item.selectedOptions.leftToppings.map((topping, idx) => (
                                      <li key={idx} className="text-red-600">
                                        • {topping.name} {topping.price > 0 && `(+$${formatPrice(topping.price)})`}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-red-600">Plain</span>
                                )}
                              </div>
                              
                              <div className="bg-blue-100 p-2 rounded border-l-2 border-blue-400">
                                <div className="font-medium text-blue-700 mb-1">Right Half:</div>
                                {item?.selectedOptions?.rightToppings && item.selectedOptions.rightToppings.length > 0 ? (
                                  <ul className="space-y-1">
                                    {item.selectedOptions.rightToppings.map((topping, idx) => (
                                      <li key={idx} className="text-blue-600">
                                        • {topping.name} {topping.price > 0 && `(+$${formatPrice(topping.price)})`}
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <span className="text-blue-600">Plain</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Show addon options */}
                          {item?.options && item.options.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {item.options.map((option, index) => (
                                <p key={index} className="text-sm text-gray-600">
                                  {option.groupName}: {option.itemName}
                                  {option.price > 0 && <span className="text-green-600"> (+${formatPrice(option.price)})</span>}
                                </p>
                              ))}
                            </div>
                          )}
                          
                          {/* Legacy selectedOptions support */}
                          {item?.selectedOptions?.size && (
                            <p className="text-sm text-gray-500">Size: {item.selectedOptions.size}</p>
                          )}
                        </>
                      )}
                      
                      {item?.specialInstructions && (
                        <p className="text-sm text-gray-500 italic mt-1">"{item.specialInstructions}"</p>
                      )}
                      
                      <div className="flex items-center mt-2 gap-2">
                        <div className="flex items-center">
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-6 w-6 rounded-full"
                            onClick={() => updateItemQuantity(item, Math.max(1, (item?.quantity || 1) - 1))}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="mx-2 text-sm">{item?.quantity || 1}</span>
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-6 w-6 rounded-full"
                            onClick={() => updateItemQuantity(item, (item?.quantity || 1) + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={(e) => handleEditItem(item, e)}
                          className="text-xs px-2 py-1 h-6"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </div>
                    <div className="ml-2 text-right">
                      <p className="font-bold">${formatPrice((item?.price || 0) * (item?.quantity || 1))}</p>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeItem(item)}
                        className="text-[#d73a31] hover:text-[#c73128] mt-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          {items.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-bold">${formatPrice(total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span className="font-bold">${formatPrice(tax)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between text-lg">
                  <span className="font-bold">Total</span>
                  <span className="font-bold">${formatPrice(total + tax)}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant="outline" 
                  onClick={clearCart}
                >
                  Clear Cart
                </Button>
                <Button
                  className="w-full bg-[#d73a31] hover:bg-[#c73128] text-white"
                  onClick={handleCheckoutClick}
                >
                  Checkout
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Item Modal */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && handleCancelEdit()}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {editingItem?.name}</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-4">
              {/* Choice Groups */}
              {editingItem && getItemChoiceGroups(editingItem.id).map((group: any, index: number) => (
                <div key={group.id} className="space-y-3 p-3 border rounded-lg">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    {index + 1}. {group.name}
                    {group.isRequired && <span className="text-red-500 text-sm">(Required)</span>}
                  </Label>

                  {group.maxSelections === 1 ? (
                    /* Radio group for single selection */
                    <RadioGroup
                      value={selectedChoices[group.id]?.[0] || ""}
                      onValueChange={(value) => handleChoiceSelection(group.id.toString(), value, true)}
                    >
                      {group.items.map((choiceItem: any) => {
                        const isSelected = selectedChoices[group.id]?.includes(choiceItem.id.toString());
                        return (
                          <div
                            key={choiceItem.id}
                            className={`flex items-center justify-between p-2 rounded border cursor-pointer ${
                              isSelected ? 'border-[#d73a31] bg-red-50' : 'border-gray-200'
                            }`}
                            onClick={() => handleChoiceSelection(group.id.toString(), choiceItem.id.toString(), true)}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value={choiceItem.id.toString()} className="pointer-events-none" />
                              <Label className="cursor-pointer">{choiceItem.name}</Label>
                            </div>
                            {parseFloat(choiceItem.price) > 0 && (
                              <span className={`text-sm font-medium ${isSelected ? 'text-[#d73a31]' : 'text-gray-600'}`}>
                                +${formatPrice(parseFloat(choiceItem.price))}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </RadioGroup>
                  ) : (
                    /* Checkbox group for multiple selections */
                    <div className="space-y-2">
                      {group.items.map((choiceItem: any) => {
                        const isSelected = selectedChoices[group.id]?.includes(choiceItem.id.toString());
                        return (
                          <div
                            key={choiceItem.id}
                            className={`flex items-center justify-between p-2 rounded border cursor-pointer ${
                              isSelected ? 'border-green-500 bg-green-50' : 'border-gray-200'
                            }`}
                            onClick={() => handleChoiceSelection(group.id.toString(), choiceItem.id.toString(), false)}
                          >
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                checked={isSelected}
                                className="pointer-events-none"
                              />
                              <Label className="cursor-pointer">{choiceItem.name}</Label>
                            </div>
                            {parseFloat(choiceItem.price) > 0 && (
                              <span className={`text-sm font-medium ${isSelected ? 'text-green-600' : 'text-gray-600'}`}>
                                +${formatPrice(parseFloat(choiceItem.price))}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {/* Special Instructions */}
              <div>
                <Label htmlFor="instructions" className="text-sm font-medium">Special Instructions</Label>
                <Textarea
                  id="instructions"
                  value={editedInstructions}
                  onChange={(e) => setEditedInstructions(e.target.value)}
                  placeholder="Any special requests for this item..."
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="bg-[#d73a31] hover:bg-[#c73128]">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Checkout Prompt Modal */}
      <CheckoutPromptModal
        isOpen={showCheckoutPrompt}
        onClose={() => setShowCheckoutPrompt(false)}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        onContinueAsGuest={handleContinueAsGuest}
      />

      {/* Checkout Upsell Modal */}
      <CheckoutUpsellModal
        isOpen={showUpsellModal}
        onClose={handleUpsellClose}
        onContinueToCheckout={handleContinueToCheckout}
        cartItems={items}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleLoginSuccess}
        mode={authMode}
      />
    </>
  );
};

export default CartSidebar;
