'use client';

import { useEffect } from 'react';
import { PageBackground, Card, Button } from '@/app/components/ui';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <PageBackground className="flex items-center justify-center p-5">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center">
            <AlertTriangle size={32} className="text-red-500" />
          </div>
        </div>
        <h1 className="font-display text-xl font-bold text-navy-900 mb-2">Terjadi Kesalahan</h1>
        <p className="text-sm text-slate-500 mb-6">
          {error.message || 'Sesuatu tidak beres. Silakan coba lagi atau hubungi admin.'}
        </p>
        {error.digest && (
          <p className="text-xs text-slate-400 mb-4 font-mono">Error ID: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>Coba Lagi</Button>
          <Button variant="secondary" onClick={() => window.location.href = '/'}>
            Kembali ke Beranda
          </Button>
        </div>
      </Card>
    </PageBackground>
  );
}
