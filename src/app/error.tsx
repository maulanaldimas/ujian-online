'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PageBackground, Card, Button } from '@/app/components/ui';
import { LOGO_SRC } from '@/lib/constants';
import { AlertTriangle } from 'lucide-react';

export default function ErrorPage({ error, unstable_retry }: { error: Error & { digest?: string }; unstable_retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <PageBackground className="flex items-center justify-center p-5">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="flex justify-center mb-4">
          <Image src={LOGO_SRC} alt="Logo" width={96} height={96} priority />
        </div>
        <div className="flex justify-center mb-3 text-amber-500"><AlertTriangle size={48} /></div>
        <h1 className="font-display text-lg font-bold text-navy-900 mb-2">Terjadi Kesalahan</h1>
        <p className="text-sm text-slate-500 mb-6">
          Ada masalah saat memuat halaman ini. Silakan coba lagi atau hubungi tim HR bila berlanjut.
        </p>
        <div className="flex flex-col gap-2">
          <Button onClick={unstable_retry}>Coba Lagi</Button>
          <Link href="/">
            <Button variant="secondary" className="w-full">Kembali ke Beranda</Button>
          </Link>
        </div>
      </Card>
    </PageBackground>
  );
}
