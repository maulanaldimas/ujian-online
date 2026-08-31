'use client';
import { useState, useEffect } from 'react';
import LoginGate from '@/app/components/LoginGate';
import { Card, Button, useToast } from '@/app/components/ui';
import { Check } from 'lucide-react';

export default function Pengaturan() {
  return (
    <LoginGate>
      {() => <PengaturanIsi />}
    </LoginGate>
  );
}

function ToggleRow({ judul, deskripsi, aktif, onToggle }: { judul: string; deskripsi: string; aktif: boolean; onToggle: () => void }) {
  return (
    <div className="flex justify-between items-center py-4 border-b border-slate-100 last:border-b-0">
      <div className="pr-4">
        <p className="font-display font-bold text-navy-900">{judul}</p>
        <p className="text-sm text-slate-500">{deskripsi}</p>
      </div>
      <button
        role="switch"
        aria-checked={aktif}
        aria-label={judul}
        onClick={onToggle}
        className={`w-14 h-8 rounded-full relative transition cursor-pointer shrink-0 ${aktif ? 'bg-teal-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${aktif ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );
}

function PengaturanIsi() {
  const { toast, toastEl } = useToast();
  const [kameraAktif, setKameraAktif] = useState(true);
  const [audioAktif, setAudioAktif] = useState(true);
  const [graceReconnectDetik, setGraceReconnectDetik] = useState(120);
  const [loadingPengaturan, setLoadingPengaturan] = useState(true);
  const [sedangSimpan, setSedangSimpan] = useState(false);
  const [pesanSukses, setPesanSukses] = useState(false);

  useEffect(() => {
    async function muatPengaturan() {
      const res = await fetch('/api/pengaturan');
      if (res.ok) {
        const data = await res.json();
        setKameraAktif(data.kameraAktif ?? true);
        setAudioAktif(data.audioAktif ?? true);
        setGraceReconnectDetik(Number.isFinite(Number(data.graceReconnectDetik)) ? Number(data.graceReconnectDetik) : 120);
      }
      setLoadingPengaturan(false);
    }
    muatPengaturan();
  }, []);

  async function simpanPengaturan() {
    setSedangSimpan(true);
    setPesanSukses(false);
    try {
      await fetch('/api/pengaturan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kameraAktif, audioAktif, graceReconnectDetik }),
      });
      setPesanSukses(true);
      setTimeout(() => setPesanSukses(false), 3000);
    } catch (err) {
      toast('Gagal menyimpan pengaturan.', 'red');
      console.error(err);
    }
    setSedangSimpan(false);
  }

  if (loadingPengaturan) {
    return (
      <div>
        <Card className="p-6 mb-4">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-4 border-b border-slate-100 last:border-b-0">
              <div className="pr-4 flex-1">
                <div className="h-4 w-48 skeleton mb-2" />
                <div className="h-3 w-full max-w-sm skeleton" />
              </div>
              <div className="w-14 h-8 rounded-full skeleton shrink-0" />
            </div>
          ))}
        </Card>
        <div className="h-3 w-80 max-w-full skeleton mb-4 rounded-md" />
        <div className="h-11 w-40 skeleton rounded-xl" />
      </div>
    );
  }

  return (
    <div>

        <Card className="p-6 mb-4">
          <ToggleRow
            judul="Deteksi Wajah (Kamera)"
            deskripsi="Memantau kamera peserta untuk deteksi wajah kosong/ganda."
            aktif={kameraAktif}
            onToggle={() => setKameraAktif(!kameraAktif)}
          />
          <ToggleRow
            judul="Deteksi Suara (Mikrofon)"
            deskripsi="Memantau mikrofon peserta untuk deteksi suara mencurigakan."
            aktif={audioAktif}
            onToggle={() => setAudioAktif(!audioAktif)}
          />
        </Card>

        <Card className="p-6 mb-4">
          <div className="flex justify-between items-center gap-3">
            <div className="pr-4">
              <p className="font-display font-bold text-navy-900">Waktu Pemulihan (Grace)</p>
              <p className="text-sm text-slate-500">
                Kompensasi maksimal (dalam detik) yang otomatis ditambahkan saat peserta terputus lalu resume. Kosongkan untuk mematikan.
              </p>
            </div>
            <input
              type="number"
              min={0}
              max={600}
              step={10}
              value={graceReconnectDetik}
              onChange={(e) => setGraceReconnectDetik(e.target.value === '' ? 0 : Number(e.target.value))}
              className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-center font-display font-bold text-navy-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              aria-label="Waktu pemulihan dalam detik"
            />
          </div>
        </Card>

        <p className="text-xs text-slate-500 mb-4">
          Perubahan berlaku untuk peserta yang <b>baru memulai</b> ujian setelah pengaturan disimpan — tidak memengaruhi sesi yang sedang berjalan.
        </p>

        <div className="flex items-center gap-3">
          <Button onClick={simpanPengaturan} disabled={sedangSimpan}>
            {sedangSimpan ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </Button>
          {pesanSukses && <span className="text-green-700 font-semibold text-sm"><Check size={14} className="inline mr-1" />Tersimpan</span>}
        </div>
        {toastEl}
    </div>
  );
}
