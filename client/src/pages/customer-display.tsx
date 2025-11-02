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

  // Query for active orders (using public endpoint - no authentication required)
  const { data: orders, isLoading } = useQuery({
    queryKey: ["/api/customer-display-orders"],
    refetchInterval: 1000, // Refetch every 1 second for immediate updates
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
          queryClient.invalidateQueries({ queryKey: ["/api/customer-display-orders"] });
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

  // Filter orders by status and ensure uniqueness
  const cookingOrders = orders
    ?.filter((order: any) => order.status === 'cooking')
    .reduce((unique: any[], order: any) => {
      return unique.find((o: any) => o.id === order.id) ? unique : [...unique, order];
    }, []) || [];

  const readyOrders = orders
    ?.filter((order: any) => order.status === 'completed')
    .reduce((unique: any[], order: any) => {
      return unique.find((o: any) => o.id === order.id) ? unique : [...unique, order];
    }, []) || [];
  // Note: picked_up orders are excluded from customer display

  // Dynamic sizing based on order count per column
  const getCardSize = (orderCount: number) => {
    if (orderCount <= 4) {
      return {
        padding: 'p-4',
        nameSize: 'text-xl',
        orderIdSize: 'text-sm',
        timeSize: 'text-lg',
        itemsSize: 'text-sm'
      };
    } else if (orderCount <= 6) {
      return {
        padding: 'p-3',
        nameSize: 'text-lg',
        orderIdSize: 'text-xs',
        timeSize: 'text-base',
        itemsSize: 'text-xs'
      };
    } else {
      // 7+ orders - smallest size
      return {
        padding: 'p-2',
        nameSize: 'text-base',
        orderIdSize: 'text-xs',
        timeSize: 'text-sm',
        itemsSize: 'text-xs'
      };
    }
  };

  const cookingCardSize = getCardSize(cookingOrders.length);
  const readyCardSize = getCardSize(readyOrders.length);

  return (
    <>
      <Helmet>
        <title>Order Status Display | {companyName}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-gray-900 text-white overflow-hidden">
        {/* Main Display */}
        <div className="grid grid-cols-2 gap-0 h-screen relative">

            {/* Centered Logo Overlay */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
              <img
                src={logoUrl}
                alt={companyName}
                className="h-32 w-32 rounded-full shadow-2xl border-4 border-gray-800"
              />
            </div>

            {/* Cooking Column */}
            <div className="bg-gray-800 h-full flex flex-col">
              <div className="bg-yellow-600 px-6 py-8">
                <div className="flex items-center justify-center space-x-3">
                  <ChefHat className="w-12 h-12 text-white" />
                  <h2 className="text-4xl font-bold text-white">NOW COOKING</h2>
                </div>
                <div className="text-center text-yellow-100 mt-2 text-xl">
                  {cookingOrders.length} {cookingOrders.length === 1 ? 'Order' : 'Orders'}
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                {cookingOrders.length === 0 ? (
                  <div className="text-center text-gray-400 py-12">
                    <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-xl">No orders cooking</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {cookingOrders.map((order: any) => (
                      <div
                        key={order.id}
                        className={`bg-gray-700 rounded-lg ${cookingCardSize.padding} border-l-4 border-yellow-500 hover:bg-gray-650 transition-colors`}
                      >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {order.order_type === 'delivery' && (
                            <Car className="w-6 h-6 text-blue-400" />
                          )}
                          <div>
                            <div className={`${cookingCardSize.nameSize} font-semibold text-white`}>
                              {formatCustomerName(order.first_name, order.last_name)}
                            </div>
                            <div className={`${cookingCardSize.orderIdSize} text-gray-300`}>
                              Order #{order.id}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className={`${cookingCardSize.timeSize} font-mono text-yellow-400`}>
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
                      <div className={`mt-2 ${cookingCardSize.itemsSize} text-gray-300`}>
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
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Ready Column */}
            <div className="bg-gray-800 h-full flex flex-col">
              <div className="bg-green-600 px-6 py-8">
                <div className="flex items-center justify-center space-x-3">
                  <CheckCircle className="w-12 h-12 text-white" />
                  <h2 className="text-4xl font-bold text-white">READY FOR PICKUP</h2>
                </div>
                <div className="text-center text-green-100 mt-2 text-xl">
                  {readyOrders.length} {readyOrders.length === 1 ? 'Order' : 'Orders'}
                </div>
              </div>

              <div className="flex-1 p-6 overflow-y-auto">
                {readyOrders.length === 0 ? (
                  <div className="text-center text-gray-400 py-12">
                    <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-xl">No orders ready</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {readyOrders.map((order: any) => {
                      const readyTime = new Date(order.updated_at || order.created_at);
                      const now = new Date();
                      const minutesReady = Math.floor((now.getTime() - readyTime.getTime()) / (1000 * 60));

                      return (
                        <div
                          key={order.id}
                          className={`bg-gray-700 rounded-lg ${readyCardSize.padding} border-l-4 border-green-500 hover:bg-gray-650 transition-colors ${
                            minutesReady > 10 ? 'animate-pulse bg-red-900 border-red-500' : ''
                          }`}
                        >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {order.order_type === 'delivery' && (
                              <Car className="w-6 h-6 text-blue-400" />
                            )}
                            <div>
                              <div className={`${readyCardSize.nameSize} font-semibold text-white`}>
                                {formatCustomerName(order.first_name, order.last_name)}
                              </div>
                              <div className={`${readyCardSize.orderIdSize} text-gray-300`}>
                                Order #{order.id}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className={`${readyCardSize.timeSize} font-mono text-green-400`}>
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
                        <div className={`mt-2 ${readyCardSize.itemsSize} text-gray-300`}>
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
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* Footer Info */}
        <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 px-6 py-2">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <Car className="w-3 h-3 text-blue-400" />
                <span>Delivery</span>
              </span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span>Cooking: {cookingOrders.length}</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Ready: {readyOrders.length}</span>
              </div>
              {isLoading && (
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span>Updating...</span>
                </div>
              )}
            </div>

            <div className="text-center">
              <div className="text-lg font-mono font-bold text-white">
                {currentTime.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true
                })}
              </div>
            </div>

            <div className="w-48"></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomerDisplay;