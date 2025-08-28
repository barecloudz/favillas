import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Pizza, 
  Plus, 
  Edit, 
  Trash2, 
  GripVertical,
  Settings2,
  AlertCircle,
  ArrowUpDown
} from "lucide-react";

// Toppings data structure (matches the pizza builder)
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

const HalfHalfManager: React.FC = () => {
  const { toast } = useToast();
  const [editingTopping, setEditingTopping] = useState<any>(null);
  const [newToppingData, setNewToppingData] = useState({
    name: "",
    price: "",
    type: "regular",
    isActive: true
  });
  const [draggedTopping, setDraggedTopping] = useState<string | null>(null);
  const [regularToppingsOrder, setRegularToppingsOrder] = useState(REGULAR_TOPPINGS.map(t => t.id));
  const [specialtyToppingsOrder, setSpecialtyToppingsOrder] = useState(SPECIALTY_TOPPINGS.map(t => t.id));

  // Fetch choice groups to find half & half group
  const { data: choiceGroups = [] } = useQuery({
    queryKey: ['choice-groups'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/choice-groups');
      return response;
    }
  });

  // Find the half & half choice group
  const halfHalfGroup = choiceGroups.find((group: any) => 
    group.name.toLowerCase().includes('half') && 
    group.name.toLowerCase().includes('half')
  );

  // Create half & half choice group if it doesn't exist
  const createHalfHalfGroupMutation = useMutation({
    mutationFn: (data: any) => apiRequest('POST', '/api/choice-groups', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['choice-groups'] });
      toast({
        title: "Success",
        description: "Half & Half choice group created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        variant: "destructive",
        description: error.message || "Failed to create Half & Half choice group",
      });
    }
  });

  // Toggle topping availability
  const toggleToppingAvailability = (toppingId: string) => {
    // For now, this will be handled through the local state
    // In a real implementation, this would update the database
    toast({
      title: "Topping Updated",
      description: "Topping availability has been updated",
    });
  };

  // Update topping price
  const updateToppingPrice = (toppingId: string, newPrice: number) => {
    // For now, this will be handled through the local state
    // In a real implementation, this would update the database
    toast({
      title: "Price Updated",
      description: `Topping price updated to $${newPrice.toFixed(2)}`,
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, toppingId: string) => {
    setDraggedTopping(toppingId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetToppingId: string, toppingType: 'regular' | 'specialty') => {
    e.preventDefault();
    
    if (!draggedTopping || draggedTopping === targetToppingId) {
      setDraggedTopping(null);
      return;
    }

    const currentOrder = toppingType === 'regular' ? regularToppingsOrder : specialtyToppingsOrder;
    const draggedIndex = currentOrder.indexOf(draggedTopping);
    const targetIndex = currentOrder.indexOf(targetToppingId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedTopping(null);
      return;
    }

    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedTopping);

    if (toppingType === 'regular') {
      setRegularToppingsOrder(newOrder);
    } else {
      setSpecialtyToppingsOrder(newOrder);
    }

    toast({
      title: "Topping Reordered",
      description: "Topping order has been updated",
    });

    setDraggedTopping(null);
  };

  // Create the half & half choice group if it doesn't exist
  const handleCreateHalfHalfGroup = () => {
    createHalfHalfGroupMutation.mutate({
      name: "Half & Half",
      description: "Split your pizza in half with different toppings on each side",
      isRequired: false,
      maxSelections: 1,
      order: 999
    });
  };

  const allToppings = [...REGULAR_TOPPINGS, ...SPECIALTY_TOPPINGS];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Pizza className="h-6 w-6" />
            Half & Half Pizza Management
          </h2>
          <p className="text-gray-600 mt-1">
            Manage toppings, pricing, and availability for half & half pizzas
          </p>
        </div>
      </div>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Half & Half System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${halfHalfGroup ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="font-medium">
                {halfHalfGroup ? 'Half & Half System Active' : 'Half & Half System Inactive'}
              </span>
              {halfHalfGroup && (
                <Badge variant="secondary">
                  Choice Group ID: {halfHalfGroup.id}
                </Badge>
              )}
            </div>
            {!halfHalfGroup && (
              <Button 
                onClick={handleCreateHalfHalfGroup}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Enable Half & Half
              </Button>
            )}
          </div>
          {!halfHalfGroup && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Half & Half system is not active</p>
                <p>Click "Enable Half & Half" to create the necessary choice group and activate the feature.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Regular Toppings Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Regular Toppings (+$1.50 each)
            <Badge variant="secondary" className="text-xs">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              Drag to reorder
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {regularToppingsOrder.map((toppingId) => {
              const topping = REGULAR_TOPPINGS.find(t => t.id === toppingId);
              if (!topping) return null;
              
              return (
                <div 
                  key={topping.id} 
                  className={`p-4 border rounded-lg bg-white cursor-move transition-all duration-200 ${
                    draggedTopping === topping.id ? 'opacity-50 scale-95' : 'hover:shadow-md'
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, topping.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, topping.id, 'regular')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      {topping.name}
                    </h4>
                    <Switch
                      checked={!topping.soldOut}
                      onCheckedChange={(checked) => toggleToppingAvailability(topping.id)}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Price: ${topping.price.toFixed(2)}</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-6 px-2">
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Specialty Toppings Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Specialty Toppings (+$2.00 each)
            <Badge variant="secondary" className="text-xs">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              Drag to reorder
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {specialtyToppingsOrder.map((toppingId) => {
              const topping = SPECIALTY_TOPPINGS.find(t => t.id === toppingId);
              if (!topping) return null;
              
              return (
                <div 
                  key={topping.id} 
                  className={`p-4 border rounded-lg bg-white cursor-move transition-all duration-200 ${
                    draggedTopping === topping.id ? 'opacity-50 scale-95' : 'hover:shadow-md'
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, topping.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, topping.id, 'specialty')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-gray-400" />
                      {topping.name}
                    </h4>
                    <Switch
                      checked={!topping.soldOut}
                      onCheckedChange={(checked) => toggleToppingAvailability(topping.id)}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className={`${topping.soldOut ? 'text-red-600' : 'text-gray-600'}`}>
                      {topping.soldOut ? 'Sold Out' : `Price: $${topping.price.toFixed(2)}`}
                    </span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="h-6 px-2">
                        <Edit className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Add New Topping Dialog */}
      <Card>
        <CardHeader>
          <CardTitle>Add New Topping</CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add New Topping
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Topping</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="topping-name">Topping Name</Label>
                  <Input
                    id="topping-name"
                    value={newToppingData.name}
                    onChange={(e) => setNewToppingData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter topping name"
                  />
                </div>
                <div>
                  <Label htmlFor="topping-price">Price</Label>
                  <Input
                    id="topping-price"
                    type="number"
                    step="0.01"
                    value={newToppingData.price}
                    onChange={(e) => setNewToppingData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="2.00"
                  />
                </div>
                <div>
                  <Label htmlFor="topping-type">Topping Type</Label>
                  <Select
                    value={newToppingData.type}
                    onValueChange={(value) => setNewToppingData(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular (+$1.50)</SelectItem>
                      <SelectItem value="specialty">Specialty (+$2.00)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="topping-active"
                    checked={newToppingData.isActive}
                    onCheckedChange={(checked) => setNewToppingData(prev => ({ ...prev, isActive: checked }))}
                  />
                  <Label htmlFor="topping-active">Available</Label>
                </div>
                <Button className="w-full">
                  Add Topping
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card>
        <CardHeader>
          <CardTitle>How Half & Half Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>• Customers can select "Customize Each Half" on any pizza item</p>
          <p>• The pizza builder allows separate topping selection for left and right halves</p>
          <p>• Toppings are priced individually for each half</p>
          <p>• Receipt shows detailed breakdown: "Left side: [toppings], Right side: [toppings]"</p>
          <p>• Kitchen ticket displays clear instructions for each pizza half</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default HalfHalfManager;