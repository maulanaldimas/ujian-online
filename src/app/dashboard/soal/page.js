'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, setDoc, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, auth } from '../../../firebase';
import Link from 'next/link';

export default function KelolaSoal() {
  const [user, setUser] = useState(null);
  const [cekLoginSelesai, setCekLoginSelesai] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorLogin, setErrorLogin] = useState('');

  const [daftarSoal, setDaftarSoal] = useState([]);
  const [kunciMap, setKunciMap] = useState({}); // BARU: { soalId: "jawaban benar" }
  const [loadingSoal, setLoadingSoal] = useState(true);
  const [sedangProses, setSedangProses] = useState(false);

  const [teksBaru, setTeksBaru] = useState('');
  const [tipeBaru, setTipeBaru] = useState('esai');
  const [pilihanBaru, setPilihanBaru] = useState(['', '', '', '']);
  const [kunciBaru, setKunciBaru] = useState(''); // BARU

  const [editId, setEditId] = useState(null);
  const [editTeks, setEditTeks] = useState('');
  const [editTipe, setEditTipe] = useState('esai');
  const [editPilihan, setEditPilihan] = useState(['', '', '', '']);
  const [editKunci, setEditKunci] = useState(''); // BARU

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCekLoginSelesai(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    muatSoal();
  }, [user]);

  async function muatSoal() {
    setLoadingSoal(true);
    const q = query(collection(db, 'soalUjian'), orderBy('urutan', 'asc'));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    setDaftarSoal(data);

    // BARU: ambil semua kunci jawaban sekaligus (HR sudah login, jadi ini diizinkan)
    const snapshotKunci = await getDocs(collection(db, 'kunciJawaban'));
    const map = {};
    snapshotKunci.docs.forEach((docSnap) => { map[docSnap.id] = docSnap.data().jawabanBenar; });
    setKunciMap(map);

    setLoadingSoal(false);
  }

  async function handleLogin(e) {
    e.preventDefault();
    setErrorLogin('');
    try {
      await signInWithEmailAndPassword(auth, emailInput, passwordInput);
    } catch (err) {
      setErrorLogin('Email atau password salah.');
    }
  }

  async function tambahSoal(e) {
    e.preventDefault();
    if (!teksBaru.trim()) return;

    let pilihanBersih = [];
    if (tipeBaru === 'pilihan_ganda') {
      pilihanBersih = pilihanBaru.map((p) => p.trim()).filter((p) => p !== '');
      if (pilihanBersih.length < 2) {
        alert('Pilihan ganda butuh minimal 2 opsi jawaban yang terisi.');
        return;
      }
      if (!kunciBaru || !pilihanBersih.includes(kunciBaru)) {
        alert('Pilih salah satu opsi sebagai kunci jawaban yang benar.');
        return;
      }
    }

    setSedangProses(true);
    try {
      const urutanTertinggi = daftarSoal.reduce((max, s) => Math.max(max, s.urutan || 0), 0);
      const dataSoal = { teks: teksBaru.trim(), urutan: urutanTertinggi + 1, tipe: tipeBaru };
      if (tipeBaru === 'pilihan_ganda') dataSoal.pilihan = pilihanBersih;

      const docRef = await addDoc(collection(db, 'soalUjian'), dataSoal);

      // BARU: simpan kunci jawaban di collection terpisah
      if (tipeBaru === 'pilihan_ganda') {
        await setDoc(doc(db, 'kunciJawaban', docRef.id), { jawabanBenar: kunciBaru });
      }

      setTeksBaru('');
      setTipeBaru('esai');
      setPilihanBaru(['', '', '', '']);
      setKunciBaru('');
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
    setEditKunci(kunciMap[soal.id] || ''); // BARU: prefill kunci yang sudah ada
  }

  async function simpanEdit(soalId) {
    if (!editTeks.trim()) return;
    let pilihanBersih = [];
    if (editTipe === 'pilihan_ganda') {
      pilihanBersih = editPilihan.map((p) => p.trim()).filter((p) => p !== '');
      if (pilihanBersih.length < 2) {
        alert('Pilihan ganda butuh minimal 2 opsi jawaban yang terisi.');
        return;
      }
      if (!editKunci || !pilihanBersih.includes(editKunci)) {
        alert('Pilih salah satu opsi sebagai kunci jawaban yang benar.');
        return;
      }
    }
    setSedangProses(true);
    try {
      await updateDoc(doc(db, 'soalUjian', soalId), {
        teks: editTeks.trim(),
        tipe: editTipe,
        pilihan: editTipe === 'pilihan_ganda' ? pilihanBersih : [],
      });

      // BARU: simpan/hapus kunci jawaban sesuai tipe soal
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
      await deleteDoc(doc(db, 'kunciJawaban', soalId)).catch(() => {}); // BARU: bersihkan kunci juga
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

  function ubahOpsiBaru(index, value) {
    setPilihanBaru((prev) => { const s = [...prev]; s[index] = value; return s; });
  }
  function tambahOpsiBaru() { setPilihanBaru((prev) => [...prev, '']); }
  function hapusOpsiBaru(index) { setPilihanBaru((prev) => prev.filter((_, i) => i !== index)); }

  function ubahOpsiEdit(index, value) {
    setEditPilihan((prev) => { const s = [...prev]; s[index] = value; return s; });
  }
  function tambahOpsiEdit() { setEditPilihan((prev) => [...prev, '']); }
  function hapusOpsiEdit(index) { setEditPilihan((prev) => prev.filter((_, i) => i !== index)); }

  const input = 'w-full p-2 mb-3 border border-gray-300 rounded text-gray-900 bg-white';
  const label = 'block font-bold text-gray-900 mb-1';
  const btnUtama = 'px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
  const btnKecil = 'px-2 py-1 ml-1 text-sm text-gray-700 hover:text-gray-900 cursor-pointer disabled:opacity-40';

  if (!cekLoginSelesai) return <p className="text-center mt-10 text-gray-900">Memuat...</p>;

  if (!user) {
    return (
      <main className="max-w-sm mx-auto mt-20 p-5">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Login HR</h1>
        <form onSubmit={handleLogin}>
          <input type="email" placeholder="Email" value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)} className={input} />
          <input type="password" placeholder="Password" value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)} className={input} />
          {errorLogin && <p className="text-red-600 mb-3">{errorLogin}</p>}
          <button type="submit" className={btnUtama}>Masuk</button>
        </form>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-5 mt-10">
      <div className="flex justify-between items-center mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Kelola Soal Ujian</h1>
        <div className="text-gray-900">
          <Link href="/dashboard" className="mr-3 underline">← Ke Dashboard</Link>
          <button onClick={() => signOut(auth)} className="cursor-pointer underline">Logout</button>
        </div>
      </div>

      <form onSubmit={tambahSoal} className="mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
        <label className={label}>Tambah Soal Baru</label>
        <textarea rows={2} className={`${input} resize-y`}
          placeholder="Ketik pertanyaan di sini..."
          value={teksBaru} onChange={(e) => setTeksBaru(e.target.value)} />

        <label className={label}>Tipe Soal</label>
        <select value={tipeBaru} onChange={(e) => { setTipeBaru(e.target.value); setKunciBaru(''); }} className={input}>
          <option value="esai">Esai (jawaban bebas)</option>
          <option value="pilihan_ganda">Pilihan Ganda</option>
        </select>

        {tipeBaru === 'pilihan_ganda' && (
          <div className="mb-3">
            <label className={label}>Opsi Jawaban</label>
            {pilihanBaru.map((opsi, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input className={`${input} mb-0`} placeholder={`Opsi ${i + 1}`}
                  value={opsi} onChange={(e) => ubahOpsiBaru(i, e.target.value)} />
                {pilihanBaru.length > 2 && (
                  <button type="button" onClick={() => hapusOpsiBaru(i)} className={btnKecil}>✕</button>
                )}
              </div>
            ))}
            <button type="button" onClick={tambahOpsiBaru} className={`${btnKecil} mb-3 block`}>+ Tambah Opsi</button>

            {/* BARU: pilih kunci jawaban */}
            <label className={label}>Kunci Jawaban (yang benar)</label>
            <select value={kunciBaru} onChange={(e) => setKunciBaru(e.target.value)} className={input}>
              <option value="">— Pilih jawaban benar —</option>
              {pilihanBaru.filter((p) => p.trim() !== '').map((opsi, i) => (
                <option key={i} value={opsi}>{opsi}</option>
              ))}
            </select>
          </div>
        )}

        <button type="submit" className={btnUtama} disabled={sedangProses}>
          {sedangProses ? 'Menyimpan...' : '+ Tambah Soal'}
        </button>
      </form>

      {loadingSoal ? (
        <p className="text-gray-900">Memuat soal...</p>
      ) : daftarSoal.length === 0 ? (
        <p className="text-gray-900">Belum ada soal. Tambahkan soal pertama di atas.</p>
      ) : (
        daftarSoal.map((soal, index) => (
          <div key={soal.id} className="border border-gray-200 rounded-lg p-4 mb-3">
            <p className="text-xs font-bold text-gray-600 mb-1">
              Soal #{index + 1} — {soal.tipe === 'pilihan_ganda' ? 'Pilihan Ganda' : 'Esai'}
            </p>

            {editId === soal.id ? (
              <>
                <textarea rows={2} className={`${input} resize-y`}
                  value={editTeks} onChange={(e) => setEditTeks(e.target.value)} />

                <select value={editTipe} onChange={(e) => setEditTipe(e.target.value)} className={input}>
                  <option value="esai">Esai (jawaban bebas)</option>
                  <option value="pilihan_ganda">Pilihan Ganda</option>
                </select>

                {editTipe === 'pilihan_ganda' && (
                  <div className="mb-3">
                    <label className={label}>Opsi Jawaban</label>
                    {editPilihan.map((opsi, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input className={`${input} mb-0`} placeholder={`Opsi ${i + 1}`}
                          value={opsi} onChange={(e) => ubahOpsiEdit(i, e.target.value)} />
                        {editPilihan.length > 2 && (
                          <button type="button" onClick={() => hapusOpsiEdit(i)} className={btnKecil}>✕</button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={tambahOpsiEdit} className={`${btnKecil} mb-3 block`}>+ Tambah Opsi</button>

                    <label className={label}>Kunci Jawaban (yang benar)</label>
                    <select value={editKunci} onChange={(e) => setEditKunci(e.target.value)} className={input}>
                      <option value="">— Pilih jawaban benar —</option>
                      {editPilihan.filter((p) => p.trim() !== '').map((opsi, i) => (
                        <option key={i} value={opsi}>{opsi}</option>
                      ))}
                    </select>
                  </div>
                )}

                <button onClick={() => simpanEdit(soal.id)} className={btnUtama} disabled={sedangProses}>Simpan</button>
                <button onClick={() => setEditId(null)} className={btnKecil}>Batal</button>
              </>
            ) : (
              <>
                <p className="text-gray-900 mb-2">{soal.teks}</p>
                {soal.tipe === 'pilihan_ganda' && (
                  <>
                    <ul className="text-sm text-gray-800 list-disc list-inside mb-1">
                      {(soal.pilihan || []).map((opsi, i) => <li key={i}>{opsi}</li>)}
                    </ul>
                    <p className="text-sm text-green-700 font-semibold mb-2">
                      ✓ Kunci: {kunciMap[soal.id] || <span className="text-red-600">(belum diatur)</span>}
                    </p>
                  </>
                )}
                <button onClick={() => pindahUrutan(soal, -1)} className={btnKecil} disabled={index === 0 || sedangProses}>↑ Naik</button>
                <button onClick={() => pindahUrutan(soal, 1)} className={btnKecil} disabled={index === daftarSoal.length - 1 || sedangProses}>↓ Turun</button>
                <button onClick={() => mulaiEdit(soal)} className={btnKecil} disabled={sedangProses}>Edit</button>
                <button onClick={() => hapusSoal(soal.id)} className={`${btnKecil} text-red-600 hover:text-red-800`} disabled={sedangProses}>Hapus</button>
              </>
            )}
          </div>
        ))
      )}
    </main>
  );
}