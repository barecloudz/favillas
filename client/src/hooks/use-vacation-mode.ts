import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface VacationMode {
  isEnabled: boolean;
  startDate: string;
  endDate: string;
  message: string;
  reason: string;
  isPaused: boolean;
  pauseMessage: string;
}

export function useVacationMode() {
  const { data, isLoading, error } = useQuery<VacationMode>({
    queryKey: ['/api/vacation-mode'],
    queryFn: async () => {
      const response = await fetch('/.netlify/functions/vacation-mode');
      if (!response.ok) {
        throw new Error('Failed to fetch vacation mode status');
      }
      return response.json();
    },
    // Refetch every 30 seconds to keep status fresh
    refetchInterval: 30000,
    // Always fetch on mount to ensure latest status
    staleTime: 0,
  });

  const isOrderingPaused = data?.isEnabled || data?.isPaused || false;
  const displayMessage = data?.isEnabled
    ? data.message
    : data?.isPaused
      ? data.pauseMessage
      : '';

  return {
    isOrderingPaused,
    displayMessage,
    vacationMode: data,
    isLoading,
    error,
  };
}
