import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, Lock, Check, Calendar as CalendarIcon, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface AdventCalendarModalProps {
  open: boolean;
  onClose: () => void;
}

// Animated present component using SVG giftboxes
const Present: React.FC<{ day: number; onClick: () => void; disabled: boolean; claimed: boolean }> = ({
  day,
  onClick,
  disabled,
  claimed
}) => {
  // Cycle through 9 giftbox variations (3 columns x 3 rows)
  const giftVariation = ((day - 1) % 9);
  const col = giftVariation % 3;
  const row = Math.floor(giftVariation / 3);

  // SVG viewBox is 0 0 76306 89187, boxes are in 3x3 grid
  const boxWidth = 76306 / 3;
  const boxHeight = 89187 / 3;
  const viewBoxX = col * boxWidth;
  const viewBoxY = row * boxHeight;

  return (
    <div
      onClick={!disabled ? onClick : undefined}
      className={`relative cursor-pointer transform transition-all duration-300 ${
        disabled || claimed ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110 animate-bounce'
      }`}
    >
      {/* SVG Present box */}
      <div className="relative w-20 h-20">
        <svg
          width="80"
          height="80"
          viewBox={`${viewBoxX} ${viewBoxY} ${boxWidth} ${boxHeight}`}
          className={`w-full h-full ${claimed ? 'opacity-60 grayscale' : ''}`}
          style={{
            filter: claimed ? 'grayscale(100%)' : 'none',
          }}
        >
          <image
            href="/images/giftboxes.svg"
            width="76306"
            height="89187"
            x="0"
            y="0"
          />
        </svg>

        {/* Day number badge */}
        <div className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold shadow-lg border-2 border-white">
          {day}
        </div>

        {/* Status icon */}
        {claimed && (
          <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 shadow-md">
            <Check className="w-3 h-3 text-white" />
          </div>
        )}
        {disabled && !claimed && (
          <div className="absolute -bottom-1 -right-1 bg-gray-500 rounded-full p-1 shadow-md">
            <Lock className="w-3 h-3 text-white" />
          </div>
        )}
      </div>
    </div>
  );
};

export const AdventCalendarModal: React.FC<AdventCalendarModalProps> = ({ open, onClose }) => {
  const { toast } = useToast();
  const [selectedDay, setSelectedDay] = useState<any>(null);

  const { data: adventData, isLoading } = useQuery({
    queryKey: ['/api/advent-calendar'],
    queryFn: async () => {
      const response = await fetch('/api/advent-calendar', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch advent calendar');
      return response.json();
    },
    enabled: open,
  });

  const claimMutation = useMutation({
    mutationFn: async (day: number) => {
      const response = await fetch('/api/advent-calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ day }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to claim reward');
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/advent-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user/vouchers'] });

      toast({
        title: '🎁 Reward Claimed!',
        description: data.message || 'Check your vouchers to use your reward!',
      });

      setSelectedDay(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to claim reward',
        variant: 'destructive',
      });
    },
  });

  const handleDayClick = (dayData: any) => {
    // Check if day is marked as closed
    if (dayData.isClosed) {
      toast({
        title: "We're Closed Today",
        description: "Come back tomorrow for your reward!",
        variant: 'default',
      });
      return;
    }

    // Check if user is logged in
    if (!adventData?.isAuthenticated) {
      toast({
        title: 'Login Required',
        description: 'You must be logged in to receive Christmas rewards',
        variant: 'destructive',
      });
      return;
    }

    setSelectedDay(dayData);
  };

  const handleClaim = () => {
    if (selectedDay) {
      claimMutation.mutate(selectedDay.day);
    }
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

  return (
    <>
      {/* Main calendar modal */}
      <Dialog open={open && !selectedDay} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
              <Gift className="w-6 h-6 text-red-500" />
              🎄 Christmas Presents 🎄
              <Gift className="w-6 h-6 text-red-500" />
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

          {/* Calendar grid */}
          <div className="grid grid-cols-5 gap-4 p-4">
            {allDays.map((dayData) => (
              <div key={dayData.day} className="flex flex-col items-center gap-2">
                <Present
                  day={dayData.day}
                  onClick={() => handleDayClick(dayData)}
                  disabled={(!dayData.canClaim && !dayData.isClaimed) || dayData.isClosed}
                  claimed={dayData.isClaimed}
                />
                <div className="text-xs text-center">
                  {dayData.isClosed && <span className="text-gray-500 font-semibold">Closed</span>}
                  {!dayData.isClosed && dayData.isClaimed && <span className="text-green-600 font-semibold">Claimed!</span>}
                  {!dayData.isClosed && dayData.isCurrentDay && !dayData.isClaimed && (
                    <span className="text-red-600 font-semibold">Today!</span>
                  )}
                  {!dayData.isClosed && dayData.isFutureDay && <span className="text-gray-400">Coming</span>}
                  {!dayData.isClosed && dayData.isPastDay && !dayData.isClaimed && (
                    <span className="text-gray-500">Expired</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Reward detail modal */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">December {selectedDay?.day}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {selectedDay?.rewardImage && (
              <img
                src={selectedDay.rewardImage}
                alt={selectedDay.rewardName}
                className="w-full h-48 object-cover rounded-lg"
              />
            )}

            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900">{selectedDay?.rewardName}</h3>
              {selectedDay?.rewardDescription && (
                <p className="text-gray-600 mt-2">{selectedDay.rewardDescription}</p>
              )}
            </div>

            {selectedDay?.canClaim ? (
              <>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800 text-center">
                    ⚠️ <strong>Use it today!</strong> This reward expires at midnight if not claimed.
                  </p>
                </div>
                <Button
                  onClick={handleClaim}
                  disabled={claimMutation.isPending}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  size="lg"
                >
                  {claimMutation.isPending ? 'Unwrapping...' : '🎁 Unwrap & Claim Reward!'}
                </Button>
              </>
            ) : selectedDay?.isClaimed ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <Check className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-800 font-semibold">Already Claimed!</p>
                <p className="text-sm text-green-600">Check your vouchers to use this reward</p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <Lock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">
                  {selectedDay?.isFutureDay && 'Available soon!'}
                  {selectedDay?.isPastDay && 'This reward has expired'}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
