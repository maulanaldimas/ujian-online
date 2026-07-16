'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from '../../firebase';
import Link from 'next/link';

export default function Dashboard() {
  const [peserta, setPeserta] = useState([]);
  const [soalMap, setSoalMap] = useState({});
  const [soalFullMap, setSoalFullMap] = useState({});
  const [kunciMap, setKunciMap] = useState({});
  const [loadingData, setLoadingData] = useState(true);
  const [user, setUser] = useState(null);
  const [cekLoginSelesai, setCekLoginSelesai] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorLogin, setErrorLogin] = useState('');
  const [pesertaTerpilih, setPesertaTerpilih] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCekLoginSelesai(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    async function ambilData() {
      const qPeserta = query(collection(db, 'pesertaUjian'), orderBy('waktuMulai', 'desc'));
      const snapshotPeserta = await getDocs(qPeserta);
      setPeserta(snapshotPeserta.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));

      // BARU: simpan seluruh data soal (bukan cuma teks), supaya tahu mana yang pilihan ganda
      const qSoal = query(collection(db, 'soalUjian'), orderBy('urutan', 'asc'));
      const snapshotSoal = await getDocs(qSoal);
      const mapSoal = {};
      const mapTeks = {};
      snapshotSoal.docs.forEach((docSnap) => {
        mapSoal[docSnap.id] = docSnap.data();
        mapTeks[docSnap.id] = docSnap.data().teks;
      });
      setSoalFullMap(mapSoal);
      setSoalMap(mapTeks);

      // BARU: ambil kunci jawaban (HR sudah login, jadi diizinkan)
      const snapshotKunci = await getDocs(collection(db, 'kunciJawaban'));
      const mapKunci = {};
      snapshotKunci.docs.forEach((docSnap) => { mapKunci[docSnap.id] = docSnap.data().jawabanBenar; });
      setKunciMap(mapKunci);

      setLoadingData(false);
    }
    ambilData();
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

  function formatWaktu(timestamp) {
    if (!timestamp) return '-';
    return timestamp.toDate().toLocaleString('id-ID');
  }

  function hitungSkor(peserta) {
    let benar = 0;
    let totalPG = 0;
    Object.entries(soalFullMap).forEach(([soalId, soal]) => {
      if (soal.tipe === 'pilihan_ganda' && kunciMap[soalId]) {
        totalPG += 1;
        if (peserta.jawaban?.[soalId] === kunciMap[soalId]) benar += 1;
      }
    });
    return { benar, totalPG };
  }

  function hitungGrade(peserta) {
    const { benar, totalPG } = hitungSkor(peserta);
    if (totalPG === 0) return { label: '—', warna: 'text-gray-400' };

    const persen = (benar / totalPG) * 100;

    if (persen <= 43) return { label: 'Review', warna: 'text-orange-600 font-bold' };
    if (persen <= 79) return { label: 'Grade A', warna: 'text-blue-700 font-bold' };
    if (persen <= 89) return { label: 'Grade B', warna: 'text-green-700 font-bold' };
    return { label: 'Grade C', warna: 'text-purple-700 font-bold' };
  }

  function hitungTerjawab(peserta) {
    const totalSoal = Object.keys(soalFullMap).length;
    const terjawab = Object.values(peserta.jawaban || {}).filter((j) => j && j.trim() !== '').length;
    return { terjawab, totalSoal };
  }

  const input = 'w-full p-2 mb-3 border border-gray-300 rounded text-gray-900 bg-white';
  const btnUtama = 'px-4 py-2 bg-slate-800 text-white rounded hover:bg-slate-900 cursor-pointer';

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

  if (loadingData) return <p className="text-center mt-10 text-gray-900">Memuat data...</p>;

  if (pesertaTerpilih) {
    return (
      <main className="max-w-2xl mx-auto mt-10 p-5">
        <button onClick={() => setPesertaTerpilih(null)} className="mb-5 px-3 py-1 border rounded cursor-pointer text-gray-900">
          ← Kembali ke daftar
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{pesertaTerpilih.nama}</h1>
        <p className="text-gray-700">Email: {pesertaTerpilih.email}</p>
        <p className="text-gray-700">No HP: {pesertaTerpilih.noHp}</p>
        <p className="text-gray-700">Lokasi Kerja: {pesertaTerpilih.lokasiKerja}</p>
        <p className="text-gray-700">NIK KTP: {pesertaTerpilih.nikKtp}</p>
        <p className="text-gray-700">Status: {pesertaTerpilih.status} | Mulai: {formatWaktu(pesertaTerpilih.waktuMulai)}</p>
        <p className={`font-bold ${pesertaTerpilih.totalPelanggaran > 0 ? 'text-red-600' : 'text-gray-900'}`}>
          Total pelanggaran terdeteksi: {pesertaTerpilih.totalPelanggaran ?? 0}
        </p>
        <p className="font-bold">
          Grade: <span className={hitungGrade(pesertaTerpilih).warna}>{hitungGrade(pesertaTerpilih).label}</span>
        </p>
        <hr className="my-5" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Jawaban</h2>
        {Object.entries(soalMap).map(([soalId, teksSoal]) => {
          const soal = soalFullMap[soalId];
          const jawabanPeserta = pesertaTerpilih.jawaban?.[soalId];
          const kunci = kunciMap[soalId];
          const isPG = soal?.tipe === 'pilihan_ganda';
          const benar = isPG && kunci && jawabanPeserta === kunci;

          return (
            <div key={soalId} className="mb-4">
              <p className="font-bold text-gray-900 mb-1">{teksSoal}</p>
              <p className={`p-2 rounded ${isPG ? (benar ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800') : 'bg-gray-50 text-gray-900'}`}>
                {jawabanPeserta || <i>(tidak dijawab)</i>}
                {isPG && (benar ? ' ✓' : ' ✗')}
              </p>
              {isPG && !benar && kunci && (
                <p className="text-sm text-green-700 mt-1">Jawaban benar: {kunci}</p>
              )}
            </div>
          );
        })}
      </main>
    );
  }

  return (
    <main className="max-w-4xl mx-auto mt-10 p-5">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Hasil Ujian</h1>
        <div className="text-gray-900">
          <Link href="/dashboard/soal" className="mr-3 underline">Kelola Soal</Link>
          <Link href="/dashboard/pengaturan" className="mr-3 underline">Pengaturan</Link>
          <button onClick={() => signOut(auth)} className="px-4 py-2 border rounded cursor-pointer">
            Logout
          </button>
        </div>
      </div>
      <p className="text-gray-700 mb-4">Login sebagai: {user.email} — Total peserta: {peserta.length}</p>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-800 text-white">
            <th className="p-2 text-left text-sm">Nama</th>
            <th className="p-2 text-left text-sm">Email</th>
            <th className="p-2 text-left text-sm">Status</th>
            <th className="p-2 text-left text-sm">Terjawab</th>
            <th className="p-2 text-left text-sm">Pelanggaran</th>
            <th className="p-2 text-left text-sm">Skor</th>
            <th className="p-2 text-left text-sm">Grade</th>
            <th className="p-2 text-left text-sm">Waktu Mulai</th>
            <th className="p-2 text-left text-sm"></th>
          </tr>
        </thead>
        <tbody>
          {peserta.map((p) => (
            <tr key={p.id} className="border-b border-gray-200">
              <td className="p-2 text-sm text-gray-900">{p.nama}</td>
              <td className="p-2 text-sm text-gray-900">{p.email}</td>
              <td className="p-2 text-sm text-gray-900">{p.status}</td>
              <td className="p-2 text-sm text-gray-900">
                {(() => {
                  const { terjawab, totalSoal } = hitungTerjawab(p);
                  return `${terjawab}/${totalSoal}`;
                })()}
              </td>
              <td className={`p-2 text-sm ${p.totalPelanggaran > 0 ? 'text-red-600 font-bold' : 'text-gray-900'}`}>
                {p.totalPelanggaran ?? 0}
              </td>
              <td className="p-2 text-sm text-gray-900">
                {(() => {
                  const { benar, totalPG } = hitungSkor(p);
                  return totalPG > 0 ? `${benar}/${totalPG} (${Math.round((benar / totalPG) * 100)}%)` : '—';
                })()}
              </td>
              <td className="p-2 text-sm">
                {(() => {
                  const { label, warna } = hitungGrade(p);
                  return <span className={warna}>{label}</span>;
                })()}
              </td>
              <td className="p-2 text-sm text-gray-900">{formatWaktu(p.waktuMulai)}</td>
              <td className="p-2 text-sm">
                <button onClick={() => setPesertaTerpilih(p)} className="px-2 py-1 border rounded cursor-pointer text-gray-900">
                  Lihat Jawaban
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}