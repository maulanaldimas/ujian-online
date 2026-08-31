'use client';

import { PageBackground, Card, Button } from '@/app/components/ui';
import { Inbox } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <PageBackground className="flex items-center justify-center p-5">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Inbox size={32} className="text-slate-400" />
          </div>
        </div>
        <h1 className="font-display text-xl font-bold text-navy-900 mb-2">Halaman Tidak Ditemukan</h1>
        <p className="text-sm text-slate-500 mb-6">
          URL yang Anda tuhi tidak tersedia atau telah dipindahkan.
        </p>
        <Link href="/">
          <Button>Kembali ke Beranda</Button>
        </Link>
      </Card>
    </PageBackground>
  );
}
