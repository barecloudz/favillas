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

// Primary choice groups that set the base price or are required selections
const PRIMARY_GROUPS = [
  'Size', 'Calzone Size', 'Stromboli Size',
  'Traditional Pizza Size', 'Specialty Gourmet Pizza Size',
  'Wing Flavors', 'Garden Salad Size',
  'Salad Dressing', 'Dressing Style',
  'Caesar Salad Dressing', 'Greek Salad Dressing',
  'Antipasto Salad Dressing', 'Chef Salad Dressing',
  'Tuna Salad Dressing', 'Grilled Chicken Salad Dressing'
];

const isPrimaryChoiceGroup = (groupName: string) => PRIMARY_GROUPS.includes(groupName);

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
  const { addItem, triggerPizzaAnimation } = useCart();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedChoices, setSelectedChoices] = useState<{ [key: string]: string[] }>({});
  const [dynamicPrices, setDynamicPrices] = useState<{ [key: string]: number }>({});
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);
  const [sizeCollapsed, setSizeCollapsed] = useState(false);

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice) || numPrice === null || numPrice === undefined) {
      return "0.00";
    }
    return numPrice.toFixed(2);
  };

  // Get choice groups for this menu item, sorted by priority
  const getItemChoiceGroups = () => {
    console.log(`🔍 [MenuItemWithChoices] Processing item "${item.name}" (id: ${item.id})`);
    console.log(`🔍 [MenuItemWithChoices] Available data:`, {
      menuItemChoiceGroups: menuItemChoiceGroups.length,
      choiceGroups: choiceGroups.length,
      choiceItems: choiceItems.length
    });

    const itemChoiceGroupIds = menuItemChoiceGroups
      .filter(micg => micg.menu_item_id === item.id);

    console.log(`🔍 [MenuItemWithChoices] Found ${itemChoiceGroupIds.length} choice group assignments for this item:`, itemChoiceGroupIds);

    const result = itemChoiceGroupIds.map(micg => {
      const group = choiceGroups.find(cg => cg.id === micg.choice_group_id);
      console.log(`🔍 [MenuItemWithChoices] Looking for choice group ${micg.choice_group_id}, found:`, group);

      if (!group) return null;

      const items = choiceItems
        .filter(ci => ci.choiceGroupId === group.id)
        .sort((a, b) => a.order - b.order);

      console.log(`🔍 [MenuItemWithChoices] Found ${items.length} choice items for group "${group.name}":`, items);

      return {
        ...group,
        items,
        isRequired: micg.is_required
      };
    }).filter(Boolean).sort((a, b) => (a.priority || 0) - (b.priority || 0));

    console.log(`🔍 [MenuItemWithChoices] Final result for item "${item.name}":`, result);
    return result;
  };

  const itemChoiceGroups = getItemChoiceGroups();
  const hasChoices = itemChoiceGroups.length > 0;

  // Get selected size name for conditional topping display
  const getSelectedSize = () => {
    const sizeGroup = itemChoiceGroups.find(g =>
      g.name === 'Size' ||
      g.name === 'Calzone Size' ||
      g.name === 'Stromboli Size' ||
      g.name === 'Traditional Pizza Size' ||
      g.name === 'Specialty Gourmet Pizza Size' ||
      g.name === 'Wing Flavors'
    );
    if (!sizeGroup || !selectedChoices[sizeGroup.id]) return null;

    const sizeChoiceId = selectedChoices[sizeGroup.id][0];
    const sizeChoice = choiceItems.find(ci => ci.id === parseInt(sizeChoiceId));
    return sizeChoice?.name;
  };

  // Determine which choice groups should be visible based on conditional display logic
  const getVisibleChoiceGroups = () => {
    if (itemChoiceGroups.length === 0) return [];

    const selectedSize = getSelectedSize();

    // Check if this item has any size-based groups at all
    const hasSizeGroup = itemChoiceGroups.some(g =>
      g.name === 'Size' || g.name === 'Calzone Size' || g.name === 'Stromboli Size' ||
      g.name === 'Traditional Pizza Size' || g.name === 'Specialty Gourmet Pizza Size' ||
      g.name === 'Wing Flavors' || g.name === 'Garden Salad Size'
    );

    // Filter groups based on size selection
    let filteredGroups = itemChoiceGroups.filter(group => {
      const groupName = group.name;

      // Always show primary selection groups (size/flavor)
      if (isPrimaryChoiceGroup(groupName)) return true;

      // If this item doesn't have a size group, show all options immediately
      if (!hasSizeGroup) return true;

      // If no size selected yet, don't show topping groups
      if (!selectedSize) return false;

      // Show topping groups that match the selected size
      // Calzone/Stromboli sizes
      if (groupName.includes('Small') && selectedSize === 'Small') return true;
      if (groupName.includes('Medium') && selectedSize === 'Medium') return true;
      if (groupName.includes('Large') && selectedSize === 'Large') return true;

      // Traditional Pizza sizes
      if (groupName.includes('(10")') && selectedSize === '10"') return true;
      if (groupName.includes('(14")') && selectedSize === '14"') return true;
      if (groupName.includes('(16")') && selectedSize === '16"') return true;
      if (groupName.includes('(Sicilian)') && selectedSize === 'Sicilian') return true;

      // Show groups that don't have size specification
      if (!groupName.includes('Small') &&
          !groupName.includes('Medium') &&
          !groupName.includes('Large') &&
          !groupName.includes('(10")') &&
          !groupName.includes('(14")') &&
          !groupName.includes('(16")') &&
          !groupName.includes('(Sicilian)')) {
        return true;
      }

      return false;
    });

    // Sort groups: size groups always first, then by priority
    const sortedGroups = filteredGroups.sort((a, b) => {
      const aIsSize = a.name === 'Size' || a.name === 'Calzone Size' || a.name === 'Stromboli Size' ||
                      a.name === 'Traditional Pizza Size' || a.name === 'Specialty Gourmet Pizza Size';
      const bIsSize = b.name === 'Size' || b.name === 'Calzone Size' || b.name === 'Stromboli Size' ||
                      b.name === 'Traditional Pizza Size' || b.name === 'Specialty Gourmet Pizza Size';

      // Size groups always come first
      if (aIsSize && !bIsSize) return -1;
      if (!aIsSize && bIsSize) return 1;

      // Otherwise sort by priority
      return (a.priority || 0) - (b.priority || 0);
    });

    // Group by priority
    const groupsByPriority = sortedGroups.reduce((acc, group) => {
      const priority = group.priority || 0;
      if (!acc[priority]) acc[priority] = [];
      acc[priority].push(group);
      return acc;
    }, {} as { [key: number]: any[] });

    const priorities = Object.keys(groupsByPriority).map(p => parseInt(p)).sort((a, b) => a - b);
    let visibleGroups: any[] = [];

    // If item doesn't have a size group, show all priority groups immediately
    if (!hasSizeGroup) {
      return sortedGroups;
    }

    // Always show the first priority group (usually sizes)
    if (priorities.length > 0) {
      visibleGroups = [...groupsByPriority[priorities[0]]];
    }

    // Show subsequent priority groups only if the previous priority has selections
    for (let i = 1; i < priorities.length; i++) {
      const previousPriority = priorities[i - 1];
      const previousGroups = groupsByPriority[previousPriority];

      // Check if any group in the previous priority has selections
      const hasPreviousSelections = previousGroups.some(group =>
        selectedChoices[group.id] && selectedChoices[group.id].length > 0
      );

      if (hasPreviousSelections) {
        visibleGroups.push(...groupsByPriority[priorities[i]]);
      } else {
        break; // Stop here, don't show further priorities
      }
    }

    return visibleGroups;
  };

  const visibleChoiceGroups = getVisibleChoiceGroups();

  // Calculate total price with selections and dynamic pricing
  const calculateTotalPrice = () => {
    let total = 0;
    let hasSizeSelection = false;

    Object.entries(selectedChoices).forEach(([groupId, selections]) => {
      const group = itemChoiceGroups.find(g => g.id === parseInt(groupId));
      const isSizeGroup = group?.name === 'Size' ||
                          group?.name === 'Calzone Size' ||
                          group?.name === 'Stromboli Size' ||
                          group?.name === 'Traditional Pizza Size' ||
                          group?.name === 'Specialty Gourmet Pizza Size' ||
                          group?.name === 'Garden Salad Size';

      selections.forEach(selectionId => {
        const choiceItem = choiceItems.find(ci => ci.id === parseInt(selectionId));
        if (choiceItem) {
          // Use dynamic price if available, otherwise fall back to base price
          const dynamicPrice = dynamicPrices[selectionId];
          const price = dynamicPrice !== undefined ? dynamicPrice : parseFloat(choiceItem.price) || 0;

          // For size selections, this IS the base price (don't add basePrice separately)
          if (isSizeGroup) {
            total += price;
            hasSizeSelection = true;
          } else {
            // For toppings, add to price
            total += price;
          }
        }
      });
    });

    // If no size was selected, use the item's base price
    if (!hasSizeSelection) {
      total += parseFloat(item.basePrice) || 0;
    }

    return total;
  };

  // Fetch dynamic prices based on current selections
  const fetchDynamicPrices = async (selectedChoiceIds: string[]) => {
    try {
      const response = await fetch('/.netlify/functions/choice-pricing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          choiceItemIds: choiceItems.map(ci => ci.id),
          selectedChoiceItems: selectedChoiceIds.map(id => parseInt(id))
        })
      });

      if (response.ok) {
        const data = await response.json();
        setDynamicPrices(data.prices || {});
      }
    } catch (error) {
      console.error('Error fetching dynamic prices:', error);
    }
  };

  // Handle choice selection with dynamic pricing
  const handleChoiceSelection = (groupId: string, itemId: string, isRadio: boolean) => {
    setSelectedChoices(prev => {
      const newChoices = isRadio
        ? { ...prev, [groupId]: [itemId] }
        : {
            ...prev,
            [groupId]: (() => {
              const currentSelections = prev[groupId] || [];
              const isSelected = currentSelections.includes(itemId);
              return isSelected
                ? currentSelections.filter(id => id !== itemId)
                : [...currentSelections, itemId];
            })()
          };

      // Fetch dynamic prices after selection change
      const allSelected = Object.values(newChoices).flat();
      if (allSelected.length > 0) {
        fetchDynamicPrices(allSelected);
      }

      // If this is a size selection, collapse the size section
      const group = itemChoiceGroups.find(g => g.id === parseInt(groupId));
      const isSizeGroup = group?.name === 'Size' ||
                          group?.name === 'Calzone Size' ||
                          group?.name === 'Stromboli Size' ||
                          group?.name === 'Traditional Pizza Size' ||
                          group?.name === 'Specialty Gourmet Pizza Size' ||
                          group?.name === 'Wing Flavors';
      console.log('🔍 [Choice Selection] Group found for collapse check:', {
        group,
        groupId: parseInt(groupId),
        priority: group?.priority,
        isRadio,
        isSizeGroup,
        shouldCollapse: group && isSizeGroup && isRadio
      });

      if (group && isSizeGroup && isRadio) {
        console.log('🔍 [Choice Selection] Setting size collapsed to true');
        setSizeCollapsed(true);
      }

      return newChoices;
    });
  };

  // Simple add to cart without choices
  const handleSimpleAddToCart = (event: React.MouseEvent<HTMLButtonElement>) => {
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

    // Special validation for primary group selection (size/flavor)
    const primaryGroup = itemChoiceGroups.find(group =>
      group.name === 'Size' ||
      group.name === 'Calzone Size' ||
      group.name === 'Stromboli Size' ||
      group.name === 'Traditional Pizza Size' ||
      group.name === 'Specialty Gourmet Pizza Size' ||
      group.name === 'Wing Flavors'
    );
    if (primaryGroup && (!selectedChoices[primaryGroup.id] || selectedChoices[primaryGroup.id].length === 0)) {
      alert('Please select a size/flavor before adding to cart.');
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
            // Use dynamic price if available, otherwise fall back to base price
            const dynamicPrice = dynamicPrices[selectionId];
            const price = dynamicPrice !== undefined ? dynamicPrice : parseFloat(choiceItem.price) || 0;

            options.push({
              groupName: group.name,
              itemName: choiceItem.name,
              price: price
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

      // Trigger pizza animation from the original trigger element
      if (triggerElement) {
        triggerPizzaAnimation(triggerElement);
      }

      setIsDialogOpen(false);
      setSelectedChoices({});
      setQuantity(1);
      setTriggerElement(null);
      setSizeCollapsed(false);
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
                <Button
                  className="bg-[#d73a31] hover:bg-[#c73128] text-white"
                  onClick={(event) => setTriggerElement(event.currentTarget)}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  See Options
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-gray-50">
                <DialogHeader className="pb-6 border-b border-gray-200">
                  <DialogTitle className="text-2xl font-bold text-center text-gray-800">
                    Customize Your {item.name}
                  </DialogTitle>
                  <p className="text-center text-gray-600 mt-2">
                    Make it exactly how you like it!
                  </p>
                </DialogHeader>

                <div className="space-y-8 py-6">
                  {visibleChoiceGroups.map((group, index) => {
                    const isPrimaryGroup = group.name === 'Size' ||
                                           group.name === 'Calzone Size' ||
                                           group.name === 'Stromboli Size' ||
                                           group.name === 'Traditional Pizza Size' ||
                                           group.name === 'Specialty Gourmet Pizza Size' ||
                                           group.name === 'Wing Flavors' ||
                                           group.name === 'Garden Salad Size' ||
                                           group.name === 'Salad Dressing' ||
                                           group.name === 'Dressing Style';
                    const isSizeBasedGroup = group.name === 'Size' ||
                                            group.name === 'Calzone Size' ||
                                            group.name === 'Stromboli Size' ||
                                            group.name === 'Traditional Pizza Size' ||
                                            group.name === 'Specialty Gourmet Pizza Size' ||
                                            group.name === 'Wing Flavors' ||
                                            group.name === 'Garden Salad Size';
                    const isSelected = selectedChoices[group.id] && selectedChoices[group.id].length > 0;

                    return (
                    <div key={group.id} className={`space-y-4 p-4 rounded-xl border-2 transition-all ${
                      isPrimaryGroup
                        ? isSelected
                          ? 'border-[#d73a31] bg-red-50/50 shadow-lg'
                          : 'border-red-200 bg-red-50/30 shadow-md animate-pulse'
                        : isSelected
                          ? 'border-green-300 bg-green-50/50 shadow-md'
                          : 'border-gray-200 bg-white shadow-sm hover:shadow-md'
                    }`}>
                      <div className="flex justify-between items-center">
                        <Label className={`text-lg font-bold flex items-center gap-2 ${
                          isPrimaryGroup ? 'text-[#d73a31]' : 'text-gray-800'
                        }`}>
                          {isPrimaryGroup && <span className="text-2xl">🍕</span>}
                          {!isPrimaryGroup && group.name.toLowerCase().includes('topping') && <span className="text-xl">🧀</span>}
                          {group.name}
                          {group.isRequired && <span className="text-red-500 ml-1 text-xl">*</span>}
                          {isSizeBasedGroup && !isSelected && <span className="text-sm font-normal text-red-500 ml-2 animate-bounce">(Choose Size First!)</span>}
                        </Label>
                        {group.maxSelections && group.maxSelections > 1 && (
                          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            Max {group.maxSelections}
                          </span>
                        )}
                      </div>

                      {group.maxSelections === 1 ? (
                        <>
                          {/* Show collapsed view if size is selected and collapsed */}
                          {isPrimaryGroup && sizeCollapsed && selectedChoices[group.id] && selectedChoices[group.id].length > 0 ? (
                            <div className="space-y-3">
                              {(() => {
                                const selectedItemId = selectedChoices[group.id][0];
                                const selectedItem = group.items.find(item => item.id.toString() === selectedItemId);
                                if (!selectedItem) return null;

                                const dynamicPrice = dynamicPrices[selectedItem.id];
                                const price = dynamicPrice !== undefined ? dynamicPrice : parseFloat(selectedItem.price) || 0;

                                return (
                                  <div className="flex items-center justify-between p-4 rounded-lg border-2 border-[#d73a31] bg-red-50 shadow-md">
                                    <div className="flex items-center space-x-3">
                                      <div className="w-5 h-5 rounded-full bg-[#d73a31] flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-white"></div>
                                      </div>
                                      <div className="flex-1">
                                        <Label className="font-medium text-[#d73a31] cursor-pointer">
                                          {selectedItem.name}
                                        </Label>
                                        {selectedItem.description && (
                                          <p className="text-sm text-gray-600 mt-1">{selectedItem.description}</p>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      {price > 0 && (
                                        <Badge className="bg-[#d73a31] text-white text-sm font-bold">
                                          {isPrimaryGroup ? '$' : '+$'}{formatPrice(price)}
                                        </Badge>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSizeCollapsed(false)}
                                        className="text-[#d73a31] hover:bg-red-100 text-sm font-medium"
                                      >
                                        Edit Size
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          ) : (
                            <RadioGroup
                              value={selectedChoices[group.id]?.[0] || ""}
                              className="space-y-3"
                            >
                              {group.items.map(choiceItem => {
                                const dynamicPrice = dynamicPrices[choiceItem.id];
                                const price = dynamicPrice !== undefined ? dynamicPrice : parseFloat(choiceItem.price) || 0;
                                const isItemSelected = selectedChoices[group.id]?.includes(choiceItem.id.toString());

                                return (
                                <div
                                  key={choiceItem.id}
                                  className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                                    isItemSelected
                                      ? 'border-[#d73a31] bg-red-50 shadow-md'
                                      : 'border-gray-200 bg-white hover:border-gray-300'
                                  }`}
                                  onClick={() => handleChoiceSelection(group.id.toString(), choiceItem.id.toString(), true)}
                                >
                                  <div className="flex items-center space-x-3">
                                    <RadioGroupItem value={choiceItem.id.toString()} className="data-[state=checked]:bg-[#d73a31] data-[state=checked]:border-[#d73a31] pointer-events-none" />
                                    <div className="flex-1">
                                      <Label className={`font-medium cursor-pointer ${
                                        isItemSelected ? 'text-[#d73a31]' : 'text-gray-700'
                                      }`}>
                                        {choiceItem.name}
                                      </Label>
                                      {choiceItem.description && (
                                        <p className="text-sm text-gray-500 mt-1">{choiceItem.description}</p>
                                      )}
                                    </div>
                                  </div>
                                  {price > 0 && (
                                    <Badge className={`text-sm font-bold ${
                                      isItemSelected
                                        ? 'bg-[#d73a31] text-white'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}>
                                      {isPrimaryGroup ? '$' : '+$'}{formatPrice(price)}
                                    </Badge>
                                  )}
                                </div>
                                );
                              })}
                            </RadioGroup>
                          )}
                        </>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {group.items.map(choiceItem => {
                            const dynamicPrice = dynamicPrices[choiceItem.id];
                            const price = dynamicPrice !== undefined ? dynamicPrice : parseFloat(choiceItem.price) || 0;
                            const isItemSelected = selectedChoices[group.id]?.includes(choiceItem.id.toString());

                            return (
                            <div
                              key={choiceItem.id}
                              className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md ${
                                isItemSelected
                                  ? 'border-green-400 bg-green-50 shadow-md'
                                  : 'border-gray-200 bg-white hover:border-gray-300'
                              }`}
                              onClick={() => handleChoiceSelection(group.id.toString(), choiceItem.id.toString(), false)}
                            >
                              <div className="flex items-center space-x-3">
                                <Checkbox
                                  checked={isItemSelected}
                                  className="data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500 pointer-events-none"
                                />
                                <div className="flex-1">
                                  <Label className={`font-medium cursor-pointer ${
                                    isItemSelected ? 'text-green-700' : 'text-gray-700'
                                  }`}>
                                    {choiceItem.name}
                                  </Label>
                                  {choiceItem.description && (
                                    <p className="text-sm text-gray-500 mt-1">{choiceItem.description}</p>
                                  )}
                                </div>
                              </div>
                              {price > 0 && (
                                <Badge className={`text-sm font-bold ${
                                  isItemSelected
                                    ? 'bg-green-500 text-white'
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {isPrimaryGroup ? '$' : '+$'}{formatPrice(price)}
                                </Badge>
                              )}
                            </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    );
                  })}

                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 rounded-xl border-2 border-gray-200 mt-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-gray-700">Quantity:</span>
                        <div className="flex items-center space-x-2 bg-white rounded-lg border border-gray-300">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            disabled={quantity <= 1}
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-semibold">{quantity}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setQuantity(quantity + 1)}
                            className="h-8 w-8 p-0 hover:bg-gray-100"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Total Price</p>
                        <p className="text-2xl font-bold text-[#d73a31]">
                          ${formatPrice(calculateTotalPrice() * quantity)}
                        </p>
                      </div>
                    </div>

                    {(() => {
                      const sizeGroup = itemChoiceGroups.find(group =>
                        group.name === 'Size' ||
                        group.name === 'Calzone Size' ||
                        group.name === 'Stromboli Size' ||
                        group.name === 'Traditional Pizza Size' ||
                        group.name === 'Specialty Gourmet Pizza Size' ||
                        group.name === 'Wing Flavors' ||
                        group.name === 'Garden Salad Size'
                      );
                      const hasSizeSelected = sizeGroup && selectedChoices[sizeGroup.id] && selectedChoices[sizeGroup.id].length > 0;
                      const canAddToCart = !sizeGroup || hasSizeSelected; // Can add if no size group OR size is selected

                      console.log('🔍 [Add to Cart Button] Debug info:', {
                        sizeGroup,
                        selectedChoices,
                        sizeGroupId: sizeGroup?.id,
                        sizeGroupSelections: sizeGroup ? selectedChoices[sizeGroup.id] : 'no size group',
                        hasSizeSelected,
                        canAddToCart,
                        sizeCollapsed
                      });

                      return (
                        <Button
                          className={`w-full py-4 text-lg font-bold transition-all transform hover:scale-105 ${
                            canAddToCart
                              ? 'bg-[#d73a31] hover:bg-[#c73128] text-white shadow-lg'
                              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          }`}
                          onClick={handleAddToCartWithChoices}
                          disabled={!canAddToCart}
                        >
                          {canAddToCart ? (
                            <>
                              <ShoppingCart className="h-5 w-5 mr-2" />
                              Add to Cart - ${formatPrice(calculateTotalPrice() * quantity)}
                            </>
                          ) : (
                            'Please Select a Size First'
                          )}
                        </Button>
                      );
                    })()}
                  </div>
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