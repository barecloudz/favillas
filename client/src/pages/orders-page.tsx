import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/use-cart";
import { useWebSocket } from "@/hooks/use-websocket";
import Footer from "@/components/layout/footer";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { 
  Search,
  Clock, 
  MapPin, 
  Phone, 
  Pizza, 
  Receipt, 
  Share2, 
  Download,
  Star,
  Gift,
  Truck,
  Store,
  Calendar,
  DollarSign,
  Package,
  CheckCircle,
  AlertCircle,
  Loader2,
  Home
} from "lucide-react";

const OrdersPage = () => {
  const { user } = useAuth();
  const { addToCart } = useCart();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Initialize WebSocket for real-time updates
  useWebSocket();

  // Fetch user's orders
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["/api/orders"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/orders", null, {
        credentials: "include"
      });
      return response.json();
    },
    enabled: !!user,
  });

  // Listen for real-time order status updates
  useEffect(() => {
    const handleOrderStatusChange = (event: CustomEvent) => {
      const { orderId, status, order } = event.detail;
      
      // Invalidate and refetch orders to get the latest data
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      
      // Also invalidate the specific order if we're viewing it
      queryClient.invalidateQueries({ queryKey: ["/api/orders", orderId] });
    };

    window.addEventListener('orderStatusChanged', handleOrderStatusChange as EventListener);
    
    return () => {
      window.removeEventListener('orderStatusChanged', handleOrderStatusChange as EventListener);
    };
  }, [queryClient]);

  // Filter orders based on search and status
  const filteredOrders = orders.filter((order: any) => {
    const matchesSearch = 
      order.id.toString().includes(searchTerm) ||
      order.items?.some((item: any) => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return "$0.00";
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "processing": return "bg-blue-100 text-blue-800";
      case "ready": return "bg-green-100 text-green-800";
      case "completed": return "bg-gray-100 text-gray-800";
      case "cancelled": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "processing": return <Package className="h-4 w-4" />;
      case "ready": return <CheckCircle className="h-4 w-4" />;
      case "completed": return <CheckCircle className="h-4 w-4" />;
      case "cancelled": return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleReorder = (order: any) => {
    // Add all items from the order to cart
    order.items?.forEach((item: any) => {
      addToCart({
        id: item.menuItemId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        options: item.options,
        specialInstructions: item.specialInstructions
      });
    });

    toast({
      title: "Order Added to Cart",
      description: `Added ${order.items?.length || 0} items from Order #${order.id} to your cart.`,
    });

    // Navigate to checkout
    navigate("/checkout");
  };

  const handleDownloadReceipt = (order: any) => {
    const receipt = `
Favilla's NY Pizza - Receipt
Order #${order.id}
Date: ${new Date(order.createdAt).toLocaleDateString()}
Time: ${new Date(order.createdAt).toLocaleTimeString()}

Customer: ${user?.firstName} ${user?.lastName}
${order.orderType === 'delivery' ? `Address: ${order.deliveryAddress || user?.address}` : 'Pickup Order'}
${user?.phone ? `Phone: ${user.phone}` : ''}

Items:
${order.items?.map((item: any) => 
  `${item.name} x${item.quantity} - ${formatCurrency(item.price * item.quantity)}`
).join('\n')}

Subtotal: ${formatCurrency(order.total)}
Tax: ${formatCurrency(order.tax)}
${order.deliveryFee > 0 ? `Delivery Fee: ${formatCurrency(order.deliveryFee)}` : ''}
${order.tip > 0 ? `Tip: ${formatCurrency(order.tip)}` : ''}

Total: ${formatCurrency((order.total || 0) + (order.tax || 0) + (order.deliveryFee || 0) + (order.tip || 0))}

Payment Status: ${order.paymentStatus}
Order Status: ${order.status}

Thank you for choosing Favilla's NY Pizza!
    `.trim();

    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `order-${order.id}-receipt.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Receipt Downloaded",
      description: "Your receipt has been downloaded successfully.",
    });
  };

  const handleViewOrder = (order: any) => {
    navigate(`/order-success?orderId=${order.id}`);
  };

  if (!user) {
    return (
      <>
        <Helmet>
          <title>My Orders | Favilla's NY Pizza</title>
        </Helmet>
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Log In</h1>
            <p className="text-gray-600 mb-6">You need to be logged in to view your orders.</p>
            <Button onClick={() => navigate("/auth")}>Log In</Button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>My Orders | Favilla's NY Pizza</title>
      </Helmet>
      
      <main className="min-h-screen bg-gray-50 py-8 pt-header" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8rem)' }}>
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
                <p className="text-gray-600">View your order history and reorder your favorites</p>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  onClick={() => navigate("/")}
                  className="border-[#d73a31] text-[#d73a31] hover:bg-[#d73a31] hover:text-white"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Home
                </Button>
                <Button 
                  onClick={() => navigate("/menu")}
                  className="bg-[#d73a31] hover:bg-[#c73128]"
                >
                  <Pizza className="h-4 w-4 mr-2" />
                  Order Now
                </Button>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
                  </div>
                  <Receipt className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Spent</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(orders.reduce((sum: number, order: any) => 
                        sum + (order.total || 0) + (order.tax || 0) + (order.deliveryFee || 0) + (order.tip || 0), 0
                      ))}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Completed</p>
                    <p className="text-2xl font-bold text-purple-600">
                      {orders.filter((order: any) => order.status === 'completed').length}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {orders.filter((order: any) => ['pending', 'processing', 'ready'].includes(order.status)).length}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search orders by ID or items..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="ready">Ready</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Orders List */}
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-red-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading your orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Pizza className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-600 mb-6">
                  {orders.length === 0 
                    ? "You haven't placed any orders yet." 
                    : "No orders match your search criteria."
                  }
                </p>
                <Button onClick={() => navigate("/menu")}>
                  <Pizza className="h-4 w-4 mr-2" />
                  Order Now
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((order: any) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardHeader className="bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center space-x-2">
                          <span>Order #{order.id}</span>
                          <Badge className={getStatusColor(order.status)}>
                            {getStatusIcon(order.status)}
                            <span className="ml-1">
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </span>
                          </Badge>
                        </CardTitle>
                        <CardDescription className="flex items-center space-x-4 mt-2">
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(order.createdAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </span>
                          <span className="flex items-center">
                            {order.orderType === 'pickup' ? (
                              <Store className="h-4 w-4 mr-1" />
                            ) : (
                              <Truck className="h-4 w-4 mr-1" />
                            )}
                            {order.orderType === 'pickup' ? 'Pickup' : 'Delivery'}
                          </span>
                        </CardDescription>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency((order.total || 0) + (order.tax || 0) + (order.deliveryFee || 0) + (order.tip || 0))}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.items?.length || 0} items
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Order Items */}
                      <div>
                        <h4 className="font-medium mb-3">Items</h4>
                        <div className="space-y-2">
                          {order.items?.slice(0, 3).map((item: any, index: number) => (
                            <div key={index} className="flex justify-between items-start text-sm">
                              <div className="flex-1">
                                <p className="font-medium">{item.name}</p>
                                {item.specialInstructions && (
                                  <p className="text-gray-500 text-xs">Note: {item.specialInstructions}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p>x{item.quantity}</p>
                                <p className="text-gray-600">{formatCurrency(item.price * item.quantity)}</p>
                              </div>
                            </div>
                          ))}
                          {order.items?.length > 3 && (
                            <p className="text-sm text-gray-500">
                              +{order.items.length - 3} more items
                            </p>
                          )}
                        </div>
                      </div>

                      <Separator />

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewOrder(order)}
                        >
                          <Receipt className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDownloadReceipt(order)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Receipt
                        </Button>
                        
                        {order.status === 'completed' && (
                          <Button 
                            size="sm"
                            onClick={() => handleReorder(order)}
                            className="bg-[#d73a31] hover:bg-[#c73128]"
                          >
                            <Pizza className="h-4 w-4 mr-2" />
                            Reorder
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </>
  );
};

export default OrdersPage;


