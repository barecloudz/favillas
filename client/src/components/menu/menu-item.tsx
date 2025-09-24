import React, { useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, Plus, Minus } from "lucide-react";

interface MenuItemProps {
  item: {
    id: number;
    name: string;
    description: string;
    imageUrl: string;
    basePrice: string;
    category: string;
    isPopular?: boolean;
    isNew?: boolean;
    isBestSeller?: boolean;
    options?: {
      sizes?: { name: string; price: string }[];
      toppings?: { name: string; price: string }[];
      extras?: { name: string; price: string }[];
      addOns?: { name: string; price: string }[];
      customizations?: { name: string; price: string }[];
    };
  };
}

const MenuItem: React.FC<MenuItemProps> = ({ item }) => {
  const { addItem, triggerPizzaAnimation } = useCart();
  const [quantity, setQuantity] = useState(1);

  // EMERGENCY: Simplified add to cart without complex options
  const handleSimpleAddToCart = (event: React.MouseEvent<HTMLButtonElement>) => {
    try {
      addItem({
        id: item.id,
        name: item.name || 'Unknown Item',
        price: parseFloat(item.basePrice) || 0,
        quantity,
        selectedOptions: {},
        specialInstructions: ''
      });

      // Trigger pizza animation from the button that was clicked
      triggerPizzaAnimation(event.currentTarget);

      console.log('Item added to cart successfully:', item.name);
    } catch (error) {
      console.error('Error adding item to cart:', error);
    }
  };
  
  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice) || numPrice === null || numPrice === undefined) {
      return "0.00";
    }
    return numPrice.toFixed(2);
  };
  
  const [selectedSize, setSelectedSize] = useState(
    item.options?.sizes ? item.options.sizes[0].name : ""
  );
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [selectedCustomizations, setSelectedCustomizations] = useState<string[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const getPrice = () => {
    let basePrice = parseFloat(item.basePrice);
    
    // Add size price if selected
    if (item.options?.sizes && selectedSize) {
      const selectedSizeOption = item.options.sizes.find(
        (size) => size.name === selectedSize
      );
      if (selectedSizeOption) {
        basePrice = parseFloat(selectedSizeOption.price);
      }
    }
    
    // Add toppings price
    if (item.options?.toppings) {
      selectedToppings.forEach(toppingName => {
        const topping = item.options.toppings.find(t => t.name === toppingName);
        if (topping) {
          basePrice += parseFloat(topping.price);
        }
      });
    }
    
    // Add extras price
    if (item.options?.extras) {
      selectedExtras.forEach(extraName => {
        const extra = item.options.extras.find(e => e.name === extraName);
        if (extra) {
          basePrice += parseFloat(extra.price);
        }
      });
    }
    
    // Add add-ons price
    if (item.options?.addOns) {
      selectedAddOns.forEach(addOnName => {
        const addOn = item.options.addOns.find(a => a.name === addOnName);
        if (addOn) {
          basePrice += parseFloat(addOn.price);
        }
      });
    }
    
    // Add customizations price
    if (item.options?.customizations) {
      selectedCustomizations.forEach(customName => {
        const custom = item.options.customizations.find(c => c.name === customName);
        if (custom) {
          basePrice += parseFloat(custom.price);
        }
      });
    }
    
    return basePrice;
  };
  
  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => prev > 1 ? prev - 1 : 1);
  
  // Check if item has customization options
  const hasCustomizationOptions = () => {
    return !!(
      item.options?.sizes ||
      item.options?.toppings ||
      item.options?.extras ||
      item.options?.addOns ||
      item.options?.customizations
    );
  };
  
  const handleAddToCart = (event?: React.MouseEvent<HTMLButtonElement>) => {
    const selectedOptions = {
      size: selectedSize,
      toppings: selectedToppings,
      extras: selectedExtras,
      addOns: selectedAddOns,
      customizations: selectedCustomizations,
    };

    addItem({
      id: item.id,
      name: item.name,
      price: getPrice(),
      quantity,
      selectedOptions,
      specialInstructions: specialInstructions.trim().length > 0 ? specialInstructions : undefined,
    });

    // Trigger pizza animation if event is provided
    if (event) {
      triggerPizzaAnimation(event.currentTarget);
    }

    // Reset state
    setQuantity(1);
    if (item.options?.sizes) {
      setSelectedSize(item.options.sizes[0].name);
    }
    setSelectedToppings([]);
    setSelectedExtras([]);
    setSelectedAddOns([]);
    setSelectedCustomizations([]);
    setSpecialInstructions("");
    setDialogOpen(false);
  };
  
  return (
    <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      <div className="h-48 overflow-hidden">
        <img 
          src={item.imageUrl} 
          alt={item.name} 
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-display font-bold">{item.name}</h3>
          <div className="flex gap-1">
            {hasCustomizationOptions() && (
              <Badge className="bg-[#d73a31] text-white">Customizable</Badge>
            )}
            {item.isBestSeller && (
              <Badge className="bg-[#f2c94c] text-[#333333]">Best Seller</Badge>
            )}
            {item.isPopular && (
              <Badge className="bg-[#f2c94c] text-[#333333]">Popular</Badge>
            )}
            {item.isNew && (
              <Badge className="bg-[#27ae60] text-white">New</Badge>
            )}
          </div>
        </div>
        <p className="text-neutral mb-4 line-clamp-3">{item.description}</p>
        <div className="flex justify-between items-center">
          <div className="text-lg font-bold">
            <span>From ${formatPrice(item.basePrice)}</span>
          </div>
          
          {/* EMERGENCY: Simplified direct add to cart */}
          <Button
            className="bg-[#d73a31] hover:bg-[#c73128] text-white"
            onClick={handleSimpleAddToCart}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            Add to Cart - ${formatPrice(item.basePrice)}
          </Button>
                {item.options?.sizes && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Select Size:</h4>
                    <RadioGroup 
                      value={selectedSize} 
                      onValueChange={setSelectedSize}
                      className="grid grid-cols-2 gap-2"
                    >
                      {item.options.sizes.map((size) => (
                        <div key={size.name} className="flex items-center space-x-2 border rounded-md p-2">
                          <RadioGroupItem value={size.name} id={`size-${size.name}`} />
                          <Label htmlFor={`size-${size.name}`} className="flex justify-between w-full">
                            <span>{size.name}</span>
                            <span>${formatPrice(size.price)}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}
                
                {item.options?.toppings && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Toppings:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {item.options.toppings.map((topping) => (
                        <div key={topping.name} className="flex items-center space-x-2 border rounded-md p-2">
                          <input
                            type="checkbox"
                            id={`topping-${topping.name}`}
                            checked={selectedToppings.includes(topping.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedToppings([...selectedToppings, topping.name]);
                              } else {
                                setSelectedToppings(selectedToppings.filter(t => t !== topping.name));
                              }
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={`topping-${topping.name}`} className="flex justify-between w-full">
                            <span>{topping.name}</span>
                            <span>${formatPrice(topping.price)}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {item.options?.extras && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Extras:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {item.options.extras.map((extra) => (
                        <div key={extra.name} className="flex items-center space-x-2 border rounded-md p-2">
                          <input
                            type="checkbox"
                            id={`extra-${extra.name}`}
                            checked={selectedExtras.includes(extra.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedExtras([...selectedExtras, extra.name]);
                              } else {
                                setSelectedExtras(selectedExtras.filter(e => e !== extra.name));
                              }
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={`extra-${extra.name}`} className="flex justify-between w-full">
                            <span>{extra.name}</span>
                            <span>${formatPrice(extra.price)}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {item.options?.addOns && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Add-Ons:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {item.options.addOns.map((addOn) => (
                        <div key={addOn.name} className="flex items-center space-x-2 border rounded-md p-2">
                          <input
                            type="checkbox"
                            id={`addon-${addOn.name}`}
                            checked={selectedAddOns.includes(addOn.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAddOns([...selectedAddOns, addOn.name]);
                              } else {
                                setSelectedAddOns(selectedAddOns.filter(a => a !== addOn.name));
                              }
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={`addon-${addOn.name}`} className="flex justify-between w-full">
                            <span>{addOn.name}</span>
                            <span>${formatPrice(addOn.price)}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {item.options?.customizations && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Customizations:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {item.options.customizations.map((custom) => (
                        <div key={custom.name} className="flex items-center space-x-2 border rounded-md p-2">
                          <input
                            type="checkbox"
                            id={`custom-${custom.name}`}
                            checked={selectedCustomizations.includes(custom.name)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCustomizations([...selectedCustomizations, custom.name]);
                              } else {
                                setSelectedCustomizations(selectedCustomizations.filter(c => c !== custom.name));
                              }
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={`custom-${custom.name}`} className="flex justify-between w-full">
                            <span>{custom.name}</span>
                            <span>${formatPrice(custom.price)}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <h4 className="font-medium">Quantity:</h4>
                  <div className="flex items-center">
                    <Button 
                      variant="outline" 
                      type="button" 
                      size="icon" 
                      className="h-8 w-8 rounded-full"
                      onClick={decrementQuantity}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="mx-4 font-medium">{quantity}</span>
                    <Button 
                      variant="outline" 
                      type="button" 
                      size="icon" 
                      className="h-8 w-8 rounded-full"
                      onClick={incrementQuantity}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Special Instructions:</h4>
                  <Textarea 
                    placeholder="Any special requests or instructions?"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    className="resize-none"
                    rows={3}
                  />
                </div>
                
                <div className="pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>${(getPrice() * quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-[#d73a31] hover:bg-[#c73128] text-white"
                  onClick={(event) => handleAddToCart(event)}
                >
                  Add to Cart
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
};

export default MenuItem;
