import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Star,
  ShoppingCart,
  Pizza,
  Crown,
  Zap,
  Coins,
  Trophy,
  Gift
} from "lucide-react";

const RewardsSection: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <section id="rewards" className="py-16 bg-gradient-to-br from-orange-50 via-red-50 to-yellow-50">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="relative bg-gradient-to-r from-[#d73a31] to-[#ff6b35] text-white p-8 rounded-2xl shadow-2xl mb-8 overflow-hidden mx-auto max-w-4xl">
            <div className="absolute inset-0 bg-black opacity-10"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-center mb-4">
                <Crown className="h-12 w-12 text-yellow-300 mr-4 animate-pulse" />
                <h2 className="text-4xl md:text-5xl font-display font-bold">REWARDS & LOYALTY</h2>
                <Crown className="h-12 w-12 text-yellow-300 ml-4 animate-pulse" />
              </div>
              <p className="text-xl text-orange-100 mb-6">Every bite brings you closer to amazing rewards!</p>
              <div className="flex flex-wrap justify-center gap-4">
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
        </div>

        {/* How to Earn Points Section */}
        <Card className="mb-12 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 shadow-2xl">
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
                <p className="text-red-100 mb-4">Every order gets you closer to delicious rewards</p>
                {!user ? (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/auth">
                      <Button className="bg-white text-red-600 hover:bg-gray-100 font-bold px-8 py-3 rounded-full shadow-lg transform hover:scale-105 transition-all duration-300">
                        <Gift className="h-5 w-5 mr-2" />
                        Sign Up & Start Earning!
                      </Button>
                    </Link>
                    <Link href="/menu">
                      <Button className="bg-yellow-400 text-gray-900 hover:bg-yellow-300 font-bold px-8 py-3 rounded-full shadow-lg transform hover:scale-105 transition-all duration-300">
                        <Pizza className="h-5 w-5 mr-2" />
                        Browse Menu
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/rewards">
                      <Button className="bg-white text-red-600 hover:bg-gray-100 font-bold px-8 py-3 rounded-full shadow-lg transform hover:scale-105 transition-all duration-300">
                        <Trophy className="h-5 w-5 mr-2" />
                        View My Rewards
                      </Button>
                    </Link>
                    <Link href="/menu">
                      <Button className="bg-yellow-400 text-gray-900 hover:bg-yellow-300 font-bold px-8 py-3 rounded-full shadow-lg transform hover:scale-105 transition-all duration-300">
                        <Pizza className="h-5 w-5 mr-2" />
                        Order & Earn Points!
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </section>
  );
};

export default RewardsSection;
