'use client';

import { PageBackground, Card, Button } from '@/app/components/ui';
import { Clock, Play, CheckCircle } from 'lucide-react';
import { STATUS } from '@/lib/constants';
import type { PesertaData } from '@/lib/utils';
import CardHeader from './CardHeader';

type Props = {
  sessionResume: PesertaData | null;
  sedangMenyimpan: boolean;
  pengaturanProctoring: { kameraAktif: boolean; audioAktif: boolean };
  sudahSetuju: boolean;
  onSetuju: (v: boolean) => void;
  onLanjutkanUjian: () => void;
  onMulaiBaru: () => void;
  onPeriksaStatus: () => void;
  onLanjutConsent: () => void;
};

export default function ConsentStep({
  sessionResume,
  sedangMenyimpan,
  pengaturanProctoring,
  sudahSetuju,
  onSetuju,
  onLanjutkanUjian,
  onMulaiBaru,
  onPeriksaStatus,
  onLanjutConsent,
}: Props) {
  return (
    <PageBackground className="flex flex-col items-center justify-center p-5">
      {sessionResume && sessionResume.status === STATUS.SEDANG_UJIAN && (
        <div className="w-full max-w-lg mb-4">
          <Card className="p-5 border-l-4 !border-l-amber-400">
            <p className="font-display font-bold text-navy-900 mb-1"><Clock size={18} className="inline mr-1" />Ujian Belum Selesai</p>
            <p className="text-sm text-slate-600 mb-3">
              <b className="text-navy-900">{sessionResume.nama}</b> · progres terakhir{' '}
              {sessionResume.terakhirDisimpan
                ? new Date(sessionResume.terakhirDisimpan).toLocaleString('id-ID')
                : 'sebelumnya'}
            </p>
            <div className="flex gap-3">
              <Button onClick={onLanjutkanUjian} disabled={sedangMenyimpan}>
                {sedangMenyimpan ? 'Memuat...' : (<><Play size={16} className="inline mr-1" />Lanjutkan Ujian</>)}
              </Button>
              <Button variant="secondary" disabled={sedangMenyimpan} onClick={onMulaiBaru}>
                Mulai Baru
              </Button>
            </div>
          </Card>
        </div>
      )}

      {sessionResume && sessionResume.status === STATUS.BELUM_UJIAN && (
        <div className="w-full max-w-lg mb-4">
          <Card className="p-5 border-l-4 !border-l-teal-600">
            <p className="font-display font-bold text-navy-900 mb-1"><Clock size={18} className="inline mr-1" />Menunggu Penetapan Kelompok</p>
            <p className="text-sm text-slate-600 mb-3">
              <b className="text-navy-900">{sessionResume.nama}</b> · Data diri sudah tersimpan. Admin akan
              menetapkan level, divisi & departemen Anda sebelum ujian dimulai.
            </p>
            <div className="flex gap-3">
              <Button onClick={onPeriksaStatus} disabled={sedangMenyimpan}>
                {sedangMenyimpan ? 'Memeriksa...' : (<><Play size={16} className="inline mr-1" />Periksa Status & Lanjutkan</>)}
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Card className="w-full max-w-lg overflow-hidden">
        <CardHeader title="Sebelum Memulai" subtitle="Mohon baca informasi berikut sebelum melanjutkan" showLogo />

        <div className="px-8 py-6">
          <p className="text-sm text-slate-600 mb-4 leading-relaxed">
            Assessment online ini digunakan sebagai bagian dari proses evaluasi. Untuk menjaga keadilan bagi seluruh kandidat, selama ujian berlangsung sistem akan:
          </p>

          <ul className="space-y-2.5 mb-5">
            {pengaturanProctoring.kameraAktif && (
              <li className="flex items-start gap-2.5 text-sm text-slate-700">
                <CheckCircle size={16} className="text-teal-600 shrink-0" />
                Mengaktifkan <b>kamera</b> untuk memantau kehadiran wajah Anda selama ujian.
              </li>
            )}
            {pengaturanProctoring.audioAktif && (
              <li className="flex items-start gap-2.5 text-sm text-slate-700">
                <CheckCircle size={16} className="text-teal-600 shrink-0" />
                Mengaktifkan <b>mikrofon</b> untuk memantau suara di sekitar Anda.
              </li>
            )}
            <li className="flex items-start gap-2.5 text-sm text-slate-700">
              <CheckCircle size={16} className="text-teal-600 shrink-0" />
              Mendeteksi aktivitas layar seperti <b>berpindah tab, keluar layar penuh, atau menyalin-tempel teks</b>.
            </li>
            <li className="flex items-start gap-2.5 text-sm text-slate-700">
              <CheckCircle size={16} className="text-teal-600 shrink-0" />
              Menyimpan data Anda (nama, email, NIK, dan hasil Assessment) untuk keperluan proses evaluasi.
            </li>
          </ul>

          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            Data yang dikumpulkan hanya digunakan untuk keperluan evaluasi rekrutmen dan dijaga kerahasiaannya oleh tim Human Capital. Jika Anda tidak bersedia, Anda dapat menutup halaman ini tanpa melanjutkan ujian.
          </p>

          <label className="flex items-start gap-3 p-4 bg-field-bg rounded-xl cursor-pointer mb-5">
            <input
              type="checkbox"
              checked={sudahSetuju}
              onChange={(e) => onSetuju(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-teal-600"
            />
            <span className="text-sm text-navy-900">
              Saya memahami dan menyetujui bahwa saya akan dipantau sebagaimana dijelaskan di atas selama sesi ujian berlangsung.
            </span>
          </label>

          <Button className="w-full" disabled={!sudahSetuju} onClick={onLanjutConsent}>
            Saya Setuju & Lanjutkan
          </Button>
        </div>
      </Card>
    </PageBackground>
  );
}