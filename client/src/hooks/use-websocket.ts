import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './use-supabase-auth';
import { useToast } from './use-toast';

interface WebSocketMessage {
  type: string;
  orderId?: number;
  status?: string;
  order?: any;
}

export const useWebSocket = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!user?.id) return;

    // Skip WebSocket connections in production (Netlify doesn't support WebSockets)
    const isNetlifyProduction = typeof window !== 'undefined' && 
      (window.location.hostname.includes('netlify.app') || 
       process.env.NODE_ENV === 'production');
    
    if (isNetlifyProduction) {
      console.log('WebSocket disabled in production (Netlify deployment)');
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // Use the correct port for local development
      const port = window.location.port === '5173' ? '5000' : window.location.port;
      const wsUrl = `${protocol}//${window.location.hostname}:${port}/ws`;
      
      console.log('WebSocket connecting to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        // Register as customer client
        ws.send(JSON.stringify({
          type: 'register',
          client: 'customer',
          userId: user.id
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'orderStatusChanged') {
            // Show toast notification
            const statusText = message.status ? 
              message.status.charAt(0).toUpperCase() + message.status.slice(1) : 
              'Unknown';
            toast({
              title: `Order #${message.orderId} Updated`,
              description: `Your order status has been updated to: ${statusText}`,
            });
            
            // Trigger a page refresh or cache invalidation
            window.dispatchEvent(new CustomEvent('orderStatusChanged', {
              detail: { orderId: message.orderId, status: message.status, order: message.order }
            }));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 5 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Close the connection on error to prevent further issues
        ws.close();
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      // Clear any existing reconnect timeout
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    }
  }, [user?.id, toast]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [user?.id, connect, disconnect]);

  return { ws: wsRef.current };
};

