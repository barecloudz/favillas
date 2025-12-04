import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, Lock, Check, ChevronLeft, ChevronRight, CalendarDays, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useLottie } from 'lottie-react';
import giftRewardAnimation from '@/assets/animations/gift-reward.json';
import christmasTreeAnimation from '@/assets/animations/christmas-tree.json';
import christmasWindChimesAnimation from '@/assets/animations/christmas-wind-chimes.json';
import happySnowmanAnimation from '@/assets/animations/happy-snowman.json';

interface AdventCalendarModalProps {
  open: boolean;
  onClose: () => void;
}

// Christmas tree decoration component
const ChristmasTree: React.FC = () => {
  const { View } = useLottie({
    animationData: christmasTreeAnimation,
    loop: true,
    autoplay: true,
  });
  return <>{View}</>;
};

// Christmas wind chimes decoration component
const ChristmasWindChimes: React.FC = () => {
  const { View } = useLottie({
    animationData: christmasWindChimesAnimation,
    loop: true,
    autoplay: true,
  });
  return <>{View}</>;
};

// Happy snowman decoration component
const HappySnowman: React.FC = () => {
  const { View } = useLottie({
    animationData: happySnowmanAnimation,
    loop: true,
    autoplay: true,
  });
  return <>{View}</>;
};

// Separate component for the gift opening animation - this ensures it remounts and plays fresh each time
const GiftOpeningAnimation: React.FC = () => {
  // Clone and remove text layers from animation (100 Points text)
  const modifiedAnimation = React.useMemo(() => {
    const data = JSON.parse(JSON.stringify(giftRewardAnimation));

    // Remove text layers entirely (ty 5 = text layer)
    if (data.layers) {
      data.layers = data.layers.filter((layer: any) => layer.ty !== 5);
    }
    return data;
  }, []);

  const { View } = useLottie({
    animationData: modifiedAnimation,
    loop: false,
    autoplay: true,
  });
  return <>{View}</>;
};

// Animated present component using Lottie gift animation
const Present: React.FC<{ day: number; onClick: () => void; disabled: boolean; claimed: boolean; isOpening?: boolean }> = ({
  day,
  onClick,
  disabled,
  claimed,
  isOpening = false
}) => {
  // Use Lottie for the gift display - show first frame only (paused)
  const { View: GiftView } = useLottie({
    animationData: giftRewardAnimation,
    loop: false,
    autoplay: false, // Don't auto-play, just show the gift
    initialSegment: [0, 1], // Show only the first frame (closed gift)
  });

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`relative cursor-pointer transform transition-all duration-300 ${
        disabled || claimed ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'
      }`}
      style={
        !disabled && !claimed
          ? {
              animation: 'presentShake 4s ease-in-out infinite',
            }
          : {}
      }
    >
      {/* Lottie Gift */}
      <div className={`relative w-20 h-20 ${claimed ? 'grayscale' : ''}`}>
        {GiftView}

        {/* Day number badge */}
        <div className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white z-10">
          {day}
        </div>

        {/* Status icon */}
        {claimed && (
          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 shadow-md z-10">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
        {disabled && !claimed && (
          <div className="absolute -bottom-1 -right-1 bg-gray-500 rounded-full p-1 shadow-md z-10">
            <Lock className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
    </div>
  );
};

export const AdventCalendarModal: React.FC<AdventCalendarModalProps> = ({ open, onClose }) => {
  const { toast } = useToast();
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isOpening, setIsOpening] = useState(false);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  const [showRewardReveal, setShowRewardReveal] = useState(false);
  const [revealedReward, setRevealedReward] = useState<{ name: string; description?: string } | null>(null);

  const { data: adventData, isLoading } = useQuery({
    queryKey: ['/api/advent-calendar'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/advent-calendar');
      const data = await response.json();
      console.log('Advent calendar data:', data);
      return data;
    },
    enabled: open,
  });

  const claimMutation = useMutation({
    mutationFn: async (day: number) => {
      const response = await apiRequest('POST', '/api/advent-calendar', { day });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/advent-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/vouchers'] });

      toast({
        title: '🎁 Reward Claimed!',
        description: data.message || 'Check your vouchers to use your reward!',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to claim reward',
        variant: 'destructive',
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (day: number) => {
      const response = await apiRequest('DELETE', '/api/advent-calendar', { day });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/advent-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/vouchers'] });

      toast({
        title: '🔄 Claim Reset',
        description: data.message || 'You can now claim this reward again.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset claim',
        variant: 'destructive',
      });
    },
  });

  // Get current day in EST
  const getCurrentDayEST = () => {
    const now = new Date();
    const estOffset = -5; // EST is UTC-5
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const estTime = new Date(utc + (3600000 * estOffset));
    return estTime.getMonth() === 11 ? estTime.getDate() : 0; // Return 0 if not December
  };

  const todayEST = getCurrentDayEST();

  // Set initial day to today when modal opens
  useEffect(() => {
    if (open && todayEST > 0 && todayEST <= 25) {
      setCurrentDayIndex(todayEST - 1);
    }
    // Reset opening animation when modal opens/closes
    setIsOpening(false);
  }, [open, todayEST]);

  // Reset opening animation when switching days
  useEffect(() => {
    setIsOpening(false);
  }, [currentDayIndex]);

  // Swipe handlers
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentDayIndex < 24) {
      setCurrentDayIndex(currentDayIndex + 1);
    }
    if (isRightSwipe && currentDayIndex > 0) {
      setCurrentDayIndex(currentDayIndex - 1);
    }
  };

  const handlePrevDay = () => {
    if (currentDayIndex > 0) {
      setCurrentDayIndex(currentDayIndex - 1);
    }
  };

  const handleNextDay = () => {
    if (currentDayIndex < 24) {
      setCurrentDayIndex(currentDayIndex + 1);
    }
  };

  const handleGoToToday = () => {
    if (todayEST > 0 && todayEST <= 25) {
      setCurrentDayIndex(todayEST - 1);
    }
  };

  const handleClaim = (day: number) => {
    claimMutation.mutate(day);
  };

  const handlePresentClick = (day: number, canClaim: boolean, rewardName?: string, rewardDescription?: string) => {
    if (!canClaim || isOpening || claimMutation.isPending || showRewardAnimation) return;

    // Store the reward info for reveal
    setRevealedReward({ name: rewardName || 'Your Reward!', description: rewardDescription });

    // Start the Lottie animation overlay
    setShowRewardAnimation(true);
    setShowRewardReveal(false);

    // After animation plays, show the reward reveal
    setTimeout(() => {
      setShowRewardReveal(true);
    }, 2500); // Lottie animation is ~3.3s, show reward at 2.5s
  };

  const handleClaimAfterAnimation = (day: number) => {
    handleClaim(day);
    setShowRewardAnimation(false);
    setShowRewardReveal(false);
    setRevealedReward(null);
  };

  const handleCloseAnimation = () => {
    setShowRewardAnimation(false);
    setShowRewardReveal(false);
    setRevealedReward(null);
  };

  if (!adventData || !adventData.enabled) {
    return null;
  }

  // Create array for all 25 days
  const allDays = Array.from({ length: 25 }, (_, i) => {
    const day = i + 1;
    const dayData = adventData.calendar?.find((d: any) => d.day === day);
    return dayData || {
      day,
      isFutureDay: true,
      isPastDay: false,
      isCurrentDay: false,
      isClaimed: false,
      isClosed: false,
      canClaim: false,
      rewardName: 'Mystery Reward',
    };
  });

  const currentDay = allDays[currentDayIndex];
  const showGoToToday = Math.abs(currentDayIndex - (todayEST - 1)) >= 2 && todayEST > 0;

  return (
    <>
      {/* Main calendar modal */}
      <Dialog open={open && !showRewardAnimation} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent
          className="max-w-2xl overflow-visible"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {/* Christmas Wind Chimes - hanging from top right */}
          <div className="absolute -top-16 -right-8 w-[384px] h-[384px] pointer-events-none z-10">
            <ChristmasWindChimes />
          </div>

          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
              <div className="w-12 h-12"><ChristmasTree /></div>
              Christmas Presents
              <div className="w-12 h-12"><ChristmasTree /></div>
            </DialogTitle>
            <p className="text-center text-gray-600">
              Open it to receive rewards!
            </p>
            {!adventData.isAuthenticated && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-2 space-y-3">
                <p className="text-sm text-yellow-800 text-center font-semibold">
                  🔐 Log in to claim your daily rewards!
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => {
                      onClose();
                      window.location.href = '/auth?mode=login';
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Log In
                  </Button>
                  <Button
                    onClick={() => {
                      onClose();
                      window.location.href = '/auth?mode=signup';
                    }}
                    variant="outline"
                    className="border-red-600 text-red-600 hover:bg-red-50"
                  >
                    Sign Up
                  </Button>
                </div>
              </div>
            )}
          </DialogHeader>

          {/* Present carousel */}
          <div className="relative py-8 px-4 transition-all duration-500 ease-in-out">
            {/* Navigation arrows */}
            <button
              onClick={handlePrevDay}
              disabled={currentDayIndex === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-6 h-6 text-[#d73a31]" />
            </button>

            <button
              onClick={handleNextDay}
              disabled={currentDayIndex === 24}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-6 h-6 text-[#d73a31]" />
            </button>

            {/* Current present */}
            <div key={currentDay.day} className="flex flex-col items-center justify-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center">
                <h3 className="text-3xl font-bold text-[#d73a31]">December {currentDay.day}</h3>
                {currentDay.day === todayEST && (
                  <span className="inline-block mt-2 px-3 py-1 bg-red-100 text-red-700 text-sm font-semibold rounded-full">
                    Today's Gift!
                  </span>
                )}
              </div>

              {/* Large present with snowman */}
              <div className="flex items-center justify-center gap-4 my-8">
                {/* Snowman to the left */}
                <div className="w-32 h-32 pointer-events-none">
                  <HappySnowman />
                </div>

                <div className="scale-150">
                  <Present
                    day={currentDay.day}
                    onClick={() => handlePresentClick(currentDay.day, currentDay.canClaim, currentDay.rewardName, currentDay.rewardDescription)}
                    disabled={!currentDay.canClaim}
                    claimed={currentDay.isClaimed}
                    isOpening={isOpening}
                  />
                </div>
              </div>

              {/* Day indicator */}
              <div className="text-sm text-gray-500">
                Day {currentDay.day} of 25
              </div>

              {/* Status and action */}
              <div className="w-full max-w-md space-y-4">
                {currentDay.isClosed ? (
                  <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center">
                    <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-700 font-semibold">We're Closed Today</p>
                    <p className="text-sm text-gray-500">Come back tomorrow!</p>
                  </div>
                ) : currentDay.isClaimed ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-green-800 font-semibold">Already Claimed!</p>
                    <p className="text-sm text-green-600">Check your vouchers to use this reward</p>
                    <p className="text-xs text-green-500 mt-1">(The vouchers are on the checkout page)</p>
                    <Button
                      onClick={() => {
                        onClose();
                        window.location.href = '/menu';
                      }}
                      className="mt-3 bg-green-600 hover:bg-green-700 text-white"
                    >
                      Order Now
                    </Button>
                    {adventData?.isAdmin && (
                      <Button
                        onClick={() => resetMutation.mutate(currentDay.day)}
                        disabled={resetMutation.isPending}
                        variant="outline"
                        size="sm"
                        className="mt-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        {resetMutation.isPending ? 'Resetting...' : 'Reset for Testing'}
                      </Button>
                    )}
                  </div>
                ) : currentDay.canClaim ? (
                  <>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-sm text-orange-800 text-center">
                        ⚠️ <strong>Use it today!</strong> Expires at 11:59 PM EST
                      </p>
                    </div>
                    {!adventData?.isAuthenticated ? (
                      <div className="space-y-3">
                        <p className="text-center text-sm text-gray-600">Log in to claim your reward</p>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              onClose();
                              window.location.href = '/auth?mode=login';
                            }}
                            className="flex-1 bg-red-600 hover:bg-red-700"
                          >
                            Log In
                          </Button>
                          <Button
                            onClick={() => {
                              onClose();
                              window.location.href = '/auth?mode=signup';
                            }}
                            variant="outline"
                            className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                          >
                            Sign Up
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-center text-lg font-medium text-red-600 italic">
                        ✨ Click the present above to open! ✨
                      </p>
                    )}
                  </>
                ) : currentDay.isFutureDay ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <Lock className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                    <p className="text-blue-800 font-semibold">Coming Soon!</p>
                    <p className="text-sm text-blue-600">Available on December {currentDay.day}</p>
                  </div>
                ) : currentDay.isCurrentDay && !adventData?.isAuthenticated ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center space-y-3">
                    <Lock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                    <p className="text-yellow-800 font-semibold">Locked</p>
                    <p className="text-sm text-yellow-700">You have to log in to open this present</p>
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={() => {
                          onClose();
                          window.location.href = '/auth?mode=login';
                        }}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Log In
                      </Button>
                      <Button
                        onClick={() => {
                          onClose();
                          window.location.href = '/auth?mode=signup';
                        }}
                        variant="outline"
                        className="border-red-600 text-red-600 hover:bg-red-50"
                      >
                        Sign Up
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 border border-gray-300 rounded-lg p-4 text-center">
                    <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-700 font-semibold">Expired</p>
                    <p className="text-sm text-gray-500">This reward is no longer available</p>
                  </div>
                )}
              </div>

              {/* Go to Today button */}
              {showGoToToday && (
                <Button
                  onClick={handleGoToToday}
                  variant="outline"
                  className="mt-4"
                >
                  <CalendarDays className="w-4 h-4 mr-2" />
                  Go Back to Today
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reward Animation Overlay */}
      {showRewardAnimation && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center">
          <div className="relative flex flex-col items-center justify-center">
            {/* Lottie Animation - separate component to force re-mount */}
            <div
              className={`transition-opacity duration-500 ${showRewardReveal ? 'opacity-0' : 'opacity-100'}`}
              style={{ width: 300, height: 300 }}
            >
              <GiftOpeningAnimation />
            </div>

            {/* Reward Reveal */}
            {showRewardReveal && (
              <div className="absolute inset-0 flex flex-col items-center justify-center animate-in fade-in zoom-in duration-500">
                <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-2xl p-8 shadow-2xl text-center max-w-sm mx-4">
                  <div className="text-6xl mb-4">🎁</div>
                  <h3 className="text-2xl font-bold text-white mb-2">You Won!</h3>
                  <p className="text-xl font-semibold text-yellow-200 mb-2">
                    {revealedReward?.name}
                  </p>
                  {revealedReward?.description && (
                    <p className="text-sm text-white/80 mb-4">{revealedReward.description}</p>
                  )}
                  <div className="space-y-2 mt-6">
                    <Button
                      onClick={() => handleClaimAfterAnimation(currentDay.day)}
                      disabled={claimMutation.isPending}
                      className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold"
                      size="lg"
                    >
                      {claimMutation.isPending ? 'Claiming...' : 'Claim Reward!'}
                    </Button>
                    <button
                      onClick={handleCloseAnimation}
                      className="text-white/70 hover:text-white text-sm underline"
                    >
                      Maybe later
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
