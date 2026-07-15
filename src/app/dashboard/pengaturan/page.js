'use client';
import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, auth } from '../../../firebase';
import Link from 'next/link';

export default function Pengaturan() {
  const [user, setUser] = useState(null);
  const [cekLoginSelesai, setCekLoginSelesai] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorLogin, setErrorLogin] = useState('');

  const [kameraAktif, setKameraAktif] = useState(true);
  const [audioAktif, setAudioAktif] = useState(true);
  const [loadingPengaturan, setLoadingPengaturan] = useState(true);
  const [sedangSimpan, setSedangSimpan] = useState(false);
  const [pesanSukses, setPesanSukses] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCekLoginSelesai(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
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
  }, [user]);

  async function handleLogin(e) {
    e.preventDefault();
    setErrorLogin('');
    try {
      await signInWithEmailAndPassword(auth, emailInput, passwordInput);
    } catch (err) {
      setErrorLogin('Email atau password salah.');
    }
  }

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

  const input = 'w-full p-2 mb-3 border border-gray-300 rounded text-gray-900 bg-white';
  const btnUtama = 'px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-900 disabled:opacity-50 cursor-pointer';

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

  if (loadingPengaturan) return <p className="text-center mt-10 text-gray-900">Memuat pengaturan...</p>;

  return (
    <main className="max-w-xl mx-auto p-5 mt-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan Proctoring</h1>
        <div className="text-gray-900">
          <Link href="/dashboard" className="mr-3 underline">← Ke Dashboard</Link>
          <button onClick={() => signOut(auth)} className="cursor-pointer underline">Logout</button>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-4">
        <div className="flex justify-between items-center py-3 border-b border-gray-200">
          <div>
            <p className="font-bold text-gray-900">Deteksi Wajah (Kamera)</p>
            <p className="text-sm text-gray-600">Memantau kamera peserta untuk deteksi wajah kosong/ganda.</p>
          </div>
          <button
            onClick={() => setKameraAktif(!kameraAktif)}
            className={`w-14 h-8 rounded-full relative transition cursor-pointer ${kameraAktif ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${kameraAktif ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        <div className="flex justify-between items-center py-3">
          <div>
            <p className="font-bold text-gray-900">Deteksi Suara (Mikrofon)</p>
            <p className="text-sm text-gray-600">Memantau mikrofon peserta untuk deteksi suara mencurigakan.</p>
          </div>
          <button
            onClick={() => setAudioAktif(!audioAktif)}
            className={`w-14 h-8 rounded-full relative transition cursor-pointer ${audioAktif ? 'bg-green-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${audioAktif ? 'left-7' : 'left-1'}`} />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-4">
        Perubahan berlaku untuk peserta yang <b>baru memulai</b> ujian setelah pengaturan disimpan — tidak memengaruhi sesi yang sedang berjalan.
      </p>

      <button onClick={simpanPengaturan} className={btnUtama} disabled={sedangSimpan}>
        {sedangSimpan ? 'Menyimpan...' : 'Simpan Pengaturan'}
      </button>
      {pesanSukses && <span className="ml-3 text-green-700 font-semibold">✓ Tersimpan</span>}
    </main>
  );
}