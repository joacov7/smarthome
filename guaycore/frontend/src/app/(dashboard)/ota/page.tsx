'use client';

import { UploadCloud } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function OtaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">OTA Updates</h1>
        <p className="mt-0.5 text-sm text-slate-400">
          Over-the-air firmware management
        </p>
      </div>

      <Card title="Firmware Management">
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-700 flex items-center justify-center">
            <UploadCloud className="w-8 h-8 text-slate-400" />
          </div>
          <div className="text-center">
            <p className="text-slate-300 font-medium">OTA module coming soon</p>
            <p className="text-slate-500 text-sm mt-1">
              Upload and distribute firmware updates to your device fleet.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
