'use client';

import { useEffect, useState } from 'react';
import { PageBackground, Card, Button } from '@/app/components/ui';
import { Search } from 'lucide-react';
import CardHeader from './CardHeader';

type Props = {
  menungguKelompok: boolean;
  sedangMenyimpan: boolean;
  onPeriksa: () => void;
};

const INTERVAL_POLLING = 15000;

export default function MenungguStep({ menungguKelompok, sedangMenyimpan, onPeriksa }: Props) {
  const [detikBerikutnya, setDetikBerikutnya] = useState(INTERVAL_POLLING / 1000);

  useEffect(() => {
    const interval = setInterval(() => {
      onPeriksa();
    }, INTERVAL_POLLING);
    return () => clearInterval(interval);
  }, [onPeriksa]);

  useEffect(() => {
    setDetikBerikutnya(INTERVAL_POLLING / 1000);
    const countdown = setInterval(() => {
      setDetikBerikutnya((d) => (d <= 1 ? INTERVAL_POLLING / 1000 : d - 1));
    }, 1000);
    return () => clearInterval(countdown);
  }, [onPeriksa]);

  return (
    <PageBackground className="flex items-center justify-center p-5">
      <Card className="w-full max-w-md overflow-hidden">
        <CardHeader title="Menunggu Aktivasi" subtitle="Data diri Anda telah tersimpan" showLogo />

        <div className="px-8 py-6 text-center">
          {menungguKelompok && (
            <div className="bg-field-bg rounded-xl p-4 mb-4 text-sm text-slate-600">
              Kelompok soal untuk Anda belum ditetapkan oleh admin. Silakan tunggu beberapa saat.
            </div>
          )}
          <p className="text-sm text-slate-600 mb-5 leading-relaxed">
            Petugas/Admin akan menetapkan <b>level</b>, <b>divisi</b>, dan <b>departemen</b> Anda terlebih dahulu.
            Setelah ditetapkan, Anda dapat melanjutkan ke ujian dengan klik tombol di bawah.
          </p>
          <Button className="w-full mb-3" onClick={onPeriksa} disabled={sedangMenyimpan}>
            {sedangMenyimpan ? 'Memeriksa...' : (<><Search size={16} className="inline mr-1" />Periksa Status</>)}
          </Button>
          <p className="text-xs text-slate-400">
            {sedangMenyimpan ? (
              'Memeriksa otomatis...'
            ) : (
              <>
                Memeriksa otomatis dalam <b>{detikBerikutnya}</b> detik · Halaman dapat diperbarui sewaktu-waktu.
              </>
            )}
          </p>
        </div>
      </Card>
    </PageBackground>
  );
}