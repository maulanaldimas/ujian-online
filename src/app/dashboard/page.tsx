'use client';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import LoginGate, { type AuthUser } from '@/app/components/LoginGate';
import { Card, Badge, Button, Input, Select, Label, StatCard, EmptyState, Pagination, useToast, StatCardSkeleton, TableSkeleton } from '@/app/components/ui';
import {
  hitungSkor as hitungSkorInti,
  hitungTerjawab as hitungTerjawabInti,
  hitungGrade as hitungGradeInti,
  hitungPersenSkor,
  PesertaData,
  SoalData,
  KelompokSoal,
} from '@/lib/utils';
import { STATUS, STATUS_LABEL, STATUS_TONE } from '@/lib/constants';
import { Users, CheckCircle2, Clock, AlertTriangle, Search, Download, ArrowUpDown, ChevronLeft, Check, X, BarChart3, Timer, Upload, Send } from 'lucide-react';
import ImportPesertaModal from '@/app/components/ImportPesertaModal';
import { DistribusiSkor, StatusPie, PenyelesaianLokasi, SoalSulit, RataRataWaktu } from '@/app/components/DashboardCharts';

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
  const [showImport, setShowImport] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sedangBulk, setSedangBulk] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkKelompokId, setBulkKelompokId] = useState('');
  const [pesanKontrol, setPesanKontrol] = useState('');
  const [sedangKontrol, setSedangKontrol] = useState(false);
  const [sedangKontrolPesan, setSedangKontrolPesan] = useState(false);

  const muatDataRaw = useCallback(async () => {
    const [pesertaRes, kelompokRes, penilaianRes] = await Promise.all([
      fetch('/api/peserta'),
      fetch('/api/kelompok'),
      fetch('/api/penilaian'),
    ]);
    const pesertaList: PesertaData[] = pesertaRes.ok ? await pesertaRes.json() : [];
    const kelompokData: KelompokSoal[] = kelompokRes.ok ? await kelompokRes.json() : [];
    const penilaianData: Record<string, any> = penilaianRes.ok ? await penilaianRes.json() : {};
    const mapSoal: Record<string, SoalData> = {};
    const mapKunci: Record<string, string> = {};
    await Promise.all(
      (kelompokData || []).filter((k) => k.id).map(async (kel) => {
        try {
          const res = await fetch(`/api/kelompok/${kel.id}/soal`);
          const soalList = await res.json();
          (soalList || []).forEach((s: any) => {
            mapSoal[s.id] = s;
            if (s.kunci) mapKunci[s.id] = s.kunci;
          });
        } catch {}
      })
    );
    return { pesertaList, kelompokData, penilaianData, mapSoal, mapKunci };
  }, []);

  useEffect(() => {
    let aktif = true;

    async function muatData() {
      try {
        const { pesertaList, kelompokData, penilaianData, mapSoal, mapKunci } = await muatDataRaw();
        if (!aktif) return;

        pesertaList.sort((a: any, b: any) => {
          const waktuA = new Date(a.waktuMulai || a.waktuConsent || 0).getTime();
          const waktuB = new Date(b.waktuMulai || b.waktuConsent || 0).getTime();
          return waktuB - waktuA;
        });
        setPeserta(pesertaList);
        setKelompokList(kelompokData);
        setSoalFullMap(mapSoal);
        setKunciMap(mapKunci);
        setPenilaianMap(penilaianData);
      } catch (err) {
        console.error('Gagal memuat data dashboard:', err);
      } finally {
        if (aktif) setLoadingData(false);
      }
    }
    muatData();
    return () => { aktif = false; };
  }, [muatDataRaw]);

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

  function formatDurasiPeserta(p: PesertaData): string {
    if (!p.waktuMulai) return '-';
    if (!p.waktuSelesai) return 'Belum selesai';
    const ms = new Date(p.waktuSelesai).getTime() - new Date(p.waktuMulai).getTime();
    const menit = Math.round(ms / 60000);
    return `${menit} menit`;
  }

  function exportPdfPeserta() {
    const p = pesertaTerpilih;
    if (!p) return;
    const { benar, totalPG } = hitungSkor(p);
    const grade = hitungGrade(p);
    const esai = penilaianMap[p.id ?? '']?.totalEsai;
    const persenPG = totalPG > 0 ? Math.round((benar / totalPG) * 100) : null;
    const skorGabungan =
      persenPG !== null && esai !== undefined
        ? Math.round((persenPG + esai) / 2)
        : persenPG ?? esai ?? null;

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFillColor(16, 25, 46);
    doc.rect(0, 0, pageW, 30, 'F');
    doc.setTextColor(255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Laporan Hasil Ujian Peserta', 14, 13);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 14, 22);

    doc.setTextColor(30, 41, 59);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text(p.nama ?? '-', pageW - 14, 13, { align: 'right' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text((p.email ?? '-') + ' · ' + (p.noHp ?? '-'), pageW - 14, 20, { align: 'right' });

    const infoRows = [
      ['Status', STATUS_LABEL[p.status ?? ''] ?? p.status ?? '-'],
      ['Lokasi Kerja', p.lokasiKerja ?? '-'],
      ['Kelompok', kelompokList.find((k) => k.id === p.kelompokId)?.nama ?? '-'],
      ['Waktu Mulai', formatWaktu(p.waktuMulai)],
      ['Waktu Selesai', formatWaktu(p.waktuSelesai)],
      ['Durasi', formatDurasiPeserta(p)],
      ['Pelanggaran', (p.totalPelanggaran ?? 0).toString()],
    ];

    autoTable(doc, {
      startY: 36,
      head: [['', '']],
      body: infoRows,
      styles: { fontSize: 9, cellPadding: 2.5 },
      headStyles: { fillColor: [31, 111, 120] },
      columnStyles: { 0: { cellWidth: 45, fontStyle: 'bold' } },
    });

    autoTable(doc, {
      head: [['PG', 'Esai', 'Gabungan', 'Grade']],
      body: [[
        persenPG !== null ? `${persenPG}%` : '-',
        esai !== undefined ? `${esai}/100` : '-',
        skorGabungan !== null ? `${skorGabungan}%` : '-',
        grade.label,
      ]],
      styles: { fontSize: 11, cellPadding: 3, halign: 'center' },
      headStyles: { fillColor: [232, 163, 61] },
    });

    const daftarPG = Object.entries(soalFullMap).filter(([, s]) => s.tipe === 'pilihan_ganda');
    const daftarEsai = Object.entries(soalFullMap).filter(([, s]) => s.tipe !== 'pilihan_ganda');

    if (daftarPG.length > 0) {
      const bodyPG = daftarPG
        .sort((a, b) => (a[1].urutan ?? 0) - (b[1].urutan ?? 0))
        .map(([soalId, soal]) => {
          const jwb = p.jawaban?.[soalId];
          const kunci = kunciMap[soalId];
          const benar_j = kunci !== undefined && jwb === kunci;
          return [
            (soal.urutan ?? 0) + 1,
            (soal.teks ?? '').slice(0, 60),
            jwb || '(kosong)',
            kunci || '-',
            jwb ? (benar_j ? '✓' : '✗') : '-',
          ];
        });
      autoTable(doc, {
        head: [['No', 'Soal', 'Jawaban', 'Kunci', 'Hasil']],
        body: bodyPG,
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [16, 25, 46] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 110 },
          2: { cellWidth: 60 },
          3: { cellWidth: 25, halign: 'center' },
          4: { cellWidth: 18, halign: 'center' },
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 4) {
            if (data.cell.raw === '✓') data.cell.styles.textColor = [22, 163, 74];
            else if (data.cell.raw === '✗') data.cell.styles.textColor = [220, 38, 38];
          }
        },
      });
    }

    if (daftarEsai.length > 0) {
      const bodyEsai = daftarEsai.map(([soalId, soal]) => {
        const jwb = p.jawaban?.[soalId];
        const nilai = penilaianMap[p.id ?? '']?.skorEsai?.[soalId];
        return [
          (soal.urutan ?? 0) + 1,
          (soal.teks ?? '').slice(0, 80),
          (jwb || '(kosong)').slice(0, 100),
          nilai !== undefined ? `${nilai}` : '-',
        ];
      });
      autoTable(doc, {
        head: [['No', 'Soal Esai', 'Jawaban', 'Nilai']],
        body: bodyEsai,
        styles: { fontSize: 8, cellPadding: 2.5 },
        headStyles: { fillColor: [16, 25, 46] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          1: { cellWidth: 90 },
          2: { cellWidth: 90 },
          3: { cellWidth: 25, halign: 'center' },
        },
      });
    }

    doc.save(`hasil-${(p.nama ?? 'peserta').replace(/\s+/g, '-').toLowerCase()}.pdf`);
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

  async function refreshPesertaUjian() {
    const d = await muatDataRaw();
    d.pesertaList.sort((a: any, b: any) => new Date(b.waktuMulai || b.waktuConsent || 0).getTime() - new Date(a.waktuMulai || a.waktuConsent || 0).getTime());
    setPeserta(d.pesertaList);
    setPesertaTerpilih((prev) => (prev?.id ? d.pesertaList.find((p: PesertaData) => p.id === prev.id) ?? prev : prev));
  }

  async function jalankanKontrol(aksi: 'force_submit' | 'tambah_waktu' | 'kirim_pesan', nilai?: number | string) {
    if (!pesertaTerpilih) return;
    const idPeserta = pesertaTerpilih.id ?? '';
    if (aksi === 'force_submit') {
      if (!window.confirm(`Akhiri ujian ${pesertaTerpilih.nama} sekarang? Jawaban yang tersimpan akan dikunci dan status menjadi selesai.`)) return;
      setSedangKontrol(true);
    } else if (aksi === 'kirim_pesan') {
      setSedangKontrolPesan(true);
    } else {
      setSedangKontrol(true);
    }
    try {
      const res = await fetch(`/api/peserta/${idPeserta}/kontrol`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aksi, nilai }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast(data.error || 'Gagal menjalankan aksi.', 'red');
        return;
      }
      if (aksi === 'force_submit') {
        toast(`Ujian ${pesertaTerpilih.nama} diakhiri paksa.`, 'green');
      } else if (aksi === 'tambah_waktu') {
        toast(`Waktu ujian ${pesertaTerpilih.nama} ditambah ${nilai} menit.`, 'green');
      } else {
        toast('Pesan terkirim ke peserta.', 'green');
        setPesanKontrol('');
      }
      await refreshPesertaUjian();
    } catch (err) {
      console.error(err);
      toast('Gagal menjalankan aksi.', 'red');
    }
    setSedangKontrol(false);
    setSedangKontrolPesan(false);
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
      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <Card className="p-5 mb-6"><div className="h-8 skeleton mb-4 w-48" /><div className="h-64 skeleton" /></Card>
        <Card className="p-5"><TableSkeleton rows={8} columns={8} /></Card>
      </div>
    );
  }

  if (pesertaTerpilih) {
    const { benar, totalPG } = hitungSkor(pesertaTerpilih);
    const grade = hitungGrade(pesertaTerpilih);

    return (
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <Button variant="secondary" onClick={() => setPesertaTerpilih(null)}>
            <ChevronLeft size={16} className="inline mr-1" />Kembali ke daftar
          </Button>
          <Button variant="secondary" onClick={exportPdfPeserta}>
            <Download size={16} className="inline mr-1" />Export PDF
          </Button>
        </div>

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

          {pesertaTerpilih.status === STATUS.SEDANG_UJIAN && (
            <Card className="p-6 mb-5 !border-amber-200">
              <h2 className="font-display text-lg font-bold text-navy-900 mb-1">Kontrol Ujian</h2>
              <p className="text-sm text-slate-500 mb-4">
                Kelola ujian {pesertaTerpilih.nama} yang sedang berjalan. Perubahan diterapkan langsung dan tersinkron ke perangkat peserta.
              </p>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                <Button variant="secondary" onClick={() => jalankanKontrol('tambah_waktu', 5)} disabled={sedangKontrol} className="!px-3 !py-2 text-xs">
                  <Clock size={14} className="inline mr-1" />+5 Menit
                </Button>
                <Button variant="secondary" onClick={() => jalankanKontrol('tambah_waktu', 15)} disabled={sedangKontrol} className="!px-3 !py-2 text-xs">
                  <Clock size={14} className="inline mr-1" />+15 Menit
                </Button>
                <Button variant="danger" onClick={() => jalankanKontrol('force_submit')} disabled={sedangKontrol} className="!px-3 !py-2 text-xs">
                  <X size={14} className="inline mr-1" />Akhiri Ujian Sekarang
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <Input
                  value={pesanKontrol}
                  onChange={(e) => setPesanKontrol(e.target.value)}
                  placeholder="Tulis pesan pengawas untuk peserta..."
                  className="!mb-0 flex-1"
                  onKeyDown={(e) => { if (e.key === 'Enter' && pesanKontrol.trim()) jalankanKontrol('kirim_pesan', pesanKontrol.trim()); }}
                />
                <Button
                  onClick={() => jalankanKontrol('kirim_pesan', pesanKontrol.trim())}
                  disabled={!pesanKontrol.trim() || sedangKontrolPesan}
                  className="!px-3 !py-2.5 text-xs"
                >
                  {sedangKontrolPesan ? 'Mengirim...' : (<><Send size={14} className="inline mr-1" />Kirim Pesan</>)}
                </Button>
              </div>
            </Card>
          )}

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
                    {soal?.gambar && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img src={soal.gambar} alt={`Ilustrasi soal ${teksSoal}`} className="max-h-40 rounded-lg border border-slate-200 object-contain mb-2" />
                    )}
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
    );
  }

  return (
    <div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
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
            label="Tingkat Penyelesaian"
            value={peserta.length > 0 ? `${Math.round((peserta.filter((p) => p.status === STATUS.SELESAI).length / peserta.length) * 100)}%` : '0%'}
            icon={BarChart3}
            tone="teal"
          />
          {(() => {
            const selesai = peserta.filter((p) => p.status === STATUS.SELESAI);
            const avgSkor = selesai.length > 0
              ? Math.round(selesai.reduce((sum, p) => sum + (persenSkor(p) ?? 0), 0) / selesai.length)
              : null;
            return <StatCard label="Rata-rata Skor" value={avgSkor !== null ? `${avgSkor}%` : '—'} icon={BarChart3} tone="navy" />;
          })()}
          {(() => {
            const selesai = peserta.filter((p) => p.status === STATUS.SELESAI && p.waktuMulai && p.waktuSelesai);
            const avgMenit = selesai.length > 0
              ? Math.round(selesai.reduce((sum, p) => {
                  const ms = new Date(p.waktuSelesai!).getTime() - new Date(p.waktuMulai!).getTime();
                  return sum + ms / 60000;
                }, 0) / selesai.length)
              : null;
            return <StatCard label="Rata-rata Waktu" value={avgMenit !== null ? `${avgMenit}m` : '—'} icon={Timer} tone="amber" />;
          })()}
        </div>

        {(() => {
          const totalPelanggaran = peserta.reduce((total, p) => total + (p.totalPelanggaran ?? 0), 0);
          const belumDitetapkan = peserta.filter((p) => !p.kelompokId && p.status === STATUS.BELUM_UJIAN).length;
          const totalPG = Object.keys(kunciMap).length;

          return (
            <Card className="p-5 mb-6">
              <h3 className="font-display font-bold text-navy-900 mb-3">Ringkasan Cepat</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-display font-bold text-navy-900">{belumDitetapkan}</p>
                  <p className="text-xs text-slate-500">Belum Ditugaskan</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-display font-bold text-navy-900">{totalPG}</p>
                  <p className="text-xs text-slate-500">Soal PG Aktif</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-display font-bold text-navy-900">{totalPelanggaran}</p>
                  <p className="text-xs text-slate-500">Total Pelanggaran</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-display font-bold text-navy-900">{kelompokList.length}</p>
                  <p className="text-xs text-slate-500">Kelompok Soal</p>
                </div>
              </div>
            </Card>
          );
        })()}

        {(() => {
          return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
              <Card className="p-5">
                <h3 className="font-display font-bold text-navy-900 mb-3">Distribusi Skor</h3>
                <DistribusiSkor peserta={peserta} persenSkor={persenSkor} />
              </Card>
              <Card className="p-5">
                <h3 className="font-display font-bold text-navy-900 mb-3">Status Peserta</h3>
                <StatusPie peserta={peserta} />
              </Card>
              <Card className="p-5">
                <h3 className="font-display font-bold text-navy-900 mb-3">Penyelesaian per Lokasi</h3>
                <PenyelesaianLokasi peserta={peserta} />
              </Card>
            </div>
          );
        })()}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card className="p-5">
            <h3 className="font-display font-bold text-navy-900 mb-3">Soal PG Paling Sulit</h3>
            <SoalSulit peserta={peserta} soalFullMap={soalFullMap} kunciMap={kunciMap} />
          </Card>
          <Card className="p-5">
            <h3 className="font-display font-bold text-navy-900 mb-3">Distribusi Waktu Pengerjaan</h3>
            <RataRataWaktu peserta={peserta} />
          </Card>
        </div>

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

          <Button variant="secondary" onClick={exportKeExcel} disabled={pesertaTertampil.length === 0}>
            <Download size={16} className="inline mr-1" />Export Excel
          </Button>
          {user.role === 'admin' && (
            <Button variant="secondary" onClick={() => setShowImport(true)}>
              <Upload size={16} className="inline mr-1" />Import Peserta
            </Button>
          )}
        </div>

        {selectedIds.size > 0 && (
          <Card className="p-4 mb-4 border-teal-200 bg-teal-50">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-semibold text-navy-900">{selectedIds.size} peserta dipilih</p>
              <Select value="" onChange={async (e) => {
                const val = e.target.value;
                if (!val || sedangBulk) return;
                if (val === 'delete') {
                  if (!window.confirm(`Hapus ${selectedIds.size} peserta yang dipilih?`)) return;
                  setSedangBulk(true);
                  try {
                    const res = await fetch('/api/peserta/bulk-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', ids: Array.from(selectedIds) }) });
                    const data = await res.json();
                    toast(`${data.affected} peserta dihapus.`, 'green');
                    setSelectedIds(new Set());
                    const d = await muatDataRaw();
                    d.pesertaList.sort((a: any, b: any) => new Date(b.waktuMulai || b.waktuConsent || 0).getTime() - new Date(a.waktuMulai || a.waktuConsent || 0).getTime());
                    setPeserta(d.pesertaList);
                  } catch { toast('Gagal menghapus peserta.', 'red'); }
                  setSedangBulk(false);
                } else if (val === 'reset') {
                  if (!window.confirm(`Reset ${selectedIds.size} peserta ke status awal?`)) return;
                  setSedangBulk(true);
                  try {
                    const res = await fetch('/api/peserta/bulk-action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reset_status', ids: Array.from(selectedIds) }) });
                    const data = await res.json();
                    toast(`${data.affected} peserta direset.`, 'green');
                    setSelectedIds(new Set());
                    const d = await muatDataRaw();
                    d.pesertaList.sort((a: any, b: any) => new Date(b.waktuMulai || b.waktuConsent || 0).getTime() - new Date(a.waktuMulai || a.waktuConsent || 0).getTime());
                    setPeserta(d.pesertaList);
                  } catch { toast('Gagal mereset peserta.', 'red'); }
                  setSedangBulk(false);
                } else if (val === 'assign') {
                  setShowBulkAssign(true);
                }
                e.target.value = '';
              }} className="!mb-0 !py-1 text-xs">
                <option value="">Pilih aksi...</option>
                <option value="assign">Tetapkan Kelompok</option>
                <option value="reset">Reset Status</option>
                <option value="delete">Hapus</option>
              </Select>
              <Button variant="ghost" className="text-xs" onClick={() => setSelectedIds(new Set())}>
                <X size={14} className="inline mr-1" />Batal
              </Button>
            </div>
          </Card>
        )}

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-navy-900 text-white">
                <th className="p-3 w-10">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 accent-teal-600"
                    checked={pesertaHalaman.length > 0 && pesertaHalaman.every((p) => p.id && selectedIds.has(p.id))}
                    onChange={() => {
                      if (pesertaHalaman.every((p) => p.id && selectedIds.has(p.id))) {
                        setSelectedIds((prev) => { const next = new Set(prev); pesertaHalaman.forEach((p) => { if (p.id) next.delete(p.id); }); return next; });
                      } else {
                        setSelectedIds((prev) => { const next = new Set(prev); pesertaHalaman.forEach((p) => { if (p.id) next.add(p.id); }); return next; });
                      }
                    }}
                  />
                </th>
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
                    <td className="p-3">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 accent-teal-600"
                        checked={!!(p.id && selectedIds.has(p.id))}
                        onChange={() => {
                          if (!p.id) return;
                          setSelectedIds((prev) => { const next = new Set(prev); if (next.has(p.id!)) next.delete(p.id!); else next.add(p.id!); return next; });
                        }}
                      />
                    </td>
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
        <ImportPesertaModal open={showImport} onClose={() => setShowImport(false)} onDone={() => window.location.reload()} />
        {showBulkAssign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowBulkAssign(false)}>
            <div className="w-full max-w-md p-6 bg-white rounded-2xl shadow-xl border border-slate-100" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-display font-bold text-navy-900 mb-4">Tetapkan Kelompok untuk {selectedIds.size} Peserta</h3>
              <p className="text-sm text-slate-500 mb-4">Hanya peserta dengan status &quot;Menunggu&quot; yang akan ditetapkan.</p>
              <label className="block mb-3">
                <span className="text-sm font-medium text-slate-700">Kelompok Soal</span>
                <Select value={bulkKelompokId} onChange={(e) => setBulkKelompokId(e.target.value)} className="mt-1">
                  <option value="">Pilih kelompok</option>
                  {kelompokList.map((k) => (
                    <option key={k.id} value={k.id}>{k.nama} ({k.level} · {k.divisi})</option>
                  ))}
                </Select>
              </label>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" onClick={() => setShowBulkAssign(false)}>Batal</Button>
                <Button
                  disabled={!bulkKelompokId || sedangBulk}
                  onClick={async () => {
                    if (!bulkKelompokId) return;
                    const kel = kelompokList.find((k) => k.id === bulkKelompokId);
                    if (!kel) return;
                    setSedangBulk(true);
                    try {
                      const res = await fetch('/api/peserta/bulk-action', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'assign_kelompok',
                          ids: Array.from(selectedIds),
                          kelompokId: bulkKelompokId,
                          level: kel.level,
                          divisi: kel.divisi,
                          departemen: kel.departemen,
                        }),
                      });
                      const data = await res.json();
                      toast(`${data.affected} peserta ditetapkan ke ${kel.nama}.`, 'green');
                      setSelectedIds(new Set());
                      setShowBulkAssign(false);
                      setBulkKelompokId('');
                      const d = await muatDataRaw();
                      d.pesertaList.sort((a: any, b: any) => new Date(b.waktuMulai || b.waktuConsent || 0).getTime() - new Date(a.waktuMulai || a.waktuConsent || 0).getTime());
                      setPeserta(d.pesertaList);
                    } catch { toast('Gagal menetapkan kelompok.', 'red'); }
                    setSedangBulk(false);
                  }}
                >
                  {sedangBulk ? 'Menyimpan...' : 'Tetapkan'}
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}