import { useQuery } from '@tanstack/react-query';

export interface AnimationSettings {
  id: number;
  animation_key: string;
  is_enabled: boolean;
  settings: {
    density?: number;
    speed?: string;
    [key: string]: any;
  };
  pages: string[];
  start_date?: string;
  end_date?: string;
}

export function useAnimations() {
  const { data: animations = [], isLoading, error } = useQuery<AnimationSettings[]>({
    queryKey: ['/api/animations'],
    queryFn: async () => {
      const response = await fetch('/api/animations');
      if (!response.ok) {
        throw new Error('Failed to fetch animations');
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Helper to check if specific animation is enabled
  const isAnimationEnabled = (key: string, currentPage?: string): boolean => {
    const animation = animations.find(a => a.animation_key === key);
    if (!animation || !animation.is_enabled) return false;

    // Check if animation should show on current page
    if (currentPage && animation.pages.length > 0) {
      if (animation.pages.includes('all')) return true;
      return animation.pages.includes(currentPage);
    }

    return true;
  };

  return {
    animations,
    isLoading,
    error,
    isAnimationEnabled,
    snowEnabled: isAnimationEnabled('snow_fall'),
  };
}
