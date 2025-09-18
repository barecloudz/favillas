import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useStripe, useElements, Elements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useAuth } from "@/hooks/use-supabase-auth";
import { useCart } from "@/hooks/use-cart";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/layout/header";
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
import { Loader2, X, Gift } from "lucide-react";
import AddressForm from "@/components/ui/address-autocomplete";

// Load Stripe outside of component to avoid recreating it on render
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error("VITE_STRIPE_PUBLIC_KEY environment variable is required");
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// CheckoutForm with Stripe integration
const CheckoutForm = ({ orderId, clientSecret }: { orderId: number, clientSecret: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/order-success?orderId=${orderId}`,
      },
      redirect: "always",
    });

    // Note: When using redirect: "always", the else block below will typically not execute
    // because Stripe will redirect the user to the return_url on success.
    // This error handling is for cases where redirect fails or payment fails.
    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
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
  const { user } = useAuth();
  const { items, total, tax, clearCart, showLoginModal } = useCart();
  const [location, navigate] = useLocation();
  const { toast } = useToast();

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
  
  const [orderType, setOrderType] = useState("pickup");
  const [fulfillmentTime, setFulfillmentTime] = useState("asap");
  const [scheduledTime, setScheduledTime] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");
  const [address, setAddress] = useState(user?.address || "");
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
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>("");
  const [tip, setTip] = useState(0);
  const [tipType, setTipType] = useState<"percentage" | "amount">("percentage");
  const [customTip, setCustomTip] = useState("");

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

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const res = await apiRequest("POST", "/api/orders", orderData);
      return await res.json();
    },
    onSuccess: (data) => {
      setOrderId(data.id);
      
      // Create payment intent
      createPaymentIntentMutation.mutate({
        amount: totals.finalTotal,
        orderId: data.id,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create payment intent mutation
  const createPaymentIntentMutation = useMutation({
    mutationFn: async (data: { amount: number; orderId: number }) => {
      const res = await apiRequest("POST", "/api/create-payment-intent", data);
      return await res.json();
    },
    onSuccess: (data) => {
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
        return await res.json();
      } catch (error: any) {
        // Try to parse the error message from JSON
        let errorMessage = "Invalid promo code";
        try {
          const errorData = JSON.parse(error.message);
          errorMessage = errorData.message || errorMessage;
        } catch {
          errorMessage = error.message || errorMessage;
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
    
    const finalTotal = finalSubtotal + taxAmount + tipAmount;
    
    return {
      subtotal,
      tax: taxAmount,
      discount: discountAmount,
      voucherDiscount: voucherDiscountAmount,
      totalDiscount: totalDiscountAmount,
      tip: tipAmount,
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

    if (voucherId === "") {
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
    setSelectedVoucherId("");
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
    
    // Create order - filter out any corrupted items
    const orderItems = items
      .filter(item => item && item.id && item.name && item.price && item.quantity)
      .map(item => ({
        menuItemId: item.id,
        quantity: item.quantity,
        price: (item.price * item.quantity).toString(),
        options: item.selectedOptions || {},
        specialInstructions: item.specialInstructions || "",
      }));
    
    // Parse address for ShipDay if delivery order
    let parsedAddressData = null;
    if (orderType === "delivery" && address) {
      const addressParts = address.split(',').map(part => part.trim());
      if (addressParts.length >= 3) {
        parsedAddressData = {
          fullAddress: address,
          street: addressParts[0] || '',
          city: addressParts[1] || '',
          state: addressParts[2] || '',
          zipCode: addressParts[3] || ''
        };
      }
    }

    createOrderMutation.mutate({
      userId: user?.id || null, // Allow null for guest users
      status: "pending",
      total: totals.finalTotal.toString(), // Store the final total (what customer actually pays)
      tax: tax.toString(),
      tip: totals.tip.toString(),
      deliveryFee: orderType === "delivery" ? "3.99" : "0", // Add delivery fee for delivery orders
      orderType,
      paymentStatus: "pending",
      specialInstructions,
      address: orderType === "delivery" ? address : "",
      addressData: orderType === "delivery" ? parsedAddressData : null,
      phone,
      items: orderItems,
      fulfillmentTime,
      scheduledTime: fulfillmentTime === "scheduled" ? scheduledTime : null,
      // Include voucher information
      voucherCode: appliedVoucher?.voucher_code || null,
      voucherDiscount: totals.voucherDiscount || 0,
      // Include metadata for breakdown
      orderMetadata: {
        subtotal: total,
        discount: totals.discount,
        voucherDiscount: totals.voucherDiscount,
        finalSubtotal: totals.finalSubtotal
      }
    });
  };

  return (
    <>
      <Helmet>
        <title>Checkout | Favilla's NY Pizza</title>
        <meta name="description" content="Complete your order at Favilla's NY Pizza. Easy and secure checkout with multiple payment options." />
      </Helmet>
      <Header />
      <main className="bg-gray-50 py-12">
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
                      <div key={`${item.id}-${JSON.stringify(item.selectedOptions)}`} className="flex justify-between items-center py-2 border-b">
                        <div className="flex items-center">
                          <div className="ml-4">
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-500">
                              {item.selectedOptions?.size && `Size: ${item.selectedOptions.size}`}
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
                                <SelectItem value="">No voucher</SelectItem>
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
                      <div>
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input 
                          id="phone" 
                          type="tel" 
                          placeholder="Enter your phone number" 
                          value={phone} 
                          onChange={(e) => setPhone(e.target.value)} 
                          required 
                        />
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
                          <div className="mt-4">
                            <Label htmlFor="scheduledTime">Select Date & Time</Label>
                            <Input
                              type="datetime-local"
                              id="scheduledTime"
                              value={scheduledTime}
                              onChange={(e) => setScheduledTime(e.target.value)}
                              min={new Date().toISOString().slice(0, 16)}
                              required={fulfillmentTime === "scheduled"}
                            />
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
                        <AddressForm
                          value={address}
                          onChange={setAddress}
                          onAddressSelect={handleAddressSelect}
                          placeholder="Enter your delivery address"
                          label="Delivery Address"
                          required={true}
                        />
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
                        className="w-full bg-[#d73a31] hover:bg-[#c73128]"
                        disabled={createOrderMutation.isPending}
                      >
                        {createOrderMutation.isPending ? (
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
                        orderId={orderId!} 
                        clientSecret={clientSecret} 
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
