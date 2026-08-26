'use client';
import { useState, useEffect, useCallback, type FormEvent, type ChangeEvent } from 'react';
import Link from 'next/link';
import { Lock, ArrowLeft, X, Save, Plus, Pencil, Trash2, Download, Rocket, ChevronUp, ChevronDown, Check } from 'lucide-react';
import * as XLSX from 'xlsx';
import LoginGate from '@/app/components/LoginGate';
import { PageBackground, Card, Label, Input, Textarea, Select, Button, Badge, TopNav, Spinner, EmptyState, ConfirmModal } from '@/app/components/ui';
import { parseBarisSoal, type KelompokSoal, type SoalData } from '@/lib/utils';

export default function KelolaKelompok() {
  return (
    <LoginGate>
      {(user) => user.role === 'admin' ? <KelolaKelompokIsi /> : <AksesTerbatas />}
    </LoginGate>
  );
}

function AksesTerbatas() {
  return (
    <PageBackground className="flex items-center justify-center p-5">
      <Card className="w-full max-w-sm p-8 text-center">
        <div className="flex justify-center mb-3 text-slate-300"><Lock size={48} /></div>
        <h1 className="font-display text-lg font-bold text-navy-900 mb-2">Khusus Admin</h1>
        <p className="text-sm text-slate-500 mb-5">Halaman ini hanya bisa diakses oleh akun dengan peran Admin.</p>
        <Link href="/dashboard" className="text-sm font-semibold text-teal-600 hover:underline"><ArrowLeft size={14} className="inline mr-1" />Kembali ke Dashboard</Link>
      </Card>
    </PageBackground>
  );
}

function KelolaKelompokIsi() {
  const [loading, setLoading] = useState(true);
  const [sedangProses, setSedangProses] = useState(false);

  const [daftarLevel, setDaftarLevel] = useState<string[]>([]);
  const [daftarDivisi, setDaftarDivisi] = useState<string[]>([]);
  const [daftarDepartemen, setDaftarDepartemen] = useState<string[]>([]);
  const [kelompokList, setKelompokList] = useState<KelompokSoal[]>([]);

  const [namaBaru, setNamaBaru] = useState('');
  const [levelBaru, setLevelBaru] = useState('');
  const [divisiBaru, setDivisiBaru] = useState('');
  const [departemenBaru, setDepartemenBaru] = useState('');

  const [opsiLevel, setOpsiLevel] = useState('');
  const [opsiDivisi, setOpsiDivisi] = useState('');
  const [opsiDepartemen, setOpsiDepartemen] = useState('');

  const [pesan, setPesan] = useState<{ tone: string; teks: string } | null>(null);

  const ambilData = useCallback(async () => {
    const [opsiRes, kelompokRes] = await Promise.all([
      fetch('/api/pengaturan'),
      fetch('/api/kelompok'),
    ]);

    const opsiData = opsiRes.ok ? await opsiRes.json() : {};
    const kelompokList = kelompokRes.ok ? await kelompokRes.json() : [];

    return {
      level: Array.isArray(opsiData.level) ? opsiData.level : [],
      divisi: Array.isArray(opsiData.divisi) ? opsiData.divisi : [],
      departemen: Array.isArray(opsiData.departemen) ? opsiData.departemen : [],
      kelompokList,
    };
  }, []);

  useEffect(() => {
    let aktif = true;
    ambilData().then((data) => {
      if (!aktif) return;
      setDaftarLevel(data.level);
      setDaftarDivisi(data.divisi);
      setDaftarDepartemen(data.departemen);
      setKelompokList(data.kelompokList);
      setLoading(false);
    });
    return () => { aktif = false; };
  }, [ambilData]);

  async function simpanOpsi() {
    setSedangProses(true);
    try {
      await fetch('/api/pengaturan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: daftarLevel, divisi: daftarDivisi, departemen: daftarDepartemen }),
      });
      setPesan({ tone: 'green', teks: 'Daftar level, divisi & departemen tersimpan.' });
    } catch (err) {
      console.error(err);
      setPesan({ tone: 'red', teks: 'Gagal menyimpan daftar opsi.' });
    }
    setSedangProses(false);
  }

  function tambahLevel() {
    const v = opsiLevel.trim();
    if (!v) return;
    setDaftarLevel((prev) => prev.includes(v) ? prev : [...prev, v]);
    setOpsiLevel('');
  }

  function tambahDivisi() {
    const v = opsiDivisi.trim();
    if (!v) return;
    setDaftarDivisi((prev) => prev.includes(v) ? prev : [...prev, v]);
    setOpsiDivisi('');
  }

  function tambahDepartemen() {
    const v = opsiDepartemen.trim();
    if (!v) return;
    setDaftarDepartemen((prev) => prev.includes(v) ? prev : [...prev, v]);
    setOpsiDepartemen('');
  }

  function hapusOpsiLevel(v: string) {
    setDaftarLevel((prev) => prev.filter((x) => x !== v));
  }

  function hapusOpsiDivisi(v: string) {
    setDaftarDivisi((prev) => prev.filter((x) => x !== v));
  }

  function hapusOpsiDepartemen(v: string) {
    setDaftarDepartemen((prev) => prev.filter((x) => x !== v));
  }

  async function simpanKelompok(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!namaBaru.trim() || !levelBaru || !divisiBaru || !departemenBaru) {
      setPesan({ tone: 'red', teks: 'Nama, level, divisi, dan departemen wajib diisi.' });
      return;
    }
    setSedangProses(true);
    try {
      await fetch('/api/kelompok', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: namaBaru.trim(),
          level: levelBaru,
          divisi: divisiBaru,
          departemen: departemenBaru,
        }),
      });
      setPesan({ tone: 'green', teks: 'Kelompok soal berhasil dibuat. Silakan tambahkan soal di dalamnya.' });
      setNamaBaru('');
      setLevelBaru('');
      setDivisiBaru('');
      setDepartemenBaru('');
      await ambilData();
    } catch (err) {
      console.error(err);
      setPesan({ tone: 'red', teks: 'Gagal membuat kelompok soal.' });
    }
    setSedangProses(false);
  }

  if (loading) {
    return (
      <PageBackground className="p-5">
        <div className="max-w-6xl mx-auto">
          <TopNav
            title="Kelompok Soal"
            links={[
              { href: '/dashboard', label: 'Dashboard' },
              { href: '/dashboard/pengaturan', label: 'Pengaturan' },
            ]}
          />
          <div className="grid lg:grid-cols-2 gap-5 mb-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <Card key={i} className="p-5">
                <div className="h-5 w-48 skeleton mb-2" />
                <div className="h-4 w-full max-w-xs skeleton mb-4" />
                <div className="h-10 w-full skeleton rounded-xl mb-3" />
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="h-6 skeleton rounded-full" style={{ width: `${60 + j * 20}px` }} />
                  ))}
                </div>
                <div className="h-10 w-full skeleton rounded-xl" />
              </Card>
            ))}
          </div>
          <Card className="p-5">
            <div className="h-5 w-56 skeleton mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="h-4 w-40 skeleton mb-2" />
                    <div className="flex gap-1.5">
                      <div className="h-5 w-16 skeleton rounded-full" />
                      <div className="h-5 w-16 skeleton rounded-full" />
                      <div className="h-5 w-20 skeleton rounded-full" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-24 skeleton rounded-xl" />
                    <div className="h-8 w-28 skeleton rounded-xl" />
                    <div className="h-8 w-20 skeleton rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </PageBackground>
    );
  }

  return (
    <PageBackground className="p-5">
      <div className="max-w-6xl mx-auto">
        <TopNav
          title="Kelompok Soal"
          subtitle="Kelola level, divisi, departemen, dan soal di dalam setiap kelompok"
          links={[
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/dashboard/pengaturan', label: 'Pengaturan' },
          ]}
          onLogout={() => fetch('/api/auth/logout', { method: 'POST' }).then(() => window.location.reload())}
        />

        {pesan && (
          <div className={`mb-4 p-3 rounded-xl text-sm ${pesan.tone === 'green' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {pesan.teks}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-5 mb-6">
          {/* Kolom kiri: opsi level, divisi & departemen */}
          <Card className="p-5">
            <h2 className="font-display font-bold text-navy-900 mb-1">Level, Divisi & Departemen</h2>
            <p className="text-sm text-slate-500 mb-4">
              Daftar pilihan yang akan muncul saat menetapkan kelompok untuk peserta.
            </p>

            <Label>Level</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={opsiLevel}
                onChange={(e) => setOpsiLevel(e.target.value)}
                placeholder="cth: Staff, Supervisor, Manager"
                className="!mb-0"
              />
              <Button variant="secondary" type="button" onClick={tambahLevel} className="!px-4 whitespace-nowrap">Tambah</Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {daftarLevel.length === 0 ? (
                <span className="text-xs text-slate-400">Belum ada level.</span>
              ) : daftarLevel.map((l) => (
                <Badge key={l} tone="teal" className="cursor-pointer">
                  <span className="inline-flex items-center gap-1">
                    {l}
                    <button type="button" onClick={() => hapusOpsiLevel(l)} className="hover:text-red-600"><X size={12} /></button>
                  </span>
                </Badge>
              ))}
            </div>

            <Label>Divisi</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={opsiDivisi}
                onChange={(e) => setOpsiDivisi(e.target.value)}
                placeholder="cth: Teknik, Produksi, HR"
                className="!mb-0"
              />
              <Button variant="secondary" type="button" onClick={tambahDivisi} className="!px-4 whitespace-nowrap">Tambah</Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {daftarDivisi.length === 0 ? (
                <span className="text-xs text-slate-400">Belum ada divisi.</span>
              ) : daftarDivisi.map((d) => (
                <Badge key={d} tone="blue" className="cursor-pointer">
                  <span className="inline-flex items-center gap-1">
                    {d}
                    <button type="button" onClick={() => hapusOpsiDivisi(d)} className="hover:text-red-600"><X size={12} /></button>
                  </span>
                </Badge>
              ))}
            </div>

            <Label>Departemen</Label>
            <div className="flex gap-2 mb-2">
              <Input
                value={opsiDepartemen}
                onChange={(e) => setOpsiDepartemen(e.target.value)}
                placeholder="cth: Operasional, Keuangan, Umum"
                className="!mb-0"
              />
              <Button variant="secondary" type="button" onClick={tambahDepartemen} className="!px-4 whitespace-nowrap">Tambah</Button>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-5">
              {daftarDepartemen.length === 0 ? (
                <span className="text-xs text-slate-400">Belum ada departemen.</span>
              ) : daftarDepartemen.map((d) => (
                <Badge key={d} tone="purple" className="cursor-pointer">
                  <span className="inline-flex items-center gap-1">
                    {d}
                    <button type="button" onClick={() => hapusOpsiDepartemen(d)} className="hover:text-red-600"><X size={12} /></button>
                  </span>
                </Badge>
              ))}
            </div>

            <Button onClick={simpanOpsi} disabled={sedangProses}>
              {sedangProses ? 'Menyimpan...' : (<><Save size={16} className="inline mr-1" />Simpan Daftar Level, Divisi & Departemen</>)}
            </Button>
          </Card>

          {/* Kolom kanan: buat kelompok baru */}
          <Card className="p-5">
            <h2 className="font-display font-bold text-navy-900 mb-4">Buat Kelompok Soal Baru</h2>
            <p className="text-sm text-slate-500 mb-4">
              Kelompok dibuat kosong. Setelah dibuat, tambahkan soal langsung di dalam kelompok tersebut.
            </p>
            <form onSubmit={simpanKelompok} className="space-y-4">
              <div>
                <Label>Nama Kelompok</Label>
                <Input value={namaBaru} onChange={(e) => setNamaBaru(e.target.value)} placeholder="cth: Teknik - Staff - Operasional" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Level</Label>
                  <Select value={levelBaru} onChange={(e) => setLevelBaru(e.target.value)}>
                    <option value="">Pilih level</option>
                    {daftarLevel.map((l) => <option key={l} value={l}>{l}</option>)}
                  </Select>
                </div>
                <div>
                  <Label>Divisi</Label>
                  <Select value={divisiBaru} onChange={(e) => setDivisiBaru(e.target.value)}>
                    <option value="">Pilih divisi</option>
                    {daftarDivisi.map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </div>
                <div>
                  <Label>Departemen</Label>
                  <Select value={departemenBaru} onChange={(e) => setDepartemenBaru(e.target.value)}>
                    <option value="">Pilih departemen</option>
                    {daftarDepartemen.map((d) => <option key={d} value={d}>{d}</option>)}
                  </Select>
                </div>
              </div>
              <Button type="submit" disabled={sedangProses} className="w-full">
                {sedangProses ? 'Menyimpan...' : (<><Plus size={16} className="inline mr-1" />Buat Kelompok Soal</>)}
              </Button>
            </form>
          </Card>
        </div>

        {/* Daftar kelompok */}
        <Card className="p-5">
          <h2 className="font-display font-bold text-navy-900 mb-4">Kelompok Tersimpan ({kelompokList.length})</h2>
          {kelompokList.length === 0 ? (
            <EmptyState title="Belum ada kelompok" description="Buat kelompok soal pertama Anda di atas." />
          ) : (
            <div className="space-y-3">
              {kelompokList.map((k) => (
                <KelompokCard
                  key={k.id}
                  kelompok={k}
                  daftarLevel={daftarLevel}
                  daftarDivisi={daftarDivisi}
                  daftarDepartemen={daftarDepartemen}
                  onChanged={async () => {
                    const data = await ambilData();
                    setKelompokList(data.kelompokList);
                  }}
                  onPesan={(tone, teks) => setPesan({ tone, teks })}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageBackground>
  );
}

function KelompokCard({
  kelompok,
  daftarLevel,
  daftarDivisi,
  daftarDepartemen,
  onChanged,
  onPesan,
}: {
  kelompok: KelompokSoal;
  daftarLevel: string[];
  daftarDivisi: string[];
  daftarDepartemen: string[];
  onChanged: () => Promise<void>;
  onPesan: (tone: string, teks: string) => void;
}) {
  const [daftarSoal, setDaftarSoal] = useState<SoalData[]>([]);
  const [kunciMap, setKunciMap] = useState<Record<string, string>>({});
  const [loadingSoal, setLoadingSoal] = useState(true);
  const [sedangProses, setSedangProses] = useState(false);

  const [showTambah, setShowTambah] = useState(false);
  const [teksBaru, setTeksBaru] = useState('');
  const [tipeBaru, setTipeBaru] = useState('esai');
  const [pilihanBaru, setPilihanBaru] = useState(['', '', '', '']);
  const [kunciBaru, setKunciBaru] = useState('');

  const [editId, setEditId] = useState<string | null>(null);
  const [editTeks, setEditTeks] = useState('');
  const [editTipe, setEditTipe] = useState('esai');
  const [editPilihan, setEditPilihan] = useState(['', '', '', '']);
  const [editKunci, setEditKunci] = useState('');

  const [editMenunjukkan, setEditMenunjukkan] = useState(false);
  const [editNama, setEditNama] = useState('');
  const [editLevel, setEditLevel] = useState('');
  const [editDivisi, setEditDivisi] = useState('');
  const [editDepartemen, setEditDepartemen] = useState('');

  const [fileExcel, setFileExcel] = useState<File | null>(null);
  const [sedangImport, setSedangImport] = useState(false);
  const [pesanImport, setPesanImport] = useState<{ tone: string; teks: string } | null>(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmMsg, setConfirmMsg] = useState('');
  function tanya(pesan: string, onYa: () => void) {
    setConfirmMsg(pesan);
    setConfirmAction(() => onYa);
    setConfirmOpen(true);
  }

  const kelompokId = kelompok.id ?? '';

  const ambilDataSoal = useCallback(async () => {
    const res = await fetch(`/api/kelompok/${kelompokId}/soal`);
    const soalList = res.ok ? await res.json() : [];

    const daftar: SoalData[] = soalList.map((s: any) => ({
      id: s.id,
      teks: s.teks,
      tipe: s.tipe,
      pilihan: s.pilihan,
      urutan: s.urutan,
    }));

    const kunci: Record<string, string> = {};
    soalList.forEach((s: any) => {
      if (s.kunci) kunci[s.id] = s.kunci;
    });

    return { daftar, kunci };
  }, [kelompokId]);

  const muatSoal = useCallback(async () => {
    const { daftar, kunci } = await ambilDataSoal();
    setDaftarSoal(daftar);
    setKunciMap(kunci);
    setLoadingSoal(false);
  }, [ambilDataSoal]);

  useEffect(() => {
    let aktif = true;
    ambilDataSoal().then(({ daftar, kunci }) => {
      if (!aktif) return;
      setDaftarSoal(daftar);
      setKunciMap(kunci);
      setLoadingSoal(false);
    }).catch((err) => console.error('Gagal ambil soal kelompok:', err));
    return () => { aktif = false; };
  }, [ambilDataSoal]);

  async function tambahSoal(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!teksBaru.trim()) return;

    let pilihanBersih: string[] = [];
    if (tipeBaru === 'pilihan_ganda') {
      pilihanBersih = pilihanBaru.map((p) => p.trim()).filter((p) => p !== '');
      if (pilihanBersih.length < 2) { onPesan('red', 'Pilihan ganda butuh minimal 2 opsi jawaban.'); return; }
      if (!kunciBaru || !pilihanBersih.includes(kunciBaru)) { onPesan('red', 'Pilih kunci jawaban yang benar.'); return; }
    }

    setSedangProses(true);
    try {
      const urutanTertinggi = daftarSoal.reduce((max, s) => Math.max(max, s.urutan || 0), 0);

      await fetch(`/api/kelompok/${kelompokId}/soal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teks: teksBaru.trim(),
          urutan: urutanTertinggi + 1,
          tipe: tipeBaru,
          pilihan: tipeBaru === 'pilihan_ganda' ? pilihanBersih : [],
          kunci: tipeBaru === 'pilihan_ganda' ? kunciBaru : undefined,
        }),
      });

      setTeksBaru(''); setTipeBaru('esai'); setPilihanBaru(['', '', '', '']); setKunciBaru('');
      setShowTambah(false);
      await muatSoal();
    } catch (err) {
      onPesan('red', 'Gagal menambah soal.');
      console.error(err);
    }
    setSedangProses(false);
  }

  function mulaiEdit(soal: SoalData) {
    setEditId(soal.id ?? null);
    setEditTeks(soal.teks || '');
    setEditTipe(soal.tipe || 'esai');
    setEditPilihan(soal.pilihan && soal.pilihan.length >= 2 ? soal.pilihan : ['', '', '', '']);
    setEditKunci(kunciMap[soal.id ?? ''] || '');
  }

  async function simpanEdit(soalId: string) {
    if (!editTeks.trim()) return;
    let pilihanBersih: string[] = [];
    if (editTipe === 'pilihan_ganda') {
      pilihanBersih = editPilihan.map((p) => p.trim()).filter((p) => p !== '');
      if (pilihanBersih.length < 2) { onPesan('red', 'Pilihan ganda butuh minimal 2 opsi jawaban.'); return; }
      if (!editKunci || !pilihanBersih.includes(editKunci)) { onPesan('red', 'Pilih kunci jawaban yang benar.'); return; }
    }
    setSedangProses(true);
    try {
      await fetch(`/api/kelompok/${kelompokId}/soal/${soalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teks: editTeks.trim(),
          tipe: editTipe,
          pilihan: editTipe === 'pilihan_ganda' ? pilihanBersih : [],
          kunci: editTipe === 'pilihan_ganda' ? editKunci : undefined,
        }),
      });
      setEditId(null);
      await muatSoal();
    } catch (err) {
      onPesan('red', 'Gagal menyimpan perubahan.');
      console.error(err);
    }
    setSedangProses(false);
  }

  async function hapusSoal(soalId: string) {
    tanya('Yakin ingin menghapus soal ini?', async () => {
      setSedangProses(true);
      try {
        await fetch(`/api/kelompok/${kelompokId}/soal/${soalId}`, { method: 'DELETE' });
        await muatSoal();
      } catch (err) {
        onPesan('red', 'Gagal menghapus soal.');
        console.error(err);
      }
      setSedangProses(false);
    });
  }

  async function pindahUrutan(soal: SoalData, arah: number) {
    const indexSekarang = daftarSoal.findIndex((s) => s.id === soal.id);
    const indexTarget = indexSekarang + arah;
    if (indexTarget < 0 || indexTarget >= daftarSoal.length) return;
    const soalTarget = daftarSoal[indexTarget];
    setSedangProses(true);
    try {
      await fetch(`/api/kelompok/${kelompokId}/soal/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            { id: soal.id, urutan: soalTarget.urutan },
            { id: soalTarget.id, urutan: soal.urutan },
          ],
        }),
      });
      await muatSoal();
    } catch (err) {
      onPesan('red', 'Gagal mengubah urutan.');
      console.error(err);
    }
    setSedangProses(false);
  }

  function bukaEditKelompok() {
    setEditNama(kelompok.nama ?? '');
    setEditLevel(kelompok.level ?? '');
    setEditDivisi(kelompok.divisi ?? '');
    setEditDepartemen(kelompok.departemen ?? '');
    setEditMenunjukkan(true);
  }

  function tutupEditKelompok() {
    setEditMenunjukkan(false);
  }

  async function simpanEditKelompok() {
    if (!editNama.trim() || !editLevel || !editDivisi || !editDepartemen) {
      onPesan('red', 'Nama, level, divisi, dan departemen wajib diisi.');
      return;
    }
    setSedangProses(true);
    try {
      await fetch(`/api/kelompok/${kelompokId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nama: editNama.trim(),
          level: editLevel,
          divisi: editDivisi,
          departemen: editDepartemen,
        }),
      });
      onPesan('green', 'Kelompok soal diperbarui.');
      await onChanged();
      tutupEditKelompok();
    } catch (err) {
      console.error(err);
      onPesan('red', 'Gagal memperbarui kelompok soal.');
    }
    setSedangProses(false);
  }

  async function hapusKelompok() {
    tanya('Hapus kelompok soal ini beserta seluruh soalnya?', async () => {
      setSedangProses(true);
      try {
        await fetch(`/api/kelompok/${kelompokId}`, { method: 'DELETE' });
        onPesan('green', 'Kelompok soal dihapus.');
        await onChanged();
      } catch (err) {
        console.error(err);
        onPesan('red', 'Gagal menghapus kelompok soal.');
      }
      setSedangProses(false);
    });
  }

  function downloadTemplate() {
    const template = [
      {
        'Pertanyaan': 'Apa singkatan dari CPU?',
        'Tipe': 'pilihan_ganda',
        'Opsi': 'Central Processing Unit;Control Processing Unit;Computer Personal Unit',
        'Kunci': 'Central Processing Unit',
      },
      {
        'Pertanyaan': 'Jelaskan pengalaman kerja Anda di bidang ini.',
        'Tipe': 'esai',
        'Opsi': '',
        'Kunci': '',
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(template);
    worksheet['!cols'] = [{ wch: 50 }, { wch: 15 }, { wch: 50 }, { wch: 30 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Soal');
    XLSX.writeFile(workbook, 'template-soal.xlsx');
  }

  function bersihkanImport() {
    setFileExcel(null);
    setPesanImport(null);
    const el = document.getElementById(`file-excel-${kelompokId}`) as HTMLInputElement | null;
    if (el) el.value = '';
  }

  async function importDariExcel(file: File) {
    setSedangImport(true);
    setPesanImport(null);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const baris: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, any>[];

      if (baris.length === 0) {
        setPesanImport({ tone: 'red', teks: 'File tidak berisi data.' });
        return;
      }

      const urutanTertinggi = daftarSoal.reduce((max, s) => Math.max(max, s.urutan || 0), 0);
      let sukses = 0;
      let gagal = 0;

      for (let i = 0; i < baris.length; i++) {
        const hasil = parseBarisSoal(baris[i], urutanTertinggi + i + 1);
        if (!hasil.valid) {
          gagal += 1;
          continue;
        }

        try {
          await fetch(`/api/kelompok/${kelompokId}/soal`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              teks: hasil.teks,
              urutan: hasil.urutan,
              tipe: hasil.tipe,
              pilihan: hasil.tipe === 'pilihan_ganda' ? hasil.pilihan : [],
              kunci: hasil.tipe === 'pilihan_ganda' ? hasil.kunci : undefined,
            }),
          });
          sukses += 1;
        } catch {
          gagal += 1;
        }
      }

      if (sukses === 0) {
        setPesanImport({ tone: 'red', teks: 'Tidak ada soal valid yang bisa diimpor. Periksa format template.' });
        return;
      }

      bersihkanImport();
      setPesanImport({
        tone: 'green',
        teks: `Berhasil menambah ${sukses} soal${gagal > 0 ? ` (${gagal} baris dilewati karena tidak valid)` : ''}.`,
      });
      await muatSoal();
    } catch (err) {
      console.error(err);
      setPesanImport({ tone: 'red', teks: 'Gagal membaca file. Pastikan formatnya .xlsx sesuai template.' });
    } finally {
      setSedangImport(false);
    }
  }

  function handleFileExcel(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileExcel(file);
    setPesanImport(null);
  }

  function ubahOpsiBaru(i: number, v: string) { setPilihanBaru((prev) => { const s = [...prev]; s[i] = v; return s; }); }
  function tambahOpsiBaru() { setPilihanBaru((prev) => [...prev, '']); }
  function hapusOpsiBaru(i: number) { setPilihanBaru((prev) => prev.filter((_, idx) => idx !== i)); }
  function ubahOpsiEdit(i: number, v: string) { setEditPilihan((prev) => { const s = [...prev]; s[i] = v; return s; }); }
  function tambahOpsiEdit() { setEditPilihan((prev) => [...prev, '']); }
  function hapusOpsiEdit(i: number) { setEditPilihan((prev) => prev.filter((_, idx) => idx !== i)); }

  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-navy-900">{kelompok.nama}</p>
          <p className="text-xs text-slate-500">
            <Badge tone="teal" className="mr-1">{kelompok.level}</Badge>
            <Badge tone="blue" className="mr-1">{kelompok.divisi}</Badge>
            <Badge tone="purple" className="mr-1">{kelompok.departemen}</Badge>
            {daftarSoal.length} soal
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => setShowTambah((v) => !v)}>
            {showTambah ? (<><X size={14} className="inline mr-1" />Tutup</>) : (<><Plus size={14} className="inline mr-1" />Tambah Soal</>)}
          </Button>
          <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={bukaEditKelompok}>
            <Pencil size={14} className="inline mr-1" />Edit Kelompok
          </Button>
          <Button variant="secondary" className="!px-3 !py-1.5 text-xs !text-red-600" onClick={hapusKelompok} disabled={sedangProses}>
            <Trash2 size={14} className="inline mr-1" />Hapus
          </Button>
        </div>
      </div>

      {editMenunjukkan && (
        <div className="mb-4 border border-slate-100 rounded-xl p-3 space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <Input value={editNama} onChange={(e) => setEditNama(e.target.value)} placeholder="Nama" className="!mb-0" />
            <Select value={editLevel} onChange={(e) => setEditLevel(e.target.value)} className="!mb-0">
              <option value="">Level</option>
              {daftarLevel.map((l) => <option key={l} value={l}>{l}</option>)}
            </Select>
            <Select value={editDivisi} onChange={(e) => setEditDivisi(e.target.value)} className="!mb-0">
              <option value="">Divisi</option>
              {daftarDivisi.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
            <Select value={editDepartemen} onChange={(e) => setEditDepartemen(e.target.value)} className="!mb-0">
              <option value="">Departemen</option>
              {daftarDepartemen.map((d) => <option key={d} value={d}>{d}</option>)}
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={simpanEditKelompok} disabled={sedangProses} className="!px-3 !py-1.5 text-xs">
              <Save size={14} className="inline mr-1" />Simpan
            </Button>
            <Button variant="secondary" onClick={tutupEditKelompok} className="!px-3 !py-1.5 text-xs">Batal</Button>
          </div>
        </div>
      )}

      {showTambah && (
        <form onSubmit={tambahSoal} className="mb-4 border border-slate-100 rounded-xl p-3 space-y-3">
          <Label>Pertanyaan</Label>
          <Textarea rows={2} className="!mb-0" placeholder="Ketik pertanyaan di sini..."
            value={teksBaru} onChange={(e) => setTeksBaru(e.target.value)} />

          <Select value={tipeBaru} onChange={(e) => { setTipeBaru(e.target.value); setKunciBaru(''); }}>
            <option value="esai">Esai (jawaban bebas)</option>
            <option value="pilihan_ganda">Pilihan Ganda</option>
          </Select>

          {tipeBaru === 'pilihan_ganda' && (
            <>
              <Label>Opsi Jawaban</Label>
              {pilihanBaru.map((opsi, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input placeholder={`Opsi ${i + 1}`} value={opsi} onChange={(e) => ubahOpsiBaru(i, e.target.value)} className="!mb-0" />
                  {pilihanBaru.length > 2 && (
                    <Button type="button" variant="secondary" onClick={() => hapusOpsiBaru(i)} className="!px-3"><X size={12} /></Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="ghost" onClick={tambahOpsiBaru} className="!px-3 !py-1.5 text-xs mb-2">+ Tambah Opsi</Button>

              <Label>Kunci Jawaban (yang benar)</Label>
              <Select value={kunciBaru} onChange={(e) => setKunciBaru(e.target.value)} className="!mb-0">
                <option value="">— Pilih jawaban benar —</option>
                {pilihanBaru.filter((p) => p.trim() !== '').map((opsi, i) => (
                  <option key={i} value={opsi}>{opsi}</option>
                ))}
              </Select>
            </>
          )}

          <Button type="submit" disabled={sedangProses} className="w-full">
            {sedangProses ? 'Menyimpan...' : '+ Tambah Soal'}
          </Button>
        </form>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-3">
        <label className="flex-1 cursor-pointer">
          <Input
            id={`file-excel-${kelompokId}`}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileExcel}
            className="!mb-0"
          />
        </label>
        <Button variant="secondary" onClick={downloadTemplate} className="!px-3 !py-1.5 text-xs"><Download size={14} className="inline mr-1" />Template</Button>
        <Button
          onClick={() => fileExcel && importDariExcel(fileExcel)}
          disabled={!fileExcel || sedangImport}
          className="!px-3 !py-1.5 text-xs"
        >
          {sedangImport ? 'Mengimpor...' : (<><Rocket size={14} className="inline mr-1" />Import Excel</>)}
        </Button>
      </div>

      {pesanImport && (
        <p className={`text-sm px-3 py-2 rounded-lg mb-3 ${pesanImport.tone === 'green' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {pesanImport.teks}
        </p>
      )}

      {loadingSoal ? (
        <div className="py-6 text-center">
          <Spinner className="mx-auto h-6 w-6" />
        </div>
      ) : daftarSoal.length === 0 ? (
        <p className="text-sm text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-xl">
          Belum ada soal di kelompok ini. Tambahkan melalui form di atas atau impor dari Excel.
        </p>
      ) : (
        <div className="divide-y divide-slate-100">
          {daftarSoal.map((soal, index) => (
            <div key={soal.id} className="py-3">
              {editId === soal.id ? (
                <div className="space-y-3">
                  <Textarea rows={2} className="!mb-0" value={editTeks} onChange={(e) => setEditTeks(e.target.value)} />
                  <Select value={editTipe} onChange={(e) => setEditTipe(e.target.value)}>
                    <option value="esai">Esai (jawaban bebas)</option>
                    <option value="pilihan_ganda">Pilihan Ganda</option>
                  </Select>
                  {editTipe === 'pilihan_ganda' && (
                    <>
                      <Label>Opsi Jawaban</Label>
                      {editPilihan.map((opsi, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <Input placeholder={`Opsi ${i + 1}`} value={opsi} onChange={(e) => ubahOpsiEdit(i, e.target.value)} className="!mb-0" />
                          {editPilihan.length > 2 && (
                            <Button type="button" variant="secondary" onClick={() => hapusOpsiEdit(i)} className="!px-3"><X size={12} /></Button>
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="ghost" onClick={tambahOpsiEdit} className="!px-3 !py-1.5 text-xs mb-2">+ Tambah Opsi</Button>
                      <Label>Kunci Jawaban (yang benar)</Label>
                      <Select value={editKunci} onChange={(e) => setEditKunci(e.target.value)}>
                        <option value="">— Pilih jawaban benar —</option>
                        {editPilihan.filter((p) => p.trim() !== '').map((opsi, i) => (
                          <option key={i} value={opsi}>{opsi}</option>
                        ))}
                      </Select>
                    </>
                  )}
                  <div className="flex gap-2">
                    <Button onClick={() => simpanEdit(soal.id ?? '')} disabled={sedangProses} className="!px-3 !py-1.5 text-xs">Simpan</Button>
                    <Button variant="secondary" onClick={() => setEditId(null)} className="!px-3 !py-1.5 text-xs">Batal</Button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex flex-wrap items-start gap-2">
                    <Badge tone="slate" className="mt-0.5">#{index + 1}</Badge>
                    <p className="text-sm text-navy-900 flex-1 break-words">{soal.teks}</p>
                  </div>
                  {soal.tipe === 'pilihan_ganda' && (
                    <>
                      <ul className="text-sm text-slate-600 list-disc list-inside mt-1 mb-1 pl-5">
                        {(soal.pilihan || []).map((opsi, i) => <li key={i}>{opsi}</li>)}
                      </ul>
                      <p className="text-sm text-green-700 font-semibold mb-1">
                        <Check size={14} className="inline text-green-600 mr-1" />Kunci: {kunciMap[soal.id ?? ''] || <span className="text-red-600">(belum diatur)</span>}
                      </p>
                    </>
                  )}
                  <div className="flex gap-1 flex-wrap mt-1">
                    <Button variant="ghost" onClick={() => pindahUrutan(soal, -1)} disabled={index === 0 || sedangProses} className="!px-3 !py-1.5 text-xs"><ChevronUp size={14} className="inline" /> Naik</Button>
                    <Button variant="ghost" onClick={() => pindahUrutan(soal, 1)} disabled={index === daftarSoal.length - 1 || sedangProses} className="!px-3 !py-1.5 text-xs"><ChevronDown size={14} className="inline" /> Turun</Button>
                    <Button variant="ghost" onClick={() => mulaiEdit(soal)} disabled={sedangProses} className="!px-3 !py-1.5 text-xs">Edit</Button>
                    <Button variant="danger" onClick={() => hapusSoal(soal.id ?? '')} disabled={sedangProses} className="!px-3 !py-1.5 text-xs">Hapus</Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <ConfirmModal open={confirmOpen} onConfirm={() => { confirmAction?.(); setConfirmOpen(false); setConfirmAction(null); }} onCancel={() => { setConfirmOpen(false); setConfirmAction(null); }} title="Konfirmasi" message={confirmMsg} confirmLabel="Ya" />
    </div>
  );
}