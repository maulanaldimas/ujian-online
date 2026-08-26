'use client';
import * as XLSX from 'xlsx';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import LoginGate, { type AuthUser } from '@/app/components/LoginGate';
import { PageBackground, Card, Badge, Button, TopNav, Input, Select, Label, StatCard, EmptyState, Pagination, useToast, StatCardSkeleton, TableSkeleton } from '@/app/components/ui';
import {
  hitungSkor as hitungSkorInti,
  hitungTerjawab as hitungTerjawabInti,
  hitungGrade as hitungGradeInti,
  hitungPersenSkor,
  PesertaData,
  SoalData,
  KelompokSoal,
} from '@/lib/utils';
import { STATUS, STATUS_LABEL, STATUS_TONE, CHART_WARNA } from '@/lib/constants';
import { Users, CheckCircle2, Clock, AlertTriangle, Search, Download, ArrowUpDown, ChevronLeft, Check, X } from 'lucide-react';

export default function Dashboard() {
  return (
    <LoginGate>
      {(user) => <DashboardIsi user={user} />}
    </LoginGate>
  );
}

type SortKolom = 'nama' | 'status' | 'pelanggaran' | 'skor' | 'waktuMulai';

function ThSort({
  label,
  kolom,
  sortKolom,
  onClick,
}: {
  label: string;
  kolom: SortKolom;
  sortKolom: SortKolom;
  onClick: (kolom: SortKolom) => void;
}) {
  const aktif = sortKolom === kolom;
  return (
    <th
      onClick={() => onClick(kolom)}
      className="p-3 text-left text-xs font-display uppercase tracking-wide cursor-pointer select-none hover:text-amber-400 transition"
    >
      {label} {aktif && <ArrowUpDown size={12} className="inline ml-1" />}
    </th>
  );
}

function BarChart({ data, warna = CHART_WARNA.utama }: { data: { label: string; nilai: number }[]; warna?: string }) {
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

function DashboardIsi({ user }: { user: AuthUser }) {
  const { toast, toastEl } = useToast();
  const [peserta, setPeserta] = useState<PesertaData[]>([]);
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
  const [halaman, setHalaman] = useState(1);
  const BAHAN_PER_HALAMAN = 25;

  const [kelompokList, setKelompokList] = useState<KelompokSoal[]>([]);
  const [kelompokPenetapan, setKelompokPenetapan] = useState('');
  const [sedangSimpanKelompok, setSedangSimpanKelompok] = useState(false);

  useEffect(() => {
    let aktif = true;

    async function muatData() {
      try {
        const [pesertaRes, kelompokRes, penilaianRes] = await Promise.all([
          fetch('/api/peserta'),
          fetch('/api/kelompok'),
          fetch('/api/penilaian'),
        ]);

        if (!aktif) return;

        if (pesertaRes.ok) {
          const listPeserta = await pesertaRes.json();
          listPeserta.sort((a: any, b: any) => {
            const waktuA = new Date(a.waktuMulai || a.waktuConsent || 0).getTime();
            const waktuB = new Date(b.waktuMulai || b.waktuConsent || 0).getTime();
            return waktuB - waktuA;
          });
          setPeserta(listPeserta);
        }

        if (kelompokRes.ok) {
          const daftarKelompok = await kelompokRes.json();
          setKelompokList(daftarKelompok);

          const mapSoal: Record<string, SoalData> = {};
          const mapKunci: Record<string, string> = {};
          await Promise.all(
            (daftarKelompok || []).filter((k: any) => k.id).map(async (kel: any) => {
              try {
                const res = await fetch(`/api/kelompok/${kel.id}/soal`);
                const soalList = await res.json();
                (soalList || []).forEach((s: any) => {
                  mapSoal[s.id] = { teks: s.teks, tipe: s.tipe, pilihan: s.pilihan, urutan: s.urutan };
                  if (s.kunci) mapKunci[s.id] = s.kunci;
                });
              } catch (err) { /* ignore */ }
            })
          );
          if (aktif) { setSoalFullMap(mapSoal); setKunciMap(mapKunci); }
        }

        if (penilaianRes.ok) {
          const penilaianData = await penilaianRes.json();
          if (aktif) setPenilaianMap(penilaianData);
        }
      } catch (err) {
        console.error('Gagal memuat data dashboard:', err);
      } finally {
        if (aktif) setLoadingData(false);
      }
    }
    muatData();

    return () => { aktif = false; };
  }, []);

  useEffect(() => { setHalaman(1); }, [cariTeks, filterStatus]);

  const hitungSkor = (p: PesertaData) => hitungSkorInti(p, soalFullMap, kunciMap);
  const hitungTerjawab = (p: PesertaData) => hitungTerjawabInti(p, Object.keys(soalFullMap).length);
  const hitungGrade = (p: PesertaData) => hitungGradeInti(p, soalFullMap, kunciMap);
  const persenSkor = (p: PesertaData) => hitungPersenSkor(p, soalFullMap, kunciMap, penilaianMap[p.id ?? '']?.totalEsai);

  function formatWaktu(timestamp: string | Date | null | undefined) {
    if (!timestamp) return '-';
    try {
      const d = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleString('id-ID');
    } catch { return '-'; }
  }

  function ambilNilaiSort(p: PesertaData, kolom: SortKolom): string | number {
    if (kolom === 'nama') return p.nama?.toLowerCase() || '';
    if (kolom === 'status') return p.status || '';
    if (kolom === 'pelanggaran') return p.totalPelanggaran ?? 0;
    if (kolom === 'skor') {
      const { benar, totalPG } = hitungSkor(p);
      return totalPG > 0 ? benar / totalPG : -1;
    }
    if (kolom === 'waktuMulai') {
      const t = p.waktuMulai || p.waktuConsent;
      return t ? new Date(t).getTime() : 0;
    }
    return '';
  }

  function bukaDetail(peserta: PesertaData) {
    setPesertaTerpilih(peserta);
    setNilaiEsaiInput({ ...(penilaianMap[peserta.id ?? '']?.skorEsai || {}) });
    setKelompokPenetapan(peserta.kelompokId ?? '');
  }

  async function simpanPenetapanKelompok() {
    if (!pesertaTerpilih) return;
    if (!kelompokPenetapan) {
      toast('Pilih kelompok soal terlebih dahulu.', 'amber');
      return;
    }
    const kelompok = kelompokList.find((k) => k.id === kelompokPenetapan);
    if (!kelompok) {
      toast('Kelompok soal tidak ditemukan.', 'red');
      return;
    }
    setSedangSimpanKelompok(true);
    try {
      await fetch(`/api/peserta/${pesertaTerpilih.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level: kelompok.level ?? null,
          divisi: kelompok.divisi ?? null,
          departemen: kelompok.departemen ?? null,
          kelompokId: kelompok.id,
        }),
      });
      setPeserta((prev) =>
        prev.map((p) =>
          p.id === pesertaTerpilih.id
            ? { ...p, level: kelompok.level, divisi: kelompok.divisi, departemen: kelompok.departemen, kelompokId: kelompok.id }
            : p
        )
      );
      setPesertaTerpilih((prev) =>
        prev ? { ...prev, level: kelompok.level, divisi: kelompok.divisi, departemen: kelompok.departemen, kelompokId: kelompok.id } : prev
      );
      toast(`Kelompok "${kelompok.nama}" ditetapkan untuk ${pesertaTerpilih.nama}.`, 'green');
    } catch (err) {
      console.error(err);
      toast('Gagal menyimpan penetapan kelompok.', 'red');
    }
    setSedangSimpanKelompok(false);
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
      await fetch('/api/penilaian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pesertaId: idPeserta,
          skorEsai: skor,
          totalEsai,
          dinilaiOleh: user.email,
          waktuDinilai: new Date().toISOString(),
        }),
      });
      setPenilaianMap((prev) => ({ ...prev, [idPeserta]: { skorEsai: skor, totalEsai } }));
      toast('Penilaian esai tersimpan.', 'green');
    } catch (err) {
      toast('Gagal menyimpan penilaian.', 'red');
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
        'Level': p.level || '-',
        'Divisi': p.divisi || '-',
        'Departemen': p.departemen || '-',
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
      { wch: 10 }, // Level
      { wch: 12 }, // Divisi
      { wch: 14 }, // Departemen
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

  const totalHalaman = Math.max(1, Math.ceil(pesertaTertampil.length / BAHAN_PER_HALAMAN));
  const halamanAman = Math.min(halaman, totalHalaman);
  const pesertaHalaman = pesertaTertampil.slice((halamanAman - 1) * BAHAN_PER_HALAMAN, halamanAman * BAHAN_PER_HALAMAN);

  if (loadingData) {
    return (
      <PageBackground className="p-5">
        <div className="max-w-7xl mx-auto">
          <TopNav title="Dashboard Rekrutmen" links={[{ href: '/dashboard/kelompok', label: 'Kelompok Soal' }, { href: '/dashboard/pengaturan', label: 'Pengaturan' }]} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
          </div>
          <Card className="p-5 mb-6"><div className="h-8 skeleton mb-4 w-48" /><div className="h-64 skeleton" /></Card>
          <Card className="p-5"><TableSkeleton rows={8} columns={8} /></Card>
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
            <ChevronLeft size={16} className="inline mr-1" />Kembali ke daftar
          </Button>

          <Card className="p-6 mb-5">
            <h1 className="font-display text-2xl font-bold text-navy-900 mb-1">{pesertaTerpilih.nama}</h1>
            <p className="text-sm text-slate-500 mb-4">
              {pesertaTerpilih.email} · {pesertaTerpilih.noHp || '-'} · Mulai {formatWaktu(pesertaTerpilih.waktuMulai)}
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge tone={STATUS_TONE[pesertaTerpilih.status ?? ''] ?? 'slate'}>{STATUS_LABEL[pesertaTerpilih.status ?? ''] ?? pesertaTerpilih.status}</Badge>
              <Badge tone={(pesertaTerpilih.totalPelanggaran ?? 0) > 0 ? 'red' : 'slate'}>
                {pesertaTerpilih.totalPelanggaran ?? 0} pelanggaran
              </Badge>
              {totalPG > 0 && <Badge tone="teal">Skor {benar}/{totalPG}</Badge>}
              {penilaianMap[pesertaTerpilih.id ?? '']?.totalEsai !== undefined && (
                <Badge tone="blue">Esai {penilaianMap[pesertaTerpilih.id ?? ''].totalEsai}/100</Badge>
              )}
              <Badge tone={grade.tone}>{grade.label}</Badge>
            </div>
            {pesertaTerpilih.status === STATUS.SEDANG_UJIAN && pesertaTerpilih.terakhirDisimpan && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-3">
                <AlertTriangle size={14} className="inline mr-1 text-amber-600" />Ujian belum diselesaikan. Progres terakhir tersimpan: {formatWaktu(pesertaTerpilih.terakhirDisimpan)}
              </p>
            )}
          </Card>

          <Card className="p-6 mb-5">
            <h2 className="font-display text-lg font-bold text-navy-900 mb-1">Penetapan Kelompok Soal</h2>
            <p className="text-sm text-slate-500 mb-4">
              Pilih kelompok soal yang sesuai untuk peserta. Level, divisi & departemen peserta mengikuti kelompok yang dipilih.
            </p>

            {pesertaTerpilih.kelompokId && (
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge tone="green">
                  Kelompok: {kelompokList.find((k) => k.id === pesertaTerpilih.kelompokId)?.nama ?? pesertaTerpilih.kelompokId}
                </Badge>
                {pesertaTerpilih.level && <Badge tone="teal">Level: {pesertaTerpilih.level}</Badge>}
                {pesertaTerpilih.divisi && <Badge tone="blue">Divisi: {pesertaTerpilih.divisi}</Badge>}
                {pesertaTerpilih.departemen && <Badge tone="purple">Departemen: {pesertaTerpilih.departemen}</Badge>}
              </div>
            )}

            <div className="mb-4">
              <Label>Kelompok Soal</Label>
              <Select value={kelompokPenetapan} onChange={(e) => setKelompokPenetapan(e.target.value)}>
                <option value="">Pilih kelompok soal</option>
                {kelompokList.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.nama} ({k.level ?? '-'} · {k.divisi ?? '-'} · {k.departemen ?? '-'})
                  </option>
                ))}
              </Select>
            </div>

            {kelompokPenetapan && (
              <p className="text-sm text-slate-500 mb-3">
                Kelompok yang dipilih:{' '}
                <b className="text-navy-900">
                  {kelompokList.find((k) => k.id === kelompokPenetapan)?.nama ?? '—'}
                </b>
              </p>
            )}

            <Button onClick={simpanPenetapanKelompok} disabled={sedangSimpanKelompok}>
              {sedangSimpanKelompok ? 'Menyimpan...' : 'Simpan Penetapan'}
            </Button>
          </Card>

          {pesertaTerpilih.logPelanggaran && pesertaTerpilih.logPelanggaran.length > 0 && (
            <Card className="p-6 mb-5">
              <h2 className="font-display text-lg font-bold text-navy-900 mb-4">
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
                        <p className="text-xs font-semibold text-navy-900">{log.tipe}</p>
                        <p className="text-xs text-slate-400">{new Date(log.waktu).toLocaleTimeString('id-ID')}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}
          
          {(() => {
            const daftarSoalEsai = Object.entries(soalFullMap).filter(([, soal]) => soal.tipe !== 'pilihan_ganda');
            const penilaianPeserta = penilaianMap[pesertaTerpilih.id ?? ''];
            const totalEsai = penilaianPeserta?.totalEsai;
            const persenPG = totalPG > 0 ? Math.round((benar / totalPG) * 100) : null;
            const skorGabungan =
              persenPG !== null && totalEsai !== undefined
                ? Math.round((persenPG + totalEsai) / 2)
                : persenPG ?? totalEsai ?? null;
            return (
              <Card className="p-6 mb-5">
                <h2 className="font-display text-lg font-bold text-navy-900 mb-1">Penilaian Esai</h2>
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
                    {daftarSoalEsai.map(([soalId, soal]) => {
                      const jawabanPeserta = pesertaTerpilih.jawaban?.[soalId];
                      return (
                        <div key={soalId}>
                          <p className="font-semibold text-navy-900 mb-1.5">{soal.teks ?? ''}</p>
                          <p className="p-3 rounded-xl text-sm bg-field-bg text-slate-700 mb-2 whitespace-pre-wrap break-words">
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
                      {sedangSimpanNilai ? 'Menyimpan...' : 'Simpan Penilaian Esai'}
                    </Button>
                  </div>
                )}
              </Card>
            );
          })()}

          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-navy-900 mb-4">Jawaban</h2>
            <div className="space-y-4">
              {Object.entries(soalFullMap).map(([soalId, soal]) => {
                const teksSoal = soal.teks ?? '';
                const jawabanPeserta = pesertaTerpilih.jawaban?.[soalId];
                const kunci = kunciMap[soalId];
                const isPG = soal?.tipe === 'pilihan_ganda';
                const jawabanBenar = isPG && kunci && jawabanPeserta === kunci;

                return (
                  <div key={soalId}>
                    <p className="font-semibold text-navy-900 mb-1.5">{teksSoal}</p>
                    <p className={`p-3 rounded-xl text-sm ${
                      isPG ? (jawabanBenar ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800') : 'bg-field-bg text-slate-700'
                    }`}>
                      {jawabanPeserta || <i className="text-slate-400">(tidak dijawab)</i>}
                      {isPG && (jawabanBenar ? <Check size={14} className="inline text-green-600" /> : <X size={14} className="inline text-red-500" />)}
                    </p>
                    {isPG && !jawabanBenar && kunci && (
                      <p className="text-xs text-green-700 mt-1">Jawaban benar: {kunci}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
          {toastEl}
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
          links={user.role === 'admin' ? [
            { href: '/dashboard/kelompok', label: 'Kelompok Soal' },
            { href: '/dashboard/pengaturan', label: 'Pengaturan' },
          ] : []}
          onLogout={() => fetch('/api/auth/logout', { method: 'POST' }).then(() => window.location.reload())}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Peserta" value={peserta.length} icon={Users} tone="navy" />
          <StatCard
            label="Selesai"
            value={peserta.filter((p) => p.status === STATUS.SELESAI).length}
            icon={CheckCircle2}
            tone="teal"
          />
          <StatCard
            label="Sedang Ujian"
            value={peserta.filter((p) => p.status === STATUS.SEDANG_UJIAN).length}
            icon={Clock}
            tone="amber"
          />
          <StatCard
            label="Total Pelanggaran"
            value={peserta.reduce((total, p) => total + (p.totalPelanggaran ?? 0), 0)}
            icon={AlertTriangle}
            tone="slate"
          />
        </div>

        {(() => {
          const pesertaSelesai = peserta.filter((p) => p.status === STATUS.SELESAI);

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
            if (p.status === STATUS.SELESAI) lokasiMap[kunciLokasi].selesai += 1;
          });
          const lokasiData = Object.entries(lokasiMap)
            .map(([label, v]) => ({ label, nilai: v.total, sub: `${v.selesai}/${v.total} selesai` }))
            .sort((a, b) => b.nilai - a.nilai)
            .slice(0, 6);

          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <Card className="p-5">
                <h3 className="font-display font-bold text-navy-900 mb-3">Distribusi Skor</h3>
                {pesertaSelesai.length === 0 ? (
                  <p className="text-sm text-slate-400">Belum ada peserta yang selesai.</p>
                ) : (
                  <BarChart data={distribusi} />
                )}
              </Card>
              <Card className="p-5">
                <h3 className="font-display font-bold text-navy-900 mb-3">Tingkat Penyelesaian per Lokasi</h3>
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
                              backgroundColor: CHART_WARNA.sekunder,
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
                <h3 className="font-display font-bold text-navy-900 mb-3">Soal PG Paling Sulit</h3>
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
                              backgroundColor: item.nilai <= 50 ? CHART_WARNA.danger : CHART_WARNA.utama,
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
            <option value="belum_ujian">Menunggu penetapan</option>
          </Select>

          <Button variant="secondary" onClick={exportKeExcel} disabled={pesertaTertampil.length === 0} className="sm:ml-auto">
            <Download size={16} className="inline mr-1" />Export ke Excel
          </Button>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-navy-900 text-white">
                <ThSort label="Nama" kolom="nama" sortKolom={sortKolom} onClick={toggleSort} />
                <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Email</th>
                <ThSort label="Status" kolom="status" sortKolom={sortKolom} onClick={toggleSort} />
                <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Kelompok</th>
                <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Terjawab</th>
                <ThSort label="Skor" kolom="skor" sortKolom={sortKolom} onClick={toggleSort} />
                <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Grade</th>
                <ThSort label="Pelanggaran" kolom="pelanggaran" sortKolom={sortKolom} onClick={toggleSort} />
                <ThSort label="Progres Terakhir" kolom="waktuMulai" sortKolom={sortKolom} onClick={toggleSort} />
                <th className="p-3 text-left text-xs font-display uppercase tracking-wide"></th>
              </tr>
            </thead>
            <tbody>
              {pesertaHalaman.length === 0 ? (
                <tr>
                  <td colSpan={10}>
                    <EmptyState
                      icon={Search}
                      title="Tidak ada data"
                      description="Tidak ada peserta yang cocok dengan pencarian atau filter saat ini."
                    />
                  </td>
                </tr>
              ) : (
              pesertaHalaman.map((p) => {
                const { benar, totalPG } = hitungSkor(p);
                const { terjawab, totalSoal } = hitungTerjawab(p);
                const grade = hitungGrade(p);
                return (
                  <tr key={p.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50/50 hover:bg-teal-600/5 transition-colors">
                    <td className="p-3 text-sm text-navy-900 font-medium">{p.nama}</td>
                    <td className="p-3 text-sm text-slate-600">{p.email}</td>
                    <td className="p-3 text-sm"><Badge tone={STATUS_TONE[p.status ?? ''] ?? 'slate'}>{STATUS_LABEL[p.status ?? ''] ?? p.status}</Badge></td>
                    <td className="p-3 text-sm">
                      {p.kelompokId ? (
                        <Badge tone="teal">{p.level ?? '-'} · {p.divisi ?? '-'} · {p.departemen ?? '-'}</Badge>
                      ) : (
                        <span className="text-xs text-slate-400">Belum ditetapkan</span>
                      )}
                    </td>
                    <td className="p-3 text-sm text-slate-600">{terjawab}/{totalSoal}</td>
                    <td className="p-3 text-sm text-slate-600">{totalPG > 0 ? `${benar}/${totalPG} (${Math.round((benar / totalPG) * 100)}%)` : '—'}</td>
                    <td className="p-3 text-sm"><Badge tone={grade.tone}>{grade.label}</Badge></td>
                    <td className="p-3 text-sm">
                      <Badge tone={(p.totalPelanggaran ?? 0) > 0 ? 'red' : 'slate'}>{p.totalPelanggaran ?? 0}</Badge>
                    </td>
                    <td className="p-3 text-sm text-slate-500">
                      {p.status === STATUS.SEDANG_UJIAN && p.terakhirDisimpan
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
          <Pagination halaman={halamanAman} totalHalaman={totalHalaman} onPindah={setHalaman} />
          </div>
        </Card>
        {toastEl}
      </div>
    </PageBackground>
  );
}