'use client';
import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../../firebase';
import LoginGate from '../components/LoginGate';
import { PageBackground, Card, Badge, Button, TopNav } from '../components/ui';

export default function Dashboard() {
  return (
    <LoginGate>
      {(user) => <DashboardIsi user={user} />}
    </LoginGate>
  );
}

function DashboardIsi({ user }) {
  const [peserta, setPeserta] = useState([]);
  const [soalMap, setSoalMap] = useState({});
  const [soalFullMap, setSoalFullMap] = useState({});
  const [kunciMap, setKunciMap] = useState({});
  const [loadingData, setLoadingData] = useState(true);
  const [pesertaTerpilih, setPesertaTerpilih] = useState(null);

  useEffect(() => {
    async function ambilData() {
      const qPeserta = query(collection(db, 'pesertaUjian'), orderBy('waktuMulai', 'desc'));
      const snapshotPeserta = await getDocs(qPeserta);
      setPeserta(snapshotPeserta.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));

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

      const snapshotKunci = await getDocs(collection(db, 'kunciJawaban'));
      const mapKunci = {};
      snapshotKunci.docs.forEach((docSnap) => { mapKunci[docSnap.id] = docSnap.data().jawabanBenar; });
      setKunciMap(mapKunci);

      setLoadingData(false);
    }
    ambilData();
  }, []);

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

  function hitungTerjawab(peserta) {
    const totalSoal = Object.keys(soalFullMap).length;
    const terjawab = Object.values(peserta.jawaban || {}).filter((j) => j && j.trim() !== '').length;
    return { terjawab, totalSoal };
  }

  function hitungGrade(peserta) {
    const { benar, totalPG } = hitungSkor(peserta);
    if (totalPG === 0) return { label: '—', tone: 'slate' };
    const persen = (benar / totalPG) * 100;
    if (persen <= 43) return { label: 'Review', tone: 'orange' };
    if (persen <= 79) return { label: 'Grade A', tone: 'blue' };
    if (persen <= 89) return { label: 'Grade B', tone: 'green' };
    return { label: 'Grade C', tone: 'purple' };
  }

  if (loadingData) {
    return (
      <PageBackground className="flex items-center justify-center">
        <p className="text-slate-500 font-display">Memuat data...</p>
      </PageBackground>
    );
  }

  if (pesertaTerpilih) {
    const { benar, totalPG } = hitungSkor(pesertaTerpilih);
    const grade = hitungGrade(pesertaTerpilih);

    return (
      <PageBackground className="p-5">
        <div className="max-w-3xl mx-auto">
          <Button variant="secondary" onClick={() => setPesertaTerpilih(null)} className="mb-5">
            ← Kembali ke daftar
          </Button>

          <Card className="p-6 mb-5">
            <h1 className="font-display text-2xl font-bold text-[#10192E] mb-1">{pesertaTerpilih.nama}</h1>
            <p className="text-sm text-slate-500 mb-4">
              {pesertaTerpilih.email} · {pesertaTerpilih.noHp || '-'} · Mulai {formatWaktu(pesertaTerpilih.waktuMulai)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge tone={pesertaTerpilih.status === 'selesai' ? 'green' : 'amber'}>{pesertaTerpilih.status}</Badge>
              <Badge tone={pesertaTerpilih.totalPelanggaran > 0 ? 'red' : 'slate'}>
                {pesertaTerpilih.totalPelanggaran ?? 0} pelanggaran
              </Badge>
              {totalPG > 0 && <Badge tone="teal">Skor {benar}/{totalPG}</Badge>}
              <Badge tone={grade.tone}>{grade.label}</Badge>
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-[#10192E] mb-4">Jawaban</h2>
            <div className="space-y-4">
              {Object.entries(soalMap).map(([soalId, teksSoal]) => {
                const soal = soalFullMap[soalId];
                const jawabanPeserta = pesertaTerpilih.jawaban?.[soalId];
                const kunci = kunciMap[soalId];
                const isPG = soal?.tipe === 'pilihan_ganda';
                const jawabanBenar = isPG && kunci && jawabanPeserta === kunci;

                return (
                  <div key={soalId}>
                    <p className="font-semibold text-[#10192E] mb-1.5">{teksSoal}</p>
                    <p className={`p-3 rounded-xl text-sm ${
                      isPG ? (jawabanBenar ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800') : 'bg-[#F7F9FB] text-slate-700'
                    }`}>
                      {jawabanPeserta || <i className="text-slate-400">(tidak dijawab)</i>}
                      {isPG && (jawabanBenar ? ' ✓' : ' ✗')}
                    </p>
                    {isPG && !jawabanBenar && kunci && (
                      <p className="text-xs text-green-700 mt-1">Jawaban benar: {kunci}</p>
                    )}
                  </div>
                );
              })}
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
          title="Dashboard Hasil Ujian"
          links={[
            { href: '/dashboard/soal', label: 'Kelola Soal' },
            { href: '/dashboard/pengaturan', label: 'Pengaturan' },
          ]}
          onLogout={() => signOut(auth)}
        />
        <p className="text-sm text-slate-500 mb-4">Login sebagai {user.email} · {peserta.length} peserta</p>

        <Card className="overflow-hidden">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#10192E] text-white">
                <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Nama</th>
                <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Email</th>
                <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Status</th>
                <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Terjawab</th>
                <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Skor</th>
                <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Grade</th>
                <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Pelanggaran</th>
                <th className="p-3 text-left text-xs font-display uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody>
              {peserta.map((p) => {
                const { benar, totalPG } = hitungSkor(p);
                const { terjawab, totalSoal } = hitungTerjawab(p);
                const grade = hitungGrade(p);
                return (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="p-3 text-sm text-[#10192E] font-medium">{p.nama}</td>
                    <td className="p-3 text-sm text-slate-600">{p.email}</td>
                    <td className="p-3 text-sm"><Badge tone={p.status === 'selesai' ? 'green' : 'amber'}>{p.status}</Badge></td>
                    <td className="p-3 text-sm text-slate-600">{terjawab}/{totalSoal}</td>
                    <td className="p-3 text-sm text-slate-600">{totalPG > 0 ? `${benar}/${totalPG} (${Math.round((benar / totalPG) * 100)}%)` : '—'}</td>
                    <td className="p-3 text-sm"><Badge tone={grade.tone}>{grade.label}</Badge></td>
                    <td className="p-3 text-sm">
                      <Badge tone={p.totalPelanggaran > 0 ? 'red' : 'slate'}>{p.totalPelanggaran ?? 0}</Badge>
                    </td>
                    <td className="p-3 text-sm">
                      <Button variant="ghost" onClick={() => setPesertaTerpilih(p)} className="!px-3 !py-1.5 text-xs">
                        Lihat Detail
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </div>
    </PageBackground>
  );
}