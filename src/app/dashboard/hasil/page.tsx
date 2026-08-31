'use client';

import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Card, Badge, Button, Input, Select, Pagination, useToast, EmptyState, StatCardSkeleton, TableSkeleton } from '@/app/components/ui';
import {
  hitungSkor as hitungSkorInti,
  hitungGrade as hitungGradeInti,
  hitungPersenSkor,
  PesertaData,
  SoalData,
  KelompokSoal,
} from '@/lib/utils';
import { STATUS } from '@/lib/constants';
import { Trophy, Medal, Download } from 'lucide-react';

export default function HasilPage() {
  const { toastEl } = useToast();
  const [peserta, setPeserta] = useState<PesertaData[]>([]);
  const [soalFullMap, setSoalFullMap] = useState<Record<string, SoalData>>({});
  const [kunciMap, setKunciMap] = useState<Record<string, string>>({});
  const [penilaianMap, setPenilaianMap] = useState<Record<string, any>>({});
  const [kelompokList, setKelompokList] = useState<KelompokSoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [cariTeks, setCariTeks] = useState('');
  const [filterKelompok, setFilterKelompok] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [sortArah, setSortArah] = useState<'asc' | 'desc'>('desc');
  const PERHalaman = 25;

  useEffect(() => {
    let aktif = true;
    async function muat() {
      try {
        const [pesertaRes, kelompokRes, penilaianRes] = await Promise.all([
          fetch('/api/peserta'),
          fetch('/api/kelompok'),
          fetch('/api/penilaian'),
        ]);
        if (!aktif) return;

        const pesertaData: PesertaData[] = pesertaRes.ok ? await pesertaRes.json() : [];
        const kelompokData: KelompokSoal[] = kelompokRes.ok ? await kelompokRes.json() : [];
        const penilaianData: Record<string, any> = penilaianRes.ok ? await penilaianRes.json() : {};

        const soalMap: Record<string, SoalData> = {};
        const kunciLookup: Record<string, string> = {};

        for (const k of kelompokData) {
          if (!k.id) continue;
          try {
            const res = await fetch(`/api/kelompok/${k.id}/soal`);
            if (res.ok) {
              const soalList: any[] = await res.json();
              for (const s of soalList) {
                if (s.id) {
                  soalMap[s.id] = s;
                  if (s.kunci) kunciLookup[s.id] = s.kunci;
                }
              }
            }
          } catch {}
        }

        if (aktif) {
          setPeserta(pesertaData);
          setKelompokList(kelompokData);
          setSoalFullMap(soalMap);
          setKunciMap(kunciLookup);
          setPenilaianMap(penilaianData);
        }
      } catch {}
      if (aktif) setLoading(false);
    }
    muat();
    return () => { aktif = false; };
  }, []);

  function skorKalkulasi(p: PesertaData) { return hitungSkorInti(p, soalFullMap, kunciMap); }
  function gradeKalkulasi(p: PesertaData) { return hitungGradeInti(p, soalFullMap, kunciMap); }
  function persenSkor(p: PesertaData) { return hitungPersenSkor(p, soalFullMap, kunciMap); }

  const pesertaSelesai = peserta.filter((p) => p.status === STATUS.SELESAI);

  const ranked = pesertaSelesai.map((p) => {
    const { benar, totalPG } = skorKalkulasi(p);
    const persen = persenSkor(p);
    const grade = gradeKalkulasi(p);
    const esai = penilaianMap[p.id ?? '']?.totalEsai;
    const skorGabungan = persen !== null && esai !== undefined
      ? Math.round((persen + esai) / 2)
      : persen ?? esai ?? null;
    const waktu = p.waktuMulai && p.waktuSelesai
      ? Math.round((new Date(p.waktuSelesai).getTime() - new Date(p.waktuMulai).getTime()) / 60000)
      : null;
    return { ...p, benar, totalPG, persen, grade, skorGabungan, waktu, esai };
  }).sort((a, b) => {
    const skorA = a.skorGabungan ?? -1;
    const skorB = b.skorGabungan ?? -1;
    return sortArah === 'desc' ? skorB - skorA : skorA - skorB;
  });

  const filtered = ranked.filter((p) => {
    if (cariTeks) {
      const t = cariTeks.toLowerCase();
      if (!(p.nama ?? '').toLowerCase().includes(t) && !(p.email ?? '').toLowerCase().includes(t)) return false;
    }
    if (filterKelompok && p.kelompokId !== filterKelompok) return false;
    return true;
  });

  const totalHalaman = Math.max(1, Math.ceil(filtered.length / PERHalaman));
  const halAman = Math.min(halaman, totalHalaman);
  const pageData = filtered.slice((halAman - 1) * PERHalaman, halAman * PERHalaman);

  const avgSkor = ranked.length > 0 ? Math.round(ranked.reduce((s, p) => s + (p.skorGabungan ?? 0), 0) / ranked.length) : null;
  const medSkor = (() => {
    const sorted = ranked.map((p) => p.skorGabungan ?? 0).filter(Boolean).sort((a, b) => a - b);
    if (sorted.length === 0) return null;
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
  })();

  function exportExcel() {
    if (filtered.length === 0) return;
    const rows = filtered.map((p, i) => ({
      'Peringkat': i + 1,
      'Nama': p.nama ?? '-',
      'Email': p.email ?? '-',
      'Lokasi': p.lokasiKerja ?? '-',
      'Kelompok': kelompokList.find((k) => k.id === p.kelompokId)?.nama ?? '-',
      'Grade': p.grade.label,
      'Skor PG (%)': p.persen ?? '-',
      'Skor Esai': p.esai ?? '-',
      'Skor Gabungan': p.skorGabungan ?? '-',
      'Benar/Total PG': p.totalPG > 0 ? `${p.benar}/${p.totalPG}` : '-',
      'Waktu (menit)': p.waktu ?? '-',
      'Pelanggaran': p.totalPelanggaran ?? 0,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ranking');
    XLSX.writeFile(wb, `ranking-ujian-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  function exportPdf() {
    if (filtered.length === 0) return;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const now = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Ranking Ujian Online', 14, 18);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dicetak: ${now}`, 14, 25);
    if (filterKelompok) {
      const namaK = kelompokList.find((k) => k.id === filterKelompok)?.nama ?? '';
      if (namaK) doc.text(`Kelompok: ${namaK}`, 14, 31);
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Peserta: ${filtered.length}`, pageW - 14, 18, { align: 'right' });
    if (avgSkor !== null) doc.text(`Rata-rata: ${avgSkor}%`, pageW - 14, 25, { align: 'right' });
    if (medSkor !== null) doc.text(`Median: ${medSkor}%`, pageW - 14, 31, { align: 'right' });

    const startY = filterKelompok ? 38 : 35;
    const body = filtered.map((p, i) => [
      i + 1,
      p.nama ?? '-',
      p.email ?? '-',
      p.lokasiKerja ?? '-',
      kelompokList.find((k) => k.id === p.kelompokId)?.nama ?? '-',
      p.grade.label,
      p.persen !== null ? `${p.persen}%` : '-',
      p.esai ?? '-',
      p.skorGabungan !== null ? `${p.skorGabungan}%` : '-',
      p.totalPG > 0 ? `${p.benar}/${p.totalPG}` : '-',
      p.waktu !== null ? `${p.waktu}m` : '-',
      (p.totalPelanggaran ?? 0).toString(),
    ]);

    autoTable(doc, {
      startY,
      head: [['#', 'Nama', 'Email', 'Lokasi', 'Kelompok', 'Grade', 'PG', 'Esai', 'Gabungan', 'Benar/PG', 'Waktu', 'Pelanggaran']],
      body,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [16, 25, 46], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 12 },
        6: { halign: 'center' },
        7: { halign: 'center' },
        8: { halign: 'center', fontStyle: 'bold' },
        10: { halign: 'center' },
        11: { halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.row.index < 3) {
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });

    doc.save(`ranking-ujian-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  function medali(i: number) {
    if (i === 0) return <Trophy size={18} className="text-amber-500" />;
    if (i === 1) return <Medal size={18} className="text-slate-400" />;
    if (i === 2) return <Medal size={18} className="text-amber-700" />;
    return <span className="text-xs text-slate-400 font-semibold w-5 text-center inline-block">{i + 1}</span>;
  }

  if (loading) {
    return (
      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
        <Card className="p-5"><TableSkeleton rows={8} columns={6} /></Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-xl font-bold text-navy-900">Hasil Ujian & Ranking</h1>
          <p className="text-sm text-slate-500">Peringkat peserta berdasarkan skor gabungan (PG + Esai)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={exportExcel} disabled={filtered.length === 0}>
            <Download size={16} className="inline mr-1" />Export Excel
          </Button>
          <Button variant="secondary" onClick={exportPdf} disabled={filtered.length === 0}>
            <Download size={16} className="inline mr-1" />Export PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 text-center">
          <p className="text-2xl font-display font-bold text-navy-900">{ranked.length}</p>
          <p className="text-xs text-slate-500">Peserta Selesai</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-display font-bold text-teal-600">{avgSkor !== null ? `${avgSkor}%` : '—'}</p>
          <p className="text-xs text-slate-500">Rata-rata Skor</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-display font-bold text-navy-900">{medSkor !== null ? `${medSkor}%` : '—'}</p>
          <p className="text-xs text-slate-500">Median Skor</p>
        </Card>
        <Card className="p-4 text-center">
          {(() => {
            const terbaik = ranked[0];
            return terbaik ? (
              <div>
                <p className="text-lg font-display font-bold text-amber-600 truncate">{terbaik.nama}</p>
                <p className="text-xs text-slate-500">Skor: {terbaik.skorGabungan}% · {terbaik.grade.label}</p>
              </div>
            ) : (
              <p className="text-2xl font-display font-bold text-slate-300">—</p>
            );
          })()}
          <p className="text-xs text-slate-500 mt-1">Peringkat #1</p>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input placeholder="Cari nama atau email..." value={cariTeks} onChange={(e) => { setCariTeks(e.target.value); setHalaman(1); }} className="!mb-0 sm:max-w-xs" />
        <Select value={filterKelompok} onChange={(e) => { setFilterKelompok(e.target.value); setHalaman(1); }} className="sm:max-w-[200px]">
          <option value="">Semua kelompok</option>
          {kelompokList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
        </Select>
        <Button variant="secondary" onClick={() => setSortArah(sortArah === 'desc' ? 'asc' : 'desc')} className="sm:ml-auto">
          {sortArah === 'desc' ? 'Skor Tertinggi' : 'Skor Terendah'}
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-5">
          <EmptyState icon={Trophy} title="Belum ada hasil" description="Belum ada peserta yang menyelesaikan ujian." />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-navy-900 text-white">
                  <th className="p-3 text-left text-xs font-display uppercase tracking-wide w-12">#</th>
                  <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Nama</th>
                  <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Kelompok</th>
                  <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Grade</th>
                  <th className="p-3 text-left text-xs font-display uppercase tracking-wide">PG</th>
                  <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Esai</th>
                  <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Gabungan</th>
                  <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Waktu</th>
                  <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Pelanggaran</th>
                </tr>
              </thead>
              <tbody>
                {pageData.map((p, i) => {
                  const globalIdx = (halAman - 1) * PERHalaman + i;
                  return (
                    <tr key={p.id} className={`border-b border-slate-100 transition-colors ${
                      globalIdx < 3 ? 'bg-amber-50/50 hover:bg-amber-50' : 'odd:bg-white even:bg-slate-50/50 hover:bg-teal-600/5'
                    }`}>
                      <td className="p-3 text-sm">{medali(globalIdx)}</td>
                      <td className="p-3">
                        <p className="text-sm font-semibold text-navy-900">{p.nama}</p>
                        <p className="text-xs text-slate-400">{p.email ?? '-'}</p>
                      </td>
                      <td className="p-3 text-sm">
                        {p.kelompokId ? (
                          <Badge tone="teal">{kelompokList.find((k) => k.id === p.kelompokId)?.nama ?? '-'}</Badge>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3"><Badge tone={p.grade.tone}>{p.grade.label}</Badge></td>
                      <td className="p-3 text-sm text-slate-600">{p.persen !== null ? `${p.persen}%` : '—'}</td>
                      <td className="p-3 text-sm text-slate-600">{p.esai ?? '—'}</td>
                      <td className="p-3 text-sm font-bold text-navy-900">{p.skorGabungan !== null ? `${p.skorGabungan}%` : '—'}</td>
                      <td className="p-3 text-sm text-slate-500">{p.waktu !== null ? `${p.waktu}m` : '—'}</td>
                      <td className="p-3 text-sm">
                        {(p.totalPelanggaran ?? 0) > 0 ? (
                          <Badge tone="red">{p.totalPelanggaran}</Badge>
                        ) : (
                          <span className="text-xs text-slate-400">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalHalaman > 1 && (
            <div className="px-4 pb-4">
              <Pagination halaman={halAman} totalHalaman={totalHalaman} onPindah={setHalaman} />
            </div>
          )}
        </Card>
      )}
      {toastEl}
    </div>
  );
}
