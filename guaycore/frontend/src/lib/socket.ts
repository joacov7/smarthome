import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  const token = useAuthStore.getState().token;

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(WS_URL, {
    path: '/socket.io',
    namespace: '/ws',
    transports: ['websocket', 'polling'],
    auth: {
      token: token || '',
    },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.error('[Socket] Connection error:', err.message);
  });

  socket.on('reconnect', (attempt) => {
    console.log('[Socket] Reconnected after', attempt, 'attempts');
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function subscribeToDevice(
  deviceId: string,
  onTelemetry: (data: Record<string, unknown>) => void
): () => void {
  const s = getSocket();

  s.emit('subscribe:device', { deviceId });

  const eventName = `telemetry:${deviceId}`;
  s.on(eventName, onTelemetry);

  return () => {
    s.emit('unsubscribe:device', { deviceId });
    s.off(eventName, onTelemetry);
  };
}

export function subscribeToAlerts(
  onAlert: (alert: Record<string, unknown>) => void
): () => void {
  const s = getSocket();

  s.emit('subscribe:alerts');
  s.on('alert:new', onAlert);

  return () => {
    s.emit('unsubscribe:alerts');
    s.off('alert:new', onAlert);
  };
}
