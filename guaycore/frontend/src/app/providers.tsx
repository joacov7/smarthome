'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  // Hydrate zustand store from localStorage on mount
  useEffect(() => {
    // The persist middleware handles rehydration automatically.
    // This effect can be used for any side effects on auth state change.
    const unsubscribe = useAuthStore.subscribe((state) => {
      if (!state.token && typeof window !== 'undefined') {
        const pathname = window.location.pathname;
        if (pathname !== '/login' && pathname !== '/') {
          // Let the page-level auth guard handle redirect
        }
      }
    });
    return unsubscribe;
  }, []);

  return <>{children}</>;
}
