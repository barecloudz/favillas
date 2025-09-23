import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface RestaurantSettings {
  id?: number;
  restaurantName: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  currency: string;
  timezone: string;
  deliveryFee: string;
  minimumOrder: string;
  autoAcceptOrders: boolean;
  sendOrderNotifications: boolean;
  sendCustomerNotifications: boolean;
  outOfStockEnabled: boolean;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  orderSchedulingEnabled: boolean;
  maxAdvanceOrderHours: number;
  createdAt?: string;
  updatedAt?: string;
}

const defaultSettings: RestaurantSettings = {
  restaurantName: "Favilla's NY Pizza",
  address: "123 Main Street, New York, NY 10001",
  phone: "(555) 123-4567",
  email: "info@favillas.com",
  website: "https://favillas.com",
  currency: "USD",
  timezone: "America/New_York",
  deliveryFee: "3.99",
  minimumOrder: "15.00",
  autoAcceptOrders: true,
  sendOrderNotifications: true,
  sendCustomerNotifications: true,
  outOfStockEnabled: false,
  deliveryEnabled: true,
  pickupEnabled: true,
  orderSchedulingEnabled: false,
  maxAdvanceOrderHours: 24,
};

export function useRestaurantSettings() {
  const { data: settingsData, isLoading, error } = useQuery({
    queryKey: ['/api/restaurant-settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/restaurant-settings');
      if (!response.ok) {
        throw new Error('Failed to fetch restaurant settings');
      }
      return await response.json();
    },
    staleTime: 30 * 1000, // 30 seconds - shorter cache so changes appear faster
    gcTime: 2 * 60 * 1000, // 2 minutes
  });

  const settings = settingsData || defaultSettings;

  return {
    settings,
    isLoading,
    error,
    // Convenience getters for common UI usage
    restaurantName: settings.restaurantName,
    address: settings.address,
    phone: settings.phone,
    email: settings.email,
    website: settings.website,
    isOpen: true, // Could be derived from business hours logic
    isAcceptingOrders: settings.autoAcceptOrders,
  };
}