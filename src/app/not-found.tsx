import Link from 'next/link';
import Image from 'next/image';
import { PageBackground, Card, Button } from '@/app/components/ui';
import { LOGO_SRC } from '@/lib/constants';

export const metadata = {
  title: 'Halaman Tidak Ditemukan',
};

export default function NotFound() {
  return (
    <PageBackground className="flex items-center justify-center p-5">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="flex justify-center mb-4">
          <Image src={LOGO_SRC} alt="Logo" width={96} height={96} priority />
        </div>
        <p className="font-display text-5xl font-bold text-navy-900 mb-2">404</p>
        <h1 className="font-display text-lg font-bold text-navy-900 mb-2">Halaman Tidak Ditemukan</h1>
        <p className="text-sm text-slate-500 mb-6">
          Halaman yang Anda cari tidak tersedia atau telah dipindahkan.
        </p>
        <Link href="/">
          <Button className="w-full">Kembali ke Beranda</Button>
        </Link>
      </Card>
    </PageBackground>
  );
}
