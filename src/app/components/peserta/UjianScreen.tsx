'use client';

import type { RefObject } from 'react';
import Image from 'next/image';
import { AlertTriangle, ArrowLeft, ArrowRight, Send, X, Clock, Loader2, Megaphone, WifiOff } from 'lucide-react';
import { PageBackground, Card, Button, Badge, Spinner, Textarea } from '@/app/components/ui';
import { LOGO_SRC, DURASI_UJIAN_DETIK } from '@/lib/constants';
import { formatWaktuDetik, type SoalData } from '@/lib/utils';

type Props = {
  daftarSoal: SoalData[];
  soalIndex: number;
  jawabanMap: Record<string, string>;
  waktuTersisa: number;
  koneksiSse: 'terhubung' | 'putus' | null;
  keluarFullscreen: boolean;
  namaPeserta: string;
  errorKamera: string;
  statusWajah: { pesan: string; ok: boolean };
  statusAudio: { pesan: string; ok: boolean };
  pelanggaran: number;
  pengaturanProctoring: { kameraAktif: boolean; audioAktif: boolean };
  sedangMenyimpan: boolean;
  showReview: boolean;
  pesanAdmin: string;
  onTutupPesanAdmin: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onJawabanChange: (soalId: string, teks: string) => void;
  onSoalSebelumnya: () => void;
  onSoalBerikutnya: () => void;
  onLompatKeSoal: (index: number) => void;
  onKembaliFullscreen: () => void;
  onKonfirmasiSubmit: () => void;
  onTutupReview: () => void;
  onKeSoalBelumDijawab: () => void;
  onTutupReviewDanKeSoal: (index: number) => void;
  onSubmitAkhir: () => void;
};

export default function UjianScreen({
  daftarSoal,
  soalIndex,
  jawabanMap,
  waktuTersisa,
  koneksiSse,
  keluarFullscreen,
  namaPeserta,
  errorKamera,
  statusWajah,
  statusAudio,
  pelanggaran,
  pengaturanProctoring,
  sedangMenyimpan,
  showReview,
  pesanAdmin,
  onTutupPesanAdmin,
  videoRef,
  canvasRef,
  onJawabanChange,
  onSoalSebelumnya,
  onSoalBerikutnya,
  onLompatKeSoal,
  onKembaliFullscreen,
  onKonfirmasiSubmit,
  onTutupReview,
  onKeSoalBelumDijawab,
  onTutupReviewDanKeSoal,
  onSubmitAkhir,
}: Props) {
  if (daftarSoal.length === 0) {
    return (
      <PageBackground className="flex items-center justify-center">
        <div className="text-center">
          <Spinner className="mx-auto h-8 w-8" />
          <p className="text-slate-500 font-display mt-3">Memuat soal...</p>
        </div>
      </PageBackground>
    );
  }

  const soalSekarang = daftarSoal[soalIndex];
  const isSoalTerakhir = soalIndex === daftarSoal.length - 1;
  const jumlahDijawab = daftarSoal.filter((s) => jawabanMap[s.id ?? ''] && jawabanMap[s.id ?? ''] !== '').length;
  const persenWaktu = Math.max(0, Math.min(100, (waktuTersisa / DURASI_UJIAN_DETIK) * 100));
  const waktuKritis = waktuTersisa < 300;
  const waktuDarurat = waktuTersisa < 60;

  const NavigasiSoal = (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="font-display text-sm font-bold text-navy-900">Navigasi Soal</p>
        <span className="text-xs font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full">{jumlahDijawab}/{daftarSoal.length}</span>
      </div>
      <p className="text-xs text-slate-500 mb-3">terjawab</p>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${(jumlahDijawab / daftarSoal.length) * 100}%` }} />
      </div>
      <div className="grid grid-cols-5 gap-2">
        {daftarSoal.map((s, i) => {
          const sudahDijawab = jawabanMap[s.id ?? ''] && jawabanMap[s.id ?? ''] !== '';
          const aktif = i === soalIndex;
          return (
            <button
              key={s.id}
              onClick={() => onLompatKeSoal(i)}
              className={`w-9 h-9 rounded-full text-sm font-bold border-2 cursor-pointer transition-all duration-150
                ${aktif ? 'bg-navy-900 text-white border-navy-900 shadow-md scale-110' : ''}
                ${!aktif && sudahDijawab ? 'bg-green-50 text-green-700 border-green-300 hover:bg-green-100' : ''}
                ${!aktif && !sudahDijawab ? 'bg-white text-slate-400 border-slate-200 hover:border-slate-300 hover:text-slate-600' : ''}
              `}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 space-y-1.5">
        <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-navy-900 inline-block" /> Sedang dilihat</p>
        <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-green-50 border border-green-300 inline-block" /> Sudah dijawab</p>
        <p className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-white border border-slate-200 inline-block" /> Belum dijawab</p>
      </div>
    </Card>
  );

  return (
    <PageBackground>
      {keluarFullscreen && (
        <div className="max-w-2xl mx-auto pt-5 px-5">
          <Card className="!border-red-300 bg-red-50 p-4 text-center">
            <p className="text-red-700 font-bold flex items-center justify-center gap-2">
              <AlertTriangle size={16} className="inline mr-1" />Anda keluar dari mode layar penuh. Ini tercatat sebagai pelanggaran.
            </p>
            <Button onClick={onKembaliFullscreen} className="mt-3">Kembali ke Layar Penuh</Button>
          </Card>
        </div>
      )}

      <div className="hidden lg:flex lg:flex-col lg:items-center lg:fixed lg:left-8 lg:top-6 lg:w-[400px]">
        <Image src={LOGO_SRC} alt="Logo" width={140} height={140} priority />
      </div>

      <div className="hidden lg:block lg:fixed lg:right-8 lg:top-6 lg:w-[240px]">
        {NavigasiSoal}
      </div>

      <div className="max-w-2xl mx-auto lg:mx-[260px] xl:mx-auto xl:max-w-2xl p-5">
        {pesanAdmin && (
          <Card className="!border-teal-300 bg-teal-50 p-4 mb-4 animate-fade-in">
            <div className="flex items-start gap-3">
              <Megaphone size={18} className="text-teal-700 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Pesan Pengawas</p>
                <p className="text-sm text-teal-900 break-words leading-relaxed">{pesanAdmin}</p>
              </div>
              <button onClick={onTutupPesanAdmin} className="text-teal-700 hover:text-teal-900 cursor-pointer shrink-0" aria-label="Tutup pesan">
                <X size={16} />
              </button>
            </div>
          </Card>
        )}

        {koneksiSse === 'putus' && (
          <Card className="p-3 mb-4 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <WifiOff size={18} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 leading-relaxed">
                Koneksi terputus. Jawaban tetap tersimpan di perangkat. Waktu yang hilang akan dipulihkan otomatis saat koneksi kembali.
              </p>
            </div>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <h1 className="font-display text-xl font-bold text-navy-900">Ujian Rekrutmen</h1>
          <div className="flex items-center gap-2">
            {sedangMenyimpan && (
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                <Loader2 size={12} className="inline animate-spin mr-1" />Menyimpan...
              </span>
            )}
            {koneksiSse === 'terhubung' && (
              <span className="text-xs text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />Sinkron
              </span>
            )}
            {koneksiSse === 'putus' && (
              <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />Offline
              </span>
            )}
            <span className={`flex items-center gap-1.5 font-display font-bold px-3 py-1.5 rounded-full text-sm ${
              waktuDarurat ? 'bg-red-50 text-red-600 animate-pulse-urgent' :
              waktuKritis ? 'bg-amber-50 text-amber-700' :
              'bg-slate-100 text-navy-900'
            }`}>
              <Clock size={16} className="inline mr-1" />{formatWaktuDetik(waktuTersisa)}
            </span>
          </div>
        </div>
        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden mb-5">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              waktuDarurat ? 'bg-red-500' : waktuKritis ? 'bg-amber-400' : 'bg-teal-500'
            }`}
            style={{ width: `${persenWaktu}%` }}
          />
        </div>

        <div className="flex justify-center mb-4 lg:hidden">
          <Image src={LOGO_SRC} alt="Logo" width={64} height={64} priority />
        </div>

        <Card className="p-6">
          <p className="text-sm text-slate-500 mb-4">Peserta: <b className="text-navy-900">{namaPeserta}</b></p>

          {errorKamera && <p className="text-red-600 text-sm mb-3">{errorKamera}</p>}

          {(pengaturanProctoring.kameraAktif || pengaturanProctoring.audioAktif) && (
            <div className="flex items-start gap-4 mb-4 pb-4 border-b border-slate-100">
              {pengaturanProctoring.kameraAktif && (
                <>
                  <video ref={videoRef} autoPlay muted playsInline className="w-[140px] rounded-lg bg-black" />
                  <canvas ref={canvasRef} className="hidden" />
                </>
              )}
              <div className="space-y-1.5">
                {pengaturanProctoring.kameraAktif && (
                  <Badge tone={statusWajah.ok ? 'green' : 'red'}>{statusWajah.pesan}</Badge>
                )}
                {pengaturanProctoring.audioAktif && (
                  <Badge tone={statusAudio.ok ? 'green' : 'red'}>{statusAudio.pesan}</Badge>
                )}
                {pelanggaran > 0 && (
                  <Badge tone="orange"><AlertTriangle size={14} className="inline mr-1" />{pelanggaran} pelanggaran terdeteksi</Badge>
                )}
              </div>
            </div>
          )}

          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wide mb-1">Soal {soalIndex + 1} dari {daftarSoal.length}</p>
          <div className="h-1 bg-slate-100 rounded-full overflow-hidden mb-3">
            <div className="h-full bg-teal-500 rounded-full transition-all" style={{ width: `${((soalIndex + 1) / daftarSoal.length) * 100}%` }} />
          </div>
          <p className="text-navy-900 text-lg mb-4 break-words leading-relaxed">{soalSekarang.teks}</p>

          {soalSekarang.gambar && (
            <div className="mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={soalSekarang.gambar} alt={`Ilustrasi soal ${soalIndex + 1}`} className="max-h-72 rounded-xl border border-slate-200 object-contain mx-auto" />
            </div>
          )}

          {soalSekarang.tipe === 'pilihan_ganda' ? (
            <div className="mb-4 space-y-2">
              {(soalSekarang.pilihan || []).map((opsi, i) => {
                const dipilih = jawabanMap[soalSekarang.id ?? ''] === opsi;
                return (
                  <label key={i} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer border-2 transition break-words
                    ${dipilih ? 'bg-teal-50 border-teal-600' : 'bg-field-bg border-transparent hover:border-slate-200'}`}>
                    <input
                      type="radio"
                      name={`soal-${soalSekarang.id}`}
                      checked={dipilih}
                      onChange={() => onJawabanChange(soalSekarang.id ?? '', opsi)}
                      className="w-4 h-4 accent-teal-600"
                    />
                    <span className="text-navy-900">{opsi}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <>
              <Textarea rows={5} className="mb-2"
                value={jawabanMap[soalSekarang.id ?? ''] || ''}
                onChange={(e) => onJawabanChange(soalSekarang.id ?? '', e.target.value)} />
              {soalSekarang.tipe === 'esai' && (
                <div className="text-xs text-slate-400 mt-1 text-right">
                  {(jawabanMap[soalSekarang.id ?? '']?.length ?? 0)} karakter · {(jawabanMap[soalSekarang.id ?? '']?.trim().split(/\s+/).filter(Boolean).length) ?? 0} kata
                </div>
              )}
            </>
          )}

          <div className="flex justify-between items-center mt-5">
            <Button variant="secondary" onClick={onSoalSebelumnya} disabled={soalIndex === 0 || sedangMenyimpan}>
              <ArrowLeft size={14} className="inline mr-1" />Sebelumnya
            </Button>
            <Button variant="secondary" onClick={onSoalBerikutnya} disabled={isSoalTerakhir || sedangMenyimpan}>
              Berikutnya<ArrowRight size={14} className="inline ml-1" />
            </Button>
          </div>

          <Button onClick={onKonfirmasiSubmit} className="w-full mt-4" disabled={sedangMenyimpan}>
            {sedangMenyimpan ? 'Menyimpan...' : (<><Send size={16} className="inline mr-1" />Review & Kirim Jawaban</>)}
          </Button>
        </Card>

        <div className="lg:hidden mt-5">{NavigasiSoal}</div>

        <p className="text-xs text-slate-300 text-center mt-4">
          Gunakan tombol ← → atau tombol soal untuk navigasi
        </p>
      </div>

      {showReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-5 overflow-y-auto">
          <Card className="w-full max-w-lg p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl font-bold text-navy-900">Review Jawaban</h2>
              <button onClick={onTutupReview} className="text-slate-400 hover:text-slate-600 text-xl cursor-pointer"><X size={20} /></button>
            </div>

            <p className="text-sm text-slate-500 mb-4">
              {jumlahDijawab} dari {daftarSoal.length} soal terjawab. Periksa kembali sebelum mengirim.
            </p>

            {jumlahDijawab < daftarSoal.length && (
              <div className="flex items-center justify-between gap-3 bg-amber-50 rounded-xl px-4 py-3 mb-4">
                <p className="text-sm text-amber-700">
                  Masih ada <b>{daftarSoal.length - jumlahDijawab}</b> soal belum dijawab.
                </p>
                <Button variant="secondary" onClick={onKeSoalBelumDijawab} className="!px-3 !py-1.5 text-xs shrink-0">
                  Ke Soal
                </Button>
              </div>
            )}

            <div className="space-y-2 max-h-80 overflow-y-auto mb-5 pr-1">
              {daftarSoal.map((s, i) => {
                const terjawab = jawabanMap[s.id ?? ''] && jawabanMap[s.id ?? ''] !== '';
                return (
                  <button
                    key={s.id}
                    onClick={() => onTutupReviewDanKeSoal(i)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left cursor-pointer transition ${terjawab ? 'bg-green-50 border-green-200' : 'bg-field-bg border-transparent hover:border-slate-200'}`}
                  >
                    <span className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${terjawab ? 'bg-green-600 text-white' : 'bg-white text-slate-400 border border-slate-200'}`}>
                      {i + 1}
                    </span>
                    <span className="text-sm text-navy-900 flex-1 truncate">{s.teks}</span>
                    <span className={`text-xs shrink-0 font-semibold ${terjawab ? 'text-green-700' : 'text-slate-400'}`}>
                      {terjawab ? 'Dijawab' : 'Belum'}
                    </span>
                  </button>
                );
              })}
            </div>

            <Button className="w-full" onClick={onSubmitAkhir} disabled={sedangMenyimpan}>
              {sedangMenyimpan ? 'Menyimpan...' : (<><Send size={16} className="inline mr-1" />Kirim Semua Jawaban Sekarang</>)}
            </Button>
            <Button variant="secondary" className="w-full mt-3" onClick={onTutupReview}>
              Kembali ke Ujian
            </Button>
          </Card>
        </div>
      )}
    </PageBackground>
  );
}