import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-supabase-auth";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

const SpinWheel: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [showReward, setShowReward] = useState(false);
  const [reward, setReward] = useState<any>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  
  // Fetch spin wheel configuration from backend
  const { data: spinWheelConfig, isLoading } = useQuery({
    queryKey: ["/api/spin-wheel/config"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/spin-wheel/config", {});
      return await res.json();
    },
    // Fallback to default config if API not available
    placeholderData: {
      slices: [
        { id: 1, label: "10% OFF", probability: 30, color: "#FF6B6B", reward: "10% discount on next order" },
        { id: 2, label: "FREE DRINK", probability: 20, color: "#4ECDC4", reward: "Free beverage with any order" },
        { id: 3, label: "FREE APPETIZER", probability: 15, color: "#45B7D1", reward: "Free appetizer with any order" },
        { id: 4, label: "20% OFF", probability: 10, color: "#96CEB4", reward: "20% discount on next order" },
        { id: 5, label: "FREE PIZZA", probability: 5, color: "#FFEAA7", reward: "Free medium pizza" },
        { id: 6, label: "TRY AGAIN", probability: 20, color: "#DDA0DD", reward: "Better luck next time!" }
      ]
    }
  });
  
  // Call the API to spin the wheel
  const spinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/spin-wheel/spin", {});
      return await res.json();
    },
    onSuccess: (data) => {
      setReward(data.reward);
      setShowReward(true);
      
      // Update the rewards list
      queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to spin wheel",
        description: error.message,
        variant: "destructive",
      });
      setIsSpinning(false);
    },
  });
  
  const spinWheel = () => {
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login or create an account to spin the wheel",
        variant: "destructive",
      });
      return;
    }
    
    if (isSpinning || !spinWheelConfig?.slices) return;
    
    setIsSpinning(true);
    
    // Calculate total probability
    const totalProbability = spinWheelConfig.slices
      .filter((slice: any) => slice.isActive)
      .reduce((sum: number, slice: any) => sum + slice.probability, 0);
    
    // Generate random number
    const random = Math.random() * totalProbability;
    
    // Find winning slice
    let currentSum = 0;
    let winningSlice = null;
    let winningIndex = 0;
    
    for (let i = 0; i < spinWheelConfig.slices.length; i++) {
      const slice = spinWheelConfig.slices[i];
      if (slice.isActive) {
        currentSum += slice.probability;
        if (random <= currentSum) {
          winningSlice = slice;
          winningIndex = i;
          break;
        }
      }
    }
    
    // Calculate rotation to land on winning slice
    const sliceAngle = 360 / spinWheelConfig.slices.length;
    const targetAngle = (winningIndex * sliceAngle) + (sliceAngle / 2);
    
    // Add multiple rotations for dramatic effect
    const extraRotations = 5; // 5 full rotations
    const finalRotation = rotation + (extraRotations * 360) + (360 - targetAngle);
    setRotation(finalRotation);
    
    // Call the API to record the spin
    setTimeout(() => {
      spinMutation.mutate();
    }, 3000); // After 3 seconds (matching the CSS transition)
  };
  
  // Reset wheel after showing reward
  const resetWheel = () => {
    setShowReward(false);
    setIsSpinning(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-[300px] h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const activeSlices = spinWheelConfig?.slices?.filter((slice: any) => slice.isActive) || [];
  const sliceAngle = activeSlices.length > 0 ? 360 / activeSlices.length : 0;

  return (
    <>
      <div className="relative w-[300px] h-[300px]">
        {/* Spin Wheel Image with Labels */}
        <div 
          ref={wheelRef}
          className="w-full h-full rounded-full relative overflow-hidden shadow-lg"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: "transform 3s cubic-bezier(0.17, 0.67, 0.83, 0.67)",
          }}
        >
          {/* Use the actual spinwheel image as background */}
          <img 
            src="/images/spinwheel.png" 
            alt="Spin Wheel" 
            className="w-full h-full object-cover"
          />
          
          {/* Overlay labels on the wheel */}
          {activeSlices.map((slice: any, index: number) => (
            <div
              key={slice.id}
              className="absolute w-full h-full"
              style={{
                transformOrigin: "center",
                transform: `rotate(${index * sliceAngle}deg)`,
              }}
            >
              {/* Label positioned on each slice */}
              <div
                className="absolute top-4 left-1/2 transform -translate-x-1/2 text-center"
                style={{
                  transform: `rotate(${sliceAngle / 2}deg)`,
                  width: `${sliceAngle * 0.8}px`,
                }}
              >
                <div 
                  className="text-xs font-bold text-white px-1 py-0.5 rounded"
                  style={{ 
                    backgroundColor: slice.color,
                    textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                  }}
                >
                  {slice.label}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-2 z-10">
          <div className="w-0 h-0 border-l-8 border-r-8 border-b-12 border-l-transparent border-r-transparent border-b-red-500"></div>
        </div>
        
        {/* Spin Button */}
        <Button
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-md font-bold"
          onClick={spinWheel}
          disabled={isSpinning || !user || activeSlices.length === 0}
        >
          {isSpinning && spinMutation.isPending ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            "SPIN"
          )}
        </Button>
      </div>
      
      {/* Reward Dialog */}
      <AlertDialog open={showReward} onOpenChange={setShowReward}>
        <AlertDialogContent className="bg-gradient-to-br from-yellow-400 to-orange-500 border-none text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-center">
              🎉 Congratulations!
            </AlertDialogTitle>
            <AlertDialogDescription className="text-lg font-medium text-center">
              You've won: <br />
              <span className="block text-2xl font-bold mt-2 text-white">
                {reward?.label || "Unknown Reward"}
              </span>
              <span className="block text-sm mt-2 opacity-90">
                {reward?.reward || "Check your account for details"}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="justify-center">
            <AlertDialogAction 
              className="bg-red-500 hover:bg-red-600 text-white font-bold"
              onClick={resetWheel}
            >
              Claim Reward
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SpinWheel;
