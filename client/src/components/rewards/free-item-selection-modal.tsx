import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pizza, X, Check } from "lucide-react";

interface FreeItemSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (menuItem: any) => void;
  category: string;
  menuItems: any[];
}

export const FreeItemSelectionModal: React.FC<FreeItemSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  category,
  menuItems
}) => {
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const handleClose = () => {
    if (!selectedItem) {
      // Warn user if they haven't selected an item
      const confirmClose = window.confirm(
        "You haven't selected a free item yet!\n\nYour reward voucher is still active - you can select your free item anytime from the 'My Vouchers' tab on the Rewards page.\n\nAre you sure you want to close?"
      );
      if (!confirmClose) return;
    }
    setSelectedItem(null);
    onClose();
  };

  // Filter menu items by category
  const filteredItems = menuItems.filter(item => item.category === category);

  const handleSelect = () => {
    if (selectedItem) {
      onSelect(selectedItem);
      setSelectedItem(null);
      onClose();
    }
  };

  const formatPrice = (price: number | string) => {
    const priceNum = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(priceNum)) return "0.00";
    return priceNum.toFixed(2);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Pizza className="h-6 w-6 text-[#d73a31]" />
            Choose Your Free Item
          </DialogTitle>
          <DialogDescription className="text-base">
            Select one free item from the <strong>{category}</strong> category
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-3">
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <Pizza className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No items available in this category</p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedItem?.id === item.id
                      ? 'border-2 border-[#d73a31] bg-red-50 shadow-lg'
                      : 'border border-gray-200 hover:border-[#d73a31] hover:shadow-md'
                  }`}
                  onClick={() => setSelectedItem(item)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        {/* Item Image */}
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                            <Pizza className="h-8 w-8 text-gray-400" />
                          </div>
                        )}

                        {/* Item Details */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>
                              {item.description && (
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  FREE
                                </Badge>
                                <span className="text-xs text-gray-500 line-through">
                                  ${formatPrice(item.base_price)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Selection Indicator */}
                      <div className="ml-4">
                        {selectedItem?.id === item.id ? (
                          <div className="w-8 h-8 bg-[#d73a31] rounded-full flex items-center justify-center">
                            <Check className="h-5 w-5 text-white" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 border-2 border-gray-300 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSelect}
            disabled={!selectedItem}
            className="bg-[#d73a31] hover:bg-[#c73128] disabled:bg-gray-300"
          >
            <Check className="h-4 w-4 mr-2" />
            Add Free Item to Cart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
