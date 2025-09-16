import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import Footer from "@/components/layout/footer";
import { Helmet } from "react-helmet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { 
  Star,
  Gift,
  Trophy,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Home,
  Pizza,
  ShoppingCart,
  History,
  Target,
  Zap,
  Crown,
  Coins,
  Truck
} from "lucide-react";

const RewardsPage = () => {
  const { user } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("rewards");
  
  // Initialize WebSocket for real-time updates
  useWebSocket();

  // Fetch user's points and rewards data
  const { data: userData, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ["/api/user/rewards"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user/rewards", null, {
        credentials: "include"
      });
      const data = await response.json();
      // Ensure we have valid user data with defaults
      return {
        points: data?.points || 0,
        totalPointsEarned: data?.totalPointsEarned || 0,
        totalPointsRedeemed: data?.totalPointsRedeemed || 0,
        lastEarnedAt: data?.lastEarnedAt
      };
    },
    enabled: !!user,
  });

  // Fetch available rewards
  const { data: rewards = [], isLoading: rewardsLoading, error: rewardsError } = useQuery({
    queryKey: ["/api/rewards"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/rewards", null, {
        credentials: "include"
      });
      const data = await response.json();
      // Ensure we have an array and each reward has required properties
      return Array.isArray(data) ? data.map(reward => ({
        id: reward.id || 0,
        name: reward.name || 'Unknown Reward',
        description: reward.description || 'No description available',
        type: reward.type || 'default',
        pointsRequired: reward.points_required || 0,
        discount: reward.discount,
        freeItem: reward.free_item,
        isActive: reward.is_active !== false
      })) : [];
    },
    enabled: !!user,
  });

  // Fetch user's redemption history
  const { data: redemptions = [], isLoading: redemptionsLoading } = useQuery({
    queryKey: ["/api/user/redemptions"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user/redemptions", null, {
        credentials: "include"
      });
      return response.json();
    },
    enabled: !!user,
  });

  // Redeem reward mutation
  const redeemRewardMutation = useMutation({
    mutationFn: async (rewardId: number) => {
      const response = await apiRequest("POST", `/api/rewards/${rewardId}/redeem`, {}, {
        credentials: "include"
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Reward Redeemed!",
        description: `You've successfully redeemed ${data.reward.name}!`,
      });
      // Refresh user data and redemptions
      queryClient.invalidateQueries({ queryKey: ["/api/user/rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/redemptions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Redemption Failed",
        description: error.message || "Failed to redeem reward. Please try again.",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (amount: number) => {
    if (isNaN(amount) || amount === null || amount === undefined) {
      return "$0.00";
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getRewardIcon = (type: string) => {
    switch (type) {
      case "discount": return <Gift className="h-5 w-5" />;
      case "free_item": return <Pizza className="h-5 w-5" />;
      case "priority": return <Zap className="h-5 w-5" />;
      case "free_delivery": return <Truck className="h-5 w-5" />;
      default: return <Star className="h-5 w-5" />;
    }
  };

  const getRewardColor = (type: string) => {
    switch (type) {
      case "discount": return "bg-green-100 text-green-800";
      case "free_item": return "bg-blue-100 text-blue-800";
      case "priority": return "bg-purple-100 text-purple-800";
      case "free_delivery": return "bg-blue-100 text-blue-800";
      default: return "bg-yellow-100 text-yellow-800";
    }
  };

  const handleRedeemReward = (reward: any) => {
    if (userData.points < reward.pointsRequired) {
      toast({
        title: "Insufficient Points",
        description: `You need ${reward.pointsRequired - userData.points} more points to redeem this reward.`,
        variant: "destructive",
      });
      return;
    }

    redeemRewardMutation.mutate(reward.id);
  };

  if (!user) {
    return (
      <>
        <Helmet>
          <title>Rewards | Favilla's NY Pizza</title>
        </Helmet>
        <main className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Log In</h1>
            <p className="text-gray-600 mb-6">You need to be logged in to view your rewards.</p>
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
        <title>Rewards | Favilla's NY Pizza</title>
      </Helmet>
      
      <main className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50 py-8 pt-header" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 8rem)' }}>
        <div className="max-w-6xl mx-auto px-4">
          {/* Hero Header */}
          <div className="mb-8 text-center">
            <div className="relative bg-gradient-to-r from-[#d73a31] to-[#ff6b35] text-white p-8 rounded-2xl shadow-2xl mb-8 overflow-hidden">
              <div className="absolute inset-0 bg-black opacity-10"></div>
              <div className="relative z-10">
                <div className="flex items-center justify-center mb-4">
                  <Crown className="h-12 w-12 text-yellow-300 mr-4 animate-pulse" />
                  <h1 className="text-4xl font-bold">Rewards & Loyalty</h1>
                  <Crown className="h-12 w-12 text-yellow-300 ml-4 animate-pulse" />
                </div>
                <p className="text-xl text-orange-100 mb-6">Every bite brings you closer to amazing rewards!</p>
                <div className="flex justify-center space-x-4">
                  <div className="bg-white/20 px-4 py-2 rounded-full">
                    <span className="text-sm font-medium">🍕 Earn 1 point per $1</span>
                  </div>
                  <div className="bg-white/20 px-4 py-2 rounded-full">
                    <span className="text-sm font-medium">🎁 Redeem for rewards</span>
                  </div>
                  <div className="bg-white/20 px-4 py-2 rounded-full">
                    <span className="text-sm font-medium">⭐ VIP benefits</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => navigate("/")}
                className="border-[#d73a31] text-[#d73a31] hover:bg-[#d73a31] hover:text-white transition-all duration-300"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
              <Button 
                onClick={() => navigate("/menu")}
                className="bg-gradient-to-r from-[#d73a31] to-[#ff6b35] hover:from-[#c73128] hover:to-[#e55a2b] text-white shadow-lg transform hover:scale-105 transition-all duration-300"
              >
                <Pizza className="h-4 w-4 mr-2" />
                Order Now & Earn Points!
              </Button>
            </div>
          </div>

          {/* Points Summary */}
          {userLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-red-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading your rewards...</p>
            </div>
          ) : userError ? (
            <div className="text-center py-12">
              <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
              <p className="text-gray-600">Failed to load rewards data. Please try again.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-gradient-to-br from-yellow-100 via-orange-50 to-yellow-50 border-yellow-300 shadow-xl transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
                <CardContent className="p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-200 to-orange-200 rounded-full -mr-10 -mt-10 opacity-20"></div>
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <p className="text-sm font-medium text-yellow-700 mb-1">Current Points</p>
                      <p className="text-4xl font-bold text-yellow-800 mb-2">{userData?.points || 0}</p>
                      <p className="text-xs text-yellow-600">💰 Ready to redeem</p>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 bg-yellow-400 rounded-full animate-ping opacity-20"></div>
                      <Coins className="h-12 w-12 text-yellow-600 relative z-10" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-100 via-emerald-50 to-green-50 border-green-300 shadow-xl transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
                <CardContent className="p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-200 to-emerald-200 rounded-full -mr-10 -mt-10 opacity-20"></div>
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <p className="text-sm font-medium text-green-700 mb-1">Total Earned</p>
                      <p className="text-4xl font-bold text-green-800 mb-2">{userData?.totalPointsEarned || 0}</p>
                      <p className="text-xs text-green-600">🏆 Lifetime achievement</p>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 bg-green-400 rounded-full animate-pulse opacity-20"></div>
                      <Trophy className="h-12 w-12 text-green-600 relative z-10" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-100 via-indigo-50 to-purple-50 border-purple-300 shadow-xl transform hover:scale-105 transition-all duration-300 hover:shadow-2xl">
                <CardContent className="p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-purple-200 to-indigo-200 rounded-full -mr-10 -mt-10 opacity-20"></div>
                  <div className="flex items-center justify-between relative z-10">
                    <div>
                      <p className="text-sm font-medium text-purple-700 mb-1">Rewards Redeemed</p>
                      <p className="text-4xl font-bold text-purple-800 mb-2">{redemptions?.length || 0}</p>
                      <p className="text-xs text-purple-600">👑 VIP status</p>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 bg-purple-400 rounded-full animate-bounce opacity-20"></div>
                      <Crown className="h-12 w-12 text-purple-600 relative z-10" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Progress to Next Reward */}
          {userData && rewards.length > 0 && (
            <Card className="mb-8 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-indigo-200 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-lg">
                <CardTitle className="flex items-center text-xl">
                  <Target className="h-6 w-6 mr-2 animate-pulse" />
                  🎯 Progress to Next Reward
                  <Zap className="h-6 w-6 ml-2 animate-pulse" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const nextReward = rewards
                    .filter((r: any) => r.pointsRequired > userData.points)
                    .sort((a: any, b: any) => a.pointsRequired - b.pointsRequired)[0];
                  
                  if (!nextReward) {
                    return (
                      <div className="text-center py-4">
                        <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                        <p className="text-green-700 font-medium">You can redeem all available rewards!</p>
                      </div>
                    );
                  }

                  const progress = (userData.points / nextReward.pointsRequired) * 100;
                  const pointsNeeded = nextReward.pointsRequired - userData.points;

                  return (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-gray-700">
                          {nextReward.name} ({nextReward.pointsRequired} points)
                        </span>
                        <span className="text-sm text-gray-500">
                          {userData.points} / {nextReward.pointsRequired} points
                        </span>
                      </div>
                      <div className="relative w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner">
                        <div 
                          className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 h-4 rounded-full transition-all duration-1000 shadow-md animate-pulse"
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        >
                          <div className="absolute inset-0 bg-white opacity-30 rounded-full"></div>
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-white/40 to-transparent rounded-full"></div>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xs font-bold text-gray-700 drop-shadow">
                            {Math.round(progress)}%
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">
                        {pointsNeeded > 0 
                          ? `You need ${pointsNeeded} more points to redeem this reward.`
                          : "You can redeem this reward now!"
                        }
                      </p>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="rewards" className="flex items-center">
                <Gift className="h-4 w-4 mr-2" />
                Available Rewards
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center">
                <History className="h-4 w-4 mr-2" />
                Redemption History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="rewards" className="space-y-6">
              {rewardsLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-red-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading rewards...</p>
                </div>
              ) : rewardsError ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-4" />
                  <p className="text-gray-600">Failed to load rewards. Please try again.</p>
                </div>
              ) : rewards.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Gift className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No rewards available</h3>
                    <p className="text-gray-600">Check back later for new rewards!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rewards.map((reward: any, index: number) => (
                    <Card 
                      key={reward.id} 
                      className="overflow-hidden bg-gradient-to-br from-white to-gray-50 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-500 border-2 hover:border-orange-300 group relative"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-yellow-200 to-orange-200 rounded-full -mr-8 -mt-8 opacity-20 group-hover:opacity-40 transition-opacity duration-300"></div>
                      
                      <CardHeader className="pb-3 relative z-10">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-xl flex items-center font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                            <div className="mr-3 p-2 bg-gradient-to-br from-orange-100 to-red-100 rounded-full">
                              {getRewardIcon(reward.type || 'default')}
                            </div>
                            {reward.name}
                          </CardTitle>
                          <Badge className={`${getRewardColor(reward.type || 'default')} animate-bounce shadow-lg`}>
                            {(reward.type || 'default').replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <CardDescription className="text-gray-600 mt-2 text-sm leading-relaxed">
                          {reward.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0 relative z-10">
                        <div className="space-y-4">
                          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-4 rounded-lg border border-yellow-200">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-700 flex items-center">
                                <Coins className="h-4 w-4 mr-2 text-yellow-600" />
                                Points Required:
                              </span>
                              <div className="flex items-center space-x-2">
                                <span className="text-2xl font-bold text-yellow-600 animate-pulse">{reward.pointsRequired}</span>
                                <span className="text-xs text-yellow-500">pts</span>
                              </div>
                            </div>
                          </div>
                          
                          {reward.discount && (
                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">💸 Your Savings:</span>
                                <span className="text-xl font-bold text-green-600 animate-bounce">
                                  {reward.discount}% OFF
                                </span>
                              </div>
                            </div>
                          )}

                          {reward.freeItem && (
                            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-3 rounded-lg border border-blue-200">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700">🆓 Free Item:</span>
                                <span className="text-lg font-bold text-blue-600">
                                  {reward.freeItem}
                                </span>
                              </div>
                            </div>
                          )}

                          <Separator />

                          <Button 
                            className={`w-full h-12 text-lg font-bold transition-all duration-300 ${
                              userData?.points >= reward.pointsRequired 
                                ? 'bg-gradient-to-r from-[#d73a31] to-[#ff6b35] hover:from-[#c73128] hover:to-[#e55a2b] text-white shadow-lg hover:shadow-xl transform hover:scale-105' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                            disabled={userData?.points < reward.pointsRequired || redeemRewardMutation.isPending}
                            onClick={() => handleRedeemReward(reward)}
                          >
                            {redeemRewardMutation.isPending ? (
                              <>
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                Redeeming...
                              </>
                            ) : userData?.points >= reward.pointsRequired ? (
                              <>
                                <Gift className="h-5 w-5 mr-2 animate-bounce" />
                                🎉 Redeem Now!
                              </>
                            ) : (
                              <>
                                <Clock className="h-5 w-5 mr-2" />
                                Need {reward.pointsRequired - userData?.points} more points
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="space-y-6">
              {redemptionsLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-red-600 mx-auto mb-4" />
                  <p className="text-gray-600">Loading redemption history...</p>
                </div>
              ) : redemptions.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No redemptions yet</h3>
                    <p className="text-gray-600 mb-6">Start earning points by placing orders!</p>
                    <Button onClick={() => navigate("/menu")}>
                      <Pizza className="h-4 w-4 mr-2" />
                      Order Now
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {redemptions.map((redemption: any) => (
                    <Card key={redemption.id}>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="p-2 bg-green-100 rounded-full">
                              <CheckCircle className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                              <h4 className="font-medium text-gray-900">{redemption.reward.name}</h4>
                              <p className="text-sm text-gray-500">
                                Redeemed on {new Date(redemption.redeemedAt).toLocaleDateString()}
                              </p>
                              {redemption.usedAt && (
                                <p className="text-sm text-gray-500">
                                  Used on {new Date(redemption.usedAt).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge className={redemption.usedAt ? "bg-gray-100 text-gray-800" : "bg-green-100 text-green-800"}>
                              {redemption.usedAt ? "Used" : "Active"}
                            </Badge>
                            <p className="text-sm text-gray-500 mt-1">
                              {redemption.pointsSpent} points
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* How to Earn Points */}
          <Card className="mt-8 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 shadow-2xl">
            <CardHeader className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-t-lg">
              <CardTitle className="flex items-center justify-center text-2xl">
                <Star className="h-8 w-8 mr-3 animate-spin" />
                🌟 How to Earn Points 🌟
                <Star className="h-8 w-8 ml-3 animate-spin" />
              </CardTitle>
              <p className="text-center text-blue-100 mt-2">Your guide to maximizing rewards!</p>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="group flex items-start space-x-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border-2 border-green-200 hover:border-green-300 transform hover:scale-105 transition-all duration-300">
                    <div className="p-3 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full shadow-lg group-hover:animate-bounce">
                      <ShoppingCart className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg mb-2">🛒 Place Orders</h4>
                      <p className="text-gray-600 mb-2">Earn <strong className="text-green-600">1 point for every dollar</strong> spent on orders</p>
                      <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full inline-block">
                        ✨ Automatic rewards!
                      </div>
                    </div>
                  </div>
                  
                  <div className="group flex items-start space-x-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200 hover:border-blue-300 transform hover:scale-105 transition-all duration-300">
                    <div className="p-3 bg-gradient-to-br from-blue-400 to-cyan-500 rounded-full shadow-lg group-hover:animate-bounce">
                      <Pizza className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg mb-2">🍕 Complete Orders</h4>
                      <p className="text-gray-600 mb-2">Points are awarded when your order is <strong className="text-blue-600">completed</strong></p>
                      <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full inline-block">
                        💫 Instant gratification
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-6">
                  <div className="group flex items-start space-x-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200 hover:border-purple-300 transform hover:scale-105 transition-all duration-300">
                    <div className="p-3 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-full shadow-lg group-hover:animate-bounce">
                      <Crown className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg mb-2">👑 VIP Benefits</h4>
                      <p className="text-gray-600 mb-2">Earn extra points on your <strong className="text-purple-600">birthday</strong> and special occasions</p>
                      <div className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full inline-block">
                        🎂 Coming soon!
                      </div>
                    </div>
                  </div>
                  
                  <div className="group flex items-start space-x-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200 hover:border-yellow-300 transform hover:scale-105 transition-all duration-300">
                    <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full shadow-lg group-hover:animate-bounce">
                      <Zap className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 text-lg mb-2">⚡ Refer Friends</h4>
                      <p className="text-gray-600 mb-2">Earn points when friends place their <strong className="text-orange-600">first order</strong></p>
                      <div className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full inline-block">
                        🚀 Spread the love!
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 text-center">
                <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-4 rounded-xl shadow-lg">
                  <h3 className="text-xl font-bold mb-2">🔥 Start Earning Today!</h3>
                  <p className="text-red-100">Every order gets you closer to delicious rewards</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </>
  );
};

export default RewardsPage;
