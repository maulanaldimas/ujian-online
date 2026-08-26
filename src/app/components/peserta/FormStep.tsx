'use client';

import type { FormEvent } from 'react';
import { PageBackground, Card, Label, Input, Button } from '@/app/components/ui';
import { HelpCircle } from 'lucide-react';
import CardHeader from './CardHeader';

export type DataDiri = {
  nama: string;
  email: string;
  noHp: string;
  lokasiKerja: string;
  nikKtp: string;
};

type Props = {
  dataDiri: DataDiri;
  sedangMenyimpan: boolean;
  onDataDiriChange: (d: DataDiri) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
};

const langkah = [
  { label: 'Data Diri', aktif: true },
  { label: 'Ujian Berlangsung', aktif: false },
  { label: 'Selesai', aktif: false },
];

export default function FormStep({ dataDiri, sedangMenyimpan, onDataDiriChange, onSubmit }: Props) {
  return (
    <PageBackground className="flex items-center justify-center p-5">
      <Card className="w-full max-w-md overflow-hidden">
        <CardHeader title="Ujian Rekrutmen" subtitle="Ujian akan berjalan dalam mode layar penuh. Keluar dari mode layar penuh akan tercatat sebagai pelanggaran." showLogo logoSize={200} />

        <div className="flex items-center justify-center gap-2 px-8 pt-5 text-xs">
          {langkah.map((l, i) => (
            <div key={l.label} className="flex items-center gap-2">
              <span className={`flex items-center gap-1 font-semibold ${l.aktif ? 'text-navy-900' : 'text-slate-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${l.aktif ? 'bg-amber-400' : 'bg-slate-300'}`} />
                {l.label}
              </span>
              {i < langkah.length - 1 && <span className="text-slate-300">—</span>}
            </div>
          ))}
        </div>

        <form onSubmit={onSubmit} className="px-8 pt-6 pb-8">
          <Label htmlFor="f-nama">Nama Lengkap</Label>
          <Input id="f-nama" required className="mb-4" placeholder="Sesuai KTP/identitas resmi"
            value={dataDiri.nama} onChange={(e) => onDataDiriChange({ ...dataDiri, nama: e.target.value })} />

          <Label htmlFor="f-email">Email</Label>
          <Input id="f-email" type="email" required className="mb-4" placeholder="nama@email.com"
            value={dataDiri.email} onChange={(e) => onDataDiriChange({ ...dataDiri, email: e.target.value })} />

          <Label htmlFor="f-hp">No HP</Label>
          <Input id="f-hp" type="tel" required className="mb-4" placeholder="08xxxxxxxxxx" minLength={10} maxLength={15}
            value={dataDiri.noHp}
            onChange={(e) => onDataDiriChange({ ...dataDiri, noHp: e.target.value.replace(/[^0-9]/g, '') })} />

          <Label htmlFor="f-lokasi">Lokasi Kerja</Label>
          <Input id="f-lokasi" required className="mb-4" placeholder="Contoh: Jakarta, Bandung, dst"
            value={dataDiri.lokasiKerja} onChange={(e) => onDataDiriChange({ ...dataDiri, lokasiKerja: e.target.value })} />

          <Label htmlFor="f-nik">NIK KTP</Label>
          <Input id="f-nik" type="tel" required className="mb-6" placeholder="16 digit NIK" minLength={16} maxLength={16}
            value={dataDiri.nikKtp}
            onChange={(e) => onDataDiriChange({ ...dataDiri, nikKtp: e.target.value.replace(/[^0-9]/g, '') })} />

          <Button type="submit" fullWidth disabled={sedangMenyimpan} isLoading={sedangMenyimpan}>
            Mulai Ujian
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-5">
            <HelpCircle size={14} className="inline mr-1" />Ada kendala? Hubungi tim HR
          </p>
        </form>
      </Card>
    </PageBackground>
  );
}