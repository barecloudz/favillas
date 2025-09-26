import { useState } from "react";
import { useAuth } from "@/hooks/use-supabase-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const FixOrderPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const fixOrder = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to fix your order.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/fix-order-167', {});
      const data = await response.json();

      if (response.ok) {
        setResult(data);
        toast({
          title: "Success!",
          description: `${data.pointsAwarded} points have been awarded to your account.`,
        });
      } else {
        throw new Error(data.error || 'Failed to fix order');
      }
    } catch (error) {
      console.error('Error fixing order:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fix order",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please log in to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Fix Orphaned Orders
          </CardTitle>
          <CardDescription>
            Find and fix any orders that weren't properly associated with your account, and award missing points.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Order Fixed Successfully!</span>
              </div>
              <div className="mt-2 text-sm text-green-700">
                {result.fixedOrders ? (
                  <>
                    <p>Orders Fixed: {result.fixedOrders.length}</p>
                    <p>Total Points Awarded: {result.totalPointsAwarded}</p>
                    <p>New Balance: {result.newBalance} points</p>
                    <div className="mt-2">
                      {result.fixedOrders.map((order: any) => (
                        <div key={order.orderId} className="text-xs">
                          Order #{order.orderId}: +{order.pointsAwarded} points
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p>Order ID: {result.orderId}</p>
                    <p>Points Awarded: {result.pointsAwarded}</p>
                    <p>New Balance: {result.newBalance} points</p>
                    {result.alreadyAwarded && (
                      <p className="text-amber-700">Note: Points were already awarded for this order.</p>
                    )}
                  </>
                )}
              </div>
            </div>
          ) : (
            <Button
              onClick={fixOrder}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Find & Fix Orphaned Orders
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FixOrderPage;