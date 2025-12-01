import React, { useState } from 'react';
import { Gift } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface ChristmasCountdownButtonProps {
  onClick: () => void;
}

export const ChristmasCountdownButton: React.FC<ChristmasCountdownButtonProps> = ({ onClick }) => {
  const { data: adventData } = useQuery({
    queryKey: ['/api/advent-calendar'],
    queryFn: async () => {
      const response = await fetch('/api/advent-calendar');
      if (!response.ok) throw new Error('Failed to fetch advent calendar');
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Don't show if not enabled
  if (!adventData?.enabled) {
    return null;
  }

  const { daysUntilChristmas } = adventData;

  return (
    <>
      {/* Mobile version (in bottom nav) */}
      <button
        onClick={onClick}
        className="relative flex flex-col items-center justify-center p-2 group lg:hidden"
        aria-label={`${daysUntilChristmas} days until Christmas`}
      >
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-3 border-[#d73a31] bg-white flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-110 animate-pulse">
            <div className="text-center flex items-baseline gap-0.5">
              <div className="text-2xl font-bold text-[#d73a31] leading-none">
                {daysUntilChristmas}
              </div>
              <span className="text-[10px] font-medium text-gray-600 leading-none">Days</span>
            </div>
          </div>

          <div className="absolute -top-1 -right-1 bg-[#d73a31] rounded-full p-1.5 shadow-md">
            <Gift className="w-4 h-4 text-white" />
          </div>

          {adventData?.calendar?.some((day: any) => day.canClaim) && (
            <div className="absolute -top-1 -left-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-bounce" />
          )}
        </div>
      </button>

      {/* Desktop version (floating bottom right) */}
      <button
        onClick={onClick}
        className="hidden lg:flex fixed bottom-6 right-6 z-40 flex-col items-center justify-center p-4 bg-white rounded-full shadow-2xl hover:shadow-3xl transition-all hover:scale-110 group border-4 border-[#d73a31] animate-pulse"
        aria-label={`${daysUntilChristmas} days until Christmas - Open Advent Calendar`}
      >
        <div className="relative">
          <div className="flex flex-col items-center">
            <Gift className="w-8 h-8 text-[#d73a31] mb-1" />
            <div className="text-3xl font-bold text-[#d73a31]">
              {daysUntilChristmas}
            </div>
            <span className="text-xs font-semibold text-gray-600 mt-1">
              Days
            </span>
          </div>

          {adventData?.calendar?.some((day: any) => day.canClaim) && (
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-bounce" />
          )}
        </div>
      </button>
    </>
  );
};
