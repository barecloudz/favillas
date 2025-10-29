import { useQuery } from '@tanstack/react-query';

interface StoreHours {
  dayOfWeek: number;
  dayName: string;
  isOpen: boolean;
  openTime: string | null;
  closeTime: string | null;
  isBreakTime: boolean;
  breakStartTime: string | null;
  breakEndTime: string | null;
}

interface StoreStatus {
  isOpen: boolean;
  isPastCutoff: boolean;
  message: string;
  canPlaceAsapOrders: boolean;
  currentTime: string;
  minutesUntilClose?: number;
  storeHours: StoreHours | null;
}

export function useStoreStatus() {
  const { data, isLoading, error } = useQuery<StoreStatus>({
    queryKey: ['/api/store-status'],
    queryFn: async () => {
      const response = await fetch('/.netlify/functions/store-status');
      if (!response.ok) {
        throw new Error('Failed to fetch store status');
      }
      return response.json();
    },
    // Refetch every 60 seconds to keep status fresh
    refetchInterval: 60000,
    // Always fetch on mount to ensure latest status
    staleTime: 0,
  });

  const isPastCutoff = data?.isPastCutoff || false;
  const canPlaceAsapOrders = data?.canPlaceAsapOrders || false;
  const cutoffMessage = data?.message || '';

  return {
    isPastCutoff,
    canPlaceAsapOrders,
    cutoffMessage,
    storeStatus: data,
    isLoading,
    error,
  };
}
