import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './use-supabase-auth';
import { supabase } from '@/lib/supabase';

interface AdminWebSocketMessage {
  type: string;
  orderId?: number;
  order?: any;
}

interface AdminWebSocketHookOptions {
  onNewOrder?: (order: any) => void;
  onOrderUpdate?: (order: any) => void;
  enableSounds?: boolean;
  soundType?: 'chime' | 'bell' | 'ding' | 'beep' | 'custom';
  volume?: number; // 0.0 to 1.0
  customSoundUrl?: string;
}

export const useAdminWebSocket = (options: AdminWebSocketHookOptions = {}) => {
  const { user } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 3;
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckedOrderRef = useRef<string | null>(null);

  // Initialize audio context for sound notifications
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current && typeof window !== 'undefined') {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Audio context not available:', error);
      }
    }
  }, []);

  // Play notification sound
  const playNotificationSound = useCallback(async () => {
    if (!options.enableSounds || !audioContextRef.current) return;

    try {
      // Resume audio context if suspended (required by some browsers)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      const soundType = options.soundType || 'chime';
      const volume = options.volume !== undefined ? options.volume : 0.3;
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
        // Bell sound with harmonics
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

      } else if (soundType === 'custom' && options.customSoundUrl) {
        // Play custom uploaded audio file (base64 data URL)
        try {
          const audio = new Audio(options.customSoundUrl);
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
  }, [options.enableSounds, options.soundType, options.volume, options.customSoundUrl]);

  // Polling-based notifications for production (Netlify)
  const startPollingNotifications = useCallback(() => {
    const checkForNewOrders = async () => {
      try {
        console.log('🔍 Polling for new orders...');

        // Get the current auth session (same method as other API calls)
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        console.log('🔑 Auth token available:', !!token);

        if (!token) {
          console.warn('⚠️ No auth token available - skipping polling');
          return;
        }

        const response = await fetch('/api/orders?limit=5', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const orders = await response.json();
          console.log('📊 Polling response:', { ordersCount: orders.length, orders: orders.map(o => ({ id: o.id, created_at: o.created_at })) });

          if (orders.length > 0) {
            const latestOrder = orders[0];
            const latestOrderId = latestOrder.id;

            console.log('🆔 Latest order ID:', latestOrderId, 'Last checked:', lastCheckedOrderRef.current);

            // On first run, just store the latest order ID without notification
            if (lastCheckedOrderRef.current === null) {
              lastCheckedOrderRef.current = latestOrderId;
              console.log('📝 Initial setup - storing latest order ID:', latestOrderId);
              return;
            }

            // Check if this is a new order
            if (lastCheckedOrderRef.current !== latestOrderId) {
              console.log('🔔 NEW ORDER DETECTED via polling!');
              console.log('📦 Order details:', latestOrder);

              // Play notification sound
              playNotificationSound();

              // Call callback if provided
              if (options.onNewOrder) {
                options.onNewOrder(latestOrder);
              }

              // Update the last checked order
              lastCheckedOrderRef.current = latestOrderId;
            } else {
              console.log('✅ No new orders since last check');
            }
          } else {
            console.log('📭 No orders found');
          }
        } else {
          console.error('❌ Failed to fetch orders:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('💥 Polling error:', error);
      }
    };

    // Start polling every 5 seconds for responsive notifications
    pollingIntervalRef.current = setInterval(checkForNewOrders, 5000);

    // Check immediately
    checkForNewOrders();
  }, [options.onNewOrder, playNotificationSound]);

  const stopPollingNotifications = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
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
      console.log('Admin WebSocket disabled in production (Netlify deployment)');

      // Only start polling if notifications are enabled
      if (options.enableSounds) {
        console.log('🔄 Starting polling-based notifications for production...');
        startPollingNotifications();
      } else {
        console.log('🔇 Notifications disabled - skipping polling');
      }
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

      console.log('Admin WebSocket connecting to:', wsUrl);
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
          console.log('Admin WebSocket message received:', message);

          if (message.type === 'newOrder') {
            console.log('New order received:', message.order);
            // Play notification sound
            playNotificationSound();
            // Call callback if provided
            if (options.onNewOrder) {
              options.onNewOrder(message.order);
            }
          } else if (message.type === 'orderStatusUpdate' || message.type === 'orderStatusChanged') {
            console.log('Order status updated:', message.order);
            // Call callback if provided
            if (options.onOrderUpdate) {
              options.onOrderUpdate(message.order);
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
  }, [user?.id, options.onNewOrder, options.onOrderUpdate, playNotificationSound]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Stop polling notifications
    stopPollingNotifications();

    // Reset reconnection attempts when manually disconnecting
    reconnectAttemptsRef.current = 0;
  }, [stopPollingNotifications]);

  useEffect(() => {
    if (user?.id) {
      initAudioContext();
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user?.id, connect, disconnect, initAudioContext]);

  const retry = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [disconnect, connect]);

  return {
    ws: wsRef.current,
    playTestSound: playNotificationSound,
    retry: retry,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    reconnectAttempts: reconnectAttemptsRef.current
  };
};