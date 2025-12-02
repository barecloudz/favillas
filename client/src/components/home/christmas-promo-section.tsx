import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLottie } from 'lottie-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Gift } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { AdventCalendarModal } from '@/components/christmas/advent-calendar-modal';
import christmasTreeAnimation from '@/assets/animations/christmas-tree.json';

const ChristmasTree: React.FC = () => {
  const { View } = useLottie({
    animationData: christmasTreeAnimation,
    loop: true,
    autoplay: true,
  });
  return <>{View}</>;
};

const ChristmasPromoSection: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  // Check if it's December client-side for instant rendering
  const now = new Date();
  const isDecember = now.getMonth() === 11; // December is month 11 (0-indexed)
  const currentDay = now.getDate();
  const clientDaysUntilChristmas = Math.max(0, 25 - currentDay);

  const { data: adventData, isLoading } = useQuery({
    queryKey: ['/api/advent-calendar'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/advent-calendar');
      return response.json();
    },
    // Only fetch if it's December
    enabled: isDecember,
  });

  // Not December - don't show
  if (!isDecember) {
    return null;
  }

  // API returned and feature is disabled - don't show
  if (!isLoading && adventData && !adventData.enabled) {
    return null;
  }

  // Use API data if available, otherwise use client-side calculation
  const daysUntilChristmas = adventData?.daysUntilChristmas ?? clientDaysUntilChristmas;

  return (
    <section className="py-12 px-4 bg-gradient-to-b from-red-50 to-green-50">
      <div className="max-w-4xl mx-auto">
        {/* Christmas Tree Animation - Centered above card */}
        <div className="flex justify-center mb-6">
          <div className="w-48 h-48 md:w-64 md:h-64">
            <ChristmasTree />
          </div>
        </div>

        {/* Info Card */}
        <Card className="border-2 border-red-200 shadow-lg bg-white/90 backdrop-blur">
          <CardContent className="p-6 md:p-8">
            {/* Days Until Christmas Header */}
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              <span className="text-red-600">{daysUntilChristmas}</span>
              <span className="text-green-700"> Days Until Christmas!</span>
            </h2>

            {/* Main Description */}
            <p className="text-center text-gray-700 text-lg mb-6">
              Open a present every day from December 1st - 25th and claim a special reward!
            </p>

            {/* How it works */}
            <div className="bg-gradient-to-r from-red-50 to-green-50 rounded-lg p-4 md:p-6">
              <h3 className="font-bold text-gray-800 mb-3 text-center">To open your present:</h3>
              <div className="space-y-2 text-gray-700">
                <p className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">Mobile:</span>
                  <span>Tap the Christmas countdown button in the bottom navigation bar</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">Desktop:</span>
                  <span>Click the floating button in the bottom-right corner</span>
                </p>
              </div>
            </div>

            {/* Sign in notice */}
            <p className="text-center text-sm text-gray-500 mt-4">
              Sign in or create a free account to participate. Rewards expire everyday at 11:59 PM EST!
            </p>

            {/* Or click here button */}
            <div className="flex justify-center mt-6">
              <Button
                onClick={() => setShowModal(true)}
                className="bg-gradient-to-r from-red-600 to-green-600 hover:from-red-700 hover:to-green-700 text-white font-bold py-3 px-6 rounded-full shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <Gift className="w-5 h-5 mr-2" />
                Or click here to open your present!
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advent Calendar Modal */}
      <AdventCalendarModal
        open={showModal}
        onClose={() => setShowModal(false)}
      />
    </section>
  );
};

export default ChristmasPromoSection;
