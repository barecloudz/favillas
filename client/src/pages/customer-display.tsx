import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { setupWebSocket } from "@/lib/websocket";
import { queryClient } from "@/lib/queryClient";
import { Helmet } from "react-helmet";
import { useBranding } from "@/hooks/use-branding";
import { Car, Clock, ChefHat, CheckCircle } from "lucide-react";

const CustomerDisplay = () => {
  const { companyName, logoUrl } = useBranding();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Query for active orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/kitchen/orders"],
    refetchInterval: 3000, // Refetch every 3 seconds for near real-time updates
  });

  // Setup WebSocket for real-time order updates
  useEffect(() => {
    const socket = setupWebSocket();

    // Register as customer display client
    socket.addEventListener('open', () => {
      socket.send(JSON.stringify({
        type: 'register',
        client: 'customer-display'
      }));
    });

    // Handle incoming messages
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'newOrder' || data.type === 'orderStatusUpdate') {
          // Refresh orders list
          queryClient.invalidateQueries({ queryKey: ["/api/kitchen/orders"] });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    return () => {
      socket.close();
    };
  }, []);

  // Format customer name (First Name + Last Initial)
  const formatCustomerName = (firstName: string = '', lastName: string = '') => {
    if (!firstName && !lastName) return 'Guest';
    const lastInitial = lastName ? lastName.charAt(0).toUpperCase() + '.' : '';
    return `${firstName} ${lastInitial}`.trim();
  };

  // Filter orders by status
  const cookingOrders = orders?.filter((order: any) => order.status === 'cooking') || [];
  const readyOrders = orders?.filter((order: any) => order.status === 'completed') || [];
  // Note: picked_up orders are excluded from customer display

  return (
    <>
      <Helmet>
        <title>Order Status Display | {companyName}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
        {/* Header */}
        <header className="bg-[#d73a31] shadow-lg">
          <div className="container mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <img src={logoUrl} alt={companyName} className="h-16" />
                <div>
                  <h1 className="text-3xl font-bold text-white">{companyName}</h1>
                  <p className="text-red-100">Order Status</p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-mono font-bold text-white">
                  {currentTime.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true
                  })}
                </div>
                <div className="text-red-100">
                  {currentTime.toLocaleDateString([], {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Display */}
        <div className="container mx-auto px-8 py-8">
          <div className="grid grid-cols-2 gap-12 h-[calc(100vh-200px)]">

            {/* Cooking Column */}
            <div className="bg-gray-800 rounded-lg shadow-xl">
              <div className="bg-yellow-600 rounded-t-lg px-6 py-4">
                <div className="flex items-center justify-center space-x-3">
                  <ChefHat className="w-8 h-8 text-white" />
                  <h2 className="text-2xl font-bold text-white">NOW COOKING</h2>
                </div>
                <div className="text-center text-yellow-100 mt-1">
                  {cookingOrders.length} {cookingOrders.length === 1 ? 'Order' : 'Orders'}
                </div>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(100vh-300px)]">
                {cookingOrders.length === 0 ? (
                  <div className="text-center text-gray-400 py-12">
                    <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-xl">No orders cooking</p>
                  </div>
                ) : (
                  cookingOrders.map((order: any) => (
                    <div
                      key={order.id}
                      className="bg-gray-700 rounded-lg p-4 border-l-4 border-yellow-500 hover:bg-gray-650 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {order.order_type === 'delivery' && (
                            <Car className="w-6 h-6 text-blue-400" />
                          )}
                          <div>
                            <div className="text-xl font-semibold text-white">
                              {formatCustomerName(order.first_name, order.last_name)}
                            </div>
                            <div className="text-sm text-gray-300">
                              Order #{order.id}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-lg font-mono text-yellow-400">
                            {new Date(order.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="text-xs text-gray-400 uppercase">
                            {order.order_type || 'Pickup'}
                          </div>
                        </div>
                      </div>

                      {/* Order items summary */}
                      <div className="mt-2 text-sm text-gray-300">
                        {order.items?.slice(0, 2).map((item: any, index: number) => (
                          <span key={index}>
                            {item.quantity}x {item.menuItem?.name || 'Item'}
                            {index < Math.min(order.items.length - 1, 1) && ', '}
                          </span>
                        ))}
                        {order.items?.length > 2 && (
                          <span className="text-gray-400">
                            {' '}+{order.items.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Ready Column */}
            <div className="bg-gray-800 rounded-lg shadow-xl">
              <div className="bg-green-600 rounded-t-lg px-6 py-4">
                <div className="flex items-center justify-center space-x-3">
                  <CheckCircle className="w-8 h-8 text-white" />
                  <h2 className="text-2xl font-bold text-white">READY FOR PICKUP</h2>
                </div>
                <div className="text-center text-green-100 mt-1">
                  {readyOrders.length} {readyOrders.length === 1 ? 'Order' : 'Orders'}
                </div>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(100vh-300px)]">
                {readyOrders.length === 0 ? (
                  <div className="text-center text-gray-400 py-12">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-xl">No orders ready</p>
                  </div>
                ) : (
                  readyOrders.map((order: any) => {
                    const readyTime = new Date(order.updated_at || order.created_at);
                    const now = new Date();
                    const minutesReady = Math.floor((now.getTime() - readyTime.getTime()) / (1000 * 60));

                    return (
                      <div
                        key={order.id}
                        className={`bg-gray-700 rounded-lg p-4 border-l-4 border-green-500 hover:bg-gray-650 transition-colors ${
                          minutesReady > 10 ? 'animate-pulse bg-red-900 border-red-500' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {order.order_type === 'delivery' && (
                              <Car className="w-6 h-6 text-blue-400" />
                            )}
                            <div>
                              <div className="text-xl font-semibold text-white">
                                {formatCustomerName(order.first_name, order.last_name)}
                              </div>
                              <div className="text-sm text-gray-300">
                                Order #{order.id}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-lg font-mono text-green-400">
                              {readyTime.toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <div className="text-xs text-gray-400 uppercase">
                              {order.order_type || 'Pickup'}
                            </div>
                            {minutesReady > 0 && (
                              <div className={`text-xs ${
                                minutesReady > 10 ? 'text-red-400' : 'text-yellow-400'
                              }`}>
                                {minutesReady}m ago
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Order items summary */}
                        <div className="mt-2 text-sm text-gray-300">
                          {order.items?.slice(0, 2).map((item: any, index: number) => (
                            <span key={index}>
                              {item.quantity}x {item.menuItem?.name || 'Item'}
                              {index < Math.min(order.items.length - 1, 1) && ', '}
                            </span>
                          ))}
                          {order.items?.length > 2 && (
                            <span className="text-gray-400">
                              {' '}+{order.items.length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-8 py-3">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center space-x-6">
              <span className="flex items-center space-x-2">
                <Car className="w-4 h-4 text-blue-400" />
                <span>Delivery Order</span>
              </span>
              <span>Orders update automatically</span>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>Cooking: {cookingOrders.length}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Ready: {readyOrders.length}</span>
              </div>
              {isLoading && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Updating...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomerDisplay;