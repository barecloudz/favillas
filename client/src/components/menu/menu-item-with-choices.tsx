import React, { useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  };
  choiceGroups?: any[];
  choiceItems?: any[];
  menuItemChoiceGroups?: any[];
}

const MenuItemWithChoices: React.FC<MenuItemProps> = ({
  item,
  choiceGroups = [],
  choiceItems = [],
  menuItemChoiceGroups = []
}) => {
  const { addItem } = useCart();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedChoices, setSelectedChoices] = useState<{ [key: string]: string[] }>({});

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice) || numPrice === null || numPrice === undefined) {
      return "0.00";
    }
    return numPrice.toFixed(2);
  };

  // Get choice groups for this menu item
  const getItemChoiceGroups = () => {
    const itemChoiceGroupIds = menuItemChoiceGroups
      .filter(micg => micg.menu_item_id === item.id)
      .sort((a, b) => a.order - b.order);

    return itemChoiceGroupIds.map(micg => {
      const group = choiceGroups.find(cg => cg.id === micg.choice_group_id);
      if (!group) return null;

      const items = choiceItems
        .filter(ci => ci.choice_group_id === group.id)
        .sort((a, b) => a.order - b.order);

      return {
        ...group,
        items,
        isRequired: micg.is_required
      };
    }).filter(Boolean);
  };

  const itemChoiceGroups = getItemChoiceGroups();
  const hasChoices = itemChoiceGroups.length > 0;

  // Calculate total price with selections
  const calculateTotalPrice = () => {
    let total = parseFloat(item.basePrice) || 0;

    Object.entries(selectedChoices).forEach(([groupId, selections]) => {
      selections.forEach(selectionId => {
        const choiceItem = choiceItems.find(ci => ci.id === parseInt(selectionId));
        if (choiceItem) {
          total += parseFloat(choiceItem.price) || 0;
        }
      });
    });

    return total;
  };

  // Handle choice selection
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

  // Simple add to cart without choices
  const handleSimpleAddToCart = () => {
    try {
      addItem({
        id: item.id,
        name: item.name || 'Unknown Item',
        price: parseFloat(item.basePrice) || 0,
        quantity: 1,
        selectedOptions: {},
        specialInstructions: ''
      });
    } catch (error) {
      console.error('Error adding item to cart:', error);
    }
  };

  // Add to cart with choices
  const handleAddToCartWithChoices = () => {
    // Validate required selections
    const missingRequired = itemChoiceGroups.filter(group =>
      group.isRequired && (!selectedChoices[group.id] || selectedChoices[group.id].length === 0)
    );

    if (missingRequired.length > 0) {
      alert(`Please select: ${missingRequired.map(g => g.name).join(', ')}`);
      return;
    }

    // Build options array
    const options: any[] = [];
    Object.entries(selectedChoices).forEach(([groupId, selections]) => {
      const group = itemChoiceGroups.find(g => g.id === parseInt(groupId));
      if (group) {
        selections.forEach(selectionId => {
          const choiceItem = choiceItems.find(ci => ci.id === parseInt(selectionId));
          if (choiceItem) {
            options.push({
              groupName: group.name,
              itemName: choiceItem.name,
              price: parseFloat(choiceItem.price) || 0
            });
          }
        });
      }
    });

    try {
      addItem({
        id: item.id,
        name: item.name || 'Unknown Item',
        price: calculateTotalPrice(),
        quantity,
        options,
        selectedOptions: {},
        specialInstructions: ''
      });

      setIsDialogOpen(false);
      setSelectedChoices({});
      setQuantity(1);
    } catch (error) {
      console.error('Error adding item to cart:', error);
    }
  };

  return (
    <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
      <div className="h-48 overflow-hidden">
        <img
          src={item.imageUrl || '/images/placeholder-pizza.jpg'}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
        />
      </div>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-display font-bold">{item.name}</h3>
          <div className="flex gap-1">
            {hasChoices && (
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

          {hasChoices ? (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#d73a31] hover:bg-[#c73128] text-white">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Customize
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{item.name}</DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  {itemChoiceGroups.map(group => (
                    <div key={group.id} className="space-y-3">
                      <div className="flex justify-between items-center">
                        <Label className="text-base font-semibold">
                          {group.name}
                          {group.isRequired && <span className="text-red-500 ml-1">*</span>}
                        </Label>
                        {group.max_selections && group.max_selections > 1 && (
                          <span className="text-sm text-gray-500">
                            Max {group.max_selections}
                          </span>
                        )}
                      </div>

                      {group.max_selections === 1 ? (
                        <RadioGroup
                          value={selectedChoices[group.id]?.[0] || ""}
                          onValueChange={(value) => handleChoiceSelection(group.id.toString(), value, true)}
                        >
                          {group.items.map(choiceItem => (
                            <div key={choiceItem.id} className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value={choiceItem.id.toString()} />
                                <Label className="font-normal">
                                  {choiceItem.name}
                                  {choiceItem.description && (
                                    <span className="text-sm text-gray-500 block">{choiceItem.description}</span>
                                  )}
                                </Label>
                              </div>
                              {parseFloat(choiceItem.price) > 0 && (
                                <Badge variant="secondary">+${formatPrice(choiceItem.price)}</Badge>
                              )}
                            </div>
                          ))}
                        </RadioGroup>
                      ) : (
                        <div className="space-y-2">
                          {group.items.map(choiceItem => (
                            <div key={choiceItem.id} className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  checked={selectedChoices[group.id]?.includes(choiceItem.id.toString()) || false}
                                  onCheckedChange={() => handleChoiceSelection(group.id.toString(), choiceItem.id.toString(), false)}
                                />
                                <Label className="font-normal">
                                  {choiceItem.name}
                                  {choiceItem.description && (
                                    <span className="text-sm text-gray-500 block">{choiceItem.description}</span>
                                  )}
                                </Label>
                              </div>
                              {parseFloat(choiceItem.price) > 0 && (
                                <Badge variant="secondary">+${formatPrice(choiceItem.price)}</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="w-8 text-center">{quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setQuantity(quantity + 1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="text-lg font-bold">
                      Total: ${formatPrice(calculateTotalPrice() * quantity)}
                    </div>
                  </div>

                  <Button
                    className="w-full bg-[#d73a31] hover:bg-[#c73128] text-white"
                    onClick={handleAddToCartWithChoices}
                  >
                    Add to Cart
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <Button
              className="bg-[#d73a31] hover:bg-[#c73128] text-white"
              onClick={handleSimpleAddToCart}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MenuItemWithChoices;