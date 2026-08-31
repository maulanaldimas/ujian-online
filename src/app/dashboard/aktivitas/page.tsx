'use client';

import { useState, useEffect } from 'react';
import { Card, Badge, Button, Input, Select, Pagination, useToast, EmptyState, TableSkeleton } from '@/app/components/ui';
import { AKTIVITAS_LABEL, AKTIVITAS_ENTITAS } from '@/lib/constants';
import { Activity, Download, LogIn, Settings, Plus, Pencil, Trash2, AlertTriangle, CheckCircle, ArrowUpDown, Play } from 'lucide-react';

interface ActivityLogItem {
  id: string;
  aksi: string;
  entitas: string | null;
  entitasId: string | null;
  detail: string | null;
  adminEmail: string | null;
  createdAt: string;
}

const aksiIcons: Record<string, any> = {
  login: LogIn,
  logout: LogIn,
  update_pengaturan: Settings,
  tambah_kelompok: Plus,
  edit_kelompok: Pencil,
  hapus_kelompok: Trash2,
  tambah_soal: Plus,
  hapus_soal: Trash2,
  reorder_soal: ArrowUpDown,
  ubah_penetapan_kelompok: Pencil,
  simpan_penilaian_esai: CheckCircle,
  export_excel: Download,
  mulai_ujian: Play,
  selesai_ujian: CheckCircle,
  pelanggaran: AlertTriangle,
};

const aksiTone: Record<string, string> = {
  login: 'green',
  logout: 'slate',
  update_pengaturan: 'blue',
  tambah_kelompok: 'teal',
  edit_kelompok: 'teal',
  hapus_kelompok: 'red',
  tambah_soal: 'teal',
  hapus_soal: 'red',
  reorder_soal: 'amber',
  ubah_penetapan_kelompok: 'blue',
  simpan_penilaian_esai: 'green',
  export_excel: 'navy',
  mulai_ujian: 'amber',
  selesai_ujian: 'green',
  pelanggaran: 'red',
};

function formatWaktu(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AktivitasPage() {
  const { toast, toastEl } = useToast();
  const [items, setItems] = useState<ActivityLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterAksi, setFilterAksi] = useState('');
  const [filterEntitas, setFilterEntitas] = useState('');
  const [cariTeks, setCariTeks] = useState('');
  const limit = 30;

  useEffect(() => {
    let aktif = true;
    async function muat() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (filterAksi) params.set('aksi', filterAksi);
        if (filterEntitas) params.set('entitas', filterEntitas);
        const res = await fetch(`/api/activity-log?${params}`);
        if (res.ok) {
          const data = await res.json();
          if (aktif) {
            setItems(data.items);
            setTotal(data.total);
          }
        }
      } catch {
        toast('Gagal memuat log aktivitas', 'red');
      }
      if (aktif) setLoading(false);
    }
    muat();
    return () => { aktif = false; };
  }, [page, filterAksi, filterEntitas]);

  const filteredItems = items.filter((item) => {
    if (!cariTeks) return true;
    const t = cariTeks.toLowerCase();
    return (
      (item.detail ?? '').toLowerCase().includes(t) ||
      (item.adminEmail ?? '').toLowerCase().includes(t) ||
      (item.entitasId ?? '').toLowerCase().includes(t) ||
      (AKTIVITAS_LABEL[item.aksi] ?? item.aksi).toLowerCase().includes(t) ||
      (AKTIVITAS_ENTITAS[item.entitas ?? ''] ?? item.entitas ?? '').toLowerCase().includes(t)
    );
  });

  const totalHalaman = Math.max(1, Math.ceil(total / limit));

  const uniqueAksi = [...new Set(items.map((i) => i.aksi))];
  const uniqueEntitas = [...new Set(items.map((i) => i.entitas).filter(Boolean))];

  function handleExport() {
    if (filteredItems.length === 0) return;
    const header = 'Waktu,Aksi,Entitas,Detail,Admin';
    const rows = filteredItems.map((i) =>
      [
        formatWaktu(i.createdAt),
        AKTIVITAS_LABEL[i.aksi] ?? i.aksi,
        AKTIVITAS_ENTITAS[i.entitas ?? ''] ?? i.entitas ?? '-',
        `"${(i.detail ?? '').replace(/"/g, '""')}"`,
        i.adminEmail ?? '-',
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aktivitas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-xl font-bold text-navy-900">Log Aktivitas</h1>
          <p className="text-sm text-slate-500">Riwayat seluruh aktivitas admin dan peserta</p>
        </div>
        <Button variant="secondary" onClick={handleExport} disabled={filteredItems.length === 0}>
          <Download size={16} className="inline mr-1" />Export CSV
        </Button>
      </div>

      {loading ? (
        <div>
          <Card className="p-5 mb-4"><TableSkeleton rows={10} columns={5} /></Card>
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <Input
              placeholder="Cari aktivitas..."
              value={cariTeks}
              onChange={(e) => setCariTeks(e.target.value)}
              className="!mb-0 sm:max-w-xs"
            />
            <Select value={filterAksi} onChange={(e) => { setFilterAksi(e.target.value); setPage(1); }} className="sm:max-w-[180px]">
              <option value="">Semua aksi</option>
              {uniqueAksi.map((a) => (
                <option key={a} value={a}>{AKTIVITAS_LABEL[a] ?? a}</option>
              ))}
            </Select>
            <Select value={filterEntitas} onChange={(e) => { setFilterEntitas(e.target.value); setPage(1); }} className="sm:max-w-[180px]">
              <option value="">Semua entitas</option>
              {uniqueEntitas.map((e) => (
                <option key={e} value={e!}>{AKTIVITAS_ENTITAS[e!] ?? e}</option>
              ))}
            </Select>
          </div>

          <p className="text-sm text-slate-500 mb-3">
            Menampilkan <b className="text-navy-900">{filteredItems.length}</b> dari {total} aktivitas
          </p>

          {filteredItems.length === 0 ? (
            <Card className="p-5">
              <EmptyState icon={Activity} title="Belum ada aktivitas" description="Log aktivitas akan muncul di sini setelah ada aksi admin atau peserta." />
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-navy-900 text-white">
                      <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Waktu</th>
                      <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Aksi</th>
                      <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Entitas</th>
                      <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Detail</th>
                      <th className="p-3 text-left text-xs font-display uppercase tracking-wide">Admin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => {
                      const Icon = aksiIcons[item.aksi] ?? Activity;
                      const tone = aksiTone[item.aksi] ?? 'slate';
                      return (
                        <tr key={item.id} className="border-b border-slate-100 odd:bg-white even:bg-slate-50/50 hover:bg-teal-600/5 transition-colors">
                          <td className="p-3 text-sm text-slate-500 whitespace-nowrap">{formatWaktu(item.createdAt)}</td>
                          <td className="p-3 text-sm">
                            <Badge tone={tone as any}>
                              <Icon size={12} className="inline mr-1" />
                              {AKTIVITAS_LABEL[item.aksi] ?? item.aksi}
                            </Badge>
                          </td>
                          <td className="p-3 text-sm text-navy-900">{AKTIVITAS_ENTITAS[item.entitas ?? ''] ?? item.entitas ?? '-'}</td>
                          <td className="p-3 text-sm text-slate-600 max-w-xs truncate" title={item.detail ?? ''}>{item.detail ?? '-'}</td>
                          <td className="p-3 text-sm text-slate-500">{item.adminEmail ?? '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalHalaman > 1 && (
                <div className="px-4 pb-4">
                  <Pagination halaman={page} totalHalaman={totalHalaman} onPindah={setPage} />
                </div>
              )}
            </Card>
          )}
        </>
      )}
      {toastEl}
    </div>
  );
}
