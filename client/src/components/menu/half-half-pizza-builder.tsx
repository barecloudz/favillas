import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Minus, X, Check } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

// Half & half toppings data
const REGULAR_TOPPINGS = [
  { id: "pepperoni", name: "Pepperoni", price: 1.50 },
  { id: "ham", name: "Ham", price: 1.50 },
  { id: "sausage", name: "Sausage", price: 1.50 },
  { id: "ground-beef", name: "Ground Beef", price: 1.50 },
  { id: "anchovies", name: "Anchovies", price: 1.50 },
  { id: "bacon", name: "Bacon", price: 1.50 },
  { id: "green-olives", name: "Green Olives", price: 1.50 },
  { id: "black-olives", name: "Black Olives", price: 1.50 },
  { id: "mushrooms", name: "Mushrooms", price: 1.50 },
  { id: "tomato", name: "Tomato", price: 1.50 },
  { id: "bell-peppers", name: "Bell Peppers", price: 1.50 },
  { id: "garlic", name: "Garlic", price: 1.50 },
  { id: "roasted-red-peppers", name: "Roasted Red Peppers", price: 1.50 },
  { id: "pineapple", name: "Pineapple", price: 1.50 },
  { id: "banana-peppers", name: "Banana Peppers", price: 1.50 },
  { id: "jalapeno-peppers", name: "Jalapeño Peppers", price: 1.50 },
  { id: "red-onion", name: "Red Onion", price: 1.50 },
  { id: "extra-sauce", name: "Extra Sauce", price: 1.50 },
  { id: "extra-cheese", name: "Extra Cheese", price: 1.50 },
];

const SPECIALTY_TOPPINGS = [
  { id: "feta", name: "Feta", price: 2.00 },
  { id: "artichokes", name: "Artichokes", price: 2.00 },
  { id: "ricotta", name: "Ricotta", price: 2.00 },
  { id: "fresh-mozzarella", name: "Fresh Mozzarella", price: 2.00 },
  { id: "chicken", name: "Chicken", price: 2.00 },
  { id: "meatballs", name: "Meatballs", price: 2.00 },
  { id: "eggplant", name: "Eggplant", price: 2.00 },
  { id: "spinach", name: "Spinach", price: 2.00, soldOut: true },
];

interface HalfHalfPizzaBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  menuItem: any;
}

interface HalfToppings {
  left: string[];
  right: string[];
}

const HalfHalfPizzaBuilder: React.FC<HalfHalfPizzaBuilderProps> = ({
  isOpen,
  onClose,
  menuItem
}) => {
  const [selectedToppings, setSelectedToppings] = useState<HalfToppings>({ left: [], right: [] });
  const [activeHalf, setActiveHalf] = useState<'left' | 'right'>('left');
  const [quantity, setQuantity] = useState(1);
  const [animatingToppings, setAnimatingToppings] = useState<Array<{ id: string, x: number, y: number }>>([]);
  const { addItem } = useCart();

  const pizzaRef = useRef<HTMLDivElement>(null);

  // Get all available toppings
  const allToppings = [...REGULAR_TOPPINGS, ...SPECIALTY_TOPPINGS];

  // Calculate total price
  const calculatePrice = () => {
    let total = parseFloat(menuItem?.basePrice || '0');
    
    [...selectedToppings.left, ...selectedToppings.right].forEach(toppingId => {
      const topping = allToppings.find(t => t.id === toppingId);
      if (topping) {
        total += topping.price;
      }
    });
    
    return total * quantity;
  };

  // Handle adding toppings with animation
  const handleAddTopping = (toppingId: string, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const pizzaRect = pizzaRef.current?.getBoundingClientRect();
    
    if (!pizzaRect) return;

    // Calculate throw animation start position
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    
    // Calculate target position on pizza (left or right half)
    const targetX = pizzaRect.left + (activeHalf === 'left' ? pizzaRect.width * 0.25 : pizzaRect.width * 0.75);
    const targetY = pizzaRect.top + pizzaRect.height / 2;

    // Add animation data
    setAnimatingToppings(prev => [...prev, {
      id: toppingId + Date.now(),
      x: startX - targetX,
      y: startY - targetY
    }]);

    // Remove animation after completion
    setTimeout(() => {
      setAnimatingToppings(prev => prev.slice(1));
    }, 800);

    // Add topping to selected half
    setSelectedToppings(prev => ({
      ...prev,
      [activeHalf]: [...prev[activeHalf], toppingId]
    }));
  };

  // Handle removing toppings
  const handleRemoveTopping = (toppingId: string, half: 'left' | 'right') => {
    setSelectedToppings(prev => ({
      ...prev,
      [half]: prev[half].filter(id => id !== toppingId)
    }));
  };

  // Handle adding to cart
  const handleAddToCart = () => {
    const leftToppings = selectedToppings.left.map(id => allToppings.find(t => t.id === id)).filter(Boolean);
    const rightToppings = selectedToppings.right.map(id => allToppings.find(t => t.id === id)).filter(Boolean);

    const cartItem = {
      id: menuItem.id,
      name: menuItem.name,
      price: calculatePrice(),
      quantity: quantity,
      selectedOptions: {
        halfAndHalf: true,
        leftToppings: leftToppings.map(t => ({ name: t!.name, price: t!.price })),
        rightToppings: rightToppings.map(t => ({ name: t!.name, price: t!.price }))
      },
      specialInstructions: `Half & Half Pizza - Left side: ${leftToppings.map(t => t!.name).join(', ') || 'Plain'}, Right side: ${rightToppings.map(t => t!.name).join(', ') || 'Plain'}`
    };

    addItem(cartItem);
    onClose();
  };

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedToppings({ left: [], right: [] });
      setActiveHalf('left');
      setQuantity(1);
      setAnimatingToppings([]);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <span>🍕</span>
            Customize Your Half & Half {menuItem?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Half Panel */}
          <div className="space-y-4">
            <div className="text-center">
              <Button
                variant={activeHalf === 'left' ? "default" : "outline"}
                onClick={() => setActiveHalf('left')}
                className="w-full mb-4"
              >
                Left Half
                {selectedToppings.left.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedToppings.left.length}
                  </Badge>
                )}
              </Button>
            </div>

            <Card className={`transition-all duration-200 ${activeHalf === 'left' ? 'ring-2 ring-red-500' : ''}`}>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3">Selected Toppings</h4>
                <div className="space-y-2 min-h-[100px]">
                  {selectedToppings.left.length === 0 ? (
                    <p className="text-gray-500 text-sm">No toppings selected</p>
                  ) : (
                    selectedToppings.left.map((toppingId, index) => {
                      const topping = allToppings.find(t => t.id === toppingId);
                      return (
                        <motion.div
                          key={`${toppingId}-${index}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center justify-between bg-gray-50 p-2 rounded"
                        >
                          <span className="text-sm">{topping?.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">+${topping?.price.toFixed(2)}</Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveTopping(toppingId, 'left')}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pizza Visual */}
          <div className="flex items-center justify-center relative">
            <div 
              ref={pizzaRef}
              className="relative w-64 h-64 rounded-full bg-yellow-100 border-8 border-yellow-600 flex items-center justify-center overflow-hidden"
            >
              {/* Pizza base */}
              <div className="absolute inset-2 rounded-full bg-yellow-200"></div>
              
              {/* Divider line */}
              <div className="absolute inset-y-0 left-1/2 w-1 bg-yellow-600 transform -translate-x-1/2 z-10"></div>
              
              {/* Left half toppings */}
              <div className="absolute left-0 top-0 w-1/2 h-full rounded-l-full overflow-hidden">
                {selectedToppings.left.map((toppingId, index) => {
                  const positions = [
                    { top: '20%', left: '25%' },
                    { top: '50%', left: '30%' },
                    { top: '70%', left: '20%' },
                    { top: '35%', left: '10%' },
                    { top: '60%', left: '35%' },
                  ];
                  const position = positions[index % positions.length];
                  
                  return (
                    <motion.div
                      key={`left-${toppingId}-${index}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute w-4 h-4 bg-red-600 rounded-full"
                      style={position}
                    />
                  );
                })}
              </div>

              {/* Right half toppings */}
              <div className="absolute right-0 top-0 w-1/2 h-full rounded-r-full overflow-hidden">
                {selectedToppings.right.map((toppingId, index) => {
                  const positions = [
                    { top: '20%', right: '25%' },
                    { top: '50%', right: '30%' },
                    { top: '70%', right: '20%' },
                    { top: '35%', right: '10%' },
                    { top: '60%', right: '35%' },
                  ];
                  const position = positions[index % positions.length];
                  
                  return (
                    <motion.div
                      key={`right-${toppingId}-${index}`}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute w-4 h-4 bg-blue-600 rounded-full"
                      style={position}
                    />
                  );
                })}
              </div>

              {/* Animated toppings during throw */}
              <AnimatePresence>
                {animatingToppings.map(({ id, x, y }) => (
                  <motion.div
                    key={id}
                    initial={{ x, y, opacity: 1, scale: 1 }}
                    animate={{ x: 0, y: 0, opacity: 1, scale: 0.8 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute w-6 h-6 bg-red-500 rounded-full z-20 pointer-events-none"
                    style={{ 
                      left: '50%', 
                      top: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
            
            {/* Active half indicator */}
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2">
              <Badge variant={activeHalf === 'left' ? "default" : "secondary"}>
                Customizing: {activeHalf === 'left' ? 'Left' : 'Right'} Half
              </Badge>
            </div>
          </div>

          {/* Right Half Panel */}
          <div className="space-y-4">
            <div className="text-center">
              <Button
                variant={activeHalf === 'right' ? "default" : "outline"}
                onClick={() => setActiveHalf('right')}
                className="w-full mb-4"
              >
                Right Half
                {selectedToppings.right.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedToppings.right.length}
                  </Badge>
                )}
              </Button>
            </div>

            <Card className={`transition-all duration-200 ${activeHalf === 'right' ? 'ring-2 ring-blue-500' : ''}`}>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3">Selected Toppings</h4>
                <div className="space-y-2 min-h-[100px]">
                  {selectedToppings.right.length === 0 ? (
                    <p className="text-gray-500 text-sm">No toppings selected</p>
                  ) : (
                    selectedToppings.right.map((toppingId, index) => {
                      const topping = allToppings.find(t => t.id === toppingId);
                      return (
                        <motion.div
                          key={`${toppingId}-${index}`}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center justify-between bg-gray-50 p-2 rounded"
                        >
                          <span className="text-sm">{topping?.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">+${topping?.price.toFixed(2)}</Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveTopping(toppingId, 'right')}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Toppings Selection */}
        <div className="space-y-6">
          {/* Regular Toppings */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Regular Toppings (+$1.50 each)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {REGULAR_TOPPINGS.map((topping) => (
                <Button
                  key={topping.id}
                  variant="outline"
                  onClick={(e) => handleAddTopping(topping.id, e)}
                  className="h-auto p-3 text-left justify-start hover:bg-red-50"
                  disabled={selectedToppings[activeHalf].includes(topping.id)}
                >
                  <div>
                    <div className="font-medium">{topping.name}</div>
                    <div className="text-sm text-gray-500">+${topping.price.toFixed(2)}</div>
                  </div>
                  {selectedToppings[activeHalf].includes(topping.id) && (
                    <Check className="h-4 w-4 ml-auto text-green-600" />
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Specialty Toppings */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Specialty Toppings (+$2.00 each)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {SPECIALTY_TOPPINGS.map((topping) => (
                <Button
                  key={topping.id}
                  variant="outline"
                  onClick={(e) => !topping.soldOut && handleAddTopping(topping.id, e)}
                  className={`h-auto p-3 text-left justify-start hover:bg-blue-50 ${topping.soldOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={selectedToppings[activeHalf].includes(topping.id) || topping.soldOut}
                >
                  <div>
                    <div className="font-medium">
                      {topping.name}
                      {topping.soldOut && <span className="text-red-500 ml-1">(Sold Out)</span>}
                    </div>
                    <div className="text-sm text-gray-500">+${topping.price.toFixed(2)}</div>
                  </div>
                  {selectedToppings[activeHalf].includes(topping.id) && (
                    <Check className="h-4 w-4 ml-auto text-green-600" />
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        {/* Quantity and Add to Cart */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="font-medium">Quantity:</span>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-xl font-semibold w-8 text-center">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-600">Total</div>
              <div className="text-2xl font-bold">${calculatePrice().toFixed(2)}</div>
            </div>
            <Button
              onClick={handleAddToCart}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg"
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default HalfHalfPizzaBuilder;