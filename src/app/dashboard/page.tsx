'use client';
import * as XLSX from 'xlsx';
import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { signOut, type User } from 'firebase/auth';
import Image from 'next/image';
import { db, auth } from '@/firebase';
import LoginGate from '@/app/components/LoginGate';
import { PageBackground, Card, Badge, Button, TopNav, Input, Select, StatCard, EmptyState, Spinner } from '@/app/components/ui';
import {
  hitungSkor as hitungSkorInti,
  hitungTerjawab as hitungTerjawabInti,
  hitungGrade as hitungGradeInti,
  hitungPersenSkor,
  PesertaData,
  SoalData,
} from '@/lib/utils';

export default function Dashboard() {
  return (
    <LoginGate>
      {(user, role) => <DashboardIsi user={user} role={role} />}
    </LoginGate>
  );
}

type SortKolom = 'nama' | 'status' | 'pelanggaran' | 'skor' | 'waktuMulai';

function ThSort({
  label,
  kolom,
  sortKolom,
  sortArah,
  onClick,
}: {
  label: string;
  kolom: SortKolom;
  sortKolom: SortKolom;
  sortArah: 'asc' | 'desc';
  onClick: (kolom: SortKolom) => void;
}) {
  const aktif = sortKolom === kolom;
  return (
    <th
      onClick={() => onClick(kolom)}
      className="p-3 text-left text-xs font-display uppercase tracking-wide cursor-pointer select-none hover:text-[#E8A33D] transition"
    >
      {label} {aktif && (sortArah === 'asc' ? '▲' : '▼')}
    </th>
  );
}

function BarChart({ data, warna = '#1F6F78' }: { data: { label: string; nilai: number }[]; warna?: string }) {
  const max = Math.max(...data.map((d) => d.nilai), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-28 text-xs text-slate-500 truncate" title={d.label}>{d.label}</span>
          <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${(d.nilai / max) * 100}%`, backgroundColor: warna }} />
          </div>
          <span className="w-14 text-xs text-slate-600 font-semibold text-right">{d.nilai}</span>
        </div>
      ))}
    </div>
  );
}

function DashboardIsi({ user, role }: { user: User; role: string | null }) {
  const [peserta, setPeserta] = useState<PesertaData[]>([]);
  const [soalMap, setSoalMap] = useState<Record<string, string>>({});
  const [soalFullMap, setSoalFullMap] = useState<Record<string, SoalData>>({});
  const [kunciMap, setKunciMap] = useState<Record<string, string>>({});
  const [loadingData, setLoadingData] = useState(true);
  const [pesertaTerpilih, setPesertaTerpilih] = useState<PesertaData | null>(null);
  const [penilaianMap, setPenilaianMap] = useState<Record<string, any>>({});
  const [nilaiEsaiInput, setNilaiEsaiInput] = useState<Record<string, string>>({});
  const [sedangSimpanNilai, setSedangSimpanNilai] = useState(false);
  const [cariTeks, setCariTeks] = useState('');
  const [filterStatus, setFilterStatus] = useState('semua');
  const [sortKolom, setSortKolom] = useState<SortKolom>('waktuMulai');
  const [sortArah, setSortArah] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    async function ambilData() {
      const qPeserta = query(collection(db, 'pesertaUjian'), orderBy('waktuMulai', 'desc'));
      const snapshotPeserta = await getDocs(qPeserta);
      setPeserta(snapshotPeserta.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));

      const qSoal = query(collection(db, 'soalUjian'), orderBy('urutan', 'asc'));
      const snapshotSoal = await getDocs(qSoal);
      const mapSoal: Record<string, SoalData> = {};
      const mapTeks: Record<string, string> = {};
      snapshotSoal.docs.forEach((docSnap) => {
        mapSoal[docSnap.id] = docSnap.data() as SoalData;
        mapTeks[docSnap.id] = String(docSnap.data().teks ?? '');
      });
      setSoalFullMap(mapSoal);
      setSoalMap(mapTeks);

      const snapshotKunci = await getDocs(collection(db, 'kunciJawaban'));
      const mapKunci: Record<string, string> = {};
      snapshotKunci.docs.forEach((docSnap) => { mapKunci[docSnap.id] = String(docSnap.data().jawabanBenar ?? ''); });
      setKunciMap(mapKunci);

      const snapshotPenilaian = await getDocs(collection(db, 'penilaianEsai'));
      const mapPenilaian: Record<string, any> = {};
      snapshotPenilaian.docs.forEach((docSnap) => { mapPenilaian[docSnap.id] = docSnap.data(); });
      setPenilaianMap(mapPenilaian);

      setLoadingData(false);
    }
    ambilData();
  }, []);

  const hitungSkor = (p: PesertaData) => hitungSkorInti(p, soalFullMap, kunciMap);
  const hitungTerjawab = (p: PesertaData) => hitungTerjawabInti(p, Object.keys(soalFullMap).length);
  const hitungGrade = (p: PesertaData) => hitungGradeInti(p, soalFullMap, kunciMap);
  const persenSkor = (p: PesertaData) => hitungPersenSkor(p, soalFullMap, kunciMap, penilaianMap[p.id ?? '']?.totalEsai);

  function formatWaktu(timestamp: { toDate: () => Date } | null | undefined) {
    if (!timestamp) return '-';
    return timestamp.toDate().toLocaleString('id-ID');
  }

  function ambilNilaiSort(p: PesertaData, kolom: SortKolom): string | number {
    if (kolom === 'nama') return p.nama?.toLowerCase() || '';
    if (kolom === 'status') return p.status || '';
    if (kolom === 'pelanggaran') return p.totalPelanggaran ?? 0;
    if (kolom === 'skor') {
      const { benar, totalPG } = hitungSkor(p);
      return totalPG > 0 ? benar / totalPG : -1;
    }
    if (kolom === 'waktuMulai') return p.waktuMulai?.toMillis?.() ?? 0;
    return '';
  }

  function bukaDetail(peserta: PesertaData) {
    setPesertaTerpilih(peserta);
    setNilaiEsaiInput({ ...(penilaianMap[peserta.id ?? '']?.skorEsai || {}) });
  }

  async function simpanPenilaianEsai() {
    if (!pesertaTerpilih) return;
    const idPeserta = pesertaTerpilih.id ?? '';
    const skor: Record<string, number> = {};
    Object.entries(soalFullMap).forEach(([soalId, soal]) => {
      if (soal.tipe !== 'pilihan_ganda' && nilaiEsaiInput[soalId] !== undefined && nilaiEsaiInput[soalId] !== '') {
        skor[soalId] = Math.max(0, Math.min(100, Number(nilaiEsaiInput[soalId]) || 0));
      }
    });
    const daftarNilai = Object.values(skor);
    const totalEsai = daftarNilai.length ? Math.round(daftarNilai.reduce((a, b) => a + b, 0) / daftarNilai.length) : 0;
    setSedangSimpanNilai(true);
    try {
      await setDoc(doc(db, 'penilaianEsai', idPeserta), {
        skorEsai: skor,
        totalEsai,
        dinilaiOleh: user.email,
        waktuDinilai: serverTimestamp(),
      });
      setPenilaianMap((prev) => ({ ...prev, [idPeserta]: { skorEsai: skor, totalEsai } }));
      alert('Penilaian esai tersimpan.');
    } catch (err) {
      alert('Gagal menyimpan penilaian.');
      console.error(err);
    }
    setSedangSimpanNilai(false);
  }

  function exportKeExcel() {
    const data = pesertaTertampil.map((p) => {
      const { benar, totalPG } = hitungSkor(p);
      const { terjawab, totalSoal } = hitungTerjawab(p);
      const grade = hitungGrade(p);
      const skorEsai = penilaianMap[p.id ?? '']?.totalEsai;
      const persenPG = totalPG > 0 ? Math.round((benar / totalPG) * 100) : null;
      const skorGabungan =
        persenPG !== null && skorEsai !== undefined
          ? Math.round((persenPG + skorEsai) / 2)
          : persenPG ?? skorEsai;

      return {
        'Nama': p.nama || '-',
        'Email': p.email || '-',
        'No HP': p.noHp || '-',
        'Lokasi Kerja': p.lokasiKerja || '-',
        'NIK KTP': p.nikKtp || '-',
        'Status': p.status || '-',
        'Terjawab': `${terjawab}/${totalSoal}`,
        'Skor PG': totalPG > 0 ? `${benar}/${totalPG} (${persenPG}%)` : '-',
        'Esai (manual)': skorEsai !== undefined ? `${skorEsai}/100` : '-',
        'Gabungan': skorGabungan !== null ? `${skorGabungan}/100` : '-',
        'Grade': grade.label,
        'Pelanggaran': p.totalPelanggaran ?? 0,
        'Waktu Mulai': formatWaktu(p.waktuMulai),
        'Waktu Selesai': formatWaktu(p.waktuSelesai),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);

    // Atur lebar kolom supaya tidak terpotong
    worksheet['!cols'] = [
      { wch: 22 }, // Nama
      { wch: 26 }, // Email
      { wch: 15 }, // No HP
      { wch: 18 }, // Lokasi Kerja
      { wch: 18 }, // NIK KTP
      { wch: 14 }, // Status
      { wch: 10 }, // Terjawab
      { wch: 16 }, // Skor PG
      { wch: 14 }, // Esai
      { wch: 12 }, // Gabungan
      { wch: 10 }, // Grade
      { wch: 12 }, // Pelanggaran
      { wch: 20 }, // Waktu Mulai
      { wch: 20 }, // Waktu Selesai
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Hasil Ujian');

    const tanggal = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `hasil-ujian-rekrutmen-${tanggal}.xlsx`);
  }

  function toggleSort(kolom: SortKolom) {
    if (sortKolom === kolom) {
      setSortArah((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKolom(kolom);
      setSortArah('asc');
    }
  }

  let pesertaTertampil = [...peserta];

  if (cariTeks.trim() !== '') {
    const q = cariTeks.trim().toLowerCase();
    pesertaTertampil = pesertaTertampil.filter(
      (p) => p.nama?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)
    );
  }

  if (filterStatus !== 'semua') {
    pesertaTertampil = pesertaTertampil.filter((p) => p.status === filterStatus);
  }

  pesertaTertampil.sort((a, b) => {
    const nilaiA = ambilNilaiSort(a, sortKolom);
    const nilaiB = ambilNilaiSort(b, sortKolom);
    if (nilaiA < nilaiB) return sortArah === 'asc' ? -1 : 1;
    if (nilaiA > nilaiB) return sortArah === 'asc' ? 1 : -1;
    return 0;
  });

  if (loadingData) {
    return (
      <PageBackground className="flex items-center justify-center">
        <div className="text-center">
          <Spinner className="mx-auto h-8 w-8" />
          <p className="text-slate-500 font-display mt-3">Memuat data...</p>
        </div>
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
              <Badge tone={(pesertaTerpilih.totalPelanggaran ?? 0) > 0 ? 'red' : 'slate'}>
                {pesertaTerpilih.totalPelanggaran ?? 0} pelanggaran
              </Badge>
              {totalPG > 0 && <Badge tone="teal">Skor {benar}/{totalPG}</Badge>}
              {penilaianMap[pesertaTerpilih.id ?? '']?.totalEsai !== undefined && (
                <Badge tone="blue">Esai {penilaianMap[pesertaTerpilih.id ?? ''].totalEsai}/100</Badge>
              )}
              <Badge tone={grade.tone}>{grade.label}</Badge>
            </div>
            {pesertaTerpilih.status === 'sedang_ujian' && pesertaTerpilih.terakhirDisimpan && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3">
                ⚠ Ujian belum diselesaikan. Progres terakhir tersimpan: {formatWaktu(pesertaTerpilih.terakhirDisimpan)}
              </p>
            )}
          </Card>

          {pesertaTerpilih.logPelanggaran && pesertaTerpilih.logPelanggaran.length > 0 && (
            <Card className="p-6 mb-5">
              <h2 className="font-display text-lg font-bold text-[#10192E] mb-4">
                Log Pelanggaran ({pesertaTerpilih.logPelanggaran.length})
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {pesertaTerpilih.logPelanggaran
                  .slice()
                  .sort((a, b) => b.waktu - a.waktu)
                  .map((log, i) => (
                    <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
                      {log.snapshotUrl ? (
                        <div className="relative w-full h-32 bg-slate-100">
                          <Image
                            src={log.snapshotUrl}
                            alt={log.tipe}
                            fill
                            sizes="(max-width: 768px) 50vw, 200px"
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="w-full h-32 bg-slate-100 flex items-center justify-center text-xs text-slate-400">
                          Tanpa foto
                        </div>
                      )}
                      <div className="p-2">
                        <p className="text-xs font-semibold text-[#10192E]">{log.tipe}</p>
                        <p className="text-xs text-slate-400">{new Date(log.waktu).toLocaleTimeString('id-ID')}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}
          
          {(() => {
            const daftarSoalEsai = Object.entries(soalMap).filter(([soalId]) => soalFullMap[soalId]?.tipe !== 'pilihan_ganda');
            const penilaianPeserta = penilaianMap[pesertaTerpilih.id ?? ''];
            const totalEsai = penilaianPeserta?.totalEsai;
            const persenPG = totalPG > 0 ? Math.round((benar / totalPG) * 100) : null;
            const skorGabungan =
              persenPG !== null && totalEsai !== undefined
                ? Math.round((persenPG + totalEsai) / 2)
                : persenPG ?? totalEsai ?? null;
            return (
              <Card className="p-6 mb-5">
                <h2 className="font-display text-lg font-bold text-[#10192E] mb-1">Penilaian Esai</h2>
                <p className="text-sm text-slate-500 mb-4">
                  Beri skor 0–100 untuk setiap jawaban esai. PG dinilai otomatis, esai dinilai manual oleh HR.
                </p>

                {skorGabungan !== null && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {persenPG !== null && <Badge tone="teal">PG: {persenPG}/100</Badge>}
                    {totalEsai !== undefined && <Badge tone="blue">Esai: {totalEsai}/100</Badge>}
                    <Badge tone="navy">Gabungan: {skorGabungan}/100</Badge>
                  </div>
                )}

                {daftarSoalEsai.length === 0 ? (
                  <p className="text-sm text-slate-400">Tidak ada soal esai.</p>
                ) : (
                  <div className="space-y-4">
                    {daftarSoalEsai.map(([soalId, teksSoal]) => {
                      const jawabanPeserta = pesertaTerpilih.jawaban?.[soalId];
                      return (
                        <div key={soalId}>
                          <p className="font-semibold text-[#10192E] mb-1.5">{teksSoal}</p>
                          <p className="p-3 rounded-xl text-sm bg-[#F7F9FB] text-slate-700 mb-2 whitespace-pre-wrap break-words">
                            {jawabanPeserta || <i className="text-slate-400">(tidak dijawab)</i>}
                          </p>
                          <div className="flex items-center gap-3">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={nilaiEsaiInput[soalId] ?? ''}
                              placeholder="Skor 0-100"
                              onChange={(e) => setNilaiEsaiInput((prev) => ({ ...prev, [soalId]: e.target.value }))}
                              className="!mb-0 max-w-[140px]"
                            />
                            <Button
                              variant="secondary"
                              onClick={() =>
                                setNilaiEsaiInput((prev) => ({ ...prev, [soalId]: '' }))
                              }
                              className="!px-3 !py-1.5 text-xs"
                            >
                              Kosongkan
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    <Button onClick={simpanPenilaianEsai} disabled={sedangSimpanNilai} className="mt-2">
                      {sedangSimpanNilai ? 'Menyimpan...' : '💾 Simpan Penilaian Esai'}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })()}

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
          subtitle={`Login sebagai ${user.email}`}
          links={role === 'admin' ? [
            { href: '/dashboard/soal', label: 'Kelola Soal' },
            { href: '/dashboard/pengaturan', label: 'Pengaturan' },
          ] : []}
          onLogout={() => signOut(auth)}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Peserta" value={peserta.length} icon="👥" tone="navy" />
          <StatCard
            label="Selesai"
            value={peserta.filter((p) => p.status === 'selesai').length}
            icon="✅"
            tone="teal"
          />
          <StatCard
            label="Sedang Ujian"
            value={peserta.filter((p) => p.status === 'sedang_ujian').length}
            icon="⏳"
            tone="amber"
          />
          <StatCard
            label="Total Pelanggaran"
            value={peserta.reduce((total, p) => total + (p.totalPelanggaran ?? 0), 0)}
            icon="⚠️"
            tone="slate"
          />
        </div>

        {(() => {
          const pesertaSelesai = peserta.filter((p) => p.status === 'selesai');

          const distribusi = [
            { label: '0-20', nilai: 0 },
            { label: '21-40', nilai: 0 },
            { label: '41-60', nilai: 0 },
            { label: '61-80', nilai: 0 },
            { label: '81-100', nilai: 0 },
          ];
          pesertaSelesai.forEach((p) => {
            const persen = persenSkor(p);
            if (persen === null) return;
            const idx = persen <= 20 ? 0 : persen <= 40 ? 1 : persen <= 60 ? 2 : persen <= 80 ? 3 : 4;
            distribusi[idx].nilai += 1;
          });

          const itemAnalysis = Object.entries(soalFullMap)
            .filter(([soalId, soal]) => soal.tipe === 'pilihan_ganda' && kunciMap[soalId])
            .map(([soalId, soal]) => {
              let benar = 0;
              let total = 0;
              pesertaSelesai.forEach((p) => {
                const jawaban = p.jawaban?.[soalId];
                if (jawaban === undefined || jawaban === '') return;
                total += 1;
                if (jawaban === kunciMap[soalId]) benar += 1;
              });
              return {
                label: soal.teks,
                nilai: total > 0 ? Math.round((benar / total) * 100) : 0,
                n: total,
              };
            })
            .filter((item) => item.n > 0)
            .sort((a, b) => a.nilai - b.nilai)
            .slice(0, 8);

          const lokasiMap: Record<string, { total: number; selesai: number }> = {};
          peserta.forEach((p) => {
            const kunciLokasi = p.lokasiKerja?.trim() || 'Tanpa lokasi';
            lokasiMap[kunciLokasi] = lokasiMap[kunciLokasi] || { total: 0, selesai: 0 };
            lokasiMap[kunciLokasi].total += 1;
            if (p.status === 'selesai') lokasiMap[kunciLokasi].selesai += 1;
          });
          const lokasiData = Object.entries(lokasiMap)
            .map(([label, v]) => ({ label, nilai: v.total, sub: `${v.selesai}/${v.total} selesai` }))
            .sort((a, b) => b.nilai - a.nilai)
            .slice(0, 6);

          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <Card className="p-5">
                <h3 className="font-display font-bold text-[#10192E] mb-3">Distribusi Skor</h3>
                {pesertaSelesai.length === 0 ? (
                  <p className="text-sm text-slate-400">Belum ada peserta yang selesai.</p>
                ) : (
                  <BarChart data={distribusi} />
                )}
              </Card>
              <Card className="p-5">
                <h3 className="font-display font-bold text-[#10192E] mb-3">Tingkat Penyelesaian per Lokasi</h3>
                {lokasiData.length === 0 ? (
                  <p className="text-sm text-slate-400">Belum ada data peserta.</p>
                ) : (
                  <div className="space-y-2">
                    {lokasiData.map((d) => (
                      <div key={d.label} className="flex items-center justify-between gap-3">
                        <span className="text-xs text-slate-500 truncate" title={d.label}>{d.label}</span>
                        <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(d.nilai / Math.max(lokasiData[0].nilai, 1)) * 100}%`,
                              backgroundColor: '#E8A33D',
                            }}
                          />
                        </div>
                        <span className="text-xs text-slate-600 font-semibold">{d.sub}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
              <Card className="p-5">
                <h3 className="font-display font-bold text-[#10192E] mb-3">Soal PG Paling Sulit</h3>
                {itemAnalysis.length === 0 ? (
                  <p className="text-sm text-slate-400">Belum cukup data untuk analisis soal.</p>
                ) : (
                  <div className="space-y-2">
                    {itemAnalysis.map((item) => (
                      <div key={item.label} className="flex items-center gap-3">
                        <span className="w-36 text-xs text-slate-500 truncate" title={item.label}>{item.label}</span>
                        <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${(item.nilai / 100) * 100}%`,
                              backgroundColor: item.nilai <= 50 ? '#C0392B' : '#1F6F78',
                            }}
                          />
                        </div>
                        <span className="w-14 text-xs text-slate-600 font-semibold text-right">{item.nilai}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          );
        })()}

        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <p className="text-sm text-slate-500">
            Menampilkan <b className="text-navy-900">{pesertaTertampil.length}</b> dari {peserta.length} peserta
          </p>
          <Button variant="secondary" onClick={exportKeExcel} disabled={pesertaTertampil.length === 0}>
            📊 Export ke Excel
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <Input
            placeholder="Cari nama atau email..."
            value={cariTeks}
            onChange={(e) => setCariTeks(e.target.value)}
            className="!mb-0 sm:max-w-xs"
          />
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="sm:max-w-[180px]"
          >
            <option value="semua">Semua status</option>
            <option value="selesai">Selesai</option>
            <option value="sedang_ujian">Sedang ujian</option>
          </Select>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-navy-900 text-white">
                <ThSort label="Nama" kolom="nama" sortKolom={sortKolom} sortArah={sortArah} onClick={toggleSort} />
                <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Email</th>
                <ThSort label="Status" kolom="status" sortKolom={sortKolom} sortArah={sortArah} onClick={toggleSort} />
                <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Terjawab</th>
                <ThSort label="Skor" kolom="skor" sortKolom={sortKolom} sortArah={sortArah} onClick={toggleSort} />
                <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Grade</th>
                <ThSort label="Pelanggaran" kolom="pelanggaran" sortKolom={sortKolom} sortArah={sortArah} onClick={toggleSort} />
                <ThSort label="Progres Terakhir" kolom="waktuMulai" sortKolom={sortKolom} sortArah={sortArah} onClick={toggleSort} />
                <th className="p-3 text-left text-xs font-display uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody>
              {pesertaTertampil.length === 0 ? (
                <tr>
                  <td colSpan={9}>
                    <EmptyState
                      icon="🔍"
                      title="Tidak ada data"
                      description="Tidak ada peserta yang cocok dengan pencarian atau filter saat ini."
                    />
                  </td>
                </tr>
              ) : (
              pesertaTertampil.map((p) => {
                const { benar, totalPG } = hitungSkor(p);
                const { terjawab, totalSoal } = hitungTerjawab(p);
                const grade = hitungGrade(p);
                return (
                  <tr key={p.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50/50 hover:bg-teal-600/5 transition-colors">
                    <td className="p-3 text-sm text-[#10192E] font-medium">{p.nama}</td>
                    <td className="p-3 text-sm text-slate-600">{p.email}</td>
                    <td className="p-3 text-sm"><Badge tone={p.status === 'selesai' ? 'green' : 'amber'}>{p.status}</Badge></td>
                    <td className="p-3 text-sm text-slate-600">{terjawab}/{totalSoal}</td>
                    <td className="p-3 text-sm text-slate-600">{totalPG > 0 ? `${benar}/${totalPG} (${Math.round((benar / totalPG) * 100)}%)` : '—'}</td>
                    <td className="p-3 text-sm"><Badge tone={grade.tone}>{grade.label}</Badge></td>
                    <td className="p-3 text-sm">
                      <Badge tone={(p.totalPelanggaran ?? 0) > 0 ? 'red' : 'slate'}>{p.totalPelanggaran ?? 0}</Badge>
                    </td>
                    <td className="p-3 text-sm text-slate-500">
                      {p.status === 'sedang_ujian' && p.terakhirDisimpan
                        ? formatWaktu(p.terakhirDisimpan)
                        : '—'}
                    </td>
                    <td className="p-3 text-sm">
                      <Button variant="ghost" onClick={() => bukaDetail(p)} className="!px-3 !py-1.5 text-xs">
                        Lihat Detail
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
          </div>
        </Card>
      </div>
    </PageBackground>
  );
}