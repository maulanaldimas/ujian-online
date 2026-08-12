'use client';
import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '@/firebase';
import LoginGate from '@/app/components/LoginGate';
import { PageBackground, Card, Button, TopNav, Spinner } from '@/app/components/ui';

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
        <p className="font-display font-bold text-[#10192E]">{judul}</p>
        <p className="text-sm text-slate-500">{deskripsi}</p>
      </div>
      <button
        onClick={onToggle}
        className={`w-14 h-8 rounded-full relative transition cursor-pointer shrink-0 ${aktif ? 'bg-[#1F6F78]' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${aktif ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );
}

function PengaturanIsi() {
  const [kameraAktif, setKameraAktif] = useState(true);
  const [audioAktif, setAudioAktif] = useState(true);
  const [loadingPengaturan, setLoadingPengaturan] = useState(true);
  const [sedangSimpan, setSedangSimpan] = useState(false);
  const [pesanSukses, setPesanSukses] = useState(false);

  useEffect(() => {
    async function muatPengaturan() {
      const docSnap = await getDoc(doc(db, 'pengaturan', 'proctoring'));
      if (docSnap.exists()) {
        const data = docSnap.data();
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
      await setDoc(doc(db, 'pengaturan', 'proctoring'), { kameraAktif, audioAktif });
      setPesanSukses(true);
      setTimeout(() => setPesanSukses(false), 3000);
    } catch (err) {
      alert('Gagal menyimpan pengaturan.');
      console.error(err);
    }
    setSedangSimpan(false);
  }

  if (loadingPengaturan) {
    return (
      <PageBackground className="flex items-center justify-center">
        <div className="text-center">
          <Spinner className="mx-auto h-7 w-7" />
          <p className="text-slate-500 font-display mt-3">Memuat pengaturan...</p>
        </div>
      </PageBackground>
    );
  }

  return (
    <PageBackground className="p-5">
      <div className="max-w-xl mx-auto">
        <TopNav
          title="Pengaturan Proctoring"
          subtitle="Aktifkan atau nonaktifkan pengawasan kamera dan mikrofon"
          links={[{ href: '/dashboard', label: '← Dashboard' }]}
          onLogout={() => signOut(auth)}
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
          {pesanSukses && <span className="text-green-700 font-semibold text-sm">✓ Tersimpan</span>}
        </div>
      </div>
    </PageBackground>
  );
}