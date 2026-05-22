import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/store/auth';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;

  const token = useAuthStore.getState().token;

  if (socket) {
    socket.disconnect();
    socket = null;
  }

  // Namespace /ws va en la URL — no como opción separada
  socket = io(`${WS_URL}/ws`, {
    transports: ['websocket', 'polling'],
    auth: { token: token || '' },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on('connect',       () => console.log('[Socket] Connected:', socket?.id));
  socket.on('disconnect',    (r) => console.log('[Socket] Disconnected:', r));
  socket.on('connect_error', (e) => console.error('[Socket] Error:', e.message));

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

// deviceId subscription — event names must match TelemetryGateway
export function subscribeToDevice(
  deviceId: string,
  onTelemetry: (data: Record<string, unknown>) => void,
): () => void {
  const s = getSocket();
  s.emit('subscribe', { deviceId });
  s.on('telemetry', onTelemetry);
  return () => {
    s.emit('unsubscribe', { deviceId });
    s.off('telemetry', onTelemetry);
  };
}

export function subscribeToAlerts(
  onAlert: (alert: Record<string, unknown>) => void,
): () => void {
  const s = getSocket();
  s.on('alert:new', onAlert);
  return () => s.off('alert:new', onAlert);
}

