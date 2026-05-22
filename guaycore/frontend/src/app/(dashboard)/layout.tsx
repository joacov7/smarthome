'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { useAuthStore } from '@/store/auth';
import {
  LayoutDashboard,
  Cpu,
  Activity,
  Bell,
  BookOpen,
  UploadCloud,
  Settings,
  LogOut,
  Radio,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/devices', label: 'Devices', icon: Cpu },
  { href: '/telemetry', label: 'Telemetry', icon: Activity },
  { href: '/alerts', label: 'Alerts', icon: Bell },
  { href: '/rules', label: 'Rules', icon: BookOpen },
  { href: '/ota', label: 'OTA', icon: UploadCloud },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { token, user, logout } = useAuthStore();

  useEffect(() => {
    if (!token) {
      router.push('/login');
    }
  }, [token, router]);

  function handleLogout() {
    logout();
    router.push('/login');
  }

  if (!token) {
    return null;
  }

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside className="flex flex-col w-60 bg-slate-950 border-r border-slate-800 flex-shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 flex-shrink-0">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-100 leading-tight">
              GuayCore
            </p>
            <p className="text-xs text-slate-500 leading-tight">IoT Platform</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-0.5 px-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href !== '/dashboard' &&
                  pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={clsx(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      active
                        ? 'bg-blue-600/20 text-blue-400 border border-blue-700/40'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                    )}
                  >
                    <Icon
                      className={clsx(
                        'w-4 h-4 flex-shrink-0',
                        active ? 'text-blue-400' : 'text-slate-500'
                      )}
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="px-3 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-semibold text-slate-300 uppercase">
                {user?.email?.[0] ?? 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-200 truncate">
                {user?.email ?? '—'}
              </p>
              <p className="text-xs text-slate-500 capitalize truncate">
                {user?.role ?? '—'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-1 flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 bg-slate-900 border-b border-slate-800 flex-shrink-0">
          <div>
            <p className="text-xs text-slate-500">
              Tenant:{' '}
              <span className="text-slate-300 font-mono">
                {user?.tenantId ?? '—'}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-slate-400">Live</span>
            </div>
            <span className="text-slate-700">|</span>
            <p className="text-sm text-slate-400">{user?.email}</p>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
