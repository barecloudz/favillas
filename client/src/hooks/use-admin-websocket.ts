import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-supabase-auth';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

interface AdminWebSocketMessage {
  type: string;
  orderId?: number;
  order?: any;
}

interface AdminWebSocketHookOptions {
  onNewOrder?: (order: any) => void;
  onOrderUpdate?: (order: any) => void;
  enableSounds?: boolean;
  soundType?: 'chime' | 'bell' | 'ding' | 'beep' | 'dingbell' | 'custom';
  volume?: number; // 0.0 to 1.0
  customSoundUrl?: string;
}

export const useAdminWebSocket = (options: AdminWebSocketHookOptions = {}) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const dingbellAudioRef = useRef<HTMLAudioElement | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 3;
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckedOrderRef = useRef<string | null>(null);
  const realtimeChannelRef = useRef<RealtimeChannel | null>(null);

  // Store callbacks in refs to avoid recreating connect/disconnect on every render
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Initialize audio context for sound notifications
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

        // Add user interaction listeners to enable audio context
        const enableAudio = async () => {
          if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
            try {
              await audioContextRef.current.resume();
              // console.log('🔊 Audio context enabled for notifications');
            } catch (error) {
              console.warn('Failed to resume audio context:', error);
            }
          }
        };

        // Enable audio on any user interaction
        ['click', 'touchstart', 'keydown'].forEach(event => {
          document.addEventListener(event, enableAudio, { once: true });
        });
      } catch (error) {
        console.warn('Audio context not available:', error);
      }
    }

    // Preload dingbell audio for iOS (self-hosted to reduce Supabase storage egress)
    if (!dingbellAudioRef.current && typeof window !== 'undefined') {
      const dingBellUrl = '/sounds/bellsound.wav'; // Self-hosted in public/sounds/
      dingbellAudioRef.current = new Audio(dingBellUrl);
      dingbellAudioRef.current.preload = 'auto';
      dingbellAudioRef.current.load();
      // console.log('🔔 Preloaded dingbell audio');
    }
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(async () => {
    console.log('🔊 playNotificationSound called', {
      enableSounds: optionsRef.current.enableSounds,
      hasAudioContext: !!audioContextRef.current,
      audioContextState: audioContextRef.current?.state
    });

    if (!optionsRef.current.enableSounds) {
      console.warn('⚠️ Sounds disabled - skipping playback');
      return;
    }

    if (!audioContextRef.current) {
      console.error('❌ No audio context - cannot play sound');
      return;
    }

    try {
      // Resume audio context if suspended (CRITICAL for iOS/iPad)
      // iOS Safari suspends audio context aggressively, must resume before every playback
      if (audioContextRef.current.state === 'suspended') {
        console.log('🔄 Audio context suspended, resuming...');
        await audioContextRef.current.resume();
        console.log('✅ Audio context resumed, state:', audioContextRef.current.state);
      }

      const soundType = optionsRef.current.soundType || 'chime';
      const volume = optionsRef.current.volume !== undefined ? optionsRef.current.volume : 0.3;
      const gainNode = audioContextRef.current.createGain();
      gainNode.connect(audioContextRef.current.destination);

      if (soundType === 'chime') {
        // Two-tone chime (default)
        const oscillator1 = audioContextRef.current.createOscillator();
        const oscillator2 = audioContextRef.current.createOscillator();

        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);

        oscillator1.frequency.setValueAtTime(800, audioContextRef.current.currentTime);
        oscillator2.frequency.setValueAtTime(1200, audioContextRef.current.currentTime + 0.15);

        gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContextRef.current.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.4);

        oscillator1.start(audioContextRef.current.currentTime);
        oscillator1.stop(audioContextRef.current.currentTime + 0.15);
        oscillator2.start(audioContextRef.current.currentTime + 0.15);
        oscillator2.stop(audioContextRef.current.currentTime + 0.4);

      } else if (soundType === 'bell') {
        // Use uploaded bell sound from Supabase
        const bellSoundUrl = 'https://tamsxlebouauwiivoyxa.supabase.co/storage/v1/object/public/notification-sounds/bellsound.wav';
        try {
          const audio = new Audio(bellSoundUrl);
          audio.volume = volume;
          await audio.play();
          return; // Exit early since we're using HTML5 Audio
        } catch (error) {
          console.warn('Failed to play bell sound, using synthesized fallback:', error);
        }

        // Fallback: Bell sound with harmonics
        const fundamental = audioContextRef.current.createOscillator();
        const harmonic2 = audioContextRef.current.createOscillator();
        const harmonic3 = audioContextRef.current.createOscillator();

        fundamental.connect(gainNode);
        harmonic2.connect(gainNode);
        harmonic3.connect(gainNode);

        fundamental.frequency.setValueAtTime(523, audioContextRef.current.currentTime); // C5
        harmonic2.frequency.setValueAtTime(659, audioContextRef.current.currentTime); // E5
        harmonic3.frequency.setValueAtTime(784, audioContextRef.current.currentTime); // G5

        gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContextRef.current.currentTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 1.0);

        fundamental.start(audioContextRef.current.currentTime);
        harmonic2.start(audioContextRef.current.currentTime);
        harmonic3.start(audioContextRef.current.currentTime);
        fundamental.stop(audioContextRef.current.currentTime + 1.0);
        harmonic2.stop(audioContextRef.current.currentTime + 1.0);
        harmonic3.stop(audioContextRef.current.currentTime + 1.0);

      } else if (soundType === 'ding') {
        // Single high-pitched ding
        const oscillator = audioContextRef.current.createOscillator();
        oscillator.connect(gainNode);

        oscillator.frequency.setValueAtTime(1480, audioContextRef.current.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(1480 * 0.8, audioContextRef.current.currentTime + 0.1);

        gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContextRef.current.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.3);

        oscillator.start(audioContextRef.current.currentTime);
        oscillator.stop(audioContextRef.current.currentTime + 0.3);

      } else if (soundType === 'beep') {
        // Sharp beep sound
        const oscillator = audioContextRef.current.createOscillator();
        oscillator.connect(gainNode);
        oscillator.type = 'square';

        oscillator.frequency.setValueAtTime(1000, audioContextRef.current.currentTime);

        gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);
        gainNode.gain.linearRampToValueAtTime(volume, audioContextRef.current.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, audioContextRef.current.currentTime + 0.15);

        oscillator.start(audioContextRef.current.currentTime);
        oscillator.stop(audioContextRef.current.currentTime + 0.15);

      } else if (soundType === 'dingbell') {
        // Use self-hosted bell sound (optimized to reduce Supabase storage egress)
        // console.log('🔔 Attempting to play dingbell sound');
        try {
          if (!dingbellAudioRef.current) {
            // If not preloaded, create new instance
            const dingBellUrl = '/sounds/bellsound.wav'; // Self-hosted in public/sounds/
            dingbellAudioRef.current = new Audio(dingBellUrl);
          }

          // Reset to beginning and set volume
          dingbellAudioRef.current.currentTime = 0;
          dingbellAudioRef.current.volume = volume;

          const playPromise = dingbellAudioRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
            // console.log('✅ Dingbell sound played successfully');
          }
        } catch (error: any) {
          console.error('❌ Failed to play ding bell sound:', error);
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);

          // If audio fails, show a toast to prompt user interaction
          if (error.name === 'NotAllowedError') {
            console.warn('⚠️ Audio blocked - user interaction required. Click "Test Sound" button first to enable audio on iPad.');
          }
        }
        return; // Exit early since we're using HTML5 Audio

      } else if (soundType === 'custom' && optionsRef.current.customSoundUrl) {
        // Play custom uploaded audio file (base64 data URL)
        try {
          const audio = new Audio(optionsRef.current.customSoundUrl);
          audio.volume = volume;

          // Ensure audio can load and play
          audio.addEventListener('canplay', () => {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.warn('Failed to play custom sound:', error);
              });
            }
          });

          audio.addEventListener('error', (error) => {
            console.warn('Custom audio error:', error);
          });

          // If already can play, play immediately
          if (audio.readyState >= 2) {
            const playPromise = audio.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.warn('Failed to play custom sound:', error);
              });
            }
          }
        } catch (error) {
          console.warn('Failed to create custom audio:', error);
        }
        return; // Exit early since we're using HTML5 Audio instead of Web Audio API
      }
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }, []); // No dependencies - uses optionsRef.current

  // Supabase Broadcast-based notifications for production (Netlify)
  // This replaces expensive HTTP polling that was causing ~2TB/month egress
  // Uses Broadcast (not postgres_changes) so it doesn't require database replication
  const startRealtimeNotifications = useCallback(() => {
    console.log('🔌 Starting Supabase Broadcast notifications...');

    // Use a fixed channel name so all clients listen on the same channel
    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'broadcast',
        { event: 'new-order' },
        (payload) => {
          const newOrder = payload.payload as any;
          console.log('🆕 New order received via Supabase Broadcast:', newOrder);

          console.log('🔔 NEW ORDER DETECTED via Broadcast!');

          // Play notification sound
          console.log('🔊 Playing notification sound...');
          playNotificationSound();

          // Invalidate all order-related queries to refresh the UI
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
          queryClient.invalidateQueries({ queryKey: ['/api/kitchen/orders'] });
          console.log('🔄 Invalidated order queries to refresh UI');

          // Call callback if provided
          if (optionsRef.current.onNewOrder) {
            console.log('🖨️ Calling onNewOrder callback for auto-print...');
            optionsRef.current.onNewOrder(newOrder);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'order-confirmed' },
        (payload) => {
          const confirmedOrder = payload.payload as any;
          console.log('🔔 ORDER CONFIRMED via Broadcast!', confirmedOrder);

          // Play notification sound
          playNotificationSound();

          // Invalidate queries
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
          queryClient.invalidateQueries({ queryKey: ['/api/kitchen/orders'] });

          // Call callback if provided
          if (optionsRef.current.onNewOrder) {
            optionsRef.current.onNewOrder(confirmedOrder);
          }
        }
      )
      .on(
        'broadcast',
        { event: 'order-updated' },
        (payload) => {
          const updatedOrder = payload.payload as any;
          console.log('🔄 Order updated via Broadcast:', updatedOrder);

          // Invalidate queries on order updates for UI refresh
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
          queryClient.invalidateQueries({ queryKey: ['/api/kitchen/orders'] });

          // Call order update callback if provided
          if (optionsRef.current.onOrderUpdate) {
            optionsRef.current.onOrderUpdate(updatedOrder);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Admin Supabase Broadcast status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to order broadcasts on channel: kitchen-orders');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to order broadcasts');
        }
      });

    realtimeChannelRef.current = channel;
  }, [playNotificationSound, queryClient]);

  const stopRealtimeNotifications = useCallback(() => {
    // Clean up old polling interval if it exists
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    // Clean up Supabase Realtime channel
    if (realtimeChannelRef.current) {
      console.log('🔌 Cleaning up Supabase Realtime subscription...');
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!user?.id) return;

    // Temporary debugging flag - disable WebSocket completely
    const isWebSocketDisabled = false; // Set to false to re-enable WebSocket

    if (isWebSocketDisabled) {
      console.log('🚫 Admin WebSocket temporarily disabled for debugging');
      return;
    }

    // Skip WebSocket connections in production (Netlify doesn't support WebSockets)
    const isNetlifyProduction = typeof window !== 'undefined' &&
      (window.location.hostname.includes('netlify.app') ||
       process.env.NODE_ENV === 'production');

    if (isNetlifyProduction) {
      console.log('📡 Admin WebSocket disabled in production (Netlify deployment)');

      // Start Supabase Realtime for new orders (handles both sounds AND auto-print via onNewOrder callback)
      // This replaces expensive HTTP polling that was causing ~2TB/month egress
      console.log('🔄 Starting Supabase Realtime notifications for production...');
      startRealtimeNotifications();
      return;
    }

    // Stop trying to reconnect after max attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('Admin WebSocket: Max reconnection attempts reached, stopping');
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Use the correct port for local development
      const port = window.location.port === '5173' ? '5000' : window.location.port;
      const wsUrl = `${protocol}//${window.location.hostname}:${port}/ws`;

      // console.log('Admin WebSocket connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Admin WebSocket connected');
        // Reset reconnection attempts on successful connection
        reconnectAttemptsRef.current = 0;
        // Register as kitchen client to receive order notifications
        ws.send(JSON.stringify({
          type: 'register',
          client: 'kitchen',
          userId: user.id
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: AdminWebSocketMessage = JSON.parse(event.data);
          // console.log('Admin WebSocket message received:', message);

          if (message.type === 'newOrder') {
            // console.log('New order received:', message.order);
            // Play notification sound
            playNotificationSound();
            // Call callback if provided
            if (optionsRef.current.onNewOrder) {
              optionsRef.current.onNewOrder(message.order);
            }
          } else if (message.type === 'orderStatusUpdate' || message.type === 'orderStatusChanged') {
            // console.log('Order status updated:', message.order);
            // Call callback if provided
            if (optionsRef.current.onOrderUpdate) {
              optionsRef.current.onOrderUpdate(message.order);
            }
          }
        } catch (error) {
          console.error('Error parsing admin WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('Admin WebSocket disconnected');
        reconnectAttemptsRef.current += 1;

        // Only attempt to reconnect if under max attempts
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000); // Exponential backoff, max 10s
          console.log(`Admin WebSocket: Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else {
          console.log('Admin WebSocket: Max reconnection attempts reached, giving up');
        }
      };

      ws.onerror = (error) => {
        console.error('Admin WebSocket error:', error);
        ws.close();
      };
    } catch (error) {
      console.error('Failed to connect admin WebSocket:', error);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    }
  }, [user?.id, playNotificationSound, startRealtimeNotifications]); // Use optionsRef instead of options dependencies

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop realtime notifications
    stopRealtimeNotifications();

    // Reset reconnection attempts when manually disconnecting
    reconnectAttemptsRef.current = 0;
  }, [stopRealtimeNotifications]);

  useEffect(() => {
    if (user?.id) {
      initAudioContext();
      connect();
    }

    return () => {
      disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only re-run when user ID changes, not when callbacks change

  const retry = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [disconnect, connect]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      // console.log('WebSocket message sent:', message);
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  }, []);

  return {
    ws: wsRef.current,
    playTestSound: playNotificationSound,
    sendMessage: sendMessage,
    retry: retry,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    reconnectAttempts: reconnectAttemptsRef.current
  };
};