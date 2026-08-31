'use client';
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  Legend,
} from 'recharts';
import { CHART_WARNA, STATUS } from '@/lib/constants';
import type { PesertaData, SoalData } from '@/lib/utils';

type Props = {
  peserta: PesertaData[];
  soalFullMap: Record<string, SoalData>;
  kunciMap: Record<string, string>;
  persenSkor: (p: PesertaData) => number | null;
};

const PIE_COLORS = [CHART_WARNA.utama, CHART_WARNA.sekunder, CHART_WARNA.ketiga, '#6366f1', '#f97316'];

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-100 px-3 py-2 text-xs">
      <p className="font-semibold text-navy-900 mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-slate-600">{entry.name}: <span className="font-semibold text-navy-800">{entry.value}</span></p>
      ))}
    </div>
  );
}

export function DistribusiSkor({ peserta, persenSkor }: Pick<Props, 'peserta' | 'persenSkor'>) {
  const selesai = peserta.filter((p) => p.status === STATUS.SELESAI);
  if (selesai.length === 0) return <p className="text-sm text-slate-400">Belum ada peserta yang selesai.</p>;

  const data = [
    { rentang: '0–20', jumlah: 0 },
    { rentang: '21–40', jumlah: 0 },
    { rentang: '41–60', jumlah: 0 },
    { rentang: '61–80', jumlah: 0 },
    { rentang: '81–100', jumlah: 0 },
  ];
  selesai.forEach((p) => {
    const pct = persenSkor(p);
    if (pct === null) return;
    const idx = pct <= 20 ? 0 : pct <= 40 ? 1 : pct <= 60 ? 2 : pct <= 80 ? 3 : 4;
    data[idx].jumlah += 1;
  });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ReBarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="rentang" tick={{ fontSize: 11, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="jumlah" name="Peserta" radius={[6, 6, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={i >= 3 ? CHART_WARNA.utama : i >= 2 ? CHART_WARNA.sekunder : '#cbd5e1'} />
          ))}
        </Bar>
      </ReBarChart>
    </ResponsiveContainer>
  );
}

export function StatusPie({ peserta }: Pick<Props, 'peserta'>) {
  const counts: Record<string, number> = {};
  peserta.forEach((p) => {
    const s = p.status || STATUS.BELUM_UJIAN;
    counts[s] = (counts[s] || 0) + 1;
  });
  const data = [
    { name: 'Selesai', value: counts[STATUS.SELESAI] || 0 },
    { name: 'Sedang Ujian', value: counts[STATUS.SEDANG_UJIAN] || 0 },
    { name: 'Menunggu', value: counts[STATUS.BELUM_UJIAN] || 0 },
  ].filter((d) => d.value > 0);

  if (data.length === 0) return <p className="text-sm text-slate-400">Belum ada data peserta.</p>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={30}
          formatter={(value: string) => <span className="text-xs text-slate-600">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PenyelesaianLokasi({ peserta }: Pick<Props, 'peserta'>) {
  const lokasiMap: Record<string, { total: number; selesai: number }> = {};
  peserta.forEach((p) => {
    const kunci = p.lokasiKerja?.trim() || 'Tanpa lokasi';
    lokasiMap[kunci] = lokasiMap[kunci] || { total: 0, selesai: 0 };
    lokasiMap[kunci].total += 1;
    if (p.status === STATUS.SELESAI) lokasiMap[kunci].selesai += 1;
  });
  const data = Object.entries(lokasiMap)
    .map(([lokasi, v]) => ({
      lokasi: lokasi.length > 12 ? lokasi.slice(0, 12) + '…' : lokasi,
      selesai: v.selesai,
      belum: v.total - v.selesai,
      total: v.total,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6);

  if (data.length === 0) return <p className="text-sm text-slate-400">Belum ada data peserta.</p>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ReBarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
        <YAxis type="category" dataKey="lokasi" tick={{ fontSize: 10, fill: '#94a3b8' }} width={90} />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={30}
          formatter={(value: string) => <span className="text-xs text-slate-600">{value}</span>}
        />
        <Bar dataKey="selesai" name="Selesai" stackId="a" fill={CHART_WARNA.utama} radius={[0, 0, 0, 0]} />
        <Bar dataKey="belum" name="Belum" stackId="a" fill="#e2e8f0" radius={[0, 6, 6, 0]} />
      </ReBarChart>
    </ResponsiveContainer>
  );
}

export function SoalSulit({ peserta, soalFullMap, kunciMap }: Pick<Props, 'peserta' | 'soalFullMap' | 'kunciMap'>) {
  const selesai = peserta.filter((p) => p.status === STATUS.SELESAI);
  const items = Object.entries(soalFullMap)
    .filter(([id, s]) => s.tipe === 'pilihan_ganda' && kunciMap[id])
    .map(([id, s]) => {
      let benar = 0;
      let total = 0;
      selesai.forEach((p) => {
        const jwb = p.jawaban?.[id];
        if (jwb === undefined || jwb === '') return;
        total += 1;
        if (jwb === kunciMap[id]) benar += 1;
      });
      return { soal: `#${(s.urutan ?? 0) + 1}`, benar: total > 0 ? Math.round((benar / total) * 100) : 0, n: total };
    })
    .filter((d) => d.n > 0)
    .sort((a, b) => a.benar - b.benar)
    .slice(0, 8);

  if (items.length === 0) return <p className="text-sm text-slate-400">Belum cukup data untuk analisis soal.</p>;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ReBarChart data={items} layout="vertical" margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={(v: number) => `${v}%`} />
        <YAxis type="category" dataKey="soal" tick={{ fontSize: 10, fill: '#94a3b8' }} width={45} />
        <Tooltip content={<CustomTooltip />} formatter={(value) => [`${value}%`, 'Tingkat Benar']} />
        <Bar dataKey="benar" name="Tingkat Benar" radius={[0, 6, 6, 0]}>
          {items.map((d, i) => (
            <Cell key={i} fill={d.benar <= 30 ? CHART_WARNA.danger : d.benar <= 60 ? CHART_WARNA.sekunder : CHART_WARNA.utama} />
          ))}
        </Bar>
      </ReBarChart>
    </ResponsiveContainer>
  );
}

export function RataRataWaktu({ peserta }: Pick<Props, 'peserta'>) {
  const selesai = peserta.filter((p) => p.status === STATUS.SELESAI && p.waktuMulai && p.waktuSelesai);
  if (selesai.length === 0) return <p className="text-sm text-slate-400">Belum ada peserta yang selesai.</p>;

  const waktuMenit: number[] = selesai.map((p) => {
    const mulai = new Date(p.waktuMulai!).getTime();
    const selesai_ = new Date(p.waktuSelesai!).getTime();
    return Math.max(0, Math.round((selesai_ - mulai) / 60000));
  });

  const data = [
    { rentang: '< 15m', jumlah: 0 },
    { rentang: '15–30m', jumlah: 0 },
    { rentang: '31–45m', jumlah: 0 },
    { rentang: '46–60m', jumlah: 0 },
    { rentang: '> 60m', jumlah: 0 },
  ];
  waktuMenit.forEach((m) => {
    const idx = m < 15 ? 0 : m <= 30 ? 1 : m <= 45 ? 2 : m <= 60 ? 3 : 4;
    data[idx].jumlah += 1;
  });

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ReBarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="rentang" tick={{ fontSize: 11, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="jumlah" name="Peserta" radius={[6, 6, 0, 0]} fill={CHART_WARNA.utama} />
      </ReBarChart>
    </ResponsiveContainer>
  );
}
