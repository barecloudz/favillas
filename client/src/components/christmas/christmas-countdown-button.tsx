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

  // Don't show if not enabled or not in December
  if (!adventData?.enabled) {
    return null;
  }

  const { daysUntilChristmas } = adventData;

  return (
    <button
      onClick={onClick}
      className="relative flex flex-col items-center justify-center p-2 group"
      aria-label={`${daysUntilChristmas} days until Christmas`}
    >
      {/* Red circle with number */}
      <div className="relative">
        <div className="w-14 h-14 rounded-full border-3 border-[#d73a31] bg-white flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all group-hover:scale-110 animate-pulse">
          <div className="text-center">
            <div className="text-2xl font-bold text-[#d73a31]">
              {daysUntilChristmas}
            </div>
          </div>
        </div>

        {/* Gift icon badge */}
        <div className="absolute -top-1 -right-1 bg-[#d73a31] rounded-full p-1.5 shadow-md">
          <Gift className="w-4 h-4 text-white" />
        </div>

        {/* Notification dot if unclaimed rewards */}
        {adventData?.calendar?.some((day: any) => day.canClaim) && (
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-bounce" />
        )}
      </div>

      {/* Label */}
      <span className="text-xs font-medium text-gray-600 mt-1">Days</span>
    </button>
  );
};
