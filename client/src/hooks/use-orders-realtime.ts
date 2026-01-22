import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface OrdersRealtimeOptions {
  onNewOrder?: (order: any) => void;
  onOrderUpdate?: (order: any) => void;
  enabled?: boolean;
}

/**
 * Hook to subscribe to real-time order updates via Supabase Broadcast.
 *
 * This replaces expensive polling (which was causing ~2TB/month egress)
 * with push-based updates that cost nearly nothing.
 *
 * Uses Broadcast (not postgres_changes) so it doesn't require database replication.
 * The server broadcasts messages when orders are created/updated.
 *
 * Benefits:
 * - Instant notifications (faster than 5-second polling)
 * - Near-zero egress cost
 * - No database replication required
 */
export const useOrdersRealtime = (options: OrdersRealtimeOptions = {}) => {
  const { enabled = true } = options;
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const optionsRef = useRef(options);

  // Keep options ref updated
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const invalidateOrderQueries = useCallback(() => {
    // Invalidate all order-related queries to trigger refetch
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
    queryClient.invalidateQueries({ queryKey: ['/api/kitchen/orders'] });
  }, [queryClient]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    console.log('🔌 Setting up Supabase Broadcast subscription for orders...');

    // Use a fixed channel name so all clients listen on the same channel
    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'broadcast',
        { event: 'new-order' },
        (payload) => {
          console.log('🆕 New order received via Broadcast:', payload);

          // Invalidate queries to refresh the order list
          invalidateOrderQueries();

          // Call the callback if provided
          if (optionsRef.current.onNewOrder) {
            optionsRef.current.onNewOrder(payload.payload);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'order-updated' },
        (payload) => {
          console.log('🔄 Order updated via Broadcast:', payload);

          // Invalidate queries to refresh the order list
          invalidateOrderQueries();

          // Call the callback if provided
          if (optionsRef.current.onOrderUpdate) {
            optionsRef.current.onOrderUpdate(payload.payload);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Supabase Broadcast subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to order broadcasts on channel: kitchen-orders');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to order broadcasts');
        }
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      console.log('🔌 Cleaning up Supabase Broadcast subscription...');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, invalidateOrderQueries]);

  return {
    isConnected: channelRef.current !== null,
  };
};
