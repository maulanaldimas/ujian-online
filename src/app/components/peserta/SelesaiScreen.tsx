'use client';

import Image from 'next/image';
import { CheckCircle2, Clock, HelpCircle, Mail } from 'lucide-react';
import { PageBackground, Card, Button } from '@/app/components/ui';
import { LOGO_SRC, NAMA_PERUSAHAAN_PENDEK } from '@/lib/constants';

type Props = {
  nama?: string;
  waktuSelesai?: string;
  jumlahSoal?: number;
  jumlahDijawab?: number;
  email?: string;
};

export default function SelesaiScreen({ nama, waktuSelesai, jumlahSoal, jumlahDijawab, email }: Props) {
  const terjawabLabel =
    jumlahDijawab !== undefined && jumlahSoal !== undefined
      ? `${jumlahDijawab} dari ${jumlahSoal}`
      : `${jumlahDijawab ?? jumlahSoal ?? '-'}${jumlahSoal !== undefined && jumlahDijawab === undefined ? ' total' : ''}`;

  return (
    <PageBackground className="flex items-center justify-center p-5">
      <Card className="w-full max-w-lg p-8">
        <div className="flex justify-center mb-5">
          <Image src={LOGO_SRC} alt="Logo" width={96} height={96} priority />
        </div>

        <div className="text-center">
          <CheckCircle2 size={48} className="mx-auto text-green-500" aria-hidden="true" />
          <h1 className="font-display text-xl font-bold text-navy-900 mt-4">Assessment Selesai</h1>
          <p className="text-sm text-slate-600 leading-relaxed mt-2">
            Terima kasih{nama ? <>, <b className="text-navy-900">{nama}</b></> : null}, atas partisipasi dan waktu yang
            telah Anda luangkan untuk mengikuti Assessment Online {NAMA_PERUSAHAAN_PENDEK}. Jawaban Anda telah berhasil
            tersimpan dalam sistem.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 divide-y divide-slate-200 text-sm">
          {nama && (
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-slate-500">Nama Peserta</span>
              <span className="font-semibold text-navy-900">{nama}</span>
            </div>
          )}
          <div className="flex items-center justify-between px-4 py-3">
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <Clock size={14} aria-hidden="true" /> Waktu Selesai
            </span>
            <span className="font-semibold text-navy-900">{waktuSelesai ?? '-'}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="inline-flex items-center gap-1.5 text-slate-500">
              <CheckCircle2 size={14} aria-hidden="true" /> Soal Terjawab
            </span>
            <span className="font-semibold text-navy-900">{terjawabLabel}</span>
          </div>
        </div>

        <div className="mt-5 flex gap-3 rounded-xl border border-teal-100 bg-teal-50 p-4">
          <HelpCircle size={18} className="shrink-0 text-teal-700 mt-0.5" aria-hidden="true" />
          <div className="text-xs text-slate-600 leading-relaxed">
            <p>Hasil Anda akan ditinjau oleh tim HR.</p>
            {email && (
              <p className="mt-1">
                Jika ada pertanyaan, hubungi{' '}
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:text-teal-800"
                >
                  <Mail size={12} aria-hidden="true" />
                  {email}
                </a>
              </p>
            )}
          </div>
        </div>

        <Button variant="secondary" fullWidth className="mt-6" onClick={() => window.close()}>
          Keluar
        </Button>
      </Card>
    </PageBackground>
  );
}
