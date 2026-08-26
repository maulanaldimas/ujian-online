'use client';
import { useState, useEffect } from 'react';
import LoginGate from '@/app/components/LoginGate';
import { PageBackground, Card, Button, TopNav, useToast } from '@/app/components/ui';
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
        body: JSON.stringify({ kameraAktif, audioAktif }),
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
      <PageBackground className="p-5">
        <div className="max-w-6xl mx-auto">
          <TopNav
            title="Pengaturan Proctoring"
            links={[
              { href: '/dashboard', label: 'Dashboard' },
              { href: '/dashboard/kelompok', label: 'Kelompok Soal' },
            ]}
          />
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
      </PageBackground>
    );
  }

  return (
    <PageBackground className="p-5">
      <div className="max-w-6xl mx-auto">
        <TopNav
          title="Pengaturan Proctoring"
          subtitle="Aktifkan atau nonaktifkan pengawasan kamera dan mikrofon"
          links={[
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/dashboard/kelompok', label: 'Kelompok Soal' },
          ]}
          onLogout={() => fetch('/api/auth/logout', { method: 'POST' }).then(() => window.location.reload())}
        />

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
    </PageBackground>
  );
}
