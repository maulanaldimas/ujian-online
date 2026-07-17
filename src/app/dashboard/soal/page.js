'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, query, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../../../firebase';
import LoginGate from '../../components/LoginGate';
import { PageBackground, Card, Label, Input, Textarea, Select, Button, Badge, TopNav } from '../../components/ui';

export default function KelolaSoal() {
  return (
    <LoginGate>
      {() => <KelolaSoalIsi />}
    </LoginGate>
  );
}

function KelolaSoalIsi() {
  const [daftarSoal, setDaftarSoal] = useState([]);
  const [kunciMap, setKunciMap] = useState({});
  const [loadingSoal, setLoadingSoal] = useState(true);
  const [sedangProses, setSedangProses] = useState(false);

  const [teksBaru, setTeksBaru] = useState('');
  const [tipeBaru, setTipeBaru] = useState('esai');
  const [pilihanBaru, setPilihanBaru] = useState(['', '', '', '']);
  const [kunciBaru, setKunciBaru] = useState('');

  const [editId, setEditId] = useState(null);
  const [editTeks, setEditTeks] = useState('');
  const [editTipe, setEditTipe] = useState('esai');
  const [editPilihan, setEditPilihan] = useState(['', '', '', '']);
  const [editKunci, setEditKunci] = useState('');

  useEffect(() => { muatSoal(); }, []);

  async function muatSoal() {
    setLoadingSoal(true);
    const q = query(collection(db, 'soalUjian'), orderBy('urutan', 'asc'));
    const snapshot = await getDocs(q);
    setDaftarSoal(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));

    const snapshotKunci = await getDocs(collection(db, 'kunciJawaban'));
    const map = {};
    snapshotKunci.docs.forEach((docSnap) => { map[docSnap.id] = docSnap.data().jawabanBenar; });
    setKunciMap(map);

    setLoadingSoal(false);
  }

  async function tambahSoal(e) {
    e.preventDefault();
    if (!teksBaru.trim()) return;

    let pilihanBersih = [];
    if (tipeBaru === 'pilihan_ganda') {
      pilihanBersih = pilihanBaru.map((p) => p.trim()).filter((p) => p !== '');
      if (pilihanBersih.length < 2) { alert('Pilihan ganda butuh minimal 2 opsi jawaban.'); return; }
      if (!kunciBaru || !pilihanBersih.includes(kunciBaru)) { alert('Pilih kunci jawaban yang benar.'); return; }
    }

    setSedangProses(true);
    try {
      const urutanTertinggi = daftarSoal.reduce((max, s) => Math.max(max, s.urutan || 0), 0);
      const dataSoal = { teks: teksBaru.trim(), urutan: urutanTertinggi + 1, tipe: tipeBaru };
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

  function mulaiEdit(soal) {
    setEditId(soal.id);
    setEditTeks(soal.teks);
    setEditTipe(soal.tipe || 'esai');
    setEditPilihan(soal.pilihan && soal.pilihan.length >= 2 ? soal.pilihan : ['', '', '', '']);
    setEditKunci(kunciMap[soal.id] || '');
  }

  async function simpanEdit(soalId) {
    if (!editTeks.trim()) return;
    let pilihanBersih = [];
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

  async function hapusSoal(soalId) {
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

  async function pindahUrutan(soal, arah) {
    const indexSekarang = daftarSoal.findIndex((s) => s.id === soal.id);
    const indexTarget = indexSekarang + arah;
    if (indexTarget < 0 || indexTarget >= daftarSoal.length) return;
    const soalTarget = daftarSoal[indexTarget];
    setSedangProses(true);
    try {
      await updateDoc(doc(db, 'soalUjian', soal.id), { urutan: soalTarget.urutan });
      await updateDoc(doc(db, 'soalUjian', soalTarget.id), { urutan: soal.urutan });
      await muatSoal();
    } catch (err) {
      alert('Gagal mengubah urutan.');
      console.error(err);
    }
    setSedangProses(false);
  }

  function ubahOpsiBaru(i, v) { setPilihanBaru((prev) => { const s = [...prev]; s[i] = v; return s; }); }
  function tambahOpsiBaru() { setPilihanBaru((prev) => [...prev, '']); }
  function hapusOpsiBaru(i) { setPilihanBaru((prev) => prev.filter((_, idx) => idx !== i)); }
  function ubahOpsiEdit(i, v) { setEditPilihan((prev) => { const s = [...prev]; s[i] = v; return s; }); }
  function tambahOpsiEdit() { setEditPilihan((prev) => [...prev, '']); }
  function hapusOpsiEdit(i) { setEditPilihan((prev) => prev.filter((_, idx) => idx !== i)); }

  return (
    <PageBackground className="p-5">
      <div className="max-w-3xl mx-auto">
        <TopNav
          title="Kelola Soal Ujian"
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

        {loadingSoal ? (
          <p className="text-slate-500 font-display">Memuat soal...</p>
        ) : daftarSoal.length === 0 ? (
          <p className="text-slate-500 font-display">Belum ada soal.</p>
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
                      <Button onClick={() => simpanEdit(soal.id)} disabled={sedangProses}>Simpan</Button>
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
                          ✓ Kunci: {kunciMap[soal.id] || <span className="text-red-600">(belum diatur)</span>}
                        </p>
                      </>
                    )}
                    <div className="flex gap-1 flex-wrap">
                      <Button variant="ghost" onClick={() => pindahUrutan(soal, -1)} disabled={index === 0 || sedangProses} className="!px-3 !py-1.5 text-xs">↑ Naik</Button>
                      <Button variant="ghost" onClick={() => pindahUrutan(soal, 1)} disabled={index === daftarSoal.length - 1 || sedangProses} className="!px-3 !py-1.5 text-xs">↓ Turun</Button>
                      <Button variant="ghost" onClick={() => mulaiEdit(soal)} disabled={sedangProses} className="!px-3 !py-1.5 text-xs">Edit</Button>
                      <Button variant="danger" onClick={() => hapusSoal(soal.id)} disabled={sedangProses} className="!px-3 !py-1.5 text-xs">Hapus</Button>
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