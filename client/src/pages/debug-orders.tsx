import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-supabase-auth";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, CheckCircle, XCircle } from "lucide-react";

const DebugOrdersPage = () => {
  const { user } = useAuth();
  const [debugData, setDebugData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDebugData = async () => {
      if (!user) {
        setError("Please log in to view debug information");
        setIsLoading(false);
        return;
      }

      try {
        const response = await apiRequest('GET', '/api/debug-user-orders');
        const data = await response.json();

        if (response.ok) {
          setDebugData(data);
        } else {
          throw new Error(data.error || 'Failed to fetch debug data');
        }
      } catch (err) {
        console.error('Debug fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch debug data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDebugData();
  }, [user]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to view order debug information.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Analyzing your orders...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Error
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500" />
              Order Debug Information
            </CardTitle>
            <CardDescription>
              Analysis of your orders and points for the last 30 days
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{debugData.summary.totalOrders}</div>
                <div className="text-sm text-gray-600">Total Orders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{debugData.summary.ordersWithoutPoints}</div>
                <div className="text-sm text-gray-600">Missing Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{debugData.summary.actualPoints}</div>
                <div className="text-sm text-gray-600">Current Points</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{debugData.summary.missingPoints}</div>
                <div className="text-sm text-gray-600">Points Owed</div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm">
                <strong>Total Spent:</strong> ${debugData.summary.totalSpent}
              </div>
              <div className="text-sm">
                <strong>Expected Points:</strong> {debugData.summary.expectedPoints} points
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Needing Points */}
        {debugData.ordersNeedingPoints.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Orders Missing Points</CardTitle>
              <CardDescription>
                These {debugData.ordersNeedingPoints.length} orders haven't awarded points yet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {debugData.ordersNeedingPoints.map((order: any) => (
                  <div key={order.id} className="flex justify-between items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div>
                      <span className="font-medium">Order #{order.id}</span>
                      <span className="ml-2 text-sm text-gray-600">${order.total.toFixed(2)}</span>
                      {order.associatedWithUser ? (
                        <Badge variant="outline" className="ml-2">Associated</Badge>
                      ) : (
                        <Badge variant="destructive" className="ml-2">Orphaned</Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-red-600">+{order.pointsToAward} points</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Order Details */}
        <Card>
          <CardHeader>
            <CardTitle>All Orders (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {debugData.orderDetails.map((order: any) => (
                <div key={order.id} className={`flex justify-between items-center p-3 rounded-lg border ${
                  order.hasPoints ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div>
                    <span className="font-medium">Order #{order.id}</span>
                    <span className="ml-2 text-sm text-gray-600">${order.total.toFixed(2)}</span>
                    <span className="ml-2 text-xs text-gray-500">
                      {new Date(order.created).toLocaleDateString()}
                    </span>
                    {order.associatedWithUser ? (
                      <Badge variant="outline" className="ml-2">Associated</Badge>
                    ) : (
                      <Badge variant="destructive" className="ml-2">Orphaned</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {order.hasPoints ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-green-600 text-sm">Points Awarded</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-600" />
                        <span className="text-red-600 text-sm">Missing {Math.floor(order.total)} points</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DebugOrdersPage;