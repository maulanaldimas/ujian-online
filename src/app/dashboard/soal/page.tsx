'use client';
import { useState, useEffect, useCallback, type FormEvent, type ChangeEvent } from 'react';
import Link from 'next/link';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, query, orderBy, writeBatch } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import * as XLSX from 'xlsx';
import { db, auth } from '@/firebase';
import LoginGate from '@/app/components/LoginGate';
import { PageBackground, Card, Label, Input, Textarea, Select, Button, Badge, TopNav, Spinner, EmptyState } from '@/app/components/ui';
import { parseBarisSoal, type SoalData } from '@/lib/utils';

export default function KelolaSoal() {
  return (
    <LoginGate>
      {(_, role) => role === 'admin' ? <KelolaSoalIsi /> : <AksesTerbatas />}
    </LoginGate>
  );
}

function AksesTerbatas() {
  return (
    <PageBackground className="flex items-center justify-center p-5">
      <Card className="w-full max-w-sm p-8 text-center">
        <p className="text-4xl mb-3">🔒</p>
        <h1 className="font-display text-lg font-bold text-[#10192E] mb-2">Khusus Admin</h1>
        <p className="text-sm text-slate-500 mb-5">Halaman ini hanya bisa diakses oleh akun dengan peran Admin.</p>
        <Link href="/dashboard" className="text-sm font-semibold text-[#1F6F78] hover:underline">← Kembali ke Dashboard</Link>
      </Card>
    </PageBackground>
  );
}

function KelolaSoalIsi() {
  const [daftarSoal, setDaftarSoal] = useState<SoalData[]>([]);
  const [kunciMap, setKunciMap] = useState<Record<string, string>>({});
  const [loadingSoal, setLoadingSoal] = useState(true);
  const [sedangProses, setSedangProses] = useState(false);
  const [fileExcel, setFileExcel] = useState<File | null>(null);
  const [sedangImport, setSedangImport] = useState(false);
  const [pesanImport, setPesanImport] = useState<{ tone: string; teks: string } | null>(null);

  const [teksBaru, setTeksBaru] = useState('');
  const [tipeBaru, setTipeBaru] = useState('esai');
  const [pilihanBaru, setPilihanBaru] = useState(['', '', '', '']);
  const [kunciBaru, setKunciBaru] = useState('');

  const [editId, setEditId] = useState<string | null>(null);
  const [editTeks, setEditTeks] = useState('');
  const [editTipe, setEditTipe] = useState('esai');
  const [editPilihan, setEditPilihan] = useState(['', '', '', '']);
  const [editKunci, setEditKunci] = useState('');

  const ambilDataSoal = useCallback(async () => {
    const q = query(collection(db, 'soalUjian'), orderBy('urutan', 'asc'));
    const snapshot = await getDocs(q);
    const daftar = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })) as SoalData[];

    const snapshotKunci = await getDocs(collection(db, 'kunciJawaban'));
    const kunci: Record<string, string> = {};
    snapshotKunci.docs.forEach((docSnap) => { kunci[docSnap.id] = String(docSnap.data().jawabanBenar ?? ''); });

    return { daftar, kunci };
  }, []);

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
    });
    return () => {
      aktif = false;
    };
  }, [ambilDataSoal]);

  async function tambahSoal(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!teksBaru.trim()) return;

    let pilihanBersih: string[] = [];
    if (tipeBaru === 'pilihan_ganda') {
      pilihanBersih = pilihanBaru.map((p) => p.trim()).filter((p) => p !== '');
      if (pilihanBersih.length < 2) { alert('Pilihan ganda butuh minimal 2 opsi jawaban.'); return; }
      if (!kunciBaru || !pilihanBersih.includes(kunciBaru)) { alert('Pilih kunci jawaban yang benar.'); return; }
    }

    setSedangProses(true);
    try {
      const urutanTertinggi = daftarSoal.reduce((max, s) => Math.max(max, s.urutan || 0), 0);
      const dataSoal: { teks: string; urutan: number; tipe: string; pilihan?: string[] } = {
        teks: teksBaru.trim(),
        urutan: urutanTertinggi + 1,
        tipe: tipeBaru,
      };
      if (tipeBaru === 'pilihan_ganda') dataSoal.pilihan = pilihanBersih;

      const docRef = await addDoc(collection(db, 'soalUjian'), dataSoal);
      if (tipeBaru === 'pilihan_ganda') {
        await setDoc(doc(db, 'kunciJawaban', docRef.id), { jawabanBenar: kunciBaru });
      }

      setTeksBaru(''); setTipeBaru('esai'); setPilihanBaru(['', '', '', '']); setKunciBaru('');
      await muatSoal();
    } catch (err) {
      alert('Gagal menambah soal.');
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
      if (pilihanBersih.length < 2) { alert('Pilihan ganda butuh minimal 2 opsi jawaban.'); return; }
      if (!editKunci || !pilihanBersih.includes(editKunci)) { alert('Pilih kunci jawaban yang benar.'); return; }
    }
    setSedangProses(true);
    try {
      await updateDoc(doc(db, 'soalUjian', soalId), {
        teks: editTeks.trim(), tipe: editTipe,
        pilihan: editTipe === 'pilihan_ganda' ? pilihanBersih : [],
      });
      if (editTipe === 'pilihan_ganda') {
        await setDoc(doc(db, 'kunciJawaban', soalId), { jawabanBenar: editKunci });
      } else {
        await deleteDoc(doc(db, 'kunciJawaban', soalId)).catch(() => {});
      }
      setEditId(null);
      await muatSoal();
    } catch (err) {
      alert('Gagal menyimpan perubahan.');
      console.error(err);
    }
    setSedangProses(false);
  }

  async function hapusSoal(soalId: string) {
    if (!confirm('Yakin ingin menghapus soal ini?')) return;
    setSedangProses(true);
    try {
      await deleteDoc(doc(db, 'soalUjian', soalId));
      await deleteDoc(doc(db, 'kunciJawaban', soalId)).catch(() => {});
      await muatSoal();
    } catch (err) {
      alert('Gagal menghapus soal.');
      console.error(err);
    }
    setSedangProses(false);
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
    const el = document.getElementById('file-excel-import') as HTMLInputElement | null;
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
      const batch = writeBatch(db);
      let sukses = 0;
      let gagal = 0;

      baris.forEach((row, i) => {
        const hasil = parseBarisSoal(row, urutanTertinggi + i + 1);
        if (!hasil.valid) {
          gagal += 1;
          return;
        }

        const refSoal = doc(collection(db, 'soalUjian'));
        batch.set(refSoal, {
          teks: hasil.teks,
          urutan: hasil.urutan,
          tipe: hasil.tipe,
          pilihan: hasil.tipe === 'pilihan_ganda' ? hasil.pilihan : [],
        });
        if (hasil.tipe === 'pilihan_ganda') {
          batch.set(doc(db, 'kunciJawaban', refSoal.id), { jawabanBenar: hasil.kunci });
        }
        sukses += 1;
      });

      if (sukses === 0) {
        setPesanImport({ tone: 'red', teks: 'Tidak ada soal valid yang bisa diimpor. Periksa format template.' });
        return;
      }

      await batch.commit();
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

  async function pindahUrutan(soal: SoalData, arah: number) {
    const indexSekarang = daftarSoal.findIndex((s) => s.id === soal.id);
    const indexTarget = indexSekarang + arah;
    if (indexTarget < 0 || indexTarget >= daftarSoal.length) return;
    const soalTarget = daftarSoal[indexTarget];
    setSedangProses(true);
    try {
      await updateDoc(doc(db, 'soalUjian', soal.id ?? ''), { urutan: soalTarget.urutan });
      await updateDoc(doc(db, 'soalUjian', soalTarget.id ?? ''), { urutan: soal.urutan });
      await muatSoal();
    } catch (err) {
      alert('Gagal mengubah urutan.');
      console.error(err);
    }
    setSedangProses(false);
  }

  function ubahOpsiBaru(i: number, v: string) { setPilihanBaru((prev) => { const s = [...prev]; s[i] = v; return s; }); }
  function tambahOpsiBaru() { setPilihanBaru((prev) => [...prev, '']); }
  function hapusOpsiBaru(i: number) { setPilihanBaru((prev) => prev.filter((_, idx) => idx !== i)); }
  function ubahOpsiEdit(i: number, v: string) { setEditPilihan((prev) => { const s = [...prev]; s[i] = v; return s; }); }
  function tambahOpsiEdit() { setEditPilihan((prev) => [...prev, '']); }
  function hapusOpsiEdit(i: number) { setEditPilihan((prev) => prev.filter((_, idx) => idx !== i)); }

  return (
    <PageBackground className="p-5">
      <div className="max-w-3xl mx-auto">
        <TopNav
          title="Kelola Soal Ujian"
          subtitle="Atur soal, kunci jawaban, dan urutan pengerjaan"
          links={[{ href: '/dashboard', label: '← Dashboard' }]}
          onLogout={() => signOut(auth)}
        />

        <Card className="p-6 mb-6">
          <p className="font-display font-bold text-[#10192E] mb-4">Tambah Soal Baru</p>
          <form onSubmit={tambahSoal}>
            <Label>Pertanyaan</Label>
            <Textarea rows={2} className="mb-4" placeholder="Ketik pertanyaan di sini..."
              value={teksBaru} onChange={(e) => setTeksBaru(e.target.value)} />

            <Label>Tipe Soal</Label>
            <Select className="mb-4" value={tipeBaru} onChange={(e) => { setTipeBaru(e.target.value); setKunciBaru(''); }}>
              <option value="esai">Esai (jawaban bebas)</option>
              <option value="pilihan_ganda">Pilihan Ganda</option>
            </Select>

            {tipeBaru === 'pilihan_ganda' && (
              <div className="mb-4">
                <Label>Opsi Jawaban</Label>
                {pilihanBaru.map((opsi, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <Input placeholder={`Opsi ${i + 1}`} value={opsi} onChange={(e) => ubahOpsiBaru(i, e.target.value)} />
                    {pilihanBaru.length > 2 && (
                      <Button type="button" variant="secondary" onClick={() => hapusOpsiBaru(i)} className="!px-3">✕</Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="ghost" onClick={tambahOpsiBaru} className="!px-3 !py-1.5 text-xs mb-4">+ Tambah Opsi</Button>

                <Label>Kunci Jawaban (yang benar)</Label>
                <Select className="mb-2" value={kunciBaru} onChange={(e) => setKunciBaru(e.target.value)}>
                  <option value="">— Pilih jawaban benar —</option>
                  {pilihanBaru.filter((p) => p.trim() !== '').map((opsi, i) => (
                    <option key={i} value={opsi}>{opsi}</option>
                  ))}
                </Select>
              </div>
            )}

            <Button type="submit" disabled={sedangProses}>
              {sedangProses ? 'Menyimpan...' : '+ Tambah Soal'}
            </Button>
          </form>
        </Card>

        <Card className="p-6 mb-6">
          <p className="font-display font-bold text-[#10192E] mb-1">Import Soal dari Excel</p>
          <p className="text-sm text-slate-500 mb-4">
            Impor banyak soal sekaligus dari file .xlsx. Unduh template untuk melihat format yang diterima.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <label className="flex-1 cursor-pointer">
              <Input
                id="file-excel-import"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileExcel}
                className="!mb-0"
              />
            </label>
            <Button variant="secondary" onClick={downloadTemplate}>⬇ Unduh Template</Button>
            <Button
              onClick={() => fileExcel && importDariExcel(fileExcel)}
              disabled={!fileExcel || sedangImport}
            >
              {sedangImport ? 'Mengimpor...' : '🚀 Import Soal'}
            </Button>
          </div>

          {pesanImport && (
            <p className={`text-sm px-3 py-2 rounded-lg ${pesanImport.tone === 'green' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {pesanImport.teks}
            </p>
          )}
        </Card>

        {loadingSoal ? (
          <div className="text-center py-10">
            <Spinner className="mx-auto h-7 w-7" />
            <p className="text-slate-500 font-display mt-3">Memuat soal...</p>
          </div>
        ) : daftarSoal.length === 0 ? (
          <EmptyState
            icon="📝"
            title="Belum ada soal"
            description="Tambahkan soal pertama melalui formulir di atas untuk memulai."
          />
        ) : (
          <div className="space-y-3">
            {daftarSoal.map((soal, index) => (
              <Card key={soal.id} className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Badge tone="slate">Soal #{index + 1}</Badge>
                  <Badge tone={soal.tipe === 'pilihan_ganda' ? 'teal' : 'slate'}>
                    {soal.tipe === 'pilihan_ganda' ? 'Pilihan Ganda' : 'Esai'}
                  </Badge>
                </div>

                {editId === soal.id ? (
                  <>
                    <Textarea rows={2} className="mb-3" value={editTeks} onChange={(e) => setEditTeks(e.target.value)} />
                    <Select className="mb-3" value={editTipe} onChange={(e) => setEditTipe(e.target.value)}>
                      <option value="esai">Esai (jawaban bebas)</option>
                      <option value="pilihan_ganda">Pilihan Ganda</option>
                    </Select>

                    {editTipe === 'pilihan_ganda' && (
                      <div className="mb-3">
                        <Label>Opsi Jawaban</Label>
                        {editPilihan.map((opsi, i) => (
                          <div key={i} className="flex gap-2 mb-2">
                            <Input placeholder={`Opsi ${i + 1}`} value={opsi} onChange={(e) => ubahOpsiEdit(i, e.target.value)} />
                            {editPilihan.length > 2 && (
                              <Button type="button" variant="secondary" onClick={() => hapusOpsiEdit(i)} className="!px-3">✕</Button>
                            )}
                          </div>
                        ))}
                        <Button type="button" variant="ghost" onClick={tambahOpsiEdit} className="!px-3 !py-1.5 text-xs mb-3">+ Tambah Opsi</Button>

                        <Label>Kunci Jawaban (yang benar)</Label>
                        <Select value={editKunci} onChange={(e) => setEditKunci(e.target.value)}>
                          <option value="">— Pilih jawaban benar —</option>
                          {editPilihan.filter((p) => p.trim() !== '').map((opsi, i) => (
                            <option key={i} value={opsi}>{opsi}</option>
                          ))}
                        </Select>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button onClick={() => simpanEdit(soal.id ?? '')} disabled={sedangProses}>Simpan</Button>
                      <Button variant="secondary" onClick={() => setEditId(null)}>Batal</Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[#10192E] mb-2">{soal.teks}</p>
                    {soal.tipe === 'pilihan_ganda' && (
                      <>
                        <ul className="text-sm text-slate-600 list-disc list-inside mb-1">
                          {(soal.pilihan || []).map((opsi, i) => <li key={i}>{opsi}</li>)}
                        </ul>
                        <p className="text-sm text-green-700 font-semibold mb-3">
                          ✓ Kunci: {kunciMap[soal.id ?? ''] || <span className="text-red-600">(belum diatur)</span>}
                        </p>
                      </>
                    )}
                    <div className="flex gap-1 flex-wrap">
                      <Button variant="ghost" onClick={() => pindahUrutan(soal, -1)} disabled={index === 0 || sedangProses} className="!px-3 !py-1.5 text-xs">↑ Naik</Button>
                      <Button variant="ghost" onClick={() => pindahUrutan(soal, 1)} disabled={index === daftarSoal.length - 1 || sedangProses} className="!px-3 !py-1.5 text-xs">↓ Turun</Button>
                      <Button variant="ghost" onClick={() => mulaiEdit(soal)} disabled={sedangProses} className="!px-3 !py-1.5 text-xs">Edit</Button>
                      <Button variant="danger" onClick={() => hapusSoal(soal.id ?? '')} disabled={sedangProses} className="!px-3 !py-1.5 text-xs">Hapus</Button>
                    </div>
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageBackground>
  );
}