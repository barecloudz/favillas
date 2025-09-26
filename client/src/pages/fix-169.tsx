import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-supabase-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

const Fix169Page = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const fixOrder169 = async () => {
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
      const response = await apiRequest('POST', '/api/fix-specific-order', {
        orderId: 169
      });
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
      console.error('Error fixing order 169:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fix order",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fix on page load if user is logged in
  useEffect(() => {
    if (user && !result && !isLoading) {
      fixOrder169();
    }
  }, [user]);

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
            Fix Order 169
          </CardTitle>
          <CardDescription>
            Award missing 24 points for order 169.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Order 169 Fixed Successfully!</span>
              </div>
              <div className="mt-2 text-sm text-green-700">
                <p>Order ID: {result.orderId}</p>
                <p>Points Awarded: {result.pointsAwarded}</p>
                <p>New Balance: {result.newBalance} points</p>
                {result.alreadyAwarded && (
                  <p className="text-amber-700">Note: Points were already awarded for this order.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Fixing order 169...</span>
                </div>
              ) : (
                <Button
                  onClick={fixOrder169}
                  disabled={isLoading}
                  className="w-full"
                >
                  Fix Order 169 & Award 24 Points
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Fix169Page;