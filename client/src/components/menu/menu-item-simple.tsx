import React from "react";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";
import { ORDERING_DISABLED } from "@/components/warning-banner";

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
  };
}

const MenuItemSimple: React.FC<MenuItemProps> = ({ item }) => {
  const { addItem, triggerPizzaAnimation } = useCart();

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice) || numPrice === null || numPrice === undefined) {
      return "0.00";
    }
    return numPrice.toFixed(2);
  };

  const handleAddToCart = (event: React.MouseEvent<HTMLButtonElement>) => {
    try {
      addItem({
        id: item.id,
        name: item.name || 'Unknown Item',
        price: parseFloat(item.basePrice) || 0,
        quantity: 1,
        selectedOptions: {},
        specialInstructions: ''
      });

      // Trigger pizza animation from the button that was clicked
      triggerPizzaAnimation(event.currentTarget);

      console.log('✅ Added to cart:', item.name);
    } catch (error) {
      console.error('❌ Error adding to cart:', error);
    }
  };

  return (
    <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      <div className="h-48 overflow-hidden">
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          decoding="async"
          width="300"
          height="192"
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-display font-bold">{item.name}</h3>
          <div className="flex gap-1">
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
            <span>${formatPrice(item.basePrice)}</span>
          </div>

          <Button
            className="bg-[#d73a31] hover:bg-[#c73128] text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
            onClick={handleAddToCart}
            disabled={ORDERING_DISABLED}
          >
            <ShoppingCart className="h-4 w-4 mr-2" />
            {ORDERING_DISABLED ? "Unavailable" : "Add to Cart"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default MenuItemSimple;