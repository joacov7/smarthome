import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: attach Bearer token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token && config.headers) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth ───────────────────────────────────────────────────────────────────

export interface LoginPayload {
  email: string;
  password: string;
  orgSlug?: string;
}

export interface LoginResponse {
  token: string;
  user: {
    userId: string;
    tenantId: string;
    email: string;
    role: string;
  };
}

export const authApi = {
  login: (payload: LoginPayload) =>
    api.post<LoginResponse>('/auth/login', payload),
};

// ─── Devices ─────────────────────────────────────────────────────────────────

export interface Device {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  status: 'online' | 'offline' | 'provisioning';
  firmwareVersion?: string;
  lastSeenAt?: string;
  config?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export const devicesApi = {
  list: () => api.get<Device[]>('/devices'),
  get: (id: string) => api.get<Device>(`/devices/${id}`),
  updateConfig: (id: string, config: Record<string, unknown>) =>
    api.patch<Device>(`/devices/${id}/config`, { config }),
};

// ─── Telemetry ────────────────────────────────────────────────────────────────

export interface TelemetryPoint {
  id: string;
  deviceId: string;
  data: Record<string, number | string | boolean>;
  timestamp: string;
}

export const telemetryApi = {
  latest: (deviceId: string) =>
    api.get<TelemetryPoint>(`/telemetry/${deviceId}/latest`),
  history: (deviceId: string, limit = 50) =>
    api.get<TelemetryPoint[]>(`/telemetry/${deviceId}`, {
      params: { limit },
    }),
};

// ─── Alerts ──────────────────────────────────────────────────────────────────

export interface Alert {
  id: string;
  tenantId: string;
  deviceId?: string;
  ruleId?: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
  status: 'open' | 'acked' | 'resolved';
  message: string;
  triggeredAt: string;
  ackedAt?: string;
  resolvedAt?: string;
}

export const alertsApi = {
  list: (params?: { status?: string; limit?: number }) =>
    api.get<Alert[]>('/alerts', { params }),
  ack: (id: string) => api.post<Alert>(`/alerts/${id}/ack`),
  resolve: (id: string) => api.post<Alert>(`/alerts/${id}/resolve`),
};

// ─── Rules ───────────────────────────────────────────────────────────────────

export interface Rule {
  id: string;
  tenantId: string;
  name: string;
  enabled: boolean;
  condition: {
    field: string;
    operator: string;
    value: number | string;
  };
  severity: 'critical' | 'error' | 'warning' | 'info';
  message: string;
  lastTriggeredAt?: string;
  createdAt: string;
  updatedAt: string;
}

export const rulesApi = {
  list: () => api.get<Rule[]>('/rules'),
  toggle: (id: string, enabled: boolean) =>
    api.patch<Rule>(`/rules/${id}`, { enabled }),
  delete: (id: string) => api.delete(`/rules/${id}`),
};

// ─── Stats ───────────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  openAlerts: number;
  rulesCount: number;
}

export const statsApi = {
  dashboard: () => api.get<DashboardStats>('/stats/dashboard'),
};
