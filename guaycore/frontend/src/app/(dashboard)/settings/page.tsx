'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { Card } from '@/components/ui/card';
import { Settings, User, Shield, Globe } from 'lucide-react';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'api'>('profile');

  const tabs = [
    { key: 'profile' as const, label: 'Profile', icon: User },
    { key: 'security' as const, label: 'Security', icon: Shield },
    { key: 'api' as const, label: 'API', icon: Globe },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-slate-400" />
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Settings</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            Manage your account and platform preferences
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-800 border border-slate-700 rounded-lg p-1 gap-1 w-fit">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-slate-700 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <Card title="Profile Information">
          <div className="space-y-5 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Email
              </label>
              <input
                type="email"
                readOnly
                value={user?.email ?? ''}
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-600 text-slate-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Role
              </label>
              <input
                type="text"
                readOnly
                value={user?.role ?? ''}
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-600 text-slate-400 capitalize cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Tenant ID
              </label>
              <input
                type="text"
                readOnly
                value={user?.tenantId ?? ''}
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-600 text-slate-400 font-mono cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                User ID
              </label>
              <input
                type="text"
                readOnly
                value={user?.userId ?? ''}
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-600 text-slate-400 font-mono cursor-not-allowed"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Security tab */}
      {activeTab === 'security' && (
        <Card title="Security">
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Shield className="w-10 h-10 text-slate-600" />
            <p className="text-slate-400 font-medium">
              Password change coming soon
            </p>
            <p className="text-slate-500 text-sm text-center max-w-sm">
              Contact your administrator to update your credentials or manage
              two-factor authentication.
            </p>
          </div>
        </Card>
      )}

      {/* API tab */}
      {activeTab === 'api' && (
        <Card title="API Configuration">
          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Backend URL
              </label>
              <input
                type="text"
                readOnly
                value={
                  process.env.NEXT_PUBLIC_API_URL ??
                  'http://localhost:3000/api/v1'
                }
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-600 text-slate-400 font-mono cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                WebSocket URL
              </label>
              <input
                type="text"
                readOnly
                value={
                  process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:3000'
                }
                className="w-full px-4 py-2.5 rounded-lg text-sm bg-slate-900 border border-slate-600 text-slate-400 font-mono cursor-not-allowed"
              />
            </div>
            <div className="pt-2 border-t border-slate-700">
              <p className="text-xs text-slate-500">
                These values are configured via environment variables
                (NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL).
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
