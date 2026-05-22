import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      login: (token: string, user: AuthUser) => {
        set({ token, user });
      },
      logout: () => {
        set({ token: null, user: null });
      },
      isAuthenticated: () => {
        return get().token !== null;
      },
    }),
    {
      name: 'guaycore-auth',
      partialize: (state) => ({ token: state.token, user: state.user }),
    }
  )
);
