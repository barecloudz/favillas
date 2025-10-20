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
  'Tuna Salad Dressing', 'Grilled Chicken Salad Dressing',
  'Garlic Roll Size', 'Garlic Rolls',
  'Sausage or Meatballs', 'Meat Size', 'Sausage Size', 'Meatball Size'
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
  isOrderingPaused?: boolean;
}

const MenuItemWithChoices: React.FC<MenuItemProps> = ({
  item,
  choiceGroups = [],
  choiceItems = [],
  menuItemChoiceGroups = [],
  isOrderingPaused = false
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

  // Get choice groups for this menu item, sorted by order field
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
    console.log(`🔍 [MenuItemWithChoices] Full assignment details:`, itemChoiceGroupIds.map(micg => ({
      id: micg.id,
      menu_item_id: micg.menu_item_id,
      choice_group_id: micg.choice_group_id,
      choice_group_name: micg.choice_group_name,
      order: micg.order,
      is_required: micg.is_required
    })));

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
        isRequired: micg.is_required,
        displayOrder: micg.order || 0  // Use the order from menu_item_choice_groups
      };
    }).filter(Boolean).sort((a, b) => {
      // Special sorting for salad dressing groups
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      // If this is a salad item, ensure dressing order is: free dressing first, extra dressing last
      if (item.category?.toLowerCase().includes('salad') || item.name.toLowerCase().includes('salad')) {
        const aIsDressing = aName.includes('dressing') && !aName.includes('extra');
        const bIsDressing = bName.includes('dressing') && !bName.includes('extra');
        const aIsExtraDressing = aName.includes('extra') && aName.includes('dressing');
        const bIsExtraDressing = bName.includes('extra') && bName.includes('dressing');

        // Free dressing comes first
        if (aIsDressing && !bIsDressing) return -1;
        if (!aIsDressing && bIsDressing) return 1;

        // Extra dressing comes last
        if (aIsExtraDressing && !bIsExtraDressing) return 1;
        if (!aIsExtraDressing && bIsExtraDressing) return -1;
      }

      // Default sort by displayOrder
      return (a.displayOrder || 0) - (b.displayOrder || 0);
    });

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

  // Progressive reveal: require size selection first for calzones/stromboli/specialty pizzas/traditional pizzas/salads, then filter toppings by size
  const getVisibleChoiceGroups = () => {
    // Check for Wing Flavors group - it should ALWAYS appear first
    const wingFlavorGroup = itemChoiceGroups.find(g => g.name === 'Wing Flavors');

    // Check if there's a size group that requires selection first
    const sizeGroup = itemChoiceGroups.find(g =>
      g.name === 'Calzone Size' ||
      g.name === 'Stromboli Size' ||
      g.name === 'Specialty Gourmet Pizza Size' ||
      g.name === 'Traditional Pizza Size' ||
      g.name === 'Garden Salad Size' ||
      g.name === 'Size'  // Also handle generic "Size" group
    );

    // If there's a wing flavor group and it hasn't been selected yet, only show the wing flavor group
    if (wingFlavorGroup && (!selectedChoices[wingFlavorGroup.id] || selectedChoices[wingFlavorGroup.id].length === 0)) {
      return [wingFlavorGroup];
    }

    // If there's a size group and it hasn't been selected yet, only show the size group
    if (sizeGroup && (!selectedChoices[sizeGroup.id] || selectedChoices[sizeGroup.id].length === 0)) {
      return [sizeGroup];
    }

    // If size is selected for calzone/stromboli/pizza, filter topping groups by size
    if (sizeGroup && selectedChoices[sizeGroup.id] && selectedChoices[sizeGroup.id].length > 0) {
      const selectedSizeId = selectedChoices[sizeGroup.id][0];
      const selectedSizeChoice = choiceItems.find(ci => ci.id === parseInt(selectedSizeId));
      const selectedSizeName = selectedSizeChoice?.name || '';

      console.log('🔍 [Size Filter] Selected size:', selectedSizeName);

      // Filter groups to show only size group and toppings that match the selected size
      const filteredGroups = itemChoiceGroups.filter(g => {
        // Always show the size group
        if (g.id === sizeGroup.id) return true;

        // For topping groups, check if they match the selected size
        const groupName = g.name.toLowerCase();
        const sizeName = selectedSizeName.toLowerCase();

        // Check if this is a topping group
        if (groupName.includes('topping')) {
          // Match size in group name with selected size
          // Calzone/Stromboli sizes
          if (sizeName.includes('small') && groupName.includes('small')) return true;
          if (sizeName.includes('medium') && groupName.includes('medium')) return true;
          if (sizeName.includes('large') && groupName.includes('large')) return true;

          // Traditional Pizza sizes
          if (sizeName.includes('personal') && groupName.includes('personal')) return true;
          if (sizeName.includes('10') && groupName.includes('10')) return true;
          if (sizeName.includes('12') && groupName.includes('12')) return true;
          if (sizeName.includes('14') && groupName.includes('14')) return true;
          if (sizeName.includes('16') && groupName.includes('16')) return true;
          if (sizeName.toLowerCase().includes('sicilian') && groupName.includes('sicilian')) return true;

          // Don't show toppings for other sizes
          return false;
        }

        // Show all non-topping groups
        return true;
      });

      console.log('🔍 [Size Filter] Filtered groups:', filteredGroups.map(g => g.name));
      return filteredGroups;
    }

    // Otherwise, show all groups in the order set by admin
    return itemChoiceGroups;
  };

  const visibleChoiceGroups = getVisibleChoiceGroups();

  // Calculate total price with selections and dynamic pricing
  const calculateTotalPrice = () => {
    let total = 0;
    let hasPrimarySelection = false;

    Object.entries(selectedChoices).forEach(([groupId, selections]) => {
      const group = itemChoiceGroups.find(g => g.id === parseInt(groupId));
      const isPrimaryGroup = group?.name ? isPrimaryChoiceGroup(group.name) : false;

      selections.forEach(selectionId => {
        const choiceItem = choiceItems.find(ci => ci.id === parseInt(selectionId));
        if (choiceItem) {
          // Use dynamic price if available, otherwise fall back to base price
          const dynamicPrice = dynamicPrices[selectionId];
          const price = dynamicPrice !== undefined ? dynamicPrice : parseFloat(choiceItem.price) || 0;

          // For primary selections (size, flavors, etc.), this IS the base price (don't add basePrice separately)
          if (isPrimaryGroup) {
            total += price;
            hasPrimarySelection = true;
          } else {
            // For toppings/add-ons, add to price
            total += price;
          }
        }
      });
    });

    // If no primary selection was made, use the item's base price
    if (!hasPrimarySelection) {
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
                  className="bg-[#d73a31] hover:bg-[#c73128] text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={(event) => setTriggerElement(event.currentTarget)}
                  disabled={isOrderingPaused}
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  {isOrderingPaused ? 'Unavailable' : 'See Options'}
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
                    const isPrimary = isPrimaryChoiceGroup(group.name);
                    const isSizeBasedGroup = group.name === 'Size' ||
                                            group.name === 'Calzone Size' ||
                                            group.name === 'Stromboli Size' ||
                                            group.name === 'Traditional Pizza Size' ||
                                            group.name === 'Specialty Gourmet Pizza Size' ||
                                            group.name === 'Wing Flavors' ||
                                            group.name === 'Garden Salad Size' ||
                                            group.name === 'Garlic Roll Size' ||
                                            group.name === 'Garlic Rolls' ||
                                            group.name === 'Sausage or Meatballs';
                    const isSelected = selectedChoices[group.id] && selectedChoices[group.id].length > 0;

                    return (
                    <div key={group.id} className={`space-y-4 p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-[#d73a31] bg-red-50/50 shadow-lg'
                        : 'border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-gray-300'
                    }`}>
                      <div className="flex justify-between items-center">
                        <Label className="text-lg font-bold flex items-center gap-2 text-gray-800">
                          {index + 1}.
                          {group.name}
                          {group.isRequired && <span className="text-red-500 ml-1 text-sm">(Required)</span>}
                        </Label>
                        {group.maxSelections && group.maxSelections > 1 && (
                          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                            Choose up to {group.maxSelections}
                          </span>
                        )}
                      </div>

                      {group.maxSelections === 1 ? (
                        <>
                          {/* Show collapsed view if size is selected and collapsed */}
                          {isPrimary && sizeCollapsed && selectedChoices[group.id] && selectedChoices[group.id].length > 0 ? (
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
                                          {isPrimary ? '$' : '+$'}{formatPrice(price)}
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
                                      {isPrimary ? '$' : '+$'}{formatPrice(price)}
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
                                  {isPrimary ? '$' : '+$'}{formatPrice(price)}
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
              className="bg-[#d73a31] hover:bg-[#c73128] text-white disabled:bg-gray-400 disabled:cursor-not-allowed"
              onClick={handleSimpleAddToCart}
              disabled={isOrderingPaused}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {isOrderingPaused ? 'Unavailable' : 'Add to Cart'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MenuItemWithChoices;