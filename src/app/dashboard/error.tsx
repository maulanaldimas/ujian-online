'use client';

import { useEffect } from 'react';
import { Card, Button } from '@/app/components/ui';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
        </div>
        <h1 className="font-display text-xl font-bold text-navy-900 mb-2">Gagal Memuat Dashboard</h1>
        <p className="text-sm text-slate-500 mb-6">
          {error.message || 'Terjadi kesalahan saat memuat data.'}
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>Coba Lagi</Button>
          <Button variant="secondary" onClick={() => window.location.href = '/dashboard'}>
            Kembali ke Dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}
