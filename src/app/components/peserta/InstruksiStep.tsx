'use client';

import { PageBackground, Card, Button } from '@/app/components/ui';
import { CheckCircle } from 'lucide-react';
import CardHeader from './CardHeader';

type Props = {
  jumlahSoal: number;
  durasiDetik: number;
  sedangMenyimpan: boolean;
  onMulai: () => void;
};

export default function InstruksiStep({ jumlahSoal, durasiDetik, sedangMenyimpan, onMulai }: Props) {
  return (
    <PageBackground className="flex items-center justify-center p-5">
      <Card className="w-full max-w-lg overflow-hidden">
        <CardHeader title="Petunjuk Pengerjaan" subtitle="Baca dengan seksama sebelum memulai" />

        <div className="px-8 py-6">
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-field-bg rounded-xl p-4 text-center">
              <p className="text-2xl font-display font-bold text-navy-900">{jumlahSoal}</p>
              <p className="text-xs text-slate-500">Jumlah Soal</p>
            </div>
            <div className="bg-field-bg rounded-xl p-4 text-center">
              <p className="text-2xl font-display font-bold text-navy-900">{Math.floor(durasiDetik / 60)}</p>
              <p className="text-xs text-slate-500">Menit Pengerjaan</p>
            </div>
          </div>

          <p className="font-display font-bold text-navy-900 mb-2 text-sm">Yang Perlu Anda Ketahui</p>
          <ul className="space-y-2.5 mb-5">
            <li className="flex items-start gap-2.5 text-sm text-slate-700">
              <CheckCircle size={16} className="text-teal-600 shrink-0" />
              Ujian akan berjalan dalam <b>mode layar penuh</b>. Sistem akan meminta izin layar penuh begitu Anda klik tombol di bawah.
            </li>
            <li className="flex items-start gap-2.5 text-sm text-slate-700">
              <CheckCircle size={16} className="text-teal-600 shrink-0" />
              Anda bisa <b>berpindah antar soal secara bebas</b> (maju, mundur, atau lompat ke nomor tertentu) sebelum mengirim jawaban akhir.
            </li>
            <li className="flex items-start gap-2.5 text-sm text-slate-700">
              <CheckCircle size={16} className="text-teal-600 shrink-0" />
              Jawaban Anda <b>tersimpan otomatis</b> setiap beberapa saat, jadi tidak akan hilang meskipun koneksi sempat terputus.
            </li>
            <li className="flex items-start gap-2.5 text-sm text-slate-700">
              <CheckCircle size={16} className="text-teal-600 shrink-0" />
              Keluar dari layar penuh, berpindah tab, atau menyalin-tempel teks akan <b>tercatat sebagai pelanggaran</b>.
            </li>
            <li className="flex items-start gap-2.5 text-sm text-slate-700">
              <CheckCircle size={16} className="text-teal-600 shrink-0" />
              Setelah waktu habis, jawaban akan <b>otomatis terkirim</b> apapun kondisinya saat itu.
            </li>
            <li className="flex items-start gap-2.5 text-sm text-slate-700">
              <CheckCircle size={16} className="text-teal-600 shrink-0" />
              Jawaban yang sudah dikirim <b>tidak dapat diubah kembali</b>.
            </li>
          </ul>

          <Button className="w-full" onClick={onMulai} disabled={sedangMenyimpan}>
            {sedangMenyimpan ? 'Menyiapkan...' : 'Mulai Sekarang'}
          </Button>
        </div>
      </Card>
    </PageBackground>
  );
}