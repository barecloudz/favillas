import { log } from "./utils";

let socket: WebSocket | null = null;

export const setupWebSocket = (): WebSocket => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    // If the socket is already open, return the existing socket
    return socket;
  }
  
  // Close existing socket if it exists
  if (socket) {
    socket.close();
  }
  
  try {
    // Create a new WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // In development, use the proxy which will route to the correct backend
    // In production, use the same host as the current page
    const wsUrl = process.env.NODE_ENV === "development" 
      ? `${protocol}//${window.location.host}/ws`
      : `${protocol}//${window.location.host}/ws`;
    
    socket = new WebSocket(wsUrl);
  } catch (error) {
    log(`Failed to create WebSocket connection: ${error}`, 'websocket');
    // Return a dummy WebSocket object to prevent errors
    return {
      readyState: WebSocket.CLOSED,
      send: () => {},
      close: () => {},
      addEventListener: () => {},
    } as any;
  }
  
  socket.addEventListener('open', () => {
    log('WebSocket connection established', 'websocket');
  });
  
  socket.addEventListener('error', (error) => {
    log(`WebSocket error: ${error}`, 'websocket');
  });
  
  socket.addEventListener('close', () => {
    log('WebSocket connection closed', 'websocket');
    // Auto-reconnect after a delay
    setTimeout(() => {
      if (socket && socket.readyState !== WebSocket.OPEN) {
        setupWebSocket();
      }
    }, 5000);
  });
  
  return socket;
};

export const sendMessage = (message: any) => {
  if (!socket || socket.readyState !== WebSocket.OPEN) {
    log('WebSocket not connected, trying to reconnect...', 'websocket');
    socket = setupWebSocket();
    // Queue the message to be sent once the connection is established
    socket.addEventListener('open', () => {
      socket?.send(JSON.stringify(message));
    });
    return;
  }
  
  socket.send(JSON.stringify(message));
};

// Ensure connection is closed when page unloads
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (socket) {
      socket.close();
    }
  });
}
