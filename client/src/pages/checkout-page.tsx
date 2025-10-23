import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useStripe, useElements, Elements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from "@/hooks/use-supabase-auth";
import { useCart } from "@/hooks/use-cart";
import { useVacationMode } from "@/hooks/use-vacation-mode";
import { useStoreStatus } from "@/hooks/use-store-status";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Footer from "@/components/layout/footer";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, X, Gift, AlertCircle } from "lucide-react";
import AddressForm from "@/components/ui/address-autocomplete";

// Load Stripe outside of component to avoid recreating it on render
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.error('❌ VITE_STRIPE_PUBLIC_KEY is missing!');
  throw new Error("VITE_STRIPE_PUBLIC_KEY environment variable is required");
}
console.log('🔑 Initializing Stripe with public key:', import.meta.env.VITE_STRIPE_PUBLIC_KEY?.substring(0, 20) + '...');
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// CheckoutForm with Stripe integration
const CheckoutForm = ({ orderId, clientSecret, customerPhone, customerName, customerAddress }: {
  orderId?: number | null,
  clientSecret: string,
  customerPhone?: string,
  customerName?: string,
  customerAddress?: {
    line1?: string,
    line2?: string,
    city?: string,
    state?: string,
    postal_code?: string,
    country?: string
  }
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [location, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('💳 Payment form submitted');
    console.log('Stripe loaded:', !!stripe);
    console.log('Elements loaded:', !!elements);
    console.log('Customer phone:', customerPhone);
    console.log('Customer name:', customerName);
    console.log('Customer address:', customerAddress);

    if (!stripe || !elements) {
      console.error('❌ Stripe or Elements not loaded');
      toast({
        title: "Payment System Not Ready",
        description: "Please wait a moment and try again. If the problem persists, refresh the page.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔄 Confirming payment...');
      // Let Stripe collect all billing details through the PaymentElement form
      // This avoids integration errors from missing fields
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-success`,
        },
        redirect: "always",
      });

      // Note: When using redirect: "always", the else block below will typically not execute
      // because Stripe will redirect the user to the return_url on success.
      // This error handling is for cases where redirect fails or payment fails.
      if (error) {
        console.error('❌ Payment confirmation error:', error);
        toast({
          title: "Payment Failed",
          description: error.message,
          variant: "destructive",
        });
        setIsLoading(false);
      } else {
        console.log('✅ Payment confirmed, waiting for redirect...');
      }
    } catch (err) {
      console.error('❌ Unexpected error during payment:', err);
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement
        options={{
          fields: {
            billingDetails: 'auto'  // Let Stripe collect everything it needs
          }
        }}
      />
      <div className="mt-6">
        <Button 
          type="submit" 
          className="w-full bg-[#d73a31] hover:bg-[#c73128]" 
          disabled={!stripe || !elements || isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Pay Now
        </Button>
      </div>
    </form>
  );
};

// CheckoutPage component
const CheckoutPage = () => {
  const { user, refreshUserProfile } = useAuth();
  const { items, total, tax, clearCart, showLoginModal } = useCart();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { isOrderingPaused, displayMessage } = useVacationMode();
  const { isPastCutoff, canPlaceAsapOrders, cutoffMessage } = useStoreStatus();

  // Check for corrupted items and handle gracefully
  useEffect(() => {
    try {
      const corruptedItems = items.filter((item, index) => {
        if (!item || !item.name) {
          console.warn(`Found corrupted item at index ${index}:`, item);
          return true;
        }
        return false;
      });

      if (corruptedItems.length > 0) {
        console.warn(`Found ${corruptedItems.length} corrupted items, but continuing with valid items`);
        toast({
          title: "Some cart items were invalid",
          description: "Invalid items have been filtered out automatically.",
          variant: "default"
        });
      }
    } catch (error) {
      console.warn('Error checking cart items:', error);
      // Just log the error, don't crash the checkout
    }
  }, [items, toast]);
  
  const formatPrice = (price: number) => {
    if (isNaN(price) || price === null || price === undefined) {
      return "0.00";
    }
    return price.toFixed(2);
  };

  // Calculate delivery fee based on address
  const calculateDeliveryFee = async (addressInfo: any) => {
    if (orderType !== "delivery" || !addressInfo) {
      setDeliveryFee(0);
      setDeliveryError("");
      setDeliveryZoneInfo(null);
      return;
    }

    setDeliveryCalculating(true);
    setDeliveryError("");

    try {
      const payload = {
        address: addressInfo.fullAddress
      };

      const response = await fetch('/api/delivery-fee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to calculate delivery fee');
      }

      if (!result.success) {
        setDeliveryError(result.message || 'Delivery not available to this location');
        setDeliveryFee(0);
        setDeliveryZoneInfo(null);
      } else {
        setDeliveryFee(result.deliveryFee);
        setDeliveryZoneInfo(result);
        setDeliveryError("");
      }

    } catch (error: any) {
      console.error('❌ Delivery fee calculation error:', error);
      setDeliveryError('Unable to calculate delivery fee. Using standard rate.');
      setDeliveryFee(3.99); // Fallback to default
      setDeliveryZoneInfo(null);
    } finally {
      setDeliveryCalculating(false);
    }
  };
  
  const [orderType, setOrderType] = useState("pickup");
  const [fulfillmentTime, setFulfillmentTime] = useState("asap");
  const [scheduledTime, setScheduledTime] = useState("");
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [addressData, setAddressData] = useState<{
    fullAddress: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    latitude?: number;
    longitude?: number;
  } | null>(null);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [orderId, setOrderId] = useState<number | null>(null);
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState<any>(null);
  const [promoCodeError, setPromoCodeError] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [voucherError, setVoucherError] = useState("");
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>("none");
  const [tip, setTip] = useState(0);
  const [tipType, setTipType] = useState<"percentage" | "amount">("percentage");
  const [customTip, setCustomTip] = useState("");
  const [contactInfoLoaded, setContactInfoLoaded] = useState(false);

  // Delivery fee calculation state
  const [deliveryFee, setDeliveryFee] = useState(3.99); // Default fallback
  const [deliveryCalculating, setDeliveryCalculating] = useState(false);
  const [deliveryError, setDeliveryError] = useState("");
  const [deliveryZoneInfo, setDeliveryZoneInfo] = useState<any>(null);

  // Auto-populate contact information when user data is available
  useEffect(() => {
    if (user && !contactInfoLoaded) {
      console.log('📞 Auto-populating contact info from user profile:', {
        phone: user.phone,
        address: user.address,
        city: user.city,
        state: user.state,
        zipCode: user.zipCode
      });

      // Set phone number if available
      if (user.phone) {
        setPhone(user.phone);
        console.log('✅ Phone auto-populated:', user.phone);
      }

      // Set address if available - construct full address from components
      if (user.address || (user.city && user.state)) {
        let fullAddress = '';

        if (user.address) {
          fullAddress = user.address;

          // Add city, state, zip if they exist and aren't already in the address
          const addressParts = [];
          if (user.city && !fullAddress.toLowerCase().includes(user.city.toLowerCase())) {
            addressParts.push(user.city);
          }
          if (user.state && !fullAddress.toLowerCase().includes(user.state.toLowerCase())) {
            addressParts.push(user.state);
          }
          if (user.zipCode && !fullAddress.includes(user.zipCode)) {
            addressParts.push(user.zipCode);
          }

          if (addressParts.length > 0) {
            fullAddress += ', ' + addressParts.join(', ');
          }
        } else if (user.city && user.state) {
          // If no street address but have city/state, just use those
          fullAddress = [user.city, user.state, user.zipCode].filter(Boolean).join(', ');
        }

        if (fullAddress) {
          setAddress(fullAddress);

          // Also set the structured address data
          setAddressData({
            fullAddress: fullAddress,
            street: user.address || '',
            city: user.city || '',
            state: user.state || '',
            zipCode: user.zipCode || ''
          });

          console.log('✅ Address auto-populated:', fullAddress);
        }
      }

      setContactInfoLoaded(true);

      // Only show toast if we actually populated some data
      if (user.phone || user.address || (user.city && user.state)) {
        toast({
          title: "Contact info auto-filled",
          description: "Your saved information has been loaded. You can edit it if needed.",
          duration: 4000
        });
      }
    }
  }, [user, contactInfoLoaded, toast]);

  // Reset contact info loaded flag when user changes
  useEffect(() => {
    setContactInfoLoaded(false);
  }, [user?.id]);

  // Calculate delivery fee when address changes
  useEffect(() => {
    if (orderType === "delivery" && addressData) {
      calculateDeliveryFee(addressData);
    } else if (orderType === "pickup") {
      setDeliveryFee(0);
      setDeliveryError("");
      setDeliveryZoneInfo(null);
    }
  }, [addressData, orderType]);

  // Store hours validation
  const isStoreOpen = () => {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hour = now.getHours();
    
    // Store hours: Mon-Sat 11AM-10PM, Sun 12PM-9PM
    if (day === 0) { // Sunday
      return hour >= 12 && hour < 21;
    } else if (day >= 1 && day <= 6) { // Monday-Saturday
      return hour >= 11 && hour < 22;
    }
    return false;
  };

  // Check if cart is empty or has corrupted items
  useEffect(() => {
    // Add a small delay to allow cart to load from localStorage
    const timer = setTimeout(() => {
      // Filter out any items that might have slipped through with missing required fields
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

      if (validItems.length === 0) {
        navigate("/menu");
        toast({
          title: "Cart is empty or contains invalid items",
          description: "Please add items to your cart before checkout.",
        });
      } else if (validItems.length !== items.length) {
        // Some items were invalid, clear cart and redirect
        clearCart();
        navigate("/menu");
        toast({
          title: "Cart contained invalid items",
          description: "Your cart has been cleared. Please add items again.",
          variant: "destructive"
        });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [items, navigate, toast, clearCart]);

  // DISABLED: Query user rewards (API returns 404)
  // const { data: rewards } = useQuery({
  //   queryKey: ["/api/rewards"],
  //   enabled: !!user,
  // });
  const rewards = null; // Temporary fix for superadmin checkout crash

  // Fetch user's active vouchers for current order total
  const { data: activeVouchersData, isLoading: vouchersLoading } = useQuery({
    queryKey: ["/api/user/active-vouchers", total],
    queryFn: async () => {
      const response = await apiRequest("POST", "/api/user/active-vouchers", {
        orderTotal: total
      });
      return response.json();
    },
    enabled: !!user && total > 0,
  });

  const availableVouchers = activeVouchersData?.vouchers || [];

  // Update user profile mutation to save contact information
  const updateUserProfileMutation = useMutation({
    mutationFn: async (contactData: { phone?: string; address?: string; city?: string; state?: string; zip_code?: string }) => {
      const res = await apiRequest("PATCH", "/api/user-profile", contactData);
      return await res.json();
    },
    onSuccess: () => {
      console.log('✅ User profile updated with contact information');
    },
    onError: (error: Error) => {
      console.warn('⚠️ Failed to update user profile:', error);
    },
  });

  // Remove old createOrderMutation - orders are now created after payment succeeds

  // Create payment intent mutation
  const createPaymentIntentMutation = useMutation({
    mutationFn: async (data: { amount: number; orderId?: number | null; orderData?: any }) => {
      const res = await apiRequest("POST", "/api/create-payment-intent", data);
      return await res.json();
    },
    onSuccess: (data) => {
      console.log('✅ Payment intent created successfully');
      console.log('Client secret received:', data.clientSecret ? '(present)' : '(missing)');
      setClientSecret(data.clientSecret);

      // Scroll to payment section when it loads
      setTimeout(() => {
        const paymentSection = document.getElementById('payment-section');
        if (paymentSection) {
          paymentSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          // Fallback: scroll to top of page
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    },
    onError: (error: Error) => {
      toast({
        title: "Payment initialization failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Validate promo code mutation
  const validatePromoCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      try {
        const res = await apiRequest("POST", "/api/promo-codes/validate", { code });

        if (!res.ok) {
          // Handle HTTP error responses
          let errorMessage = "Invalid promo code";
          try {
            const errorData = await res.json();
            errorMessage = errorData.message || errorMessage;
          } catch {
            // If response isn't JSON, use status text
            errorMessage = res.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }

        return await res.json();
      } catch (error: any) {
        // Clean error handling - avoid HTML responses
        let errorMessage = "Invalid promo code";

        if (error.message && !error.message.includes('<html')) {
          errorMessage = error.message;
        }

        throw new Error(errorMessage);
      }
    },
    onSuccess: (data) => {
      setAppliedPromoCode(data);
      setPromoCodeError("");
      toast({
        title: "Promo code applied!",
        description: `${data.discountType === 'percentage' ? data.discount + '%' : '$' + data.discount} discount applied`,
      });
    },
    onError: (error: any) => {
      setPromoCodeError(error.message || "Invalid promo code");
      setAppliedPromoCode(null);
      toast({
        title: "Invalid promo code",
        description: error.message || "Please check your code and try again",
        variant: "destructive",
      });
    },
  });


  // Calculate totals with promo code and vouchers
  const calculateTotals = () => {
    const subtotal = total;
    const taxAmount = tax;
    let discountAmount = 0;
    let voucherDiscountAmount = 0;

    // Apply promo code discount
    if (appliedPromoCode) {
      if (appliedPromoCode.discountType === 'percentage') {
        discountAmount = (subtotal * appliedPromoCode.discount) / 100;
      } else {
        discountAmount = appliedPromoCode.discount;
      }
    }

    // Apply voucher discount
    if (appliedVoucher) {
      // Check minimum order amount
      if (subtotal >= (appliedVoucher.min_order_amount || 0)) {
        if (appliedVoucher.discount_type === 'percentage') {
          voucherDiscountAmount = (subtotal * appliedVoucher.discount_amount) / 100;
        } else if (appliedVoucher.discount_type === 'delivery_fee') {
          // Free delivery - this would be handled separately in delivery fee calculation
          voucherDiscountAmount = 0; // Delivery fee discount handled elsewhere
        } else {
          voucherDiscountAmount = appliedVoucher.discount_amount;
        }
      }
    }

    const totalDiscountAmount = discountAmount + voucherDiscountAmount;
    const finalSubtotal = Math.max(0, subtotal - totalDiscountAmount);
    
    // Calculate tip
    let tipAmount = 0;
    if (tipType === "percentage" && tip > 0) {
      tipAmount = (finalSubtotal * tip) / 100;
    } else if (tipType === "amount") {
      tipAmount = parseFloat(customTip) || 0;
    }
    
    // Use dynamic delivery fee (calculated based on distance)
    const currentDeliveryFee = orderType === "delivery" ? deliveryFee : 0;

    const finalTotal = finalSubtotal + taxAmount + tipAmount + currentDeliveryFee;

    return {
      subtotal,
      tax: taxAmount,
      discount: discountAmount,
      voucherDiscount: voucherDiscountAmount,
      totalDiscount: totalDiscountAmount,
      tip: tipAmount,
      deliveryFee: currentDeliveryFee,
      finalSubtotal,
      finalTotal
    };
  };

  const totals = calculateTotals();

  // Handle promo code submission
  const handlePromoCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.trim()) {
      validatePromoCodeMutation.mutate(promoCode.trim());
    }
  };

  // Remove promo code
  const removePromoCode = () => {
    setAppliedPromoCode(null);
    setPromoCode("");
    setPromoCodeError("");
  };

  // Handle voucher selection from dropdown
  const handleVoucherSelect = (voucherId: string) => {
    setSelectedVoucherId(voucherId);
    setVoucherError("");

    if (voucherId === "" || voucherId === "none") {
      // No voucher selected
      setAppliedVoucher(null);
      return;
    }

    // Find the selected voucher
    const selectedVoucher = availableVouchers.find((v: any) => v.id.toString() === voucherId);
    if (selectedVoucher) {
      setAppliedVoucher(selectedVoucher);
    }
  };


  // Remove voucher
  const removeVoucher = () => {
    setAppliedVoucher(null);
    setSelectedVoucherId("none");
    setVoucherError("");
  };

  const handleAddressSelect = (addressInfo: {
    fullAddress: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    latitude?: number;
    longitude?: number;
  }) => {
    setAddressData(addressInfo);
    setAddress(addressInfo.fullAddress);
  };

  // Handle form submission
  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();

    console.log('🚀🚀🚀 DEPLOYMENT UPDATE:', new Date().toISOString(), 'Version 2.3 - COMPLETE PAYMENT FIX');
    console.log('🔄 NEW CHECKOUT FLOW - This should NOT create orders immediately!');
    console.log('🔄 If you see POST /api/orders after this, there is a caching issue!');

    // Allow guest checkout - just require phone number
    if (!phone) {
      toast({
        title: "Phone number required",
        description: "Please provide a phone number for your order.",
        variant: "destructive",
      });
      return;
    }
    
    if (orderType === "delivery" && !address) {
      toast({
        title: "Address required",
        description: "Please provide a complete delivery address.",
        variant: "destructive",
      });
      return;
    }

    // Validate that address has all required components
    if (orderType === "delivery" && address) {
      const addressParts = address.split(',').map(part => part.trim());
      if (addressParts.length < 3) {
        toast({
          title: "Incomplete Address",
          description: "Please provide street address, city, state, and ZIP code.",
          variant: "destructive",
        });
        return;
      }
    }

    // Validate delivery zone
    if (orderType === "delivery" && deliveryError) {
      toast({
        title: "Delivery Not Available",
        description: deliveryError,
        variant: "destructive",
      });
      return;
    }

    // Don't allow ordering if delivery fee calculation is in progress
    if (orderType === "delivery" && deliveryCalculating) {
      toast({
        title: "Calculating Delivery Fee",
        description: "Please wait while we calculate your delivery fee.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate fulfillment time
    if (fulfillmentTime === "asap" && !isStoreOpen()) {
      toast({
        title: "Store is Closed",
        description: "Please select a scheduled time or try again during business hours.",
        variant: "destructive",
      });
      return;
    }
    
    if (fulfillmentTime === "scheduled" && !scheduledTime) {
      toast({
        title: "Scheduled Time Required",
        description: "Please select a date and time for your order.",
        variant: "destructive",
      });
      return;
    }

    // Validate scheduled time is within store hours
    if (fulfillmentTime === "scheduled" && scheduledTime) {
      const selectedDate = new Date(scheduledTime);
      const day = selectedDate.getDay();
      const hour = selectedDate.getHours();
      const minute = selectedDate.getMinutes();

      let isValidTime = false;
      if (day === 0) { // Sunday
        isValidTime = (hour > 12 || (hour === 12 && minute >= 0)) && hour < 21;
      } else if (day >= 1 && day <= 6) { // Monday-Saturday
        isValidTime = (hour > 11 || (hour === 11 && minute >= 0)) && hour < 22;
      }

      if (!isValidTime) {
        toast({
          title: "Outside Store Hours",
          description: "Please select a time when we're open. Mon-Sat: 11AM-10PM, Sun: 12PM-9PM",
          variant: "destructive",
        });
        return;
      }
    }
    
    // Create order - filter out any corrupted items
    const orderItems = items
      .filter(item => item && item.id && item.name && item.price && item.quantity)
      .map(item => {
        console.log('🔍 CHECKOUT DEBUG - Processing cart item for order:', {
          itemName: item.name,
          itemId: item.id,
          hasOptions: !!item.options,
          optionsType: typeof item.options,
          optionsLength: Array.isArray(item.options) ? item.options.length : 'N/A',
          optionsContent: item.options,
          hasSelectedOptions: !!item.selectedOptions,
          selectedOptionsType: typeof item.selectedOptions,
          selectedOptionsContent: item.selectedOptions,
          finalOptions: item.options || item.selectedOptions || []
        });

        return {
          menuItemId: item.id,
          quantity: item.quantity,
          price: (item.price * item.quantity).toString(),
          options: item.options || item.selectedOptions || [],
          specialInstructions: item.specialInstructions || "",
        };
      });
    
    // Use structured address data from AddressForm component
    // addressData state is already being set by handleAddressSelect

    // Store order data for after payment confirmation (don't create order yet)
    const pendingOrderData = {
      status: "pending", // Will be updated to confirmed after payment processing
      total: totals.finalTotal.toString(),
      tax: tax.toString(),
      tip: totals.tip.toString(),
      deliveryFee: orderType === "delivery" ? deliveryFee.toString() : "0",
      orderType,
      paymentStatus: "pending", // Will be set to succeeded after payment confirmation
      specialInstructions,
      address: orderType === "delivery" ? address : "",
      addressData: orderType === "delivery" ? addressData : null,
      phone,
      items: orderItems,
      fulfillmentTime,
      scheduledTime: fulfillmentTime === "scheduled" ? scheduledTime : null,
      voucherCode: appliedVoucher?.voucher_code || null,
      voucherDiscount: totals.voucherDiscount || 0,
      // Promo code data (different from vouchers - these are admin-created discount codes)
      promoCode: appliedPromoCode?.code || null,
      promoCodeId: appliedPromoCode?.id || null,
      promoCodeDiscount: totals.discount || 0,
      orderMetadata: {
        subtotal: total,
        discount: totals.discount,
        voucherDiscount: totals.voucherDiscount,
        finalSubtotal: totals.finalSubtotal
      }
    };

    // Store in sessionStorage for payment completion
    sessionStorage.setItem('pendingOrderData', JSON.stringify(pendingOrderData));
    console.log('💾 Stored pending order data for after payment:', pendingOrderData);

    console.log('⚡ About to create payment intent with orderId: null (NEW FLOW)');
    console.log('⚡ If you see an order being created now, there is a bug somewhere!');

    // Create payment intent directly (no order created yet)
    createPaymentIntentMutation.mutate({
      amount: totals.finalTotal,
      orderId: null, // No order ID yet - order will be created after payment
      orderData: pendingOrderData // Send order data to payment intent
    });
  };

  return (
    <>
      <Helmet>
        <title>Checkout | Favilla's NY Pizza</title>
        <meta name="description" content="Complete your order at Favilla's NY Pizza. Easy and secure checkout with multiple payment options." />
      </Helmet>

      <main className="bg-gray-50 py-12 md:pt-[72px] pt-14">
        {/* Vacation Mode Banner */}
        {isOrderingPaused && (
          <div className="bg-yellow-500 border-b-4 border-yellow-600 px-4 sm:px-6 lg:px-8 py-4 mb-6">
            <div className="max-w-6xl mx-auto flex items-center gap-3 text-white">
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
          <div className="bg-yellow-500 border-b-4 border-yellow-600 px-4 sm:px-6 lg:px-8 py-4 mb-6">
            <div className="max-w-6xl mx-auto flex items-center gap-3 text-white">
              <AlertCircle className="h-6 w-6 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-bold text-lg">ASAP Orders Closed</p>
                <p className="text-sm mb-1">{cutoffMessage}</p>
                <p className="text-sm font-medium bg-yellow-600 bg-opacity-50 px-2 py-1 rounded inline-block">
                  💡 You can still schedule an order for tomorrow!
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="container mx-auto px-4">
          {/* Back Button */}
          <div className="mb-6">
            <Button
              variant="outline"
              onClick={() => navigate("/menu")}
              className="flex items-center gap-2"
            >
              ← Back to Menu
            </Button>
          </div>

          <h1 className="text-3xl font-display font-bold text-center mb-8">Checkout</h1>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Order Summary */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                  <CardDescription>Review your order before payment</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {items.filter(item => item && item.id && item.name).map((item) => (
                      <div key={`${item.id}-${JSON.stringify(item.options || item.selectedOptions)}`} className="flex justify-between items-center py-2 border-b">
                        <div className="flex items-center">
                          <div className="ml-4">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-500">
                              {item.selectedOptions?.size && `Size: ${item.selectedOptions.size}`}
                              {/* Show add-ons */}
                              {item.options && item.options.length > 0 && (
                                <span className="block">
                                  {item.options.map((opt, idx) => {
                                    // Don't show sizes in add-ons list or price calculation
                                    const isSize = opt.groupName?.toLowerCase().includes('size');
                                    return isSize ? null : `${opt.itemName || opt.name}`;
                                  }).filter(Boolean).join(', ') || 'No add-ons'}
                                  {(() => {
                                    // Calculate add-on price excluding sizes
                                    const addOnPrice = item.options
                                      .filter(opt => !opt.groupName?.toLowerCase().includes('size'))
                                      .reduce((sum, opt) => sum + (opt.price || 0), 0);
                                    return addOnPrice > 0 ? ` (+$${addOnPrice.toFixed(2)})` : '';
                                  })()}
                                </span>
                              )}
                              {item.specialInstructions && (
                                <span className="block italic">"{item.specialInstructions}"</span>
                              )}
                            </p>
                            <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <p className="font-medium">${formatPrice(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                  
                  {/* Promo Code Section */}
                  <div className="mt-6 space-y-3">
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Promo Code</Label>
                      {!appliedPromoCode ? (
                        <form onSubmit={handlePromoCodeSubmit} className="flex gap-2">
                          <Input
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value)}
                            placeholder="Enter promo code"
                            className="flex-1"
                            disabled={validatePromoCodeMutation.isPending}
                          />
                          <Button
                            type="submit"
                            variant="outline"
                            size="sm"
                            disabled={!promoCode.trim() || validatePromoCodeMutation.isPending}
                          >
                            {validatePromoCodeMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Apply"
                            )}
                          </Button>
                        </form>
                      ) : (
                        <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
                          <div className="flex items-center gap-2">
                            <span className="text-green-700 font-medium">
                              {appliedPromoCode.code} - {appliedPromoCode.discountType === 'percentage' ? `${appliedPromoCode.discount}%` : `$${appliedPromoCode.discount}`} off
                            </span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={removePromoCode}
                            className="text-green-600 hover:text-green-800"
                          >
                            Remove
                          </Button>
                        </div>
                      )}
                      {promoCodeError && (
                        <p className="text-sm text-red-600">{promoCodeError}</p>
                      )}
                    </div>
                  </div>

                  {/* Available Vouchers Section */}
                  <div className="mt-4 space-y-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Gift className="h-4 w-4 text-blue-600" />
                        Available Vouchers
                      </Label>
                      <p className="text-xs text-gray-500">Select one of your redeemed vouchers to apply (no codes needed!)</p>

                      {vouchersLoading ? (
                        <div className="flex items-center gap-2 p-3 text-gray-500 bg-gray-50 rounded-lg">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading your vouchers...</span>
                        </div>
                      ) : availableVouchers.length === 0 ? (
                        <div className="p-4 text-center bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                          <div className="text-gray-400 mb-2">🎁</div>
                          <p className="text-gray-600 font-medium">No vouchers available</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Redeem rewards to get vouchers for discounts!
                          </p>
                        </div>
                      ) : (
                        <>
                          {!appliedVoucher ? (
                            <Select value={selectedVoucherId} onValueChange={handleVoucherSelect}>
                              <SelectTrigger className="w-full border-blue-200 focus:border-blue-400 focus:ring-blue-100">
                                <SelectValue placeholder="Choose a voucher to apply (optional)" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No voucher</SelectItem>
                                {availableVouchers.map((voucher: any) => (
                                  <SelectItem key={voucher.id} value={voucher.id.toString()}>
                                    <div className="flex flex-col py-1">
                                      <span className="font-medium text-gray-900">
                                        {voucher.voucher_code} - {voucher.savings_text}
                                      </span>
                                      {voucher.min_order_amount > 0 && (
                                        <span className="text-xs text-gray-500">
                                          Min order: ${voucher.min_order_amount}
                                        </span>
                                      )}
                                      {voucher.calculated_discount > 0 && (
                                        <span className="text-xs text-green-600 font-medium">
                                          Saves ${voucher.calculated_discount.toFixed(2)} on this order
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg flex-1 border border-green-300">
                                <div className="flex items-center justify-between">
                                  <span className="text-green-700 font-medium">
                                    🎉 {appliedVoucher.voucher_code} - {appliedVoucher.savings_text}
                                  </span>
                                  <span className="text-green-800 font-bold">
                                    -${appliedVoucher.calculated_discount?.toFixed(2) || appliedVoucher.discount_amount}
                                  </span>
                                </div>
                                {appliedVoucher.min_order_amount > 0 && (
                                  <span className="text-xs text-green-600">
                                    Min order: ${appliedVoucher.min_order_amount}
                                  </span>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={removeVoucher}
                                className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                      {voucherError && (
                        <p className="text-sm text-red-600">{voucherError}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>${formatPrice(totals.subtotal)}</span>
                    </div>
                    {totals.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Promo Discount</span>
                        <span>-${formatPrice(totals.discount)}</span>
                      </div>
                    )}
                    {totals.voucherDiscount > 0 && (
                      <div className="flex justify-between text-green-600 font-medium">
                        <span className="flex items-center gap-1">
                          <Gift className="h-4 w-4" />
                          Voucher Discount
                        </span>
                        <span>-${formatPrice(totals.voucherDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>${formatPrice(totals.tax)}</span>
                    </div>
                    {orderType === "delivery" && (
                      <div className="flex justify-between">
                        <span className="flex items-center">
                          Delivery Fee
                          {deliveryCalculating && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                          {deliveryZoneInfo && (
                            <span className="text-xs text-gray-500 ml-1">
                              ({deliveryZoneInfo.distance} mi)
                            </span>
                          )}
                        </span>
                        <span>${formatPrice(totals.deliveryFee)}</span>
                      </div>
                    )}
                    {deliveryError && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {deliveryError}
                      </div>
                    )}
                    {totals.tip > 0 && (
                      <div className="flex justify-between">
                        <span>Tip</span>
                        <span>${formatPrice(totals.tip)}</span>
                      </div>
                    )}
                    <Separator className="my-2" />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>${formatPrice(totals.finalTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {!clientSecret && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Order Details</CardTitle>
                    <CardDescription>Please provide the following details for your order</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmitOrder} className="space-y-6">
                      {/* Guest Name Field - Only shown for non-logged-in users */}
                      {!user && (
                        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                          <Label htmlFor="guestName" className="text-blue-700 font-semibold flex items-center gap-2">
                            👤 Your Name <span className="text-blue-600 text-sm">(Required)</span>
                          </Label>
                          <Input
                            id="guestName"
                            type="text"
                            placeholder="Enter your name"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            required
                            className="mt-2 border-2 border-blue-300 focus:border-blue-500 focus:ring-blue-500 bg-white"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            📝 This will appear on your order and receipt
                          </p>
                        </div>
                      )}

                      <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                        <Label htmlFor="phone" className="text-red-700 font-semibold flex items-center gap-2">
                          📞 Phone Number <span className="text-red-600 text-sm">(Required)</span>
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder={user ? "Your phone number will be saved for future orders" : "Enter your phone number"}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                          className="mt-2 border-2 border-red-300 focus:border-red-500 focus:ring-red-500 bg-white"
                        />
                        {user && !phone && (
                          <p className="text-xs text-gray-500 mt-1">
                            📞 Your phone number will be saved to your account for faster checkout next time
                          </p>
                        )}
                        {user && phone && user.phone && phone === user.phone && (
                          <p className="text-xs text-green-600 mt-1">
                            ✅ Using your saved phone number
                          </p>
                        )}
                        {user && phone && user.phone && phone !== user.phone && (
                          <p className="text-xs text-blue-600 mt-1">
                            ℹ️ This will update your saved phone number
                          </p>
                        )}
                      </div>
                      
                      <div>
                        <Label className="mb-2 block">Order Type</Label>
                        <RadioGroup value={orderType} onValueChange={setOrderType} className="flex space-x-4">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="pickup" id="pickup" />
                            <Label htmlFor="pickup">Pickup</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="delivery" id="delivery" />
                            <Label htmlFor="delivery">Delivery</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* Tip Selection */}
                      <div>
                        <Label className="mb-2 block">Add a Tip</Label>
                        <p className="text-sm text-gray-500 mb-3">
                          {orderType === "pickup" 
                            ? "Tips will be split among all employees currently clocked in"
                            : "25% of delivery tips will be shared with clocked-in staff"
                          }
                        </p>
                        <div className="space-y-3">
                          <RadioGroup value={tipType} onValueChange={setTipType} className="flex space-x-4">
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="percentage" id="percentage" />
                              <Label htmlFor="percentage">Percentage</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="amount" id="amount" />
                              <Label htmlFor="amount">Custom Amount</Label>
                            </div>
                          </RadioGroup>
                          
                          {tipType === "percentage" && (
                            <div className="flex space-x-2">
                              {[15, 18, 20, 25].map((percent) => (
                                <Button
                                  key={percent}
                                  type="button"
                                  variant={tip === percent ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setTip(percent)}
                                  className="flex-1"
                                >
                                  {percent}%
                                </Button>
                              ))}
                              <Button
                                type="button"
                                variant={tip === 0 ? "default" : "outline"}
                                size="sm"
                                onClick={() => setTip(0)}
                                className="flex-1"
                              >
                                No Tip
                              </Button>
                            </div>
                          )}
                          
                          {tipType === "amount" && (
                            <div className="flex space-x-2">
                              <div className="flex-1">
                                <Input
                                  type="number"
                                  placeholder="Enter amount"
                                  value={customTip}
                                  onChange={(e) => setCustomTip(e.target.value)}
                                  min="0"
                                  step="0.01"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setCustomTip("");
                                  setTipType("percentage");
                                  setTip(0);
                                }}
                              >
                                No Tip
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Fulfillment Time Selection */}
                      <div>
                        <Label className="mb-2 block">When would you like your order?</Label>
                        <RadioGroup value={fulfillmentTime} onValueChange={setFulfillmentTime} className="flex space-x-4">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="asap" id="asap" />
                            <Label htmlFor="asap">ASAP</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="scheduled" id="scheduled" />
                            <Label htmlFor="scheduled">Schedule for Later</Label>
                          </div>
                        </RadioGroup>
                        
                        {fulfillmentTime === "scheduled" && (
                          <div className="mt-4 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl shadow-sm">
                            <Label htmlFor="scheduledTime" className="text-lg font-bold text-blue-900 mb-3 block flex items-center gap-2">
                              📅 Select Date & Time
                            </Label>

                            {/* Store Hours Info */}
                            <div className="mb-4 p-3 bg-white/80 rounded-lg border border-blue-200">
                              <p className="text-sm font-semibold text-gray-700 mb-1">🕒 Store Hours:</p>
                              <ul className="text-sm text-gray-600 space-y-0.5 ml-1">
                                <li>• Monday - Saturday: 11:00 AM - 10:00 PM</li>
                                <li>• Sunday: 12:00 PM - 9:00 PM</li>
                              </ul>
                              <p className="text-xs text-blue-600 mt-2 font-medium">
                                💡 Please select a time during our operating hours
                              </p>
                            </div>

                            <Input
                              type="datetime-local"
                              id="scheduledTime"
                              value={scheduledTime}
                              onChange={(e) => {
                                const selectedDate = new Date(e.target.value);
                                const day = selectedDate.getDay();
                                const hour = selectedDate.getHours();
                                const minute = selectedDate.getMinutes();

                                // Check if selected time is within store hours
                                let isValidTime = false;
                                if (day === 0) { // Sunday
                                  isValidTime = (hour > 12 || (hour === 12 && minute >= 0)) && hour < 21;
                                } else if (day >= 1 && day <= 6) { // Monday-Saturday
                                  isValidTime = (hour > 11 || (hour === 11 && minute >= 0)) && hour < 22;
                                }

                                if (!isValidTime) {
                                  toast({
                                    title: "Outside Store Hours",
                                    description: "Please select a time when we're open. Mon-Sat: 11AM-10PM, Sun: 12PM-9PM",
                                    variant: "destructive"
                                  });
                                }

                                setScheduledTime(e.target.value);
                              }}
                              min={new Date().toISOString().slice(0, 16)}
                              required={fulfillmentTime === "scheduled"}
                              className="text-base font-medium border-2 border-blue-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 h-14 bg-white shadow-sm"
                            />
                            <p className="text-sm text-blue-700 mt-3 flex items-center gap-1.5 bg-blue-100 p-2 rounded-md">
                              <span className="text-lg">✨</span>
                              <span className="font-medium">Your order will be prepared to be ready at this time</span>
                            </p>
                          </div>
                        )}
                        
                        {fulfillmentTime === "asap" && !isStoreOpen() && (
                          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-700">
                              ⚠️ Store is currently closed. Please select a scheduled time or try again during business hours.
                            </p>
                            <p className="text-xs text-red-600 mt-1">
                              Hours: Mon-Sat 11AM-10PM, Sun 12PM-9PM
                            </p>
                          </div>
                        )}
                      </div>
                      
                      {orderType === "delivery" && (
                        <div>
                          <AddressForm
                            value={address}
                            onChange={setAddress}
                            onAddressSelect={handleAddressSelect}
                            placeholder={user ? "Your address will be saved for future orders" : "Enter your delivery address"}
                            label="Delivery Address"
                            required={true}
                          />
                          {user && !address && (
                            <p className="text-xs text-gray-500 mt-1">
                              🏠 Your delivery address will be saved to your account for faster checkout next time
                            </p>
                          )}
                          {user && address && user.address && address.includes(user.address) && (
                            <p className="text-xs text-green-600 mt-1">
                              ✅ Using your saved delivery address
                            </p>
                          )}
                          {user && address && user.address && !address.includes(user.address) && (
                            <p className="text-xs text-blue-600 mt-1">
                              ℹ️ This will update your saved delivery address
                            </p>
                          )}
                        </div>
                      )}
                      
                      <div>
                        <Label htmlFor="instructions">Special Instructions (Optional)</Label>
                        <Textarea 
                          id="instructions" 
                          placeholder="Any special instructions for your order?" 
                          value={specialInstructions} 
                          onChange={(e) => setSpecialInstructions(e.target.value)} 
                        />
                      </div>
                      
                      <Button
                        type="submit"
                        className="w-full bg-[#d73a31] hover:bg-[#c73128] disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={createPaymentIntentMutation.isPending || isOrderingPaused || isPastCutoff}
                      >
                        {isOrderingPaused || isPastCutoff ? (
                          "ASAP Orders Not Available"
                        ) : createPaymentIntentMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Processing...
                          </>
                        ) : (
                          "Continue to Payment"
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              )}
            </div>
            
            {/* Payment */}
            <div id="payment-section">
              <Card>
                <CardHeader>
                  <CardTitle>Payment</CardTitle>
                  <CardDescription>Secure payment processing by Stripe</CardDescription>
                </CardHeader>
                <CardContent>
                  {clientSecret ? (
                    <Elements 
                      stripe={stripePromise} 
                      options={{ 
                        clientSecret,
                        appearance: { theme: 'stripe' } 
                      }}
                    >
                      <CheckoutForm
                        orderId={orderId}
                        clientSecret={clientSecret}
                        customerPhone={phone}
                        customerName={user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || undefined : guestName || undefined}
                        customerAddress={addressData ? {
                          line1: addressData.street || undefined,
                          city: addressData.city || undefined,
                          state: addressData.state || undefined,
                          postal_code: addressData.zipCode || undefined,
                          country: 'US'
                        } : undefined}
                      />
                    </Elements>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>Please complete your order details first</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              {rewards && rewards.length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Your Rewards</CardTitle>
                    <CardDescription>Apply a reward to this order</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {rewards.map((userReward: any) => (
                        <div key={userReward.id} className="flex justify-between items-center p-3 border rounded-md">
                          <div>
                            <p className="font-medium">{userReward.reward.name}</p>
                            <p className="text-sm text-gray-500">{userReward.reward.description}</p>
                          </div>
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              // Apply reward logic would go here
                              toast({
                                title: "Reward Applied",
                                description: `${userReward.reward.name} has been applied to your order.`
                              });
                            }}
                            disabled={!!clientSecret}
                          >
                            Apply
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default CheckoutPage;
