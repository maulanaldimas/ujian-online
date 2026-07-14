'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'firebase/auth';
import { db, auth } from '../../firebase';

export default function Dashboard() {
  const [peserta, setPeserta] = useState([]);
  const [soalMap, setSoalMap] = useState({}); // BARU: { soalId: "teks pertanyaan" }
  const [loadingData, setLoadingData] = useState(true);
  const [user, setUser] = useState(null);
  const [cekLoginSelesai, setCekLoginSelesai] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorLogin, setErrorLogin] = useState('');
  const [pesertaTerpilih, setPesertaTerpilih] = useState(null); // BARU: untuk lihat detail jawaban

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
      // Ambil semua peserta
      const qPeserta = query(collection(db, 'pesertaUjian'), orderBy('waktuMulai', 'desc'));
      const snapshotPeserta = await getDocs(qPeserta);
      const dataPeserta = snapshotPeserta.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      setPeserta(dataPeserta);

      // BARU: ambil semua soal, buat "kamus" id -> teks pertanyaan
      const qSoal = query(collection(db, 'soalUjian'), orderBy('urutan', 'asc'));
      const snapshotSoal = await getDocs(qSoal);
      const map = {};
      snapshotSoal.docs.forEach((docSnap) => {
        map[docSnap.id] = docSnap.data().teks;
      });
      setSoalMap(map);

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

  if (!cekLoginSelesai) {
    return <p style={{ textAlign: 'center', marginTop: 40 }}>Memuat...</p>;
  }

  if (!user) {
    return (
      <main style={{ maxWidth: 400, margin: '80px auto', fontFamily: 'Arial', padding: 20 }}>
        <h1>Login HR</h1>
        <form onSubmit={handleLogin}>
          <input type="email" placeholder="Email" value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            style={{ width: '100%', padding: 8, marginBottom: 12, boxSizing: 'border-box' }} />
          <input type="password" placeholder="Password" value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            style={{ width: '100%', padding: 8, marginBottom: 12, boxSizing: 'border-box' }} />
          {errorLogin && <p style={{ color: 'red' }}>{errorLogin}</p>}
          <button type="submit" style={{ padding: '10px 20px', background: '#2c3e50', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
            Masuk
          </button>
        </form>
      </main>
    );
  }

  if (loadingData) {
    return <p style={{ textAlign: 'center', marginTop: 40 }}>Memuat data...</p>;
  }

  // BARU: tampilan detail satu peserta (kalau sedang dipilih)
  if (pesertaTerpilih) {
    return (
      <main style={{ maxWidth: 700, margin: '40px auto', fontFamily: 'Arial', padding: 20 }}>
        <button onClick={() => setPesertaTerpilih(null)} style={{ marginBottom: 20, cursor: 'pointer', padding: '6px 12px' }}>
          ← Kembali ke daftar
        </button>
        <h1>{pesertaTerpilih.nama}</h1>
        <p>Email: {pesertaTerpilih.email} | No HP: {pesertaTerpilih.noHp || '-'}</p>
        <p>Status: {pesertaTerpilih.status} | Mulai: {formatWaktu(pesertaTerpilih.waktuMulai)}</p>
        <p style={{ color: pesertaTerpilih.totalPelanggaran > 0 ? 'red' : 'inherit', fontWeight: 'bold' }}>
          Total pelanggaran terdeteksi: {pesertaTerpilih.totalPelanggaran ?? 0}
        </p>
        <hr style={{ margin: '20px 0' }} />
        <h2>Jawaban</h2>
        {Object.entries(soalMap).map(([soalId, teksSoal]) => (
          <div key={soalId} style={{ marginBottom: 16 }}>
            <p style={{ fontWeight: 'bold', marginBottom: 4 }}>{teksSoal}</p>
            <p style={{ background: '#f4f4f9', color: '#1a1a1a', padding: 10, borderRadius: 4 }}>
              {pesertaTerpilih.jawaban?.[soalId] || <i>(tidak dijawab)</i>}
            </p>
          </div>
        ))}
      </main>
    );
  }

  return (
    <main style={{ maxWidth: 1000, margin: '40px auto', fontFamily: 'Arial', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Dashboard Hasil Ujian</h1>
        <button onClick={() => signOut(auth)} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          Logout
        </button>
      </div>
      <p>Login sebagai: {user.email} — Total peserta: {peserta.length}</p>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
        <thead>
          <tr style={{ background: '#2c3e50', color: 'white' }}>
            <th style={thTd}>Nama</th>
            <th style={thTd}>Email</th>
            <th style={thTd}>Status</th>
            <th style={thTd}>Pelanggaran</th>
            <th style={thTd}>Waktu Mulai</th>
            <th style={thTd}></th>
          </tr>
        </thead>
        <tbody>
          {peserta.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={thTd}>{p.nama}</td>
              <td style={thTd}>{p.email}</td>
              <td style={thTd}>{p.status}</td>
              <td style={{ ...thTd, color: p.totalPelanggaran > 0 ? 'red' : 'inherit', fontWeight: p.totalPelanggaran > 0 ? 'bold' : 'normal' }}>
                {p.totalPelanggaran ?? 0}
              </td>
              <td style={thTd}>{formatWaktu(p.waktuMulai)}</td>
              <td style={thTd}>
                <button onClick={() => setPesertaTerpilih(p)} style={{ cursor: 'pointer', padding: '4px 10px' }}>
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

const thTd = { padding: 10, textAlign: 'left', fontSize: 14 };