import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useToast } from "./use-toast";
import { useAuth } from "./use-supabase-auth";

// Cart item type
export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  selectedOptions?: {
    size?: string;
    [key: string]: any;
  };
  options?: Array<{
    groupName: string;
    itemName: string;
    price: number;
  }>;
  specialInstructions?: string;
  halfAndHalf?: {
    firstHalf: Array<{
      itemName: string;
      price: number;
    }>;
    secondHalf: Array<{
      itemName: string;
      price: number;
    }>;
  };
  isFreeItem?: boolean; // Marks item as a free reward - cannot change quantity
}

// Cart context type
interface CartContextType {
  isOpen: boolean;
  toggleCart: () => void;
  closeCart: () => void;
  items: CartItem[];
  total: number;
  tax: number;
  addItem: (item: CartItem) => void;
  updateItemQuantity: (item: CartItem, quantity: number) => void;
  removeItem: (item: CartItem) => void;
  clearCart: () => void;
  showLoginModal: () => void;
  hideLoginModal: () => void;
  isLoginModalOpen: boolean;
  addPendingItem: (item: CartItem) => void;
  clearPendingItem: () => void;
  addPendingItemToCart: () => void;
  triggerPizzaAnimation: (startElement: HTMLElement) => void;
}

// Create context
const CartContext = createContext<CartContextType | undefined>(undefined);

// Tax rate (8.25%)
const TAX_RATE = 0.0825;

// Local storage key
const CART_STORAGE_KEY = "favillasCart";

// Global function to clear cart data (useful for debugging)
(window as any).clearFavillasCart = () => {
  localStorage.removeItem(CART_STORAGE_KEY);
  localStorage.clear(); // Clear ALL localStorage data
  console.log("ALL localStorage data cleared - reloading page");
  window.location.reload();
};

// Emergency function to reset everything
(window as any).emergencyReset = () => {
  // Clear all storage
  localStorage.clear();
  sessionStorage.clear();

  // Clear all cookies
  document.cookie.split(";").forEach(function(c) {
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
  });

  console.log("EMERGENCY RESET: All data cleared");
  window.location.href = window.location.origin;
};

// Provider component
export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [pendingItem, setPendingItem] = useState<CartItem | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Filter out any corrupted items before calculations
  const validItems = items.filter(item =>
    item &&
    typeof item === 'object' &&
    typeof item.id === 'number' &&
    typeof item.name === 'string' &&
    item.name.trim() !== '' &&
    (typeof item.price === 'number' || typeof item.price === 'string') &&
    (typeof item.quantity === 'number' || typeof item.quantity === 'string') &&
    !isNaN(parseFloat(String(item.price))) &&
    !isNaN(parseInt(String(item.quantity))) &&
    parseInt(String(item.quantity)) > 0
  );

  // Calculate totals only with valid items
  const total = validItems.reduce((sum, item) => {
    // Note: item.price already includes base price + option prices when item is added to cart
    // See menu-item-with-choices.tsx line 277: price: calculateTotalPrice()
    const itemPrice = typeof item.price === 'number' ? item.price : parseFloat(item.price);
    const itemTotal = itemPrice * item.quantity;
    return sum + itemTotal;
  }, 0);
  const tax = total * TAX_RATE;
  
  // Load cart from localStorage on initial render
  useEffect(() => {
    // Clear any old corruption flags
    localStorage.removeItem('cartCorrupted');

    const savedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (savedCart) {
      try {
        const parsedCart = JSON.parse(savedCart);
        // Check if parsedCart is an array
        if (!Array.isArray(parsedCart)) {
          console.warn("Cart data is not an array, starting with empty cart");
          localStorage.removeItem(CART_STORAGE_KEY);
          setItems([]);
          return;
        }

        // Filter out corrupted items with strict validation
        const normalizedCart = parsedCart
          .filter((item: any) => {
            return item &&
                   typeof item === 'object' &&
                   typeof item.id === 'number' &&
                   typeof item.name === 'string' &&
                   item.name.trim() !== '' &&
                   (typeof item.price === 'number' || typeof item.price === 'string') &&
                   (typeof item.quantity === 'number' || typeof item.quantity === 'string') &&
                   !isNaN(parseFloat(String(item.price))) &&
                   !isNaN(parseInt(String(item.quantity))) &&
                   parseInt(String(item.quantity)) > 0;
          })
          .map((item: any) => ({
            ...item,
            price: typeof item.price === 'string' ? parseFloat(item.price) : item.price,
            quantity: typeof item.quantity === 'string' ? parseInt(item.quantity) : item.quantity
          }));

        // If we filtered out items, log it and continue with valid items
        if (normalizedCart.length !== parsedCart.length) {
          console.warn(`Filtered out ${parsedCart.length - normalizedCart.length} corrupted cart items, continuing with ${normalizedCart.length} valid items`);
        }

        setItems(normalizedCart);
      } catch (error) {
        console.error("Failed to parse cart data from localStorage", error);
        // Clear corrupted cart data
        localStorage.removeItem(CART_STORAGE_KEY);
        setItems([]);
      }
    }
  }, []);
  
  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);
  
  // Toggle cart sidebar
  const toggleCart = () => setIsOpen(prev => !prev);
  const closeCart = () => setIsOpen(false);

  // Login modal functions
  const showLoginModal = () => setIsLoginModalOpen(true);
  const hideLoginModal = () => setIsLoginModalOpen(false);
  
  // Pending item functions
  const addPendingItem = (item: CartItem) => setPendingItem(item);
  const clearPendingItem = () => setPendingItem(null);
  
  // Add pending item to cart (called after successful login)
  const addPendingItemToCart = () => {
    if (pendingItem) {
      // Ensure price is a number
      const normalizedItem = {
        ...pendingItem,
        price: typeof pendingItem.price === 'string' ? parseFloat(pendingItem.price) : pendingItem.price
      };
      
      setItems(prevItems => {
        // Check if item already exists in cart with same options
        const existingItemIndex = prevItems.findIndex(item => areItemsEqual(item, normalizedItem));
        
        if (existingItemIndex >= 0) {
          // Update existing item's quantity - create new object to ensure React detects change
          const updatedItems = [...prevItems];
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + normalizedItem.quantity
          };

          // Only show toast for significant quantity changes
          if (normalizedItem.quantity > 1) {
            toast({
              title: "Cart updated",
              description: `Updated quantity of ${normalizedItem.name}`,
            });
          }

          return updatedItems;
        } else {
          // Add new item
          toast({
            title: "Added to cart",
            description: `${normalizedItem.name} added to your cart`,
          });

          return [...prevItems, normalizedItem];
        }
      });

      // Clear pending item
      setPendingItem(null);
    }
  };
  
  // Check if items are equal (including ALL selected options and customizations)
  const areItemsEqual = (a: CartItem, b: CartItem) => {
    if (a.id !== b.id) return false;

    // Compare special instructions
    if (a.specialInstructions !== b.specialInstructions) return false;

    // Compare selectedOptions objects
    const aSelectedOptions = JSON.stringify(a.selectedOptions || {});
    const bSelectedOptions = JSON.stringify(b.selectedOptions || {});
    if (aSelectedOptions !== bSelectedOptions) return false;

    // Compare options array (detailed toppings/choices)
    const aOptions = JSON.stringify(a.options || []);
    const bOptions = JSON.stringify(b.options || []);
    if (aOptions !== bOptions) return false;

    // Compare halfAndHalf data (for half-and-half pizzas)
    const aHalfAndHalf = JSON.stringify(a.halfAndHalf || null);
    const bHalfAndHalf = JSON.stringify(b.halfAndHalf || null);
    if (aHalfAndHalf !== bHalfAndHalf) return false;

    return true;
  };
  
  // Add item to cart
  const addItem = (newItem: CartItem) => {
    // Ensure price is a number
    const normalizedItem = {
      ...newItem,
      price: typeof newItem.price === 'string' ? parseFloat(newItem.price) : newItem.price
    };
    
    // Allow both authenticated and guest users to add items to cart
    // Login will only be required at checkout
    
    setItems(prevItems => {
      // Check if item already exists in cart with same options
      const existingItemIndex = prevItems.findIndex(item => areItemsEqual(item, normalizedItem));
      
      if (existingItemIndex >= 0) {
        // Update existing item's quantity - create new object to ensure React detects change
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + normalizedItem.quantity
        };

        toast({
          title: "Cart updated",
          description: `Updated quantity of ${normalizedItem.name}`,
        });

        return updatedItems;
      } else {
        // Add new item
        toast({
          title: "Added to cart",
          description: `${normalizedItem.name} added to your cart`,
        });
        
        return [...prevItems, normalizedItem];
      }
    });
  };
  
  // Update item quantity
  const updateItemQuantity = (itemToUpdate: CartItem, quantity: number) => {
    // Block quantity changes for free items
    if (itemToUpdate.isFreeItem) {
      toast({
        title: "Cannot change quantity",
        description: "Free reward items are limited to 1 per order",
        variant: "destructive",
      });
      return;
    }

    setItems(prevItems =>
      prevItems.map(item =>
        areItemsEqual(item, itemToUpdate)
          ? { ...item, quantity }
          : item
      )
    );

    // Only show toast for significant quantity changes
    if (quantity === 0) {
      toast({
        title: "Item removed",
        description: `${itemToUpdate.name} removed from your cart`,
      });
    }
  };
  
  // Remove item from cart
  const removeItem = (itemToRemove: CartItem) => {
    setItems(prevItems => prevItems.filter(item => !areItemsEqual(item, itemToRemove)));
    
    // Only show toast for items with quantity > 1 or if it's the last item
    const itemInCart = items.find(item => areItemsEqual(item, itemToRemove));
    if (!itemInCart || itemInCart.quantity === 1) {
      toast({
        title: "Item removed",
        description: `${itemToRemove.name} removed from your cart`,
      });
    }
  };
  
  // Clear cart
  const clearCart = () => {
    setItems([]);

    toast({
      title: "Cart cleared",
      description: "All items removed from your cart",
    });
  };

  // Pizza animation function
  const triggerPizzaAnimation = (startElement: HTMLElement) => {
    // Find cart icon (desktop in header, mobile in bottom navigation)
    const cartIconDesktop = document.querySelector('[data-cart-icon="desktop"]');
    const cartIconMobile = document.querySelector('[data-cart-icon="mobile"]');

    // Use mobile cart on small screens, desktop cart on larger screens
    const isMobile = window.innerWidth < 768;
    const cartIcon = isMobile ? cartIconMobile : cartIconDesktop;

    if (!cartIcon) {
      console.warn('Cart icon not found for animation');
      return;
    }

    // Get start and end positions
    const startRect = startElement.getBoundingClientRect();
    const endRect = cartIcon.getBoundingClientRect();

    // Create flying pizza emoji
    const pizzaEmoji = document.createElement('div');
    pizzaEmoji.textContent = '🍕';
    pizzaEmoji.className = 'pizza-flying';

    // Set starting position
    pizzaEmoji.style.left = `${startRect.left + startRect.width / 2}px`;
    pizzaEmoji.style.top = `${startRect.top + startRect.height / 2}px`;

    // Calculate flight path
    const deltaX = endRect.left + endRect.width / 2 - (startRect.left + startRect.width / 2);
    const deltaY = endRect.top + endRect.height / 2 - (startRect.top + startRect.height / 2);

    // Set CSS variables for animation
    pizzaEmoji.style.setProperty('--fly-x', `${deltaX * 0.6}px`);
    pizzaEmoji.style.setProperty('--fly-y', `${deltaY * 0.6}px`);
    pizzaEmoji.style.setProperty('--fly-x-end', `${deltaX}px`);
    pizzaEmoji.style.setProperty('--fly-y-end', `${deltaY}px`);

    // Add to DOM
    document.body.appendChild(pizzaEmoji);

    // Trigger cart shake animation
    cartIcon.classList.add('cart-shake');

    // Clean up after animation
    setTimeout(() => {
      if (document.body.contains(pizzaEmoji)) {
        document.body.removeChild(pizzaEmoji);
      }
      cartIcon.classList.remove('cart-shake');
    }, 1200);
  };
  
  // Clean up corrupted items automatically (gentle approach)
  useEffect(() => {
    if (validItems.length !== items.length && items.length > 0) {
      console.warn(`Detected ${items.length - validItems.length} corrupted cart items, filtering them out`);
      // Gently filter out corrupted items instead of clearing everything
      setItems(validItems);
    }
  }, [items, validItems]);

  return (
    <CartContext.Provider
      value={{
        isOpen,
        toggleCart,
        closeCart,
        items: validItems, // Always provide clean items
        total,
        tax,
        addItem,
        updateItemQuantity,
        removeItem,
        clearCart,
        showLoginModal,
        hideLoginModal,
        isLoginModalOpen,
        addPendingItem,
        clearPendingItem,
        addPendingItemToCart,
        triggerPizzaAnimation,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// Hook to use the cart context
export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
